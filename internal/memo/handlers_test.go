package memo

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/store"
)

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
	if _, err := db.ReadActiveMemo(context.Background(), memoID); err != nil {
		t.Fatalf("memo should remain readable after wrong revoke token: %v", err)
	}
}
