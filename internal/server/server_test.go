package server

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/frontend"
	"github.com/timoheimonen/securememo/internal/store"
)

func TestCleanupEndpointIsNotPubliclyRouted(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	app := New(config.Config{
		PublicOrigin:   "https://securememo.app",
		AllowedOrigins: []string{"https://securememo.app"},
	}, db)

	req := httptest.NewRequest(http.MethodPost, "/api/cleanup", nil)
	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST /api/cleanup status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
}

func TestRenderedSEOHeadUsesLocalizedMetadata(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/fi", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /fi status = %d, want %d", rec.Code, http.StatusOK)
	}
	body := rec.Body.String()
	if !strings.Contains(body, `<title>securememo.app - Salatut muistiot automaattisella poistolla</title>`) {
		t.Fatal("localized title missing from rendered /fi page")
	}
	if strings.Contains(body, "Encrypted Memos with Automaattinen") {
		t.Fatal("rendered /fi page contains mixed-language SEO title")
	}
	if !strings.Contains(body, `<link rel="canonical" href="https://securememo.app/fi">`) {
		t.Fatal("localized canonical missing from rendered /fi page")
	}
	if !strings.Contains(body, `<meta property="og:url" content="https://securememo.app/fi">`) {
		t.Fatal("localized og:url missing from rendered /fi page")
	}
	if !strings.Contains(body, `"url": "https://securememo.app/fi"`) {
		t.Fatal("localized JSON-LD url missing from rendered /fi page")
	}
	if !strings.Contains(body, `hreflang="fi" href="https://securememo.app/fi"`) {
		t.Fatal("fi hreflang missing from rendered /fi page")
	}
	if !strings.Contains(body, `hreflang="x-default" href="https://securememo.app/en"`) {
		t.Fatal("x-default hreflang missing from rendered /fi page")
	}
}

func TestNoIndexPagesAreMarkedButCrawlable(t *testing.T) {
	app := newTestServer(t)
	for _, path := range []string{"/en/create-memo.html", "/en/read-memo.html", "/en/tos.html", "/en/privacy.html"} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, path, nil)

		app.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("GET %s status = %d, want %d", path, rec.Code, http.StatusOK)
		}
		if !strings.Contains(rec.Body.String(), `<meta name="robots" content="noindex,follow">`) {
			t.Fatalf("GET %s missing noindex robots meta", path)
		}
	}
}

func TestSitemapOnlyIncludesIndexablePages(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/sitemap.xml", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /sitemap.xml status = %d, want %d", rec.Code, http.StatusOK)
	}
	body := rec.Body.String()
	for _, path := range []string{"/create-memo.html", "/read-memo.html", "/tos.html", "/privacy.html"} {
		if strings.Contains(body, path) {
			t.Fatalf("sitemap includes noindex page %s", path)
		}
	}
	for _, path := range []string{"https://securememo.app/en", "https://securememo.app/en/about.html"} {
		if !strings.Contains(body, path) {
			t.Fatalf("sitemap missing indexable page %s", path)
		}
	}
}

func TestRobotsAllowsNoIndexPagesToBeCrawled(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/robots.txt", nil)

	app.ServeHTTP(rec, req)

	body, _ := io.ReadAll(rec.Result().Body)
	text := string(body)
	if strings.Contains(text, "Disallow: /tos") || strings.Contains(text, "Disallow: /privacy") {
		t.Fatal("robots.txt blocks pages that need to expose noindex meta")
	}
}

func TestLegalPagesAreOnlyServedInEnglish(t *testing.T) {
	app := newTestServer(t)
	for _, tc := range []struct {
		path     string
		location string
	}{
		{"/fi/tos.html", "https://securememo.app/en/tos.html"},
		{"/fi/privacy.html", "https://securememo.app/en/privacy.html"},
		{"/zh/tos.html", "https://securememo.app/en/tos.html"},
		{"/zh/privacy.html", "https://securememo.app/en/privacy.html"},
	} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, tc.path, nil)

		app.ServeHTTP(rec, req)

		if rec.Code != http.StatusMovedPermanently {
			t.Fatalf("GET %s status = %d, want %d", tc.path, rec.Code, http.StatusMovedPermanently)
		}
		if got := rec.Header().Get("Location"); got != tc.location {
			t.Fatalf("GET %s Location = %q, want %q", tc.path, got, tc.location)
		}
	}
}

func TestLocalizedPagesLinkToEnglishLegalPages(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/fi", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /fi status = %d, want %d", rec.Code, http.StatusOK)
	}
	body := rec.Body.String()
	for _, href := range []string{`href="/en/tos.html"`, `href="/en/privacy.html"`} {
		if !strings.Contains(body, href) {
			t.Fatalf("localized page missing English legal link %s", href)
		}
	}
	for _, href := range []string{`href="/fi/tos.html"`, `href="/fi/privacy.html"`} {
		if strings.Contains(body, href) {
			t.Fatalf("localized page contains localized legal link %s", href)
		}
	}
}

func TestLegalPagesHaveOnlyEnglishLanguageMenu(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/en/tos.html", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /en/tos.html status = %d, want %d", rec.Code, http.StatusOK)
	}
	body := rec.Body.String()
	if !strings.Contains(body, `href="/en/tos.html" class="language-item active"`) {
		t.Fatal("English legal page missing active English language item")
	}
	if strings.Contains(body, `href="/fi/tos.html"`) || strings.Contains(body, `href="/zh/tos.html"`) {
		t.Fatal("English legal page contains localized legal language links")
	}
}

func TestLegalDocumentTextIsNotInLocalizationBundles(t *testing.T) {
	for _, locale := range supportedLocales {
		filename := fmt.Sprintf("generated/js/clientLocalization.%s.js", locale)
		body, err := frontend.FS.ReadFile(filename)
		if err != nil {
			t.Fatalf("read %s: %v", filename, err)
		}
		raw := extractTranslationJSON(string(body))
		if raw == "" {
			t.Fatalf("extract translations from %s", filename)
		}
		var catalog map[string]map[string]string
		if err := json.Unmarshal([]byte(raw), &catalog); err != nil {
			t.Fatalf("parse %s: %v", filename, err)
		}
		for catalogLocale, messages := range catalog {
			for key := range messages {
				if isLegalTranslationKey(key) {
					t.Fatalf("%s catalog %s contains legal translation key %q", filename, catalogLocale, key)
				}
			}
		}
	}
}

func isLegalTranslationKey(key string) bool {
	for _, prefix := range []string{"tos.", "privacy.", "page.tos.", "page.privacy.", "schema.tos.", "schema.privacy."} {
		if strings.HasPrefix(key, prefix) {
			return true
		}
	}
	return false
}

func TestMemoCryptoWorkerAssetIsServed(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/js/memo-crypto-worker.js?v=test", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /js/memo-crypto-worker.js status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/javascript; charset=utf-8" {
		t.Fatalf("content type = %q, want application/javascript; charset=utf-8", got)
	}
	if !strings.Contains(rec.Body.String(), "encryptMemo") {
		t.Fatal("worker asset does not contain expected crypto handler")
	}
}

func TestMemoCryptoConfigAssetIsServed(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/js/memo-crypto-config.js?v=test", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /js/memo-crypto-config.js status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/javascript; charset=utf-8" {
		t.Fatalf("content type = %q, want application/javascript; charset=utf-8", got)
	}
	if !strings.Contains(rec.Body.String(), "MemoCryptoConfig") {
		t.Fatal("crypto config asset does not contain expected global config")
	}
}

func TestEnglishLocalizationBundleAssetIsServed(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/js/clientLocalization.en.js", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /js/clientLocalization.en.js status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/javascript; charset=utf-8" {
		t.Fatalf("content type = %q, want application/javascript; charset=utf-8", got)
	}
	if !strings.Contains(rec.Body.String(), `"nav.home": "Home"`) {
		t.Fatal("English localization bundle does not contain expected translations")
	}
}

func TestLocalizationBundlesDoNotVaryOnReferer(t *testing.T) {
	app := newTestServer(t)
	memoID := strings.Repeat("A", 40)
	for _, tc := range []struct {
		name         string
		path         string
		cacheControl string
		bodyContains string
	}{
		{
			name:         "localized versioned asset",
			path:         "/js/clientLocalization.fi.js?v=" + assetVersion,
			cacheControl: "public, max-age=31536000, immutable",
			bodyContains: "export const locale = 'fi';",
		},
		{
			name:         "legacy fallback",
			path:         "/js/clientLocalization.js",
			cacheControl: "public, max-age=3600",
			bodyContains: "export const locale = 'en';",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			req.Header.Set("Referer", "https://securememo.app/en/read-memo.html?id="+memoID)

			app.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("GET %s status = %d, want %d", tc.path, rec.Code, http.StatusOK)
			}
			if got := rec.Header().Get("Vary"); strings.Contains(got, "Referer") {
				t.Fatalf("Vary = %q, must not include Referer", got)
			}
			if got := rec.Header().Get("Cache-Control"); got != tc.cacheControl {
				t.Fatalf("Cache-Control = %q, want %q", got, tc.cacheControl)
			}
			if !strings.Contains(rec.Body.String(), tc.bodyContains) {
				t.Fatalf("GET %s missing expected locale marker", tc.path)
			}
		})
	}
}

func TestCommonScriptImportsExplicitLocalizationBundle(t *testing.T) {
	body, err := frontend.FS.ReadFile("generated/js/common.js")
	if err != nil {
		t.Fatalf("read common.js: %v", err)
	}
	source := string(body)
	if strings.Contains(source, "versionedAssetPath('/js/clientLocalization.js')") {
		t.Fatal("common.js still imports Referer-selected localization bundle")
	}
	if !strings.Contains(source, "versionedAssetPath('/js/clientLocalization.' + locale + '.js')") {
		t.Fatal("common.js does not import the explicit locale localization bundle")
	}
}

func TestMemoScriptsAreVersioned(t *testing.T) {
	app := newTestServer(t)
	for _, tc := range []struct {
		path    string
		scripts []string
	}{
		{
			path: "/en/create-memo.html",
			scripts: []string{
				`/js/memo-crypto-config.js?v=` + assetVersion,
				`/js/create-memo.js?v=` + assetVersion,
			},
		},
		{
			path: "/en/read-memo.html",
			scripts: []string{
				`/js/memo-crypto-config.js?v=` + assetVersion,
				`/js/read-memo.js?v=` + assetVersion,
			},
		},
	} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, tc.path, nil)

		app.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("GET %s status = %d, want %d", tc.path, rec.Code, http.StatusOK)
		}
		previousIndex := -1
		body := rec.Body.String()
		for _, script := range tc.scripts {
			index := strings.Index(body, script)
			if index == -1 {
				t.Fatalf("GET %s missing versioned script %s", tc.path, script)
			}
			if index < previousIndex {
				t.Fatalf("GET %s has script %s before an earlier dependency", tc.path, script)
			}
			previousIndex = index
		}
	}
}

func TestLanguageMenuUsesRootRelativeLocaleLinks(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/en", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /en status = %d, want %d", rec.Code, http.StatusOK)
	}
	body := rec.Body.String()
	if !strings.Contains(body, `href="/da" class="language-item `) {
		t.Fatal("language menu missing root-relative /da link")
	}
	if strings.Contains(body, `href="da"`) || strings.Contains(body, `href="/en/da"`) {
		t.Fatal("language menu contains relative or nested Danish locale link")
	}
}

func newTestServer(t *testing.T) *Server {
	t.Helper()
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		_ = db.Close()
	})
	return New(config.Config{
		PublicOrigin:   "https://securememo.app",
		AllowedOrigins: []string{"https://securememo.app"},
	}, db)
}
