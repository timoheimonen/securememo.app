package server

import (
	"io"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/timoheimonen/securememo/internal/config"
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
