package store

import (
	"context"
	"errors"
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	sqlite3 "github.com/mattn/go-sqlite3"
)

func TestCreateMemoEnforcesExactStorageByteBoundary(t *testing.T) {
	const limit = int64(1_000_000)
	db := openStorageTestStore(t, StorageLimits{MaxBytes: limit, MaxMemos: 10})
	ctx := context.Background()
	if _, err := db.db.ExecContext(ctx, `UPDATE storage_usage SET used_bytes = ?, used_memos = 0 WHERE singleton = 1`, limit-3); err != nil {
		t.Fatalf("seed usage: %v", err)
	}

	if err := db.CreateMemo(ctx, "exact", "abc", time.Now().Add(time.Hour).Unix(), "delete", "owner"); err != nil {
		t.Fatalf("create at exact byte boundary: %v", err)
	}
	if err := db.CreateMemo(ctx, "over", "d", time.Now().Add(time.Hour).Unix(), "delete", "owner"); !errors.Is(err, ErrStorageLimitReached) {
		t.Fatalf("create over byte boundary error = %v, want ErrStorageLimitReached", err)
	}

	stats := storageStatsForTest(t, db)
	if stats.UsageBytes != limit || stats.Memos != 1 {
		t.Fatalf("usage after boundary rejection = bytes:%d memos:%d", stats.UsageBytes, stats.Memos)
	}
}

func TestCreateMemoRollsBackReservationWhenInsertFails(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MaxBytes: 1_000_000, MaxMemos: 10})
	ctx := context.Background()
	expiry := time.Now().Add(time.Hour).Unix()
	if err := db.CreateMemo(ctx, "duplicate", "first", expiry, "delete", "owner"); err != nil {
		t.Fatalf("create first memo: %v", err)
	}
	if err := db.CreateMemo(ctx, "duplicate", "second", expiry, "delete", "owner"); err == nil || errors.Is(err, ErrStorageLimitReached) {
		t.Fatalf("duplicate create error = %v, want ordinary uniqueness error", err)
	}

	stats := storageStatsForTest(t, db)
	if stats.UsageBytes != int64(len("first")) || stats.Memos != 1 {
		t.Fatalf("usage after failed insert = bytes:%d memos:%d", stats.UsageBytes, stats.Memos)
	}
}

func TestMemoCountLimitReleasesOnDelete(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MaxBytes: 1_000_000, MaxMemos: 1})
	ctx := context.Background()
	expiry := time.Now().Add(time.Hour).Unix()
	if err := db.CreateMemo(ctx, "first", "one", expiry, "delete", "owner"); err != nil {
		t.Fatalf("create first memo: %v", err)
	}
	if err := db.CreateMemo(ctx, "second", "two", expiry, "delete", "owner"); !errors.Is(err, ErrStorageLimitReached) {
		t.Fatalf("create over memo count error = %v, want ErrStorageLimitReached", err)
	}
	deleted, err := db.DeleteMemo(ctx, "first")
	if err != nil || !deleted {
		t.Fatalf("delete first memo = %v, %v", deleted, err)
	}
	if err := db.CreateMemo(ctx, "second", "two", expiry, "delete", "owner"); err != nil {
		t.Fatalf("create after delete released capacity: %v", err)
	}

	stats := storageStatsForTest(t, db)
	if stats.UsageBytes != int64(len("two")) || stats.Memos != 1 {
		t.Fatalf("usage after delete and create = bytes:%d memos:%d", stats.UsageBytes, stats.Memos)
	}
}

func TestCleanupReleasesOnlyActuallyDeletedMemos(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MaxBytes: 1_000_000, MaxMemos: 10})
	ctx := context.Background()
	now := time.Now().Unix()
	if err := db.CreateMemo(ctx, "active", "alive", now+3600, "delete", "owner"); err != nil {
		t.Fatalf("create active memo: %v", err)
	}
	if err := db.CreateMemo(ctx, "expired", "expired", now-1, "delete", "owner"); err != nil {
		t.Fatalf("create expired memo: %v", err)
	}

	result, err := db.Cleanup(ctx)
	if err != nil {
		t.Fatalf("cleanup: %v", err)
	}
	if result.MemosDeleted != 1 {
		t.Fatalf("MemosDeleted = %d, want 1", result.MemosDeleted)
	}
	stats := storageStatsForTest(t, db)
	if stats.UsageBytes != int64(len("alive")) || stats.Memos != 1 {
		t.Fatalf("usage after cleanup = bytes:%d memos:%d", stats.UsageBytes, stats.Memos)
	}
}

func TestOpenSQLiteReconcilesStorageUsage(t *testing.T) {
	path := filepath.Join(t.TempDir(), "securememo.sqlite")
	ctx := context.Background()
	db, err := OpenSQLite(path, StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.CreateMemo(ctx, "one", "abc", time.Now().Add(time.Hour).Unix(), "delete", "owner"); err != nil {
		t.Fatalf("create one: %v", err)
	}
	if err := db.CreateMemo(ctx, "two", "defgh", time.Now().Add(-time.Hour).Unix(), "delete", "owner"); err != nil {
		t.Fatalf("create two: %v", err)
	}
	if _, err := db.db.ExecContext(ctx, `UPDATE storage_usage SET used_bytes = 0, used_memos = 0 WHERE singleton = 1`); err != nil {
		t.Fatalf("corrupt usage: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close sqlite: %v", err)
	}

	db, err = OpenSQLite(path, StorageLimits{MaxBytes: 1_000_000, MaxMemos: 10})
	if err != nil {
		t.Fatalf("reopen sqlite: %v", err)
	}
	defer db.Close()
	stats := storageStatsForTest(t, db)
	if stats.UsageBytes != 8 || stats.Memos != 2 {
		t.Fatalf("reconciled usage = bytes:%d memos:%d, want bytes:8 memos:2", stats.UsageBytes, stats.Memos)
	}
}

func TestLoweredStorageLimitUsesDrainMode(t *testing.T) {
	path := filepath.Join(t.TempDir(), "securememo.sqlite")
	ctx := context.Background()
	db, err := OpenSQLite(path, StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	if err := db.CreateMemo(ctx, "existing", strings.Repeat("x", 100_000), time.Now().Add(time.Hour).Unix(), "delete", "owner"); err != nil {
		t.Fatalf("create existing memo: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("close sqlite: %v", err)
	}

	db, err = OpenSQLite(path, StorageLimits{MaxBytes: 1, MaxMemos: 1})
	if err != nil {
		t.Fatalf("reopen oversized sqlite in drain mode: %v", err)
	}
	defer db.Close()
	if _, err := db.ReadActiveMemo(ctx, "existing"); err != nil {
		t.Fatalf("read existing memo in drain mode: %v", err)
	}
	if err := db.CreateMemo(ctx, "blocked", "x", time.Now().Add(time.Hour).Unix(), "delete", "owner"); !errors.Is(err, ErrStorageLimitReached) {
		t.Fatalf("create in drain mode error = %v, want ErrStorageLimitReached", err)
	}
	var pagesBeforeReuse int64
	if err := db.db.QueryRowContext(ctx, `PRAGMA main.page_count`).Scan(&pagesBeforeReuse); err != nil {
		t.Fatalf("page count before drain reuse: %v", err)
	}
	deleted, err := db.DeleteMemo(ctx, "existing")
	if err != nil || !deleted {
		t.Fatalf("delete existing memo in drain mode = %v, %v", deleted, err)
	}
	if err := db.CreateMemo(ctx, "reused", "x", time.Now().Add(time.Hour).Unix(), "delete", "owner"); err != nil {
		t.Fatalf("create did not reuse allocated SQLite space after drain: %v", err)
	}
	var pagesAfterReuse int64
	if err := db.db.QueryRowContext(ctx, `PRAGMA main.page_count`).Scan(&pagesAfterReuse); err != nil {
		t.Fatalf("page count after drain reuse: %v", err)
	}
	if pagesAfterReuse != pagesBeforeReuse {
		t.Fatalf("drain reuse grew page count from %d to %d", pagesBeforeReuse, pagesAfterReuse)
	}
}

func TestCreateMemoHonorsFilesystemReserve(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MaxBytes: 1_000_000, MaxMemos: 10, MinFreeDiskBytes: 100})
	ctx := context.Background()
	db.availableDiskBytes = func(string) (int64, error) { return 100, nil }
	if err := db.CreateMemo(ctx, "blocked", "x", time.Now().Add(time.Hour).Unix(), "delete", "owner"); !errors.Is(err, ErrStorageLimitReached) {
		t.Fatalf("create at filesystem reserve error = %v, want ErrStorageLimitReached", err)
	}
	stats := storageStatsForTest(t, db)
	if stats.UsageBytes != 0 || stats.Memos != 0 {
		t.Fatalf("filesystem rejection changed usage = bytes:%d memos:%d", stats.UsageBytes, stats.Memos)
	}
}

func TestLifetimeCounterWritesHonorFilesystemReserve(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MaxBytes: 1_000_000, MaxMemos: 10, MinFreeDiskBytes: 100})
	ctx := context.Background()
	db.availableDiskBytes = func(string) (int64, error) { return 100, nil }

	if err := db.IncrementAppStat(ctx, AppStatMemosRead); !errors.Is(err, ErrStorageLimitReached) {
		t.Fatalf("app-stat write at filesystem reserve error = %v, want ErrStorageLimitReached", err)
	}
	var appStatRows int64
	if err := db.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM app_stats`).Scan(&appStatRows); err != nil {
		t.Fatalf("count app-stat rows: %v", err)
	}
	if appStatRows != 0 {
		t.Fatalf("reserve rejection persisted app-stat rows: %d", appStatRows)
	}
}

func TestCleanupUsesBoundedBatchesAndTruncatesWAL(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MaxBytes: 1_000_000, MaxMemos: cleanupBatchSize + 1})
	ctx := context.Background()
	expiry := time.Now().Add(-time.Hour).Unix()
	for index := 0; index < cleanupBatchSize+1; index++ {
		if err := db.CreateMemo(ctx, fmt.Sprintf("expired-%d", index), "x", expiry, "delete", "owner"); err != nil {
			t.Fatalf("create expired memo %d: %v", index, err)
		}
	}

	result, err := db.Cleanup(ctx)
	if err != nil {
		t.Fatalf("cleanup: %v", err)
	}
	if result.MemosDeleted != cleanupBatchSize+1 {
		t.Fatalf("MemosDeleted = %d, want %d", result.MemosDeleted, cleanupBatchSize+1)
	}
	stats := storageStatsForTest(t, db)
	if stats.UsageBytes != 0 || stats.Memos != 0 {
		t.Fatalf("usage after batched cleanup = bytes:%d memos:%d", stats.UsageBytes, stats.Memos)
	}
	walBytes, err := fileSizeOrZero(db.path + "-wal")
	if err != nil {
		t.Fatalf("stat WAL: %v", err)
	}
	if walBytes != 0 {
		t.Fatalf("WAL bytes after batched cleanup = %d, want 0", walBytes)
	}
}

func TestConcurrentCreatesCannotOversubscribeMemoLimit(t *testing.T) {
	db := openStorageTestStore(t, StorageLimits{MaxBytes: 1_000_000, MaxMemos: 5})
	ctx := context.Background()
	var successes atomic.Int64
	unexpected := make(chan error, 20)
	var wait sync.WaitGroup
	for index := 0; index < 20; index++ {
		wait.Add(1)
		go func(index int) {
			defer wait.Done()
			err := db.CreateMemo(ctx, fmt.Sprintf("memo-%d", index), "x", time.Now().Add(time.Hour).Unix(), "delete", "owner")
			switch {
			case err == nil:
				successes.Add(1)
			case errors.Is(err, ErrStorageLimitReached):
			default:
				unexpected <- err
			}
		}(index)
	}
	wait.Wait()
	close(unexpected)
	if err := <-unexpected; err != nil {
		t.Fatalf("concurrent create returned unexpected error: %v", err)
	}
	if successes.Load() != 5 {
		t.Fatalf("successful creates = %d, want 5", successes.Load())
	}
	stats := storageStatsForTest(t, db)
	if stats.UsageBytes != 5 || stats.Memos != 5 {
		t.Fatalf("concurrent usage = bytes:%d memos:%d", stats.UsageBytes, stats.Memos)
	}
}

func TestMaxPageCountIsAppliedAndSQLiteFullIsNormalized(t *testing.T) {
	const limit = int64(1_000_000)
	db := openStorageTestStore(t, StorageLimits{MaxBytes: limit, MaxMemos: 10})
	ctx := context.Background()
	var pageSize int64
	var maxPages int64
	if err := db.db.QueryRowContext(ctx, `PRAGMA main.page_size`).Scan(&pageSize); err != nil {
		t.Fatalf("page size: %v", err)
	}
	if err := db.db.QueryRowContext(ctx, `PRAGMA main.max_page_count`).Scan(&maxPages); err != nil {
		t.Fatalf("max page count: %v", err)
	}
	if want := limit / pageSize; maxPages != want {
		t.Fatalf("max_page_count = %d, want %d", maxPages, want)
	}

	wrapped := fmt.Errorf("wrapped: %w", sqlite3.Error{Code: sqlite3.ErrFull})
	if err := normalizeStorageError(wrapped); !errors.Is(err, ErrStorageLimitReached) {
		t.Fatalf("normalized SQLITE_FULL = %v, want ErrStorageLimitReached", err)
	}
}

func TestMaxPageCountIsReappliedAfterPoolConnectionReplacement(t *testing.T) {
	const limit = int64(1_000_000)
	db := openStorageTestStore(t, StorageLimits{MaxBytes: limit, MaxMemos: 10})
	ctx := context.Background()
	var pageSize int64
	if err := db.db.QueryRowContext(ctx, `PRAGMA main.page_size`).Scan(&pageSize); err != nil {
		t.Fatalf("page size: %v", err)
	}
	want := limit / pageSize

	db.db.SetMaxIdleConns(0)
	for attempt := 0; attempt < 2; attempt++ {
		var maxPages int64
		if err := db.db.QueryRowContext(ctx, `PRAGMA main.max_page_count`).Scan(&maxPages); err != nil {
			t.Fatalf("max page count after replacement %d: %v", attempt+1, err)
		}
		if maxPages != want {
			t.Fatalf("max_page_count after replacement %d = %d, want %d", attempt+1, maxPages, want)
		}
	}
}

func openStorageTestStore(t *testing.T, limits StorageLimits) *SQLiteStore {
	t.Helper()
	db, err := OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), limits)
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("close sqlite: %v", err)
		}
	})
	return db
}

func storageStatsForTest(t *testing.T, db *SQLiteStore) StorageStats {
	t.Helper()
	stats, err := db.StorageStats(context.Background())
	if err != nil {
		t.Fatalf("storage stats: %v", err)
	}
	return stats
}
