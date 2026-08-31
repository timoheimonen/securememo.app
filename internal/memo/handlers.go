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

const (
	maxJSONBytes       = 64 * 1024
	rateLimitMinute    = 10
	rateLimitHour      = 100
	failureLimitHour   = 20
	rateLimitCreateKey = "create"
	rateLimitReadKey   = "read"
	rateLimitDeleteKey = "delete"
	rateLimitFailKey   = "failure"
)

const (
	errorCodeInvalidMessageFormat     = "INVALID_MESSAGE_FORMAT"
	errorCodeInvalidExpiryTime        = "INVALID_EXPIRY_TIME"
	errorCodeInvalidDeletionTokenHash = "INVALID_DELETION_TOKEN_HASH"
	errorCodeMemoIDGeneration         = "MEMO_ID_GENERATION_ERROR"
	errorCodeDatabase                 = "DATABASE_ERROR"
	errorCodeDatabaseRead             = "DATABASE_READ_ERROR"
	errorCodeMemoDeletion             = "MEMO_DELETION_ERROR"
	errorCodeMethodNotAllowed         = "METHOD_NOT_ALLOWED"
	errorCodeForbidden                = "FORBIDDEN"
	errorCodeContentType              = "CONTENT_TYPE_ERROR"
	errorCodeInvalidJSON              = "INVALID_JSON"
	errorCodeRequestTooLarge          = "REQUEST_TOO_LARGE"
	errorCodeMemoAccessDenied         = "MEMO_ACCESS_DENIED"
	errorCodeRateLimited              = "RATE_LIMITED"
	errorCodeStorageLimitReached      = "STORAGE_LIMIT_REACHED"
	errorCodeGeneral                  = "GENERAL_ERROR"
)

type apiErrorResponse struct {
	ErrorCode string `json:"errorCode"`
}

type rateLimitRule struct {
	Name   string
	Limit  int
	Window time.Duration
}

var defaultRateLimitRules = []rateLimitRule{
	{Name: "minute", Limit: rateLimitMinute, Window: time.Minute},
	{Name: "hour", Limit: rateLimitHour, Window: time.Hour},
}

var failureRateLimitRules = []rateLimitRule{
	{Name: "minute", Limit: rateLimitMinute, Window: time.Minute},
	{Name: "hour", Limit: failureLimitHour, Window: time.Hour},
}

type Handler struct {
	Config config.Config
	Store  *store.SQLiteStore
}

func (h Handler) Create(w http.ResponseWriter, r *http.Request) {
	if !h.requirePOST(w, r) {
		return
	}
	if !h.allowRateLimitedAction(w, r, rateLimitCreateKey) {
		return
	}
	var req struct {
		EncryptedMessage       string      `json:"encryptedMessage"`
		ExpiryHours            interface{} `json:"expiryHours"`
		DeletionTokenHash      string      `json:"deletionTokenHash"`
		OwnerDeletionTokenHash string      `json:"ownerDeletionTokenHash"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}

	if !security.ValidEncryptedMessage(req.EncryptedMessage) {
		writeAPIError(w, http.StatusBadRequest, errorCodeInvalidMessageFormat)
		return
	}
	expiryHours := stringify(req.ExpiryHours)
	if !security.ValidExpiryHours(expiryHours) {
		writeAPIError(w, http.StatusBadRequest, errorCodeInvalidExpiryTime)
		return
	}
	if !security.ValidDeletionTokenHash(req.DeletionTokenHash) {
		writeAPIError(w, http.StatusBadRequest, errorCodeInvalidDeletionTokenHash)
		return
	}
	if !security.ValidDeletionTokenHash(req.OwnerDeletionTokenHash) {
		writeAPIError(w, http.StatusBadRequest, errorCodeInvalidDeletionTokenHash)
		return
	}
	hours, _ := strconv.Atoi(expiryHours)
	expiryTime := time.Now().Add(time.Duration(hours) * time.Hour).Unix()

	memoID, err := h.generateMemoID(r.Context(), 10)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, errorCodeMemoIDGeneration)
		return
	}
	if err := h.Store.CreateMemo(r.Context(), memoID, req.EncryptedMessage, expiryTime, req.DeletionTokenHash, req.OwnerDeletionTokenHash); err != nil {
		if errors.Is(err, store.ErrStorageLimitReached) {
			writeAPIError(w, http.StatusInsufficientStorage, errorCodeStorageLimitReached)
			return
		}
		writeAPIError(w, http.StatusInternalServerError, errorCodeDatabase)
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
	if !h.allowRateLimitedAction(w, r, rateLimitReadKey) {
		return
	}
	var req struct{}
	if !decodeJSON(w, r, &req) {
		return
	}

	query := r.URL.Query()
	memoIDs, ok := query["id"]
	if !ok || len(memoIDs) != 1 || len(query) != 1 {
		h.accessDenied(w)
		return
	}
	memoID := memoIDs[0]
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
		writeAPIError(w, http.StatusInternalServerError, errorCodeDatabaseRead)
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
		writeAPIError(w, http.StatusInternalServerError, errorCodeDatabaseRead)
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
	if !h.allowRateLimitedAction(w, r, rateLimitDeleteKey) {
		return
	}
	deleted, err := h.Store.DeleteMemo(r.Context(), req.MemoID)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, errorCodeMemoDeletion)
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

func (h Handler) Revoke(w http.ResponseWriter, r *http.Request) {
	if !h.requirePOST(w, r) {
		return
	}
	var req struct {
		MemoID           string `json:"memoId"`
		OwnerDeleteToken string `json:"ownerDeleteToken"`
	}
	if !decodeJSON(w, r, &req) {
		return
	}
	if !security.ValidMemoID(req.MemoID) || !security.ValidOwnerDeleteToken(req.OwnerDeleteToken) {
		h.rateLimitOrAccessDenied(w, r)
		return
	}

	row, err := h.Store.ReadActiveMemo(r.Context(), req.MemoID)
	if errors.Is(err, store.ErrNotFound) {
		h.rateLimitOrAccessDenied(w, r)
		return
	}
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, errorCodeDatabaseRead)
		return
	}
	if row.OwnerDeletionTokenHash == "" {
		h.rateLimitOrAccessDenied(w, r)
		return
	}

	hash := hashDeletionToken(req.OwnerDeleteToken)
	if !security.ConstantTimeEqual(hash, row.OwnerDeletionTokenHash) {
		h.rateLimitOrAccessDenied(w, r)
		return
	}

	deleted, err := h.Store.DeleteMemo(r.Context(), req.MemoID)
	if err != nil {
		writeAPIError(w, http.StatusInternalServerError, errorCodeMemoDeletion)
		return
	}
	if !deleted {
		h.accessDenied(w)
		return
	}
	delayedJSON(w, http.StatusOK, map[string]interface{}{
		"success": true,
		"message": "Memo revoked successfully",
	})
}

func (h Handler) requirePOST(w http.ResponseWriter, r *http.Request) bool {
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return false
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST")
		writeAPIError(w, http.StatusMethodNotAllowed, errorCodeMethodNotAllowed)
		return false
	}
	if !security.IsAllowedOrigin(r.Header.Get("Origin"), h.Config.AllowedOrigins) {
		writeAPIError(w, http.StatusForbidden, errorCodeForbidden)
		return false
	}
	return true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst interface{}) bool {
	if !strings.Contains(strings.ToLower(r.Header.Get("Content-Type")), "application/json") {
		writeAPIError(w, http.StatusBadRequest, errorCodeContentType)
		return false
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxJSONBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			writeAPIError(w, http.StatusRequestEntityTooLarge, errorCodeRequestTooLarge)
			return false
		}
		writeAPIError(w, http.StatusBadRequest, errorCodeInvalidJSON)
		return false
	}
	return true
}

func writeAPIError(w http.ResponseWriter, status int, errorCode string) {
	delayedJSON(w, status, apiErrorResponse{ErrorCode: errorCode})
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
	writeAPIError(w, http.StatusNotFound, errorCodeMemoAccessDenied)
}

func (h Handler) rateLimitOrAccessDenied(w http.ResponseWriter, r *http.Request) {
	result, err := h.recordRateLimits(r, rateLimitFailKey, failureRateLimitRules)
	if err == nil && result.Limited {
		w.Header().Set("Retry-After", retryAfterSeconds(result.RetryAfter))
		writeAPIError(w, http.StatusTooManyRequests, errorCodeRateLimited)
		return
	}
	h.accessDenied(w)
}

func (h Handler) allowRateLimitedAction(w http.ResponseWriter, r *http.Request, action string) bool {
	result, err := h.recordRateLimits(r, action, defaultRateLimitRules)
	if err != nil {
		if errors.Is(err, store.ErrStorageLimitReached) {
			if action == rateLimitCreateKey {
				writeAPIError(w, http.StatusInsufficientStorage, errorCodeStorageLimitReached)
				return false
			}
			// The trusted Cloudflare edge remains the fallback limiter when the
			// physically saturated SQLite database cannot persist a read/delete event.
			return true
		}
		writeAPIError(w, http.StatusInternalServerError, errorCodeGeneral)
		return false
	}
	if result.Limited {
		w.Header().Set("Retry-After", retryAfterSeconds(result.RetryAfter))
		writeAPIError(w, http.StatusTooManyRequests, errorCodeRateLimited)
		return false
	}
	return true
}

func (h Handler) recordRateLimits(r *http.Request, action string, rules []rateLimitRule) (store.RateLimitResult, error) {
	ipHash := hashString(h.clientIP(r))
	for _, rule := range rules {
		key := "api:" + action + ":" + rule.Name + ":" + ipHash
		result, err := h.Store.RecordEvent(r.Context(), key, rule.Limit, rule.Window)
		if err != nil || result.Limited {
			return result, err
		}
	}
	return store.RateLimitResult{}, nil
}

func retryAfterSeconds(duration time.Duration) string {
	seconds := int(duration.Round(time.Second) / time.Second)
	if seconds < 1 {
		seconds = 1
	}
	return strconv.Itoa(seconds)
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

func (h Handler) clientIP(r *http.Request) string {
	remoteIP := remoteAddrIP(r.RemoteAddr)
	if h.Config.TrustedProxyLocal && isLocalProxyPeer(remoteIP) {
		if ip := forwardedClientIP(r); ip != "" {
			return ip
		}
	}
	if remoteIP != "" {
		return remoteIP
	}
	return "unknown"
}

func forwardedClientIP(r *http.Request) string {
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
	return ""
}

func remoteAddrIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		return ""
	}
	if ip := net.ParseIP(host); ip != nil {
		return ip.String()
	}
	return ""
}

func isLocalProxyPeer(ip string) bool {
	parsed := net.ParseIP(ip)
	return parsed != nil && parsed.IsLoopback()
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
