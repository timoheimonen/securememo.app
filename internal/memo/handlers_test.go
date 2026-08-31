package memo

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"time"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/frontend"
	"github.com/timoheimonen/securememo/internal/store"
)

func TestCreateValidatesExpiryHours(t *testing.T) {
	tests := []struct {
		name          string
		expiryHours   int
		wantStatus    int
		wantErrorCode string
	}{
		{name: "supported", expiryHours: 336, wantStatus: http.StatusOK},
		{name: "unsupported", expiryHours: 999, wantStatus: http.StatusBadRequest, wantErrorCode: errorCodeInvalidExpiryTime},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
			if err != nil {
				t.Fatalf("open sqlite: %v", err)
			}
			defer db.Close()

			handler := Handler{
				Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
				Store:  db,
			}
			body := fmt.Sprintf(
				`{"encryptedMessage":"%s","expiryHours":%d,"deletionTokenHash":"%s","ownerDeletionTokenHash":"%s"}`,
				validEncryptedMessageForHandlerTest(44),
				tt.expiryHours,
				strings.Repeat("A", 44),
				strings.Repeat("B", 44),
			)
			req := httptest.NewRequest(http.MethodPost, "/api/create-memo", strings.NewReader(body))
			req.RemoteAddr = "203.0.113.10:12345"
			req.Header.Set("Origin", "https://securememo.app")
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			handler.Create(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("create status = %d, want %d; body=%s", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if tt.wantErrorCode != "" {
				assertAPIError(t, rec, tt.wantStatus, tt.wantErrorCode)
			}
		})
	}
}

func TestCreateRejectsInvalidEncryptedMessageFormat(t *testing.T) {
	valid := validEncryptedMessageForHandlerTest(44)
	tests := []struct {
		name             string
		encryptedMessage string
	}{
		{name: "empty"},
		{name: "unversioned", encryptedMessage: strings.TrimPrefix(valid, "v1:")},
		{name: "future version", encryptedMessage: "v2:" + strings.TrimPrefix(valid, "v1:")},
		{name: "malformed base64", encryptedMessage: "v1:not-base64!"},
		{name: "whitespace in base64", encryptedMessage: valid[:12] + "\n" + valid[12:]},
		{name: "short envelope", encryptedMessage: validEncryptedMessageForHandlerTest(43)},
		{name: "over byte limit", encryptedMessage: validEncryptedMessageForHandlerTest(30_748)},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
			if err != nil {
				t.Fatalf("open sqlite: %v", err)
			}
			defer db.Close()

			handler := Handler{
				Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
				Store:  db,
			}
			body, err := json.Marshal(map[string]interface{}{
				"encryptedMessage":       tt.encryptedMessage,
				"expiryHours":            24,
				"deletionTokenHash":      strings.Repeat("A", 44),
				"ownerDeletionTokenHash": strings.Repeat("B", 44),
			})
			if err != nil {
				t.Fatalf("encode request: %v", err)
			}
			req := httptest.NewRequest(http.MethodPost, "/api/create-memo", strings.NewReader(string(body)))
			req.RemoteAddr = "203.0.113.11:12345"
			req.Header.Set("Origin", "https://securememo.app")
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			handler.Create(rec, req)

			assertAPIError(t, rec, http.StatusBadRequest, errorCodeInvalidMessageFormat)
		})
	}
}

func TestCreateStoresEncryptedMessageUnchanged(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	handler := Handler{
		Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
		Store:  db,
	}
	encryptedMessage := "v1:" + base64.StdEncoding.EncodeToString([]byte{
		0xfb, 0xff, 0xef, 0xfb, 0xff, 0xef, 0xfb, 0xff, 0xef, 0xfb, 0xff,
		0xef, 0xfb, 0xff, 0xef, 0xfb, 0xff, 0xef, 0xfb, 0xff, 0xef, 0xfb,
		0xff, 0xef, 0xfb, 0xff, 0xef, 0xfb, 0xff, 0xef, 0xfb, 0xff, 0xef,
		0xfb, 0xff, 0xef, 0xfb, 0xff, 0xef, 0xfb, 0xff, 0xef, 0xfb, 0xff,
	})
	body, err := json.Marshal(map[string]interface{}{
		"encryptedMessage":       encryptedMessage,
		"expiryHours":            24,
		"deletionTokenHash":      strings.Repeat("A", 44),
		"ownerDeletionTokenHash": strings.Repeat("B", 44),
	})
	if err != nil {
		t.Fatalf("encode request: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/create-memo", strings.NewReader(string(body)))
	req.RemoteAddr = "203.0.113.12:12345"
	req.Header.Set("Origin", "https://securememo.app")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.Create(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("create status = %d, want %d; body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}
	var result struct {
		MemoID string `json:"memoId"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	row, err := db.ReadActiveMemo(context.Background(), result.MemoID)
	if err != nil {
		t.Fatalf("read created memo: %v", err)
	}
	if row.EncryptedMessage != encryptedMessage {
		t.Fatalf("stored encrypted message = %q, want original %q", row.EncryptedMessage, encryptedMessage)
	}
}

func TestRequestValidationUsesStableErrorCodes(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	handler := Handler{
		Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
		Store:  db,
	}
	tests := []struct {
		name          string
		method        string
		origin        string
		contentType   string
		body          string
		wantStatus    int
		wantErrorCode string
	}{
		{
			name:          "method",
			method:        http.MethodGet,
			wantStatus:    http.StatusMethodNotAllowed,
			wantErrorCode: errorCodeMethodNotAllowed,
		},
		{
			name:          "origin",
			method:        http.MethodPost,
			origin:        "https://example.invalid",
			wantStatus:    http.StatusForbidden,
			wantErrorCode: errorCodeForbidden,
		},
		{
			name:          "content type",
			method:        http.MethodPost,
			origin:        "https://securememo.app",
			body:          `{}`,
			wantStatus:    http.StatusBadRequest,
			wantErrorCode: errorCodeContentType,
		},
		{
			name:          "invalid JSON",
			method:        http.MethodPost,
			origin:        "https://securememo.app",
			contentType:   "application/json",
			body:          `{`,
			wantStatus:    http.StatusBadRequest,
			wantErrorCode: errorCodeInvalidJSON,
		},
		{
			name:          "request too large",
			method:        http.MethodPost,
			origin:        "https://securememo.app",
			contentType:   "application/json",
			body:          `{"encryptedMessage":"` + strings.Repeat("x", maxJSONBytes) + `"}`,
			wantStatus:    http.StatusRequestEntityTooLarge,
			wantErrorCode: errorCodeRequestTooLarge,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/api/create-memo", strings.NewReader(tt.body))
			req.RemoteAddr = "203.0.113.20:12345"
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			if tt.contentType != "" {
				req.Header.Set("Content-Type", tt.contentType)
			}
			rec := httptest.NewRecorder()

			handler.Create(rec, req)

			assertAPIError(t, rec, tt.wantStatus, tt.wantErrorCode)
		})
	}
}

func TestRecordRateLimitsAppliesLaterWindow(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	handler := Handler{Store: db}
	req := httptest.NewRequest("POST", "/api/read-memo", nil)
	req.RemoteAddr = "203.0.113.10:12345"

	rules := []rateLimitRule{
		{Name: "minute", Limit: 100, Window: time.Minute},
		{Name: "hour", Limit: 3, Window: time.Hour},
	}

	for i := 0; i < 3; i++ {
		result, err := handler.recordRateLimits(req, rateLimitReadKey, rules)
		if err != nil {
			t.Fatalf("record allowed event %d: %v", i+1, err)
		}
		if result.Limited {
			t.Fatalf("event %d was unexpectedly limited", i+1)
		}
	}

	result, err := handler.recordRateLimits(req, rateLimitReadKey, rules)
	if err != nil {
		t.Fatalf("record limited event: %v", err)
	}
	if !result.Limited {
		t.Fatal("expected hourly rule to limit the fourth event")
	}
	if result.RetryAfter <= 0 {
		t.Fatalf("expected positive retry-after, got %s", result.RetryAfter)
	}
}

func TestRateLimitResponseUsesStableErrorCode(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	handler := Handler{
		Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
		Store:  db,
	}
	seedReq := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	seedReq.RemoteAddr = "203.0.113.40:12345"
	for i := 0; i < rateLimitMinute; i++ {
		result, err := handler.recordRateLimits(seedReq, rateLimitReadKey, defaultRateLimitRules)
		if err != nil {
			t.Fatalf("seed rate limit event %d: %v", i+1, err)
		}
		if result.Limited {
			t.Fatalf("seed rate limit event %d was unexpectedly limited", i+1)
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	req.RemoteAddr = seedReq.RemoteAddr
	req.Header.Set("Origin", "https://securememo.app")
	rec := httptest.NewRecorder()

	handler.Read(rec, req)

	assertAPIError(t, rec, http.StatusTooManyRequests, errorCodeRateLimited)
	if rec.Header().Get("Retry-After") == "" {
		t.Fatal("rate-limit response is missing Retry-After")
	}
}

func TestFailureRateLimitRulesAreStricterThanDefault(t *testing.T) {
	if len(defaultRateLimitRules) != 2 || len(failureRateLimitRules) != 2 {
		t.Fatal("expected minute and hour rules for default and failure limits")
	}
	if defaultRateLimitRules[1].Window != time.Hour {
		t.Fatalf("expected default hourly rule, got %s", defaultRateLimitRules[1].Window)
	}
	if failureRateLimitRules[1].Window != time.Hour {
		t.Fatalf("expected failure hourly rule, got %s", failureRateLimitRules[1].Window)
	}
	if failureRateLimitRules[1].Limit >= defaultRateLimitRules[1].Limit {
		t.Fatalf("failure hourly limit should be stricter than default hourly limit")
	}
}

func TestReadRejectsAmbiguousMemoIDQuery(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	memoID := strings.Repeat("A", 40)
	if err := db.CreateMemo(context.Background(), memoID, "ciphertext", time.Now().Add(time.Hour).Unix(), "hash", "owner-hash"); err != nil {
		t.Fatalf("create memo: %v", err)
	}
	handler := Handler{
		Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
		Store:  db,
	}

	goodReq := httptest.NewRequest(http.MethodPost, "/api/read-memo?id="+memoID, strings.NewReader(`{}`))
	goodReq.RemoteAddr = "203.0.113.10:12345"
	goodReq.Header.Set("Origin", "https://securememo.app")
	goodReq.Header.Set("Content-Type", "application/json")
	goodRec := httptest.NewRecorder()
	handler.Read(goodRec, goodReq)
	if goodRec.Code != http.StatusOK {
		t.Fatalf("valid read status = %d, want %d", goodRec.Code, http.StatusOK)
	}

	ambiguousReq := httptest.NewRequest(http.MethodPost, "/api/read-memo?id="+memoID+"&x=y", strings.NewReader(`{}`))
	ambiguousReq.RemoteAddr = "203.0.113.10:12345"
	ambiguousReq.Header.Set("Origin", "https://securememo.app")
	ambiguousReq.Header.Set("Content-Type", "application/json")
	ambiguousRec := httptest.NewRecorder()
	handler.Read(ambiguousRec, ambiguousReq)
	if ambiguousRec.Code != http.StatusNotFound {
		t.Fatalf("ambiguous read status = %d, want %d", ambiguousRec.Code, http.StatusNotFound)
	}
	assertAPIError(t, ambiguousRec, http.StatusNotFound, errorCodeMemoAccessDenied)
}

func TestMemoAccessFailuresUseOneErrorCode(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	activeMemoID := strings.Repeat("A", 40)
	expiredMemoID := strings.Repeat("B", 40)
	deletionToken := strings.Repeat("D", 32)
	ownerToken := strings.Repeat("F", 43)
	if err := db.CreateMemo(context.Background(), activeMemoID, "ciphertext", time.Now().Add(time.Hour).Unix(), hashDeletionToken(deletionToken), hashDeletionToken(ownerToken)); err != nil {
		t.Fatalf("create active memo: %v", err)
	}
	if err := db.CreateMemo(context.Background(), expiredMemoID, "ciphertext", time.Now().Add(-time.Hour).Unix(), "deletion-hash", "owner-hash"); err != nil {
		t.Fatalf("create expired memo: %v", err)
	}

	handler := Handler{
		Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
		Store:  db,
	}
	tests := []struct {
		name   string
		target string
		body   string
		handle func(http.ResponseWriter, *http.Request)
	}{
		{
			name:   "missing memo",
			target: "/api/read-memo?id=" + strings.Repeat("C", 40),
			body:   `{}`,
			handle: handler.Read,
		},
		{
			name:   "expired memo",
			target: "/api/read-memo?id=" + expiredMemoID,
			body:   `{}`,
			handle: handler.Read,
		},
		{
			name:   "wrong read deletion token",
			target: "/api/confirm-delete",
			body:   `{"memoId":"` + activeMemoID + `","deletionToken":"` + strings.Repeat("E", 32) + `"}`,
			handle: handler.ConfirmDelete,
		},
		{
			name:   "wrong revoke token",
			target: "/api/revoke-memo",
			body:   `{"memoId":"` + activeMemoID + `","ownerDeleteToken":"` + strings.Repeat("G", 43) + `"}`,
			handle: handler.Revoke,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, tt.target, strings.NewReader(tt.body))
			req.RemoteAddr = "203.0.113.30:12345"
			req.Header.Set("Origin", "https://securememo.app")
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()

			tt.handle(rec, req)

			assertAPIError(t, rec, http.StatusNotFound, errorCodeMemoAccessDenied)
		})
	}
}

func TestClientIPIgnoresForwardedHeadersByDefault(t *testing.T) {
	handler := Handler{}
	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("CF-Connecting-IP", "203.0.113.10")
	req.Header.Set("X-Forwarded-For", "198.51.100.20")

	if got := handler.clientIP(req); got != "127.0.0.1" {
		t.Fatalf("clientIP() = %q, want loopback remote address", got)
	}
}

func TestClientIPUsesForwardedHeadersWhenExplicitlyTrusted(t *testing.T) {
	handler := Handler{Config: config.Config{TrustedProxyLocal: true}}
	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("CF-Connecting-IP", "203.0.113.10")
	req.Header.Set("X-Forwarded-For", "198.51.100.20")

	if got := handler.clientIP(req); got != "203.0.113.10" {
		t.Fatalf("clientIP() = %q, want CF-Connecting-IP", got)
	}
}

func TestRevokeDeletesMemoWithValidOwnerToken(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	memoID := strings.Repeat("A", 40)
	ownerToken := strings.Repeat("B", 43)
	if err := db.CreateMemo(context.Background(), memoID, "ciphertext", time.Now().Add(time.Hour).Unix(), "deletion-hash", hashDeletionToken(ownerToken)); err != nil {
		t.Fatalf("create memo: %v", err)
	}
	handler := Handler{
		Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
		Store:  db,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/revoke-memo", strings.NewReader(`{"memoId":"`+memoID+`","ownerDeleteToken":"`+ownerToken+`"}`))
	req.RemoteAddr = "203.0.113.10:12345"
	req.Header.Set("Origin", "https://securememo.app")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.Revoke(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("revoke status = %d, want %d; body=%s", rec.Code, http.StatusOK, rec.Body.String())
	}
	if _, err := db.ReadActiveMemo(context.Background(), memoID); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("memo still readable after revoke, err=%v", err)
	}
}

func TestRevokeRejectsWrongOwnerToken(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	memoID := strings.Repeat("A", 40)
	ownerToken := strings.Repeat("B", 43)
	wrongToken := strings.Repeat("C", 43)
	if err := db.CreateMemo(context.Background(), memoID, "ciphertext", time.Now().Add(time.Hour).Unix(), "deletion-hash", hashDeletionToken(ownerToken)); err != nil {
		t.Fatalf("create memo: %v", err)
	}
	handler := Handler{
		Config: config.Config{AllowedOrigins: []string{"https://securememo.app"}},
		Store:  db,
	}

	req := httptest.NewRequest(http.MethodPost, "/api/revoke-memo", strings.NewReader(`{"memoId":"`+memoID+`","ownerDeleteToken":"`+wrongToken+`"}`))
	req.RemoteAddr = "203.0.113.10:12345"
	req.Header.Set("Origin", "https://securememo.app")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.Revoke(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("revoke status = %d, want %d; body=%s", rec.Code, http.StatusNotFound, rec.Body.String())
	}
	assertAPIError(t, rec, http.StatusNotFound, errorCodeMemoAccessDenied)
	if _, err := db.ReadActiveMemo(context.Background(), memoID); err != nil {
		t.Fatalf("memo should remain readable after wrong revoke token: %v", err)
	}
}

func TestBrowserAPIErrorsUseExplicitTranslationKeys(t *testing.T) {
	tests := []struct {
		asset string
		codes []string
	}{
		{
			asset: "generated/js/create-memo.js",
			codes: []string{
				errorCodeInvalidMessageFormat,
				errorCodeInvalidExpiryTime,
				errorCodeInvalidDeletionTokenHash,
				errorCodeMemoIDGeneration,
				errorCodeDatabase,
				errorCodeContentType,
				errorCodeInvalidJSON,
				errorCodeRequestTooLarge,
				errorCodeMethodNotAllowed,
				errorCodeForbidden,
				errorCodeRateLimited,
				errorCodeGeneral,
			},
		},
		{
			asset: "generated/js/read-memo.js",
			codes: []string{
				errorCodeMemoAccessDenied,
				errorCodeDatabaseRead,
				errorCodeMemoDeletion,
				errorCodeContentType,
				errorCodeInvalidJSON,
				errorCodeRequestTooLarge,
				errorCodeMethodNotAllowed,
				errorCodeForbidden,
				errorCodeRateLimited,
				errorCodeGeneral,
			},
		},
		{
			asset: "generated/js/revoke-memo.js",
			codes: []string{
				errorCodeMemoAccessDenied,
				errorCodeDatabaseRead,
				errorCodeMemoDeletion,
				errorCodeContentType,
				errorCodeInvalidJSON,
				errorCodeRequestTooLarge,
				errorCodeMethodNotAllowed,
				errorCodeForbidden,
				errorCodeRateLimited,
				errorCodeGeneral,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.asset, func(t *testing.T) {
			body, err := frontend.FS.ReadFile(tt.asset)
			if err != nil {
				t.Fatalf("read browser asset: %v", err)
			}
			source := string(body)
			for _, code := range tt.codes {
				mapping := code + ": 'error." + code + "'"
				if !strings.Contains(source, mapping) {
					t.Errorf("browser asset does not explicitly map %s", code)
				}
			}
			if regexp.MustCompile(`\b(?:result|deleteResult)\.error\b`).MatchString(source) {
				t.Error("browser asset may access a raw server error property")
			}
			if !strings.Contains(source, "Object.prototype.hasOwnProperty.call(") {
				t.Error("browser asset does not guard API error-code lookup against prototype properties")
			}
		})
	}
}

func assertAPIError(t *testing.T, rec *httptest.ResponseRecorder, wantStatus int, wantErrorCode string) {
	t.Helper()
	if rec.Code != wantStatus {
		t.Fatalf("status = %d, want %d; body=%s", rec.Code, wantStatus, rec.Body.String())
	}
	var body map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode API error: %v; body=%s", err, rec.Body.String())
	}
	if len(body) != 1 {
		t.Fatalf("API error fields = %v, want only errorCode", body)
	}
	if _, ok := body["error"]; ok {
		t.Fatalf("API error exposed raw error text: %v", body)
	}
	if got, ok := body["errorCode"].(string); !ok || got != wantErrorCode {
		t.Fatalf("errorCode = %v, want %q", body["errorCode"], wantErrorCode)
	}
}

func validEncryptedMessageForHandlerTest(envelopeBytes int) string {
	return "v1:" + base64.StdEncoding.EncodeToString(make([]byte, envelopeBytes))
}
