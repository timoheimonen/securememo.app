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
			db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
			if err != nil {
				t.Fatalf("open sqlite: %v", err)
			}
			defer db.Close()

			handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
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
			db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
			if err != nil {
				t.Fatalf("open sqlite: %v", err)
			}
			defer db.Close()

			handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
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
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
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

func TestCreateReturnsGenericStorageCapacityError(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{
		MaxBytes: 1_000_000,
		MaxMemos: 1,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()
	if err := db.CreateMemo(context.Background(), "existing", "ciphertext", time.Now().Add(time.Hour).Unix(), "delete", "owner"); err != nil {
		t.Fatalf("seed capacity: %v", err)
	}

	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
	body, err := json.Marshal(map[string]interface{}{
		"encryptedMessage":       validEncryptedMessageForHandlerTest(44),
		"expiryHours":            24,
		"deletionTokenHash":      strings.Repeat("A", 44),
		"ownerDeletionTokenHash": strings.Repeat("B", 44),
	})
	if err != nil {
		t.Fatalf("encode request: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/create-memo", strings.NewReader(string(body)))
	req.RemoteAddr = "203.0.113.90:12345"
	req.Header.Set("Origin", "https://securememo.app")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	handler.Create(rec, req)

	assertAPIError(t, rec, http.StatusInsufficientStorage, errorCodeStorageLimitReached)
	if rec.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", rec.Header().Get("Cache-Control"))
	}
	if rec.Header().Get("Retry-After") != "" {
		t.Fatalf("capacity response exposed Retry-After %q", rec.Header().Get("Retry-After"))
	}
}

func TestFilesystemReservePreservesReadAndAuthenticatedDelete(t *testing.T) {
	path := filepath.Join(t.TempDir(), "securememo.sqlite")
	ctx := context.Background()
	seed, err := store.OpenSQLite(path, store.StorageLimits{})
	if err != nil {
		t.Fatalf("open seed sqlite: %v", err)
	}
	memoID := strings.Repeat("A", 40)
	deletionToken := strings.Repeat("D", 32)
	if err := seed.CreateMemo(ctx, memoID, "ciphertext", time.Now().Add(time.Hour).Unix(), hashDeletionToken(deletionToken), "owner"); err != nil {
		t.Fatalf("seed memo: %v", err)
	}
	if err := seed.Close(); err != nil {
		t.Fatalf("close seed sqlite: %v", err)
	}

	db, err := store.OpenSQLite(path, store.StorageLimits{
		MaxBytes:         1_000_000,
		MaxMemos:         10,
		MinFreeDiskBytes: int64(^uint64(0) >> 1),
	})
	if err != nil {
		t.Fatalf("reopen sqlite at filesystem reserve: %v", err)
	}
	defer db.Close()
	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)

	readReq := httptest.NewRequest(http.MethodPost, "/api/read-memo?id="+memoID, strings.NewReader(`{}`))
	readReq.RemoteAddr = "203.0.113.91:12345"
	readReq.Header.Set("Origin", "https://securememo.app")
	readReq.Header.Set("Content-Type", "application/json")
	readRec := httptest.NewRecorder()
	handler.Read(readRec, readReq)
	if readRec.Code != http.StatusOK {
		t.Fatalf("read at filesystem reserve status = %d, want 200; body=%s", readRec.Code, readRec.Body.String())
	}

	deleteReq := httptest.NewRequest(http.MethodPost, "/api/confirm-delete", strings.NewReader(`{"memoId":"`+memoID+`","deletionToken":"`+deletionToken+`"}`))
	deleteReq.RemoteAddr = "203.0.113.91:12345"
	deleteReq.Header.Set("Origin", "https://securememo.app")
	deleteReq.Header.Set("Content-Type", "application/json")
	deleteRec := httptest.NewRecorder()
	handler.ConfirmDelete(deleteRec, deleteReq)
	if deleteRec.Code != http.StatusOK {
		t.Fatalf("delete at filesystem reserve status = %d, want 200; body=%s", deleteRec.Code, deleteRec.Body.String())
	}
	if _, err := db.ReadActiveMemo(ctx, memoID); !errors.Is(err, store.ErrNotFound) {
		t.Fatalf("memo after delete at reserve error = %v, want ErrNotFound", err)
	}
}

func TestRequestValidationUsesStableErrorCodes(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
	originalUniformDelay := uniformDelay
	delayCalls := 0
	uniformDelay = func() {
		delayCalls++
	}
	t.Cleanup(func() {
		uniformDelay = originalUniformDelay
	})
	tests := []struct {
		name           string
		method         string
		origin         string
		contentType    string
		body           string
		wantStatus     int
		wantErrorCode  string
		wantAllow      string
		wantDelayCalls int
	}{
		{
			name:          "method",
			method:        http.MethodGet,
			wantStatus:    http.StatusMethodNotAllowed,
			wantErrorCode: errorCodeMethodNotAllowed,
			wantAllow:     "POST",
		},
		{
			name:          "origin",
			method:        http.MethodPost,
			origin:        "https://example.invalid",
			wantStatus:    http.StatusForbidden,
			wantErrorCode: errorCodeForbidden,
		},
		{
			name:           "content type",
			method:         http.MethodPost,
			origin:         "https://securememo.app",
			body:           `{}`,
			wantStatus:     http.StatusBadRequest,
			wantErrorCode:  errorCodeContentType,
			wantDelayCalls: 1,
		},
		{
			name:           "invalid JSON",
			method:         http.MethodPost,
			origin:         "https://securememo.app",
			contentType:    "application/json",
			body:           `{`,
			wantStatus:     http.StatusBadRequest,
			wantErrorCode:  errorCodeInvalidJSON,
			wantDelayCalls: 1,
		},
		{
			name:           "request too large",
			method:         http.MethodPost,
			origin:         "https://securememo.app",
			contentType:    "application/json",
			body:           `{"encryptedMessage":"` + strings.Repeat("x", maxJSONBytes) + `"}`,
			wantStatus:     http.StatusRequestEntityTooLarge,
			wantErrorCode:  errorCodeRequestTooLarge,
			wantDelayCalls: 1,
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
			delayCallsBefore := delayCalls

			handler.Create(rec, req)

			assertAPIError(t, rec, tt.wantStatus, tt.wantErrorCode)
			if tt.wantAllow != "" && rec.Header().Get("Allow") != tt.wantAllow {
				t.Fatalf("Allow header = %q, want %q", rec.Header().Get("Allow"), tt.wantAllow)
			}
			if got := delayCalls - delayCallsBefore; got != tt.wantDelayCalls {
				t.Fatalf("uniform delay calls = %d, want %d", got, tt.wantDelayCalls)
			}
		})
	}

	delayCallsBefore := delayCalls
	optionsRec := httptest.NewRecorder()
	handler.Create(optionsRec, httptest.NewRequest(http.MethodOptions, "/api/create-memo", nil))
	if optionsRec.Code != http.StatusOK {
		t.Fatalf("OPTIONS status = %d, want %d", optionsRec.Code, http.StatusOK)
	}
	if optionsRec.Body.Len() != 0 {
		t.Fatalf("OPTIONS body = %q, want empty", optionsRec.Body.String())
	}
	if got := delayCalls - delayCallsBefore; got != 0 {
		t.Fatalf("OPTIONS uniform delay calls = %d, want 0", got)
	}
}

func TestRecordRateLimitsAppliesLaterWindow(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	handler := newHandlerForTest(t, config.Config{}, db)
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

func TestRecordRateLimitsReturnsLongestBlockingWindow(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()
	handler := newHandlerForTest(t, config.Config{}, db)
	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	req.RemoteAddr = "203.0.113.41:12345"
	rules := []rateLimitRule{
		{Name: "minute", Limit: 1, Window: time.Minute},
		{Name: "hour", Limit: 1, Window: time.Hour},
	}

	if result, err := handler.recordRateLimits(req, rateLimitReadKey, rules); err != nil || result.Limited {
		t.Fatalf("first record = %+v, %v; want allowed", result, err)
	}
	result, err := handler.recordRateLimits(req, rateLimitReadKey, rules)
	if err != nil {
		t.Fatalf("limited record: %v", err)
	}
	if !result.Limited || result.RetryAfter < 59*time.Minute {
		t.Fatalf("limited result = %+v, want longest blocking window", result)
	}
}

func TestTrustedCloudflareClientsUseSeparateRateLimitBuckets(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()
	handler := newHandlerForTest(t, config.Config{TrustedProxyLocal: true}, db)
	rules := []rateLimitRule{{Name: "test", Limit: 1, Window: time.Minute}}
	request := func(clientIP string) *http.Request {
		req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
		req.RemoteAddr = "127.0.0.1:12345"
		req.Header.Set("CF-Connecting-IP", clientIP)
		return req
	}

	clientA := request("203.0.113.10")
	if result, err := handler.recordRateLimits(clientA, rateLimitReadKey, rules); err != nil || result.Limited {
		t.Fatalf("client A first request = %+v, %v; want allowed", result, err)
	}
	if result, err := handler.recordRateLimits(clientA, rateLimitReadKey, rules); err != nil || !result.Limited {
		t.Fatalf("client A second request = %+v, %v; want limited", result, err)
	}
	if result, err := handler.recordRateLimits(request("198.51.100.20"), rateLimitReadKey, rules); err != nil || result.Limited {
		t.Fatalf("client B first request = %+v, %v; want separate allowed bucket", result, err)
	}
}

func TestRateLimitResponseUsesStableErrorCode(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
	originalUniformDelay := uniformDelay
	delayCalls := 0
	uniformDelay = func() {
		delayCalls++
	}
	t.Cleanup(func() {
		uniformDelay = originalUniformDelay
	})
	seedReq := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	seedReq.RemoteAddr = "203.0.113.40:12345"
	for i := 0; i < standardLimitMinute; i++ {
		result, err := handler.recordRateLimits(seedReq, rateLimitReadKey, standardRateLimitRules)
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
	if delayCalls != 0 {
		t.Fatalf("rate-limit response used uniform delay %d times, want 0", delayCalls)
	}
}

func TestCreateUsesStricterRateLimitRules(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()
	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
	seedReq := httptest.NewRequest(http.MethodPost, "/api/create-memo", nil)
	seedReq.RemoteAddr = "203.0.113.42:12345"
	for attempt := 0; attempt < createLimitMinute; attempt++ {
		result, err := handler.recordRateLimits(seedReq, rateLimitCreateKey, createRateLimitRules)
		if err != nil || result.Limited {
			t.Fatalf("seed create %d = %+v, %v; want allowed", attempt+1, result, err)
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/api/create-memo", strings.NewReader(`{`))
	req.RemoteAddr = seedReq.RemoteAddr
	req.Header.Set("Origin", "https://securememo.app")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.Create(rec, req)

	assertAPIError(t, rec, http.StatusTooManyRequests, errorCodeRateLimited)
}

func TestTrustedProxyModeFailsClosedWithoutCloudflareClientIP(t *testing.T) {
	handler := newHandlerForTest(t, config.Config{
		AllowedOrigins:    []string{"https://securememo.app"},
		TrustedProxyLocal: true,
	}, nil)
	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", strings.NewReader(`{}`))
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("Origin", "https://securememo.app")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Forwarded-For", "203.0.113.10")
	rec := httptest.NewRecorder()
	originalUniformDelay := uniformDelay
	delayCalls := 0
	uniformDelay = func() {
		delayCalls++
	}
	t.Cleanup(func() {
		uniformDelay = originalUniformDelay
	})

	handler.Read(rec, req)

	assertAPIError(t, rec, http.StatusForbidden, errorCodeForbidden)
	if delayCalls != 0 {
		t.Fatalf("proxy identity rejection used uniform delay %d times, want 0", delayCalls)
	}
}

func TestDeleteAndRevokeAreRateLimitedBeforeRequestParsing(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()
	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)

	tests := []struct {
		name   string
		target string
		action string
		handle func(http.ResponseWriter, *http.Request)
	}{
		{name: "delete", target: "/api/confirm-delete", action: rateLimitDeleteKey, handle: handler.ConfirmDelete},
		{name: "revoke", target: "/api/revoke-memo", action: rateLimitRevokeKey, handle: handler.Revoke},
	}

	for index, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			remoteAddr := fmt.Sprintf("203.0.113.%d:12345", index+50)
			seedReq := httptest.NewRequest(http.MethodPost, tt.target, nil)
			seedReq.RemoteAddr = remoteAddr
			for attempt := 0; attempt < standardLimitMinute; attempt++ {
				result, err := handler.recordRateLimits(seedReq, tt.action, standardRateLimitRules)
				if err != nil {
					t.Fatalf("seed rate limit %d: %v", attempt+1, err)
				}
				if result.Limited {
					t.Fatalf("seed request %d was unexpectedly limited", attempt+1)
				}
			}

			req := httptest.NewRequest(http.MethodPost, tt.target, strings.NewReader(`{`))
			req.RemoteAddr = remoteAddr
			req.Header.Set("Origin", "https://securememo.app")
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			tt.handle(rec, req)

			assertAPIError(t, rec, http.StatusTooManyRequests, errorCodeRateLimited)
			if rec.Header().Get("Retry-After") == "" {
				t.Fatal("rate-limit response is missing Retry-After")
			}
		})
	}
}

func TestRetryAfterSecondsRoundsUp(t *testing.T) {
	if got := retryAfterSeconds(time.Second + time.Millisecond); got != "2" {
		t.Fatalf("retryAfterSeconds() = %q, want 2", got)
	}
}

func TestRateLimitRulesMatchOperationCosts(t *testing.T) {
	tests := []struct {
		name       string
		rules      []rateLimitRule
		wantMinute int
		wantHour   int
	}{
		{name: "create", rules: createRateLimitRules, wantMinute: 5, wantHour: 30},
		{name: "standard", rules: standardRateLimitRules, wantMinute: 10, wantHour: 100},
		{name: "failure", rules: failureRateLimitRules, wantMinute: 5, wantHour: 20},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if len(tt.rules) != 2 {
				t.Fatalf("rule count = %d, want minute and hour rules", len(tt.rules))
			}
			if tt.rules[0].Window != time.Minute || tt.rules[0].Limit != tt.wantMinute {
				t.Fatalf("minute rule = %+v, want limit %d over one minute", tt.rules[0], tt.wantMinute)
			}
			if tt.rules[1].Window != time.Hour || tt.rules[1].Limit != tt.wantHour {
				t.Fatalf("hour rule = %+v, want limit %d over one hour", tt.rules[1], tt.wantHour)
			}
		})
	}

	if got := rateLimitRulesForAction(rateLimitCreateKey); got[0].Limit != createLimitMinute || got[1].Limit != createLimitHour {
		t.Fatalf("create action rules = %+v", got)
	}
	for _, action := range []string{rateLimitReadKey, rateLimitDeleteKey, rateLimitRevokeKey} {
		if got := rateLimitRulesForAction(action); got[0].Limit != standardLimitMinute || got[1].Limit != standardLimitHour {
			t.Fatalf("%s action rules = %+v", action, got)
		}
	}
}

func TestReadRejectsAmbiguousMemoIDQuery(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	memoID := strings.Repeat("A", 40)
	if err := db.CreateMemo(context.Background(), memoID, "ciphertext", time.Now().Add(time.Hour).Unix(), "hash", "owner-hash"); err != nil {
		t.Fatalf("create memo: %v", err)
	}
	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)

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
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
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

	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
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

	got, err := handler.clientIP(req)
	if err != nil {
		t.Fatalf("clientIP() error = %v", err)
	}
	if got != "127.0.0.1" {
		t.Fatalf("clientIP() = %q, want loopback remote address", got)
	}
}

func TestClientIPUsesForwardedHeadersWhenExplicitlyTrusted(t *testing.T) {
	handler := Handler{Config: config.Config{TrustedProxyLocal: true}}
	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("CF-Connecting-IP", "203.0.113.10")
	req.Header.Set("X-Forwarded-For", "198.51.100.20")

	got, err := handler.clientIP(req)
	if err != nil {
		t.Fatalf("clientIP() error = %v", err)
	}
	if got != "203.0.113.10" {
		t.Fatalf("clientIP() = %q, want CF-Connecting-IP", got)
	}
}

func TestClientIPRejectsUntrustedCloudflareHeaderFallbacks(t *testing.T) {
	handler := Handler{Config: config.Config{TrustedProxyLocal: true}}
	tests := []struct {
		name    string
		headers http.Header
	}{
		{
			name:    "missing Cloudflare header",
			headers: http.Header{"X-Forwarded-For": {"198.51.100.20"}},
		},
		{
			name:    "invalid Cloudflare header",
			headers: http.Header{"Cf-Connecting-Ip": {"not-an-ip"}},
		},
		{
			name:    "duplicate Cloudflare header",
			headers: http.Header{"Cf-Connecting-Ip": {"203.0.113.10", "203.0.113.11"}},
		},
		{
			name:    "comma-separated Cloudflare header",
			headers: http.Header{"Cf-Connecting-Ip": {"203.0.113.10, 203.0.113.11"}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
			req.RemoteAddr = "127.0.0.1:12345"
			req.Header = tt.headers
			if got, err := handler.clientIP(req); !errors.Is(err, errInvalidCloudflareClientIP) {
				t.Fatalf("clientIP() = %q, %v; want invalid Cloudflare client IP", got, err)
			}
		})
	}
}

func TestClientIPIgnoresCloudflareHeadersFromNonLocalPeer(t *testing.T) {
	handler := Handler{Config: config.Config{TrustedProxyLocal: true}}
	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	req.RemoteAddr = "198.51.100.20:12345"
	req.Header.Set("CF-Connecting-IP", "203.0.113.10")

	got, err := handler.clientIP(req)
	if err != nil {
		t.Fatalf("clientIP() error = %v", err)
	}
	if got != "198.51.100.20" {
		t.Fatalf("clientIP() = %q, want socket peer", got)
	}
}

func TestClientIPNormalizesIPv4AndIPv6Networks(t *testing.T) {
	handler := Handler{Config: config.Config{TrustedProxyLocal: true}}
	tests := []struct {
		name         string
		connectingIP string
		connectingV6 string
		wantIdentity string
	}{
		{
			name:         "IPv4-mapped IPv6",
			connectingIP: "::ffff:203.0.113.10",
			wantIdentity: "203.0.113.10",
		},
		{
			name:         "IPv6 prefix",
			connectingIP: "2001:db8:abcd:12::1234",
			wantIdentity: "2001:db8:abcd:12::/64",
		},
		{
			name:         "Cloudflare pseudo IPv4",
			connectingIP: "240.1.2.3",
			connectingV6: "2001:db8:feed:beef::1234",
			wantIdentity: "2001:db8:feed:beef::/64",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
			req.RemoteAddr = "127.0.0.1:12345"
			req.Header.Set("CF-Connecting-IP", tt.connectingIP)
			if tt.connectingV6 != "" {
				req.Header.Set("CF-Connecting-IPv6", tt.connectingV6)
			}

			got, err := handler.clientIP(req)
			if err != nil {
				t.Fatalf("clientIP() error = %v", err)
			}
			if got != tt.wantIdentity {
				t.Fatalf("clientIP() = %q, want %q", got, tt.wantIdentity)
			}
		})
	}
}

func TestClientIPRejectsPseudoIPv4WithoutOriginalIPv6(t *testing.T) {
	handler := Handler{Config: config.Config{TrustedProxyLocal: true}}
	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	req.RemoteAddr = "127.0.0.1:12345"
	req.Header.Set("CF-Connecting-IP", "240.1.2.3")

	if _, err := handler.clientIP(req); !errors.Is(err, errInvalidCloudflareClientIP) {
		t.Fatalf("clientIP() error = %v, want invalid Cloudflare client IP", err)
	}
}

func TestRevokeDeletesMemoWithValidOwnerToken(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	memoID := strings.Repeat("A", 40)
	ownerToken := strings.Repeat("B", 43)
	if err := db.CreateMemo(context.Background(), memoID, "ciphertext", time.Now().Add(time.Hour).Unix(), "deletion-hash", hashDeletionToken(ownerToken)); err != nil {
		t.Fatalf("create memo: %v", err)
	}
	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)

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
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
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
	handler := newHandlerForTest(t, config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)

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
				errorCodeStorageLimitReached,
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
	for name, want := range map[string]string{
		"Content-Type":           "application/json",
		"Cache-Control":          "no-store",
		"X-Content-Type-Options": "nosniff",
		"X-Frame-Options":        "DENY",
	} {
		if got := rec.Header().Get(name); got != want {
			t.Fatalf("%s header = %q, want %q", name, got, want)
		}
	}
}

func validEncryptedMessageForHandlerTest(envelopeBytes int) string {
	return "v1:" + base64.StdEncoding.EncodeToString(make([]byte, envelopeBytes))
}

func newHandlerForTest(t *testing.T, cfg config.Config, db *store.SQLiteStore) Handler {
	t.Helper()
	handler, err := NewHandler(cfg, db)
	if err != nil {
		t.Fatalf("NewHandler: %v", err)
	}
	return handler
}
