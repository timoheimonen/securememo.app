package memo

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/timoheimonen/securememo/internal/config"
	"github.com/timoheimonen/securememo/internal/security"
	"github.com/timoheimonen/securememo/internal/store"
)

const maxJSONBytes = 64 * 1024

type Handler struct {
	Config config.Config
	Store  *store.SQLiteStore
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	if !h.requirePOST(w, r) {
		return
	}
	var req struct {
		EncryptedMessage  string      `json:"encryptedMessage"`
		ExpiryHours       interface{} `json:"expiryHours"`
		DeletionTokenHash string      `json:"deletionTokenHash"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}

	encryptedMessage, ok := security.SanitizeEncryptedMessage(req.EncryptedMessage)
	if !ok {
		delayedJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid message format."})
		return
	}
	expiryHours := stringify(req.ExpiryHours)
	if !security.ValidExpiryHours(expiryHours) {
		delayedJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid expiry time."})
		return
	}
	if !security.ValidDeletionTokenHash(req.DeletionTokenHash) {
		delayedJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid deletion token."})
		return
	}
	hours, _ := strconv.Atoi(expiryHours)
	expiryTime := time.Now().Add(time.Duration(hours) * time.Hour).Unix()

	memoID, err := h.generateMemoID(r.Context(), 10)
	if err != nil {
		delayedJSON(w, http.StatusInternalServerError, map[string]string{"error": "Could not generate memo ID."})
		return
	}
	if err := h.Store.CreateMemo(r.Context(), memoID, encryptedMessage, expiryTime, req.DeletionTokenHash); err != nil {
		delayedJSON(w, http.StatusInternalServerError, map[string]string{"error": "Database error."})
		return
	}

	delayedJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"memoId":  memoID,
	})
}

func (h Handler) Read(w http.ResponseWriter, r *http.Request) {
	if !h.requirePOST(w, r) {
		return
	}
	var req struct{}
	if !decodeJSON(w, r, &req) {
		return
	}

	memoID := r.URL.Query().Get("id")
	if !security.ValidMemoID(memoID) {
		h.accessDenied(w)
		return
	}

	row, err := h.Store.ReadActiveMemo(r.Context(), memoID)
	if errors.Is(err, store.ErrNotFound) {
		h.accessDenied(w)
		return
	}
	if err != nil {
		delayedJSON(w, http.StatusInternalServerError, map[string]string{"error": "Database read error."})
		return
	}

	delayedJSON(w, http.StatusOK, map[string]interface{}{
		"success":          true,
		"encryptedMessage": security.NormalizeCiphertext(row.EncryptedMessage),
	})
}

func (h Handler) ConfirmDelete(w http.ResponseWriter, r *http.Request) {
	if !h.requirePOST(w, r) {
		return
	}
	var req struct {
		MemoID        string `json:"memoId"`
		DeletionToken string `json:"deletionToken"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if !security.ValidMemoID(req.MemoID) {
		h.rateLimitOrAccessDenied(w, r)
		return
	}

	row, err := h.Store.ReadActiveMemo(r.Context(), req.MemoID)
	if errors.Is(err, store.ErrNotFound) {
		h.rateLimitOrAccessDenied(w, r)
		return
	}
	if err != nil {
		delayedJSON(w, http.StatusInternalServerError, map[string]string{"error": "Database read error."})
		return
	}
	if !security.ValidDeletionToken(req.DeletionToken) {
		h.rateLimitOrAccessDenied(w, r)
		return
	}

	hash := hashDeletionToken(req.DeletionToken)
	if !security.ConstantTimeEqual(hash, row.DeletionTokenHash) {
		h.rateLimitOrAccessDenied(w, r)
		return
	}
	deleted, err := h.Store.DeleteMemo(r.Context(), req.MemoID)
	if err != nil {
		delayedJSON(w, http.StatusInternalServerError, map[string]string{"error": "Memo deletion error."})
		return
	}
	if !deleted {
		h.accessDenied(w)
		return
	}
	delayedJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Memo deleted successfully",
	})
}

func (h Handler) Cleanup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	result, err := h.Store.Cleanup(r.Context())
	if err != nil {
		delayedJSON(w, http.StatusInternalServerError, map[string]string{"error": "Database error."})
		return
	}
	delayedJSON(w, http.StatusOK, map[string]interface{}{
		"success":           true,
		"cleanedUp":         result.MemosDeleted,
		"rateLimitsCleaned": result.RateLimitsDeleted,
	})
}

func (h Handler) requirePOST(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return false
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		delayedJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "Method not allowed."})
		return false
	}
	if !security.IsAllowedOrigin(r.Header.Get("Origin"), h.Config.AllowedOrigins) {
		delayedJSON(w, http.StatusForbidden, map[string]string{"error": "Forbidden."})
		return false
	}
	return true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst interface{}) bool {
	if !strings.Contains(strings.ToLower(r.Header.Get("Content-Type")), "application/json") {
		delayedJSON(w, http.StatusBadRequest, map[string]string{"error": "Content-Type must be application/json."})
		return false
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		delayedJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON."})
		return false
	}
	return true
}

func delayedJSON(w http.ResponseWriter, status int, body interface{}) {
	security.UniformDelay()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("X-Frame-Options", "DENY")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func (h Handler) accessDenied(w http.ResponseWriter) {
	delayedJSON(w, http.StatusNotFound, map[string]string{"error": "Memo not found or access denied."})
}

func (h Handler) rateLimitOrAccessDenied(w http.ResponseWriter, r *http.Request) {
	key := "delFail:" + hashString(clientIP(r))
	result, err := h.Store.RecordFailure(r.Context(), key, 2, 10*time.Minute)
	if err == nil && result.Limited {
		w.Header().Set("Retry-After", "60")
		delayedJSON(w, http.StatusTooManyRequests, map[string]string{"error": "Too many attempts. Please try again later."})
		return
	}
	h.accessDenied(w)
}

func (h Handler) generateMemoID(ctx context.Context, attempts int) (string, error) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
	biasThreshold := 256 - (256 % len(chars))
	for i := 0; i < attempts; i++ {
		id := make([]byte, 40)
		for j := range id {
			var one [1]byte
			for {
				if _, err := rand.Read(one[:]); err != nil {
					return "", err
				}
				if int(one[0]) < biasThreshold {
					break
				}
			}
			id[j] = chars[int(one[0])%len(chars)]
		}
		memoID := string(id)
		exists, err := h.Store.MemoExists(ctx, memoID)
		if err != nil || !exists {
			return memoID, nil
		}
	}
	return "", errors.New("memo id generation exhausted")
}

func hashDeletionToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.StdEncoding.EncodeToString(sum[:])
}

func hashString(input string) string {
	sum := sha256.Sum256([]byte(input))
	return hex.EncodeToString(sum[:])
}

func clientIP(r *http.Request) string {
	for _, header := range []string{"CF-Connecting-IP", "Cf-Connecting-Ip", "X-Forwarded-For"} {
		value := strings.TrimSpace(r.Header.Get(header))
		if value == "" {
			continue
		}
		if header == "X-Forwarded-For" {
			value = strings.TrimSpace(strings.Split(value, ",")[0])
		}
		if ip := net.ParseIP(value); ip != nil {
			return ip.String()
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return "unknown"
	}
	if ip := net.ParseIP(host); ip != nil {
		return ip.String()
	}
	return "unknown"
}

func stringify(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case float64:
		return strconv.Itoa(int(v))
	case int:
		return strconv.Itoa(v)
	default:
		return ""
	}
}
