package server

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/timoheimonen/securememo/internal/store"
)

func TestMetricsExposeLifetimeMemoStatsFromSQLite(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
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

func TestMetricsDoNotIncrementLifetimeMemoStatsForFailedRequests(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
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
