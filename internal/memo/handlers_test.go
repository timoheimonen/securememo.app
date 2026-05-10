package memo

import (
	"net/http/httptest"
	"path/filepath"
	"testing"
	"time"

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
