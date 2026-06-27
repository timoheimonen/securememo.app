package server

import (
	"context"
	"encoding/xml"
	"fmt"
	"io/fs"
	"mime"
	"net/http"
	"path"
	"regexp"
	"strings"
	"time"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/frontend"
	"github.com/timoheimonen/securememo/internal/memo"
	"github.com/timoheimonen/securememo/internal/security"
	"github.com/timoheimonen/securememo/internal/store"
)

const assetVersion = "20260627b"

var clientLocalizationAssetRe = regexp.MustCompile(`^/js/clientLocalization\.([A-Za-z0-9_-]+)\.js$`)

type nonceKey struct{}

type Server struct {
	cfg     config.Config
	db      *store.SQLiteStore
	mux     *http.ServeMux
	memo    memo.Handler
	metrics *Metrics
}

func New(cfg config.Config, db *store.SQLiteStore) *Server {
	s := &Server{
		cfg:     cfg,
		db:      db,
		metrics: NewMetrics(db),
	}
	s.memo = memo.Handler{
		Config: cfg,
		Store:  db,
	}
	s.mux = http.NewServeMux()
	s.routes()
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	rw := &metricsResponseWriter{ResponseWriter: w, status: http.StatusOK}
	s.serveHTTP(rw, r)
	if s.metrics != nil {
		s.metrics.Observe(r, rw.status, rw.bytes, time.Since(start))
	}
}

func (s *Server) MetricsHandler() http.Handler {
	if s.metrics == nil {
		return http.NotFoundHandler()
	}
	return s.metrics.Handler()
}

func (s *Server) serveHTTP(w http.ResponseWriter, r *http.Request) {
	nonce, err := security.Nonce()
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	security.ApplyHeaders(w, security.SecurityHeaders(r, s.cfg.AllowedOrigins, nonce))
	s.mux.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), nonceKey{}, nonce)))
}

func (s *Server) routes() {
	s.mux.HandleFunc("/api/create-memo", s.memo.Create)
	s.mux.HandleFunc("/api/read-memo", s.memo.Read)
	s.mux.HandleFunc("/api/confirm-delete", s.memo.ConfirmDelete)
	s.mux.HandleFunc("/", s.handle)
}

func (s *Server) handle(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		if !security.IsAllowedOrigin(r.Header.Get("Origin"), s.cfg.AllowedOrigins) {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}

	urlPath := r.URL.Path
	if s.serveGeneratedAsset(w, r, urlPath) {
		return
	}
	if s.servePublicAsset(w, r, urlPath) {
		return
	}
	if urlPath == "/sitemap.xml" {
		s.serveSitemap(w, r)
		return
	}
	s.servePage(w, r)
}

func (s *Server) serveGeneratedAsset(w http.ResponseWriter, r *http.Request, urlPath string) bool {
	if locale, ok := localizationAssetLocale(urlPath); ok {
		return s.serveFile(w, r, fmt.Sprintf("generated/js/clientLocalization.%s.js", locale), "application/javascript; charset=utf-8", cacheStatic(r.URL.Query().Has("v")))
	}
	switch urlPath {
	case "/styles.css":
		return s.serveFile(w, r, "generated/styles.css", "text/css; charset=utf-8", cacheStatic(r.URL.Query().Has("v")))
	case "/js/common.js":
		return s.serveFile(w, r, "generated/js/common.js", "application/javascript; charset=utf-8", cacheStatic(true))
	case "/js/localization-core.js":
		return s.serveFile(w, r, "generated/js/localization-core.js", "application/javascript; charset=utf-8", cacheStatic(true))
	case "/js/memo-crypto-config.js":
		return s.serveFile(w, r, "generated/js/memo-crypto-config.js", "application/javascript; charset=utf-8", cacheStatic(true))
	case "/js/create-memo.js":
		return s.serveFile(w, r, "generated/js/create-memo.js", "application/javascript; charset=utf-8", cacheStatic(true))
	case "/js/read-memo.js":
		return s.serveFile(w, r, "generated/js/read-memo.js", "application/javascript; charset=utf-8", cacheStatic(true))
	case "/js/memo-crypto-worker.js":
		return s.serveFile(w, r, "generated/js/memo-crypto-worker.js", "application/javascript; charset=utf-8", cacheStatic(true))
	case "/js/clientLocalization.js":
		return s.serveFile(w, r, "generated/js/clientLocalization.en.js", "application/javascript; charset=utf-8", cacheStatic(false))
	default:
		return false
	}
}

func localizationAssetLocale(urlPath string) (string, bool) {
	matches := clientLocalizationAssetRe.FindStringSubmatch(urlPath)
	if len(matches) != 2 || !supportedLocaleSet[matches[1]] {
		return "", false
	}
	return matches[1], true
}

func (s *Server) servePublicAsset(w http.ResponseWriter, r *http.Request, urlPath string) bool {
	if urlPath == "/" || strings.Contains(urlPath, "..") {
		return false
	}
	name := strings.TrimPrefix(path.Clean(urlPath), "/")
	switch {
	case strings.HasPrefix(name, "favicon"), strings.HasSuffix(name, ".png"), name == "robots.txt", strings.HasSuffix(name, ".html"):
		contentType := mime.TypeByExtension(path.Ext(name))
		if contentType == "" {
			contentType = "application/octet-stream"
		}
		return s.serveFile(w, r, "generated/public/"+name, contentType, cacheStatic(r.URL.Query().Has("v")))
	default:
		return false
	}
}

func (s *Server) serveFile(w http.ResponseWriter, r *http.Request, filename, contentType, cacheControl string) bool {
	body, err := frontend.FS.ReadFile(filename)
	if err != nil {
		return false
	}
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Cache-Control", cacheControl)
	w.Header().Set("ETag", fmt.Sprintf(`"asset-%s-%x"`, assetVersion, len(body)))
	if notModified(w, r) {
		return true
	}
	_, _ = w.Write(body)
	return true
}

func (s *Server) servePage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	info := extractLocaleFromPath(r.URL.Path)
	if info.NeedsRedirect {
		http.Redirect(w, r, s.cfg.PublicOrigin+buildLocalizedPath("en", info.PathWithoutLocale), http.StatusMovedPermanently)
		return
	}
	if redirectPath := localeRedirectPath(r.URL.Path); redirectPath != "" && redirectPath != r.URL.Path {
		http.Redirect(w, r, s.cfg.PublicOrigin+redirectPath, http.StatusMovedPermanently)
		return
	}
	if isEnglishOnlyLegalPage(info.PathWithoutLocale) && info.Locale != "en" {
		http.Redirect(w, r, s.cfg.PublicOrigin+buildLocalizedPath("en", info.PathWithoutLocale), http.StatusMovedPermanently)
		return
	}

	page := pageFilename(info.PathWithoutLocale)
	if page == "" {
		http.NotFound(w, r)
		return
	}
	body, err := frontend.FS.ReadFile(fmt.Sprintf("generated/pages/en/%s", page))
	if err != nil {
		http.NotFound(w, r)
		return
	}
	nonce, _ := r.Context().Value(nonceKey{}).(string)
	html := localizeHTML(string(body), info.Locale, info.PathWithoutLocale, s.cfg.PublicOrigin)
	html = strings.ReplaceAll(html, "{{CSP_NONCE}}", nonce)
	html = strings.ReplaceAll(html, "{{PUBLIC_ORIGIN}}", s.cfg.PublicOrigin)
	html = addAssetVersions(html)

	if isCacheablePage(info.PathWithoutLocale) {
		w.Header().Set("Cache-Control", "public, max-age=604800, stale-while-revalidate=604800")
		w.Header().Set("ETag", fmt.Sprintf(`"html-%s-%s-%s"`, assetVersion, info.Locale, page))
		if notModified(w, r) {
			return
		}
	} else {
		w.Header().Set("Cache-Control", "no-store")
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = w.Write([]byte(html))
}

func (s *Server) serveSitemap(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", "GET")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	type urlEntry struct {
		Loc        string `xml:"loc"`
		LastMod    string `xml:"lastmod"`
		ChangeFreq string `xml:"changefreq"`
		Priority   string `xml:"priority"`
	}
	type urlSet struct {
		XMLName xml.Name   `xml:"urlset"`
		Xmlns   string     `xml:"xmlns,attr"`
		URLs    []urlEntry `xml:"url"`
	}
	pages := []struct {
		path       string
		priority   string
		changeFreq string
	}{
		{"", "1.0", "weekly"},
		{"/about.html", "0.8", "monthly"},
	}
	now := time.Now().UTC().Format("2006-01-02")
	var entries []urlEntry
	for _, page := range pages {
		for _, locale := range supportedLocales {
			entries = append(entries, urlEntry{
				Loc:        fmt.Sprintf("%s/%s%s", s.cfg.PublicOrigin, locale, page.path),
				LastMod:    now,
				ChangeFreq: page.changeFreq,
				Priority:   page.priority,
			})
		}
	}
	body, err := xml.MarshalIndent(urlSet{Xmlns: "http://www.sitemaps.org/schemas/sitemap/0.9", URLs: entries}, "", "  ")
	if err != nil {
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	w.Header().Set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800")
	_, _ = w.Write([]byte(xml.Header))
	_, _ = w.Write(body)
}

func notModified(w http.ResponseWriter, r *http.Request) bool {
	if r.Header.Get("If-None-Match") == "" {
		return false
	}
	if r.Header.Get("If-None-Match") == w.Header().Get("ETag") {
		w.WriteHeader(http.StatusNotModified)
		return true
	}
	return false
}

func cacheStatic(immutable bool) string {
	if immutable {
		return "public, max-age=31536000, immutable"
	}
	return "public, max-age=3600"
}

func pageFilename(pathWithoutLocale string) string {
	switch pathWithoutLocale {
	case "/":
		return "index.html"
	case "/about.html":
		return "about.html"
	case "/create-memo.html":
		return "create-memo.html"
	case "/read-memo.html":
		return "read-memo.html"
	case "/tos.html":
		return "tos.html"
	case "/privacy.html":
		return "privacy.html"
	default:
		return ""
	}
}

func isCacheablePage(pathWithoutLocale string) bool {
	switch pathWithoutLocale {
	case "/", "/about.html", "/tos.html", "/privacy.html":
		return true
	default:
		return false
	}
}

func addAssetVersions(input string) string {
	replacements := []struct {
		old string
		new string
	}{
		{"/styles.css", "/styles.css?v=" + assetVersion},
		{"/js/common.js", "/js/common.js?v=" + assetVersion},
		{`src="/js/memo-crypto-config.js"`, `src="/js/memo-crypto-config.js?v=` + assetVersion + `"`},
		{`src="/js/create-memo.js"`, `src="/js/create-memo.js?v=` + assetVersion + `"`},
		{`src="/js/read-memo.js"`, `src="/js/read-memo.js?v=` + assetVersion + `"`},
		{"/favicon.ico", "/favicon.ico?v=" + assetVersion},
		{"/apple-touch-icon.png", "/apple-touch-icon.png?v=" + assetVersion},
		{"/android-chrome-192x192.png", "/android-chrome-192x192.png?v=" + assetVersion},
		{"/android-chrome-512x512.png", "/android-chrome-512x512.png?v=" + assetVersion},
	}
	out := input
	for _, replacement := range replacements {
		out = strings.ReplaceAll(out, replacement.old, replacement.new)
	}
	out = regexp.MustCompile(`/js/create-memo\.js\?locale=([A-Za-z0-9_-]+)`).ReplaceAllString(out, `/js/create-memo.js?locale=$1&v=`+assetVersion)
	out = regexp.MustCompile(`/js/read-memo\.js\?locale=([A-Za-z0-9_-]+)`).ReplaceAllString(out, `/js/read-memo.js?locale=$1&v=`+assetVersion)
	return out
}

var _ fs.FS = frontend.FS
