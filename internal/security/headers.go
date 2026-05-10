package security

import (
	"crypto/rand"
	"encoding/base64"
	"net/http"
	"strings"
)

func Nonce() (string, error) {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b[:]), nil
}

func SecurityHeaders(r *http.Request, allowedOrigins []string, nonce string) http.Header {
	headers := http.Header{}
	headers.Set("X-Content-Type-Options", "nosniff")
	headers.Set("X-Frame-Options", "DENY")
	headers.Set("Referrer-Policy", "strict-origin-when-cross-origin")
	headers.Set("Permissions-Policy", "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()")
	headers.Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
	headers.Set("Cross-Origin-Opener-Policy", "same-origin")
	headers.Set("Cross-Origin-Resource-Policy", "same-origin")
	headers.Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	headers.Set("Access-Control-Allow-Headers", "Content-Type")
	headers.Set("Access-Control-Max-Age", "86400")
	headers.Set("Vary", "Origin")
	headers.Set("Content-Security-Policy", contentSecurityPolicy(nonce))

	if IsAllowedOrigin(r.Header.Get("Origin"), allowedOrigins) {
		headers.Set("Access-Control-Allow-Origin", strings.TrimRight(r.Header.Get("Origin"), "/"))
	}
	return headers
}

func IsAllowedOrigin(origin string, allowedOrigins []string) bool {
	origin = strings.TrimRight(strings.TrimSpace(origin), "/")
	if origin == "" {
		return false
	}
	for _, allowed := range allowedOrigins {
		if origin == strings.TrimRight(allowed, "/") {
			return true
		}
	}
	return false
}

func ApplyHeaders(w http.ResponseWriter, headers http.Header) {
	for key, values := range headers {
		for _, value := range values {
			w.Header().Add(key, value)
		}
	}
}

func contentSecurityPolicy(nonce string) string {
	directives := []string{
		"default-src 'none'",
		"base-uri 'self'",
		"form-action 'self'",
		"frame-ancestors 'none'",
		"connect-src 'self' https://www.youtube-nocookie.com https://youtube.googleapis.com https://s.ytimg.com",
		"frame-src https://www.youtube-nocookie.com blob:",
		"child-src https://www.youtube-nocookie.com blob:",
		"img-src 'self' https://s.ytimg.com data:",
		"style-src 'self'",
		"worker-src 'self' blob:",
		"object-src 'none'",
		"script-src 'nonce-" + nonce + "' 'strict-dynamic' blob:",
		"require-trusted-types-for 'script'",
	}
	return strings.Join(directives, "; ") + ";"
}
