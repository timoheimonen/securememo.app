package server

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/store"
)

func TestCleanupEndpointIsNotPubliclyRouted(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatalf("open sqlite: %v", err)
	}
	defer db.Close()

	app := New(config.Config{
		PublicOrigin:   "https://securememo.app",
		AllowedOrigins: []string{"https://securememo.app"},
	}, db)

	req := httptest.NewRequest(http.MethodPost, "/api/cleanup", nil)
	rec := httptest.NewRecorder()
	app.ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST /api/cleanup status = %d, want %d", rec.Code, http.StatusMethodNotAllowed)
	}
}
