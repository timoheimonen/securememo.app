package server

import (
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/store"
)

func TestMemoLifecycle(t *testing.T) {
	db, err := store.OpenSQLite(filepath.Join(t.TempDir(), "securememo.sqlite"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	cfg := config.Config{
		Addr:             "127.0.0.1:0",
		DBPath:           "test",
		PublicOrigin:     "https://securememo.test",
		TurnstileSiteKey: "site-key",
		TurnstileBypass:  true,
		AllowedOrigins:   []string{"https://securememo.test"},
	}
	app := New(cfg, db)

	token := "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef"
	createBody := map[string]interface{}{
		"encryptedMessage":    "encrypted-payload",
		"expiryHours":         "8",
		"cfTurnstileResponse": "bypass-token",
		"deletionTokenHash":   hashDeletionTokenForTest(token),
	}
	createResp := doJSON(t, app, http.MethodPost, "/api/create-memo", createBody)
	if createResp.Code != http.StatusOK {
		t.Fatalf("create status = %d body=%s", createResp.Code, createResp.Body.String())
	}
	var createOut struct {
		Success bool   `json:"success"`
		MemoID  string `json:"memoId"`
	}
	if err := json.Unmarshal(createResp.Body.Bytes(), &createOut); err != nil {
		t.Fatal(err)
	}
	if !createOut.Success || len(createOut.MemoID) != 40 {
		t.Fatalf("bad create response: %+v", createOut)
	}

	readResp := doJSON(t, app, http.MethodPost, "/api/read-memo?id="+createOut.MemoID, map[string]interface{}{
		"cfTurnstileResponse": "bypass-token",
	})
	if readResp.Code != http.StatusOK {
		t.Fatalf("read status = %d body=%s", readResp.Code, readResp.Body.String())
	}
	var readOut struct {
		Success          bool   `json:"success"`
		EncryptedMessage string `json:"encryptedMessage"`
	}
	if err := json.Unmarshal(readResp.Body.Bytes(), &readOut); err != nil {
		t.Fatal(err)
	}
	if !readOut.Success || readOut.EncryptedMessage != "encrypted-payload" {
		t.Fatalf("bad read response: %+v", readOut)
	}

	deleteResp := doJSON(t, app, http.MethodPost, "/api/confirm-delete", map[string]interface{}{
		"memoId":        createOut.MemoID,
		"deletionToken": token,
	})
	if deleteResp.Code != http.StatusOK {
		t.Fatalf("delete status = %d body=%s", deleteResp.Code, deleteResp.Body.String())
	}

	readAgainResp := doJSON(t, app, http.MethodPost, "/api/read-memo?id="+createOut.MemoID, map[string]interface{}{
		"cfTurnstileResponse": "bypass-token",
	})
	if readAgainResp.Code != http.StatusNotFound {
		t.Fatalf("read after delete status = %d body=%s", readAgainResp.Code, readAgainResp.Body.String())
	}
}

func doJSON(t *testing.T, handler http.Handler, method, target string, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(method, target, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://securememo.test")
	req.Header.Set("CF-Connecting-IP", "203.0.113.10")
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)
	return rec
}

func hashDeletionTokenForTest(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.StdEncoding.EncodeToString(sum[:])
}
