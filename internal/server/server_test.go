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
	for _, path := range []string{"/en/read-memo.html", "/en/revoke-memo.html", "/en/tos.html", "/en/privacy.html"} {
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

func TestCreateMemoPageIsIndexableAndLocalized(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/fi/create-memo.html", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /fi/create-memo.html status = %d, want %d", rec.Code, http.StatusOK)
	}
	body := rec.Body.String()
	if strings.Contains(body, `<meta name="robots" content="noindex,follow">`) {
		t.Fatal("localized create page is marked noindex")
	}
	for _, want := range []string{
		`<link rel="canonical" href="https://securememo.app/fi/create-memo.html">`,
		`hreflang="fi" href="https://securememo.app/fi/create-memo.html"`,
		`hreflang="x-default" href="https://securememo.app/en/create-memo.html"`,
		`<h2 id="create-privacy-title">Mikä tekee siitä yksityisen</h2>`,
		`<h3>Salattu selaimessasi</h3>`,
	} {
		if !strings.Contains(body, want) {
			t.Fatalf("localized create page missing %q", want)
		}
	}
}

func TestAboutStructuredDataMatchesVisiblePageType(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/en/about.html", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /en/about.html status = %d, want %d", rec.Code, http.StatusOK)
	}
	body := rec.Body.String()
	if strings.Contains(body, `"@type": "FAQPage"`) {
		t.Fatal("about page contains FAQ structured data without a visible FAQ")
	}
	if !strings.Contains(body, `"@type": "AboutPage"`) {
		t.Fatal("about page missing AboutPage structured data")
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
	for _, path := range []string{"/read-memo.html", "/revoke-memo.html", "/tos.html", "/privacy.html"} {
		if strings.Contains(body, path) {
			t.Fatalf("sitemap includes noindex page %s", path)
		}
	}
	for _, entry := range []string{
		"<loc>https://securememo.app/en</loc>\n    <lastmod>2026-06-27</lastmod>",
		"<loc>https://securememo.app/en/about.html</loc>\n    <lastmod>2026-07-12</lastmod>",
		"<loc>https://securememo.app/en/create-memo.html</loc>\n    <lastmod>2026-07-12</lastmod>",
	} {
		if !strings.Contains(body, entry) {
			t.Fatalf("sitemap missing indexable entry %q", entry)
		}
	}
	if strings.Contains(body, "<changefreq>") || strings.Contains(body, "<priority>") {
		t.Fatal("sitemap includes ignored changefreq or priority hints")
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

func TestRevokePageIsLocalized(t *testing.T) {
	app := newTestServer(t)
	for _, tc := range []struct {
		path         string
		localizedH1  string
		canonicalURL string
	}{
		{"/fi/revoke-memo.html", "Peruuta suojattu muistio", "https://securememo.app/fi/revoke-memo.html"},
		{"/zh/revoke-memo.html", "撤销安全备忘录", "https://securememo.app/zh/revoke-memo.html"},
	} {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, tc.path, nil)

		app.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Fatalf("GET %s status = %d, want %d", tc.path, rec.Code, http.StatusOK)
		}
		body := rec.Body.String()
		if !strings.Contains(body, tc.localizedH1) {
			t.Fatalf("GET %s missing localized revoke heading %q", tc.path, tc.localizedH1)
		}
		if !strings.Contains(body, `<meta name="robots" content="noindex,follow">`) {
			t.Fatalf("GET %s missing noindex robots meta", tc.path)
		}
		if !strings.Contains(body, fmt.Sprintf(`<link rel="canonical" href="%s">`, tc.canonicalURL)) {
			t.Fatalf("GET %s missing localized canonical %q", tc.path, tc.canonicalURL)
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

func TestRevokeMemoScriptAssetIsServed(t *testing.T) {
	app := newTestServer(t)
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/js/revoke-memo.js?v=test", nil)

	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("GET /js/revoke-memo.js status = %d, want %d", rec.Code, http.StatusOK)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/javascript; charset=utf-8" {
		t.Fatalf("content type = %q, want application/javascript; charset=utf-8", got)
	}
	if !strings.Contains(rec.Body.String(), "/api/revoke-memo") {
		t.Fatal("revoke script asset does not contain expected API endpoint")
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
		{
			path: "/en/revoke-memo.html",
			scripts: []string{
				`/js/revoke-memo.js?v=` + assetVersion,
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

func TestSensitiveMemoFormsFailClosedBeforeJavaScript(t *testing.T) {
	app := newTestServer(t)
	tests := []struct {
		name          string
		page          string
		formID        string
		fieldsetID    string
		secretTagName string
		secretID      string
		statusID      string
	}{
		{
			name:          "create",
			page:          "create-memo.html",
			formID:        "memoForm",
			fieldsetID:    "memoFormControls",
			secretTagName: "textarea",
			secretID:      "message",
			statusID:      "memoFormStatus",
		},
		{
			name:          "read",
			page:          "read-memo.html",
			formID:        "decryptForm",
			fieldsetID:    "decryptFormControls",
			secretTagName: "input",
			secretID:      "password",
			statusID:      "decryptFormStatus",
		},
	}

	for _, locale := range supportedLocales {
		for _, tc := range tests {
			t.Run(locale+"/"+tc.name, func(t *testing.T) {
				rec := httptest.NewRecorder()
				req := httptest.NewRequest(http.MethodGet, "/"+locale+"/"+tc.page, nil)
				app.ServeHTTP(rec, req)

				if rec.Code != http.StatusOK {
					t.Fatalf("GET %s status = %d, want %d", req.URL.Path, rec.Code, http.StatusOK)
				}
				body := rec.Body.String()
				secretTag := htmlStartTagByID(t, body, tc.secretTagName, tc.secretID)
				if htmlStartTagHasAttribute(secretTag, "name") {
					t.Fatalf("GET %s secret control is natively serializable: %s", req.URL.Path, secretTag)
				}

				fieldsetTag := htmlStartTagByID(t, body, "fieldset", tc.fieldsetID)
				if !htmlStartTagHasAttribute(fieldsetTag, "disabled") {
					t.Fatalf("GET %s sensitive fieldset is not disabled: %s", req.URL.Path, fieldsetTag)
				}

				formTag := htmlStartTagByID(t, body, "form", tc.formID)
				if !strings.Contains(formTag, `aria-busy="true"`) {
					t.Fatalf("GET %s sensitive form is not initially busy: %s", req.URL.Path, formTag)
				}
				htmlStartTagByID(t, body, "p", tc.statusID)
			})
		}
	}
}

func TestSensitiveMemoScriptsAttachSubmitGuardsBeforeEnablingForms(t *testing.T) {
	tests := []struct {
		name            string
		asset           string
		attachStatement string
		enableStatement string
		forbidden       string
	}{
		{
			name:            "create",
			asset:           "generated/js/create-memo.js",
			attachStatement: "memoForm.addEventListener('submit', handleCreateSubmit);",
			enableStatement: "memoFormControls.disabled = false;",
		},
		{
			name:            "read",
			asset:           "generated/js/read-memo.js",
			attachStatement: "decryptForm.addEventListener('submit', handleDecryptSubmit);",
			enableStatement: "decryptFormControls.disabled = false;",
			forbidden:       "window.addEventListener('load'",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			body, err := frontend.FS.ReadFile(tc.asset)
			if err != nil {
				t.Fatalf("read %s: %v", tc.asset, err)
			}
			source := string(body)
			attachIndex := strings.Index(source, tc.attachStatement)
			if attachIndex == -1 {
				t.Fatalf("%s missing submit guard %q", tc.asset, tc.attachStatement)
			}
			enableIndex := strings.Index(source, tc.enableStatement)
			if enableIndex == -1 {
				t.Fatalf("%s missing form enablement %q", tc.asset, tc.enableStatement)
			}
			if attachIndex > enableIndex {
				t.Fatalf("%s enables the sensitive form before attaching its submit guard", tc.asset)
			}
			if tc.forbidden != "" && strings.Contains(source, tc.forbidden) {
				t.Fatalf("%s still delays its submit guard with %q", tc.asset, tc.forbidden)
			}
		})
	}
}

func htmlStartTagByID(t *testing.T, body, tagName, id string) string {
	t.Helper()
	needle := `id="` + id + `"`
	idIndex := strings.Index(body, needle)
	if idIndex == -1 {
		t.Fatalf("missing element %s#%s", tagName, id)
	}
	startIndex := strings.LastIndex(body[:idIndex], "<")
	endOffset := strings.Index(body[idIndex:], ">")
	if startIndex == -1 || endOffset == -1 {
		t.Fatalf("malformed start tag for %s#%s", tagName, id)
	}
	tag := body[startIndex : idIndex+endOffset+1]
	if !strings.HasPrefix(strings.ToLower(tag), "<"+strings.ToLower(tagName)) {
		t.Fatalf("element #%s is %s, want <%s>", id, tag, tagName)
	}
	return tag
}

func htmlStartTagHasAttribute(tag, attribute string) bool {
	attribute = strings.ToLower(attribute)
	for _, field := range strings.Fields(strings.Trim(tag, "<>")) {
		field = strings.ToLower(strings.TrimSuffix(field, "/"))
		if field == attribute || strings.HasPrefix(field, attribute+"=") {
			return true
		}
	}
	return false
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
