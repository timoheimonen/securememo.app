package store

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestRecordEventsProcessesEveryRuleAndCapsLimitedBuckets(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{})
	ctx := context.Background()

	if _, err := db.RecordEvent(ctx, "already-full", 1, time.Hour); err != nil {
		t.Fatalf("fill first bucket: %v", err)
	}
	results, err := db.RecordEvents(ctx, []RateLimitRule{
		{Key: "already-full", Limit: 1, Window: time.Hour},
		{Key: "still-open", Limit: 2, Window: time.Minute},
	})
	if err != nil {
		t.Fatalf("record batch: %v", err)
	}
	if len(results) != 2 {
		t.Fatalf("result count = %d, want 2", len(results))
	}
	if !results[0].Limited || results[0].Count != 1 || results[0].Remaining != 0 || results[0].RetryAfter <= 0 {
		t.Fatalf("limited result = %+v", results[0])
	}
	if results[1].Limited || results[1].Count != 1 || results[1].Remaining != 1 || results[1].RetryAfter != 0 {
		t.Fatalf("open result = %+v", results[1])
	}

	assertRateLimitCount(t, db, "already-full", 1)
	assertRateLimitCount(t, db, "still-open", 1)
}

func TestRecordEventsRollsBackWholeBatchOnWriteFailure(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{})
	ctx := context.Background()
	if _, err := db.db.ExecContext(ctx, `
CREATE TRIGGER fail_rate_limit_insert
BEFORE INSERT ON rate_limits
WHEN NEW.key = 'forced-failure'
BEGIN
    SELECT RAISE(ABORT, 'forced failure');
END`); err != nil {
		t.Fatalf("create failure trigger: %v", err)
	}

	results, err := db.RecordEvents(ctx, []RateLimitRule{
		{Key: "would-succeed", Limit: 10, Window: time.Minute},
		{Key: "forced-failure", Limit: 10, Window: time.Minute},
	})
	if err == nil {
		t.Fatal("record batch succeeded, want forced failure")
	}
	if results != nil {
		t.Fatalf("results after failed batch = %+v, want nil", results)
	}

	var rows int
	if err := db.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM rate_limits`).Scan(&rows); err != nil {
		t.Fatalf("count rate-limit rows: %v", err)
	}
	if rows != 0 {
		t.Fatalf("rows after failed batch = %d, want 0", rows)
	}
}

func TestRecordEventsValidatesBeforeTransactionAndChecksReserveOnce(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MinFreeDiskBytes: 1})
	ctx := context.Background()
	var reserveChecks atomic.Int64
	db.availableDiskBytes = func(string) (int64, error) {
		reserveChecks.Add(1)
		return attackerWriteHeadroomBytes + 1, nil
	}

	invalidRules := []struct {
		name string
		rule RateLimitRule
	}{
		{name: "empty key", rule: RateLimitRule{Limit: 10, Window: time.Minute}},
		{name: "zero limit", rule: RateLimitRule{Key: "zero-limit", Window: time.Minute}},
		{name: "zero window", rule: RateLimitRule{Key: "zero-window", Limit: 10}},
		{name: "negative window", rule: RateLimitRule{Key: "negative-window", Limit: 10, Window: -time.Second}},
	}
	for _, tt := range invalidRules {
		t.Run(tt.name, func(t *testing.T) {
			if _, err := db.RecordEvents(ctx, []RateLimitRule{
				{Key: "valid", Limit: 10, Window: time.Minute},
				tt.rule,
			}); err == nil {
				t.Fatal("invalid batch succeeded")
			}
		})
	}
	if got := reserveChecks.Load(); got != 0 {
		t.Fatalf("reserve checks for invalid batch = %d, want 0", got)
	}
	assertRateLimitMissing(t, db, "valid")

	if _, err := db.RecordEvents(ctx, []RateLimitRule{
		{Key: "minute", Limit: 10, Window: time.Minute},
		{Key: "hour", Limit: 100, Window: time.Hour},
	}); err != nil {
		t.Fatalf("record valid batch: %v", err)
	}
	if got := reserveChecks.Load(); got != 1 {
		t.Fatalf("reserve checks for two-rule batch = %d, want 1", got)
	}
}

func TestRecordEventsConcurrentBatchesStayConsistent(t *testing.T) {
	const (
		limit   = 20
		workers = 64
	)
	db := openStorageTestStore(t, StorageLimits{})
	ctx := context.Background()
	type outcome struct {
		results []RateLimitResult
		err     error
	}
	outcomes := make(chan outcome, workers)
	var wait sync.WaitGroup
	for range workers {
		wait.Add(1)
		go func() {
			defer wait.Done()
			results, err := db.RecordEvents(ctx, []RateLimitRule{
				{Key: "minute", Limit: limit, Window: time.Minute},
				{Key: "hour", Limit: limit, Window: time.Hour},
			})
			outcomes <- outcome{results: results, err: err}
		}()
	}
	wait.Wait()
	close(outcomes)

	allowed := 0
	for outcome := range outcomes {
		if outcome.err != nil {
			t.Fatalf("concurrent batch: %v", outcome.err)
		}
		if len(outcome.results) != 2 {
			t.Fatalf("concurrent result count = %d, want 2", len(outcome.results))
		}
		if outcome.results[0].Limited != outcome.results[1].Limited {
			t.Fatalf("batch observed inconsistent limit state: %+v", outcome.results)
		}
		if !outcome.results[0].Limited {
			allowed++
		}
	}
	if allowed != limit {
		t.Fatalf("allowed batches = %d, want %d", allowed, limit)
	}
	assertRateLimitCount(t, db, "minute", limit)
	assertRateLimitCount(t, db, "hour", limit)
}

func TestRecordEventDelegatesToBatchAPI(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MinFreeDiskBytes: 1})
	ctx := context.Background()
	var reserveChecks atomic.Int64
	capacityErr := errors.New("capacity unavailable")
	db.availableDiskBytes = func(string) (int64, error) {
		reserveChecks.Add(1)
		return 0, capacityErr
	}

	if _, err := db.RecordEvent(ctx, "wrapper", 10, time.Minute); !errors.Is(err, capacityErr) {
		t.Fatalf("RecordEvent error = %v", err)
	}
	if got := reserveChecks.Load(); got != 1 {
		t.Fatalf("RecordEvent reserve checks = %d, want 1", got)
	}
}

func assertRateLimitCount(t *testing.T, db *SQLiteStore, key string, want int) {
	t.Helper()
	var got int
	if err := db.db.QueryRow(`SELECT count FROM rate_limits WHERE key = ?`, key).Scan(&got); err != nil {
		t.Fatalf("read rate-limit count for %q: %v", key, err)
	}
	if got != want {
		t.Fatalf("rate-limit count for %q = %d, want %d", key, got, want)
	}
}

func assertRateLimitMissing(t *testing.T, db *SQLiteStore, key string) {
	t.Helper()
	var exists int
	if err := db.db.QueryRow(`SELECT EXISTS(SELECT 1 FROM rate_limits WHERE key = ?)`, key).Scan(&exists); err != nil {
		t.Fatalf("read rate-limit existence for %q: %v", key, err)
	}
	if exists != 0 {
		t.Fatalf("rate-limit row %q exists, want missing", key)
	}
}
