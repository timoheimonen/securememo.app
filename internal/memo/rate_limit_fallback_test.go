package memo

import (
	"crypto/sha256"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/timoheimonen/securememo/internal/config"
)

func TestRateLimiterUsesLongestBlockingWindow(t *testing.T) {
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	limiter := newRateLimiter(10)
	limiter.now = func() time.Time { return now }
	rules := []rateLimitCounterRule{
		{Key: testRateLimitKey(1), Limit: 1, Window: time.Minute},
		{Key: testRateLimitKey(2), Limit: 1, Window: time.Hour},
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
	if limiter.entries[testRateLimitKey(1)].count != 1 || limiter.entries[testRateLimitKey(2)].count != 1 {
		t.Fatalf("limited buckets grew: %+v", limiter.entries)
	}
}

func TestRateLimiterRejectsInvalidRulesBeforeMutation(t *testing.T) {
	limiter := newRateLimiter(10)
	tests := []struct {
		name string
		rule rateLimitCounterRule
	}{
		{name: "empty key", rule: rateLimitCounterRule{Limit: 1, Window: time.Minute}},
		{name: "zero limit", rule: rateLimitCounterRule{Key: testRateLimitKey(2), Window: time.Minute}},
		{name: "zero window", rule: rateLimitCounterRule{Key: testRateLimitKey(3), Limit: 1}},
		{name: "negative window", rule: rateLimitCounterRule{Key: testRateLimitKey(4), Limit: 1, Window: -time.Second}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := limiter.record([]rateLimitCounterRule{
				{Key: testRateLimitKey(1), Limit: 1, Window: time.Minute},
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

func TestRateLimiterIsConcurrentAndAtomic(t *testing.T) {
	const (
		limit   = 20
		workers = 64
	)
	limiter := newRateLimiter(10)
	rules := []rateLimitCounterRule{
		{Key: testRateLimitKey(1), Limit: limit, Window: time.Minute},
		{Key: testRateLimitKey(2), Limit: limit, Window: time.Hour},
	}
	results := make(chan rateLimitResult, workers)
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
	if limiter.entries[testRateLimitKey(1)].count != limit || limiter.entries[testRateLimitKey(2)].count != limit {
		t.Fatalf("concurrent buckets = %+v", limiter.entries)
	}
}

func TestRateLimiterCapacityFailsClosedAndRecovers(t *testing.T) {
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	limiter := newRateLimiter(1)
	limiter.now = func() time.Time { return now }
	first := []rateLimitCounterRule{{Key: testRateLimitKey(1), Limit: 10, Window: time.Minute}}
	second := []rateLimitCounterRule{{Key: testRateLimitKey(2), Limit: 10, Window: time.Minute}}

	if result, err := limiter.record(first); err != nil || result.Limited {
		t.Fatalf("first identity = %+v, %v; want allowed", result, err)
	}
	result, err := limiter.record(second)
	if err != nil {
		t.Fatalf("capacity record: %v", err)
	}
	if !result.Limited || result.RetryAfter != time.Minute || len(limiter.entries) != 1 {
		t.Fatalf("capacity result = %+v, entries=%d", result, len(limiter.entries))
	}

	now = now.Add(time.Minute)
	result, err = limiter.record(second)
	if err != nil || result.Limited {
		t.Fatalf("record after expiry = %+v, %v; want allowed", result, err)
	}
	if _, exists := limiter.entries[testRateLimitKey(1)]; exists {
		t.Fatal("expired entry was not removed")
	}
}

func TestRateLimiterCachesCapacityRetryWithoutRescanning(t *testing.T) {
	now := time.Date(2026, 8, 31, 12, 0, 0, 0, time.UTC)
	limiter := newRateLimiter(1)
	limiter.now = func() time.Time { return now }
	first := []rateLimitCounterRule{{Key: testRateLimitKey(1), Limit: 10, Window: time.Minute}}
	second := []rateLimitCounterRule{{Key: testRateLimitKey(2), Limit: 10, Window: time.Minute}}

	if result, err := limiter.record(first); err != nil || result.Limited {
		t.Fatalf("first identity = %+v, %v; want allowed", result, err)
	}
	if result, err := limiter.record(second); err != nil || !result.Limited || result.RetryAfter != time.Minute {
		t.Fatalf("first capacity result = %+v, %v", result, err)
	}

	entry := limiter.entries[testRateLimitKey(1)]
	entry.expiresAt = now.Add(2 * time.Hour)
	limiter.entries[testRateLimitKey(1)] = entry
	now = now.Add(10 * time.Second)
	result, err := limiter.record(second)
	if err != nil {
		t.Fatalf("cached capacity record: %v", err)
	}
	if !result.Limited || result.RetryAfter != 50*time.Second {
		t.Fatalf("cached capacity result = %+v, want 50-second cached retry", result)
	}
}

func TestRateLimitBucketKeysAreKeyedAndDomainSeparated(t *testing.T) {
	handler := Handler{rateLimitHMACKey: testHMACKey(1)}
	rule := rateLimitRule{Name: "minute", Limit: 10, Window: time.Minute}
	identity := "203.0.113.7"

	key := handler.deriveRateLimitBucketKey(identity, rateLimitReadKey, rule)
	if key != handler.deriveRateLimitBucketKey(identity, rateLimitReadKey, rule) {
		t.Fatal("same rate-limit inputs did not produce a stable in-process key")
	}
	rawHash := sha256.Sum256([]byte(identity))
	if key == rateLimitBucketKey(rawHash) {
		t.Fatal("rate-limit key equals the enumerable raw SHA-256 identity hash")
	}
	if key == handler.deriveRateLimitBucketKey(identity, rateLimitCreateKey, rule) {
		t.Fatal("rate-limit action was not domain-separated")
	}
	if key == handler.deriveRateLimitBucketKey(identity, rateLimitReadKey, rateLimitRule{Name: "hour", Limit: 10, Window: time.Hour}) {
		t.Fatal("rate-limit window was not domain-separated")
	}
	otherHandler := Handler{rateLimitHMACKey: testHMACKey(2)}
	if key == otherHandler.deriveRateLimitBucketKey(identity, rateLimitReadKey, rule) {
		t.Fatal("different process keys produced the same rate-limit bucket")
	}
}

func TestHandlerRateLimitsWithoutPersistentStorageAndResetsOnRestart(t *testing.T) {
	first, err := NewHandler(config.Config{}, nil)
	if err != nil {
		t.Fatalf("NewHandler: %v", err)
	}
	request := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	request.RemoteAddr = "203.0.113.71:12345"
	rules := []rateLimitRule{{Name: "test", Limit: 1, Window: time.Hour}}

	if result, err := first.recordRateLimits(request, rateLimitReadKey, rules); err != nil || result.Limited {
		t.Fatalf("first process initial record = %+v, %v; want allowed", result, err)
	}
	if result, err := first.recordRateLimits(request, rateLimitReadKey, rules); err != nil || !result.Limited {
		t.Fatalf("first process repeated record = %+v, %v; want limited", result, err)
	}

	restarted, err := NewHandler(config.Config{}, nil)
	if err != nil {
		t.Fatalf("restart NewHandler: %v", err)
	}
	if first.rateLimitHMACKey == restarted.rateLimitHMACKey {
		t.Fatal("restart reused the process-local rate-limit key")
	}
	if result, err := restarted.recordRateLimits(request, rateLimitReadKey, rules); err != nil || result.Limited {
		t.Fatalf("restarted process initial record = %+v, %v; want reset allowance", result, err)
	}
}

func TestUninitializedHandlerFailsRateLimitAdmissionClosed(t *testing.T) {
	request := httptest.NewRequest(http.MethodPost, "/api/read-memo", nil)
	request.RemoteAddr = "203.0.113.72:12345"
	_, err := (Handler{}).recordRateLimits(request, rateLimitReadKey, standardRateLimitRules)
	if !errors.Is(err, errRateLimiterUnavailable) {
		t.Fatalf("uninitialized rate limiter error = %v, want %v", err, errRateLimiterUnavailable)
	}
}

func testRateLimitKey(value byte) rateLimitBucketKey {
	var key rateLimitBucketKey
	key[0] = value
	return key
}

func testHMACKey(value byte) [32]byte {
	var key [32]byte
	key[0] = value
	return key
}
