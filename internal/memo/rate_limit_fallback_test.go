package memo

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/store"
)

func TestRateLimitFallbackUsesLongestBlockingWindow(t *testing.T) {
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	limiter := newRateLimitFallback(10)
	limiter.now = func() time.Time { return now }
	rules := []store.RateLimitRule{
		{Key: "minute", Limit: 1, Window: time.Minute},
		{Key: "hour", Limit: 1, Window: time.Hour},
	}

	if result, err := limiter.record(rules); err != nil || result.Limited {
		t.Fatalf("first record = %+v, %v; want allowed", result, err)
	}
	result, err := limiter.record(rules)
	if err != nil {
		t.Fatalf("limited record: %v", err)
	}
	if !result.Limited || result.RetryAfter != time.Hour {
		t.Fatalf("limited result = %+v, want one-hour retry", result)
	}
	if limiter.entries["minute"].count != 1 || limiter.entries["hour"].count != 1 {
		t.Fatalf("limited buckets grew: %+v", limiter.entries)
	}
}

func TestRateLimitFallbackRejectsInvalidRulesBeforeMutation(t *testing.T) {
	limiter := newRateLimitFallback(10)
	tests := []struct {
		name string
		rule store.RateLimitRule
	}{
		{name: "empty key", rule: store.RateLimitRule{Limit: 1, Window: time.Minute}},
		{name: "zero limit", rule: store.RateLimitRule{Key: "zero-limit", Window: time.Minute}},
		{name: "zero window", rule: store.RateLimitRule{Key: "zero-window", Limit: 1}},
		{name: "negative window", rule: store.RateLimitRule{Key: "negative-window", Limit: 1, Window: -time.Second}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := limiter.record([]store.RateLimitRule{
				{Key: "valid", Limit: 1, Window: time.Minute},
				tt.rule,
			}); err == nil {
				t.Fatal("invalid rules succeeded")
			}
			if len(limiter.entries) != 0 {
				t.Fatalf("invalid rules mutated %d entries", len(limiter.entries))
			}
		})
	}
}

func TestRateLimitFallbackIsConcurrentAndAtomic(t *testing.T) {
	const (
		limit   = 20
		workers = 64
	)
	limiter := newRateLimitFallback(10)
	rules := []store.RateLimitRule{
		{Key: "minute", Limit: limit, Window: time.Minute},
		{Key: "hour", Limit: limit, Window: time.Hour},
	}
	results := make(chan store.RateLimitResult, workers)
	errors := make(chan error, workers)
	var wait sync.WaitGroup
	for range workers {
		wait.Add(1)
		go func() {
			defer wait.Done()
			result, err := limiter.record(rules)
			results <- result
			errors <- err
		}()
	}
	wait.Wait()
	close(results)
	close(errors)

	for err := range errors {
		if err != nil {
			t.Fatalf("concurrent record: %v", err)
		}
	}
	allowed := 0
	for result := range results {
		if !result.Limited {
			allowed++
		}
	}
	if allowed != limit {
		t.Fatalf("allowed records = %d, want %d", allowed, limit)
	}
	if limiter.entries["minute"].count != limit || limiter.entries["hour"].count != limit {
		t.Fatalf("concurrent buckets = %+v", limiter.entries)
	}
}

func TestRateLimitFallbackCapacityFailsClosedAndRecovers(t *testing.T) {
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	limiter := newRateLimitFallback(1)
	limiter.now = func() time.Time { return now }

	if result, err := limiter.record([]store.RateLimitRule{{Key: "first", Limit: 10, Window: time.Minute}}); err != nil || result.Limited {
		t.Fatalf("first identity = %+v, %v; want allowed", result, err)
	}
	result, err := limiter.record([]store.RateLimitRule{{Key: "second", Limit: 10, Window: time.Minute}})
	if err != nil {
		t.Fatalf("capacity record: %v", err)
	}
	if !result.Limited || result.RetryAfter != time.Minute || len(limiter.entries) != 1 {
		t.Fatalf("capacity result = %+v, entries=%d", result, len(limiter.entries))
	}

	now = now.Add(time.Minute)
	result, err = limiter.record([]store.RateLimitRule{{Key: "second", Limit: 10, Window: time.Minute}})
	if err != nil || result.Limited {
		t.Fatalf("record after expiry = %+v, %v; want allowed", result, err)
	}
	if _, exists := limiter.entries["first"]; exists {
		t.Fatal("expired entry was not removed")
	}
}

func TestRateLimitFallbackCachesCapacityRetryWithoutRescanning(t *testing.T) {
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	limiter := newRateLimitFallback(1)
	limiter.now = func() time.Time { return now }
	first := []store.RateLimitRule{{Key: "first", Limit: 10, Window: time.Minute}}
	second := []store.RateLimitRule{{Key: "second", Limit: 10, Window: time.Minute}}

	if result, err := limiter.record(first); err != nil || result.Limited {
		t.Fatalf("first identity = %+v, %v; want allowed", result, err)
	}
	if result, err := limiter.record(second); err != nil || !result.Limited || result.RetryAfter != time.Minute {
		t.Fatalf("first capacity result = %+v, %v", result, err)
	}

	entry := limiter.entries["first"]
	entry.expiresAt = now.Add(2 * time.Hour)
	limiter.entries["first"] = entry
	now = now.Add(10 * time.Second)
	result, err := limiter.record(second)
	if err != nil {
		t.Fatalf("cached capacity record: %v", err)
	}
	if !result.Limited || result.RetryAfter != 50*time.Second {
		t.Fatalf("cached capacity result = %+v, want 50-second cached retry", result)
	}
}

func TestHandlerFallsBackToMemoryWhenRateLimitPersistenceIsUnavailable(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{
		MinFreeDiskBytes: int64(^uint64(0) >> 1),
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()
	handler := NewHandler(config.Config{AllowedOrigins: []string{"https://securememo.app"}}, db)
	memoID := strings.Repeat("A", 40)

	for attempt := 0; attempt < standardLimitMinute; attempt++ {
		req := httptest.NewRequest(http.MethodPost, "/api/read-memo?id="+memoID, strings.NewReader(`{}`))
		req.RemoteAddr = "203.0.113.70:12345"
		req.Header.Set("Origin", "https://securememo.app")
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		handler.Read(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("attempt %d status = %d, want 404; body=%s", attempt+1, rec.Code, rec.Body.String())
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/api/read-memo?id="+memoID, strings.NewReader(`{}`))
	req.RemoteAddr = "203.0.113.70:12345"
	req.Header.Set("Origin", "https://securememo.app")
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	handler.Read(rec, req)

	assertAPIError(t, rec, http.StatusTooManyRequests, errorCodeRateLimited)
	if rec.Header().Get("Retry-After") == "" {
		t.Fatal("fallback rate-limit response is missing Retry-After")
	}
}

func TestHandlerKeepsFallbackCountersWarmWhileSQLiteIsAvailable(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()
	handler := NewHandler(config.Config{}, db)
	req := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	req.RemoteAddr = "203.0.113.71:12345"

	for attempt := 0; attempt < 3; attempt++ {
		result, err := handler.recordRateLimits(req, rateLimitReadKey, standardRateLimitRules)
		if err != nil || result.Limited {
			t.Fatalf("record %d = %+v, %v; want allowed", attempt+1, result, err)
		}
	}
	handler.rateLimitFallback.mu.Lock()
	defer handler.rateLimitFallback.mu.Unlock()
	if len(handler.rateLimitFallback.entries) != len(standardRateLimitRules) {
		t.Fatalf("fallback entry count = %d, want %d", len(handler.rateLimitFallback.entries), len(standardRateLimitRules))
	}
	for key, entry := range handler.rateLimitFallback.entries {
		if entry.count != 3 {
			t.Fatalf("fallback entry %q count = %d, want 3", key, entry.count)
		}
	}
}
