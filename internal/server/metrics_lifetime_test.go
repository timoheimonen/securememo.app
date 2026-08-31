package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/timoheimonen/securememo/internal/store"
)

func TestMetricsExposeLifetimeMemoStatsFromSQLite(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	metrics := NewMetrics(db)
	createReq := httptest.NewRequest(http.MethodPost, "/api/create-memo", nil)
	readReq := httptest.NewRequest(http.MethodPost, "/api/read-memo?id=abc", nil)

	metrics.Observe(createReq, http.StatusOK, 0, time.Millisecond)
	metrics.Observe(createReq, http.StatusOK, 0, time.Millisecond)
	metrics.Observe(readReq, http.StatusOK, 0, time.Millisecond)

	// Simulate a Go process restart: construct a fresh Metrics instance backed by the same DB.
	restarted := NewMetrics(db)
	rec := httptest.NewRecorder()
	restarted.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	body := rec.Body.String()

	if !strings.Contains(body, "securememo_memos_created_total 2\n") {
		t.Fatalf("metrics missing persisted created counter, body:\n%s", body)
	}
	if !strings.Contains(body, "securememo_memos_read_total 1\n") {
		t.Fatalf("metrics missing persisted read counter, body:\n%s", body)
	}
}

func TestMetricsExposeUnlabeledAggregateStorageGauges(t *testing.T) {
	path := filepath.Join(t.TempDir(), "securememo.sqlite")
	db, err := store.OpenSQLite(path, store.StorageLimits{
		MaxBytes:         1_000_000,
		MaxMemos:         10,
		MinFreeDiskBytes: 0,
	})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()
	const memoID = "private-memo-id"
	const ciphertext = "secret-ciphertext"
	if err := db.CreateMemo(context.Background(), memoID, ciphertext, time.Now().Add(time.Hour).Unix(), "delete", "owner"); err != nil {
		t.Fatalf("create memo: %v", err)
	}
	stats, err := db.StorageStats(context.Background())
	if err != nil {
		t.Fatalf("storage stats: %v", err)
	}

	rec := httptest.NewRecorder()
	NewMetrics(db).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	body := rec.Body.String()
	want := map[string]int64{
		"securememo_storage_usage_bytes":         int64(len(ciphertext)),
		"securememo_storage_limit_bytes":         stats.LimitBytes,
		"securememo_storage_memos":               1,
		"securememo_storage_memos_limit":         stats.MemosLimit,
		"securememo_storage_min_free_disk_bytes": stats.MinFreeDiskBytes,
	}
	for name, value := range want {
		sample := name + " " + strconv.FormatInt(value, 10) + "\n"
		if !strings.Contains(body, sample) {
			t.Errorf("metrics missing %q; body:\n%s", sample, body)
		}
	}
	for _, name := range []string{
		"securememo_storage_sqlite_main_bytes",
		"securememo_storage_sqlite_freelist_bytes",
		"securememo_storage_sqlite_wal_bytes",
		"securememo_storage_filesystem_available_bytes",
	} {
		if !strings.Contains(body, name+" ") {
			t.Errorf("metrics missing %s; body:\n%s", name, body)
		}
	}
	for _, line := range strings.Split(body, "\n") {
		if !strings.HasPrefix(line, "securememo_storage_") {
			continue
		}
		if strings.Contains(line, "{") {
			t.Errorf("storage metric has labels: %s", line)
		}
		if strings.Contains(line, memoID) || strings.Contains(line, ciphertext) || strings.Contains(line, path) {
			t.Errorf("storage metric exposes private value: %s", line)
		}
	}
}

func TestMetricsDoNotIncrementLifetimeMemoStatsForFailedRequests(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"), store.StorageLimits{})
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	metrics := NewMetrics(db)
	metrics.Observe(httptest.NewRequest(http.MethodPost, "/api/create-memo", nil), http.StatusBadRequest, 0, time.Millisecond)
	metrics.Observe(httptest.NewRequest(http.MethodGet, "/api/read-memo", nil), http.StatusOK, 0, time.Millisecond)

	rec := httptest.NewRecorder()
	metrics.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/metrics", nil))
	body := rec.Body.String()

	if !strings.Contains(body, "securememo_memos_created_total 0\n") {
		t.Fatalf("created counter should stay zero, body:\n%s", body)
	}
	if !strings.Contains(body, "securememo_memos_read_total 0\n") {
		t.Fatalf("read counter should stay zero, body:\n%s", body)
	}
}
