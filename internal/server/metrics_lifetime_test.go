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

	metrics := NewMetrics(db, false)
	createReq := httptest.NewRequest(http.MethodPost, "/api/create-memo", nil)
	readReq := httptest.NewRequest(http.MethodPost, "/api/read-memo?id=abc", nil)

	metrics.Observe(createReq, http.StatusOK, 0, time.Millisecond)
	metrics.Observe(createReq, http.StatusOK, 0, time.Millisecond)
	metrics.Observe(readReq, http.StatusOK, 0, time.Millisecond)

	// Simulate a Go process restart: construct a fresh Metrics instance backed by the same DB.
	restarted := NewMetrics(db, false)
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

func TestMetricsObserveDoesNotHoldLockDuringLifetimeWrite(t *testing.T) {
	metrics := NewMetrics(nil, false)
	entered := make(chan struct{})
	release := make(chan struct{})
	metrics.incrementAppStat = func(ctx context.Context, key string) error {
		if key != store.AppStatMemosCreated {
			t.Errorf("lifetime stat key = %q, want %q", key, store.AppStatMemosCreated)
		}
		close(entered)
		select {
		case <-release:
			return nil
		case <-ctx.Done():
			return ctx.Err()
		}
	}

	done := make(chan struct{})
	request := httptest.NewRequest(http.MethodPost, "/api/create-memo", nil)
	go func() {
		defer close(done)
		metrics.Observe(
			request,
			http.StatusOK,
			17,
			25*time.Millisecond,
		)
	}()

	select {
	case <-entered:
	case <-time.After(time.Second):
		close(release)
		<-done
		t.Fatal("lifetime write was not reached")
	}

	lockAvailable := metrics.mu.TryLock()
	if lockAvailable {
		key := metricKey{Method: http.MethodPost, Route: "/api/create-memo", Status: "200", Country: "unknown"}
		if metrics.memosCreated != 1 {
			t.Errorf("in-memory created count = %d, want 1", metrics.memosCreated)
		}
		if metrics.requests[key] != 1 {
			t.Errorf("in-memory request count = %d, want 1", metrics.requests[key])
		}
		if metrics.bytes[key] != 17 {
			t.Errorf("in-memory response bytes = %d, want 17", metrics.bytes[key])
		}
		if got := metrics.duration[key]; got.Count != 1 || got.Sum != 0.025 {
			t.Errorf("in-memory duration = %+v, want count 1 and sum 0.025", got)
		}
		metrics.mu.Unlock()
	}
	lifetimeLockAvailable := metrics.lifetimeMu.TryLock()
	if lifetimeLockAvailable {
		metrics.lifetimeMu.Unlock()
	}
	close(release)
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Observe did not finish after lifetime write was released")
	}
	if !lockAvailable {
		t.Fatal("metrics lock remained held while lifetime persistence was blocked")
	}
	if lifetimeLockAvailable {
		t.Fatal("lifetime writes were not serialized around persistence")
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
	NewMetrics(db, false).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/metrics", nil))
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

	metrics := NewMetrics(db, false)
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

func TestMetricCountryRequiresTrustedLocalProxy(t *testing.T) {
	tests := []struct {
		name       string
		trusted    bool
		remoteAddr string
		values     []string
		want       string
	}{
		{name: "proxy trust disabled", remoteAddr: "127.0.0.1:1234", values: []string{"FI"}, want: "unknown"},
		{name: "non-loopback peer", trusted: true, remoteAddr: "203.0.113.10:1234", values: []string{"FI"}, want: "unknown"},
		{name: "malformed peer", trusted: true, remoteAddr: "127.0.0.1", values: []string{"FI"}, want: "unknown"},
		{name: "trusted IPv4 loopback", trusted: true, remoteAddr: "127.0.0.1:1234", values: []string{"fi"}, want: "FI"},
		{name: "trusted IPv6 loopback", trusted: true, remoteAddr: "[::1]:1234", values: []string{"SE"}, want: "SE"},
		{name: "missing", trusted: true, remoteAddr: "127.0.0.1:1234", want: "unknown"},
		{name: "empty", trusted: true, remoteAddr: "127.0.0.1:1234", values: []string{"  "}, want: "unknown"},
		{name: "duplicate", trusted: true, remoteAddr: "127.0.0.1:1234", values: []string{"FI", "SE"}, want: "unknown"},
		{name: "identical duplicate", trusted: true, remoteAddr: "127.0.0.1:1234", values: []string{"FI", "FI"}, want: "unknown"},
		{name: "comma separated", trusted: true, remoteAddr: "127.0.0.1:1234", values: []string{"FI, SE"}, want: "unknown"},
		{name: "malformed", trusted: true, remoteAddr: "127.0.0.1:1234", values: []string{"F1"}, want: "unknown"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = tt.remoteAddr
			for _, value := range tt.values {
				req.Header.Add("CF-IPCountry", value)
			}
			if got := metricCountry(req, tt.trusted); got != tt.want {
				t.Fatalf("metricCountry() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestMetricsObserveSuppressesUntrustedCountryHeader(t *testing.T) {
	metrics := NewMetrics(nil, false)
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.RemoteAddr = "203.0.113.20:1234"
	req.Header.Set("CF-IPCountry", "FI")
	metrics.Observe(req, http.StatusOK, 0, time.Millisecond)

	key := metricKey{Method: http.MethodGet, Route: "/", Status: "200", Country: "unknown"}
	if metrics.requests[key] != 1 {
		t.Fatalf("untrusted country metric = %+v, want one unknown-country request", metrics.requests)
	}
}
