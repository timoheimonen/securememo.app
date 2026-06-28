package security

import (
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

var (
	memoIDRe            = regexp.MustCompile(`^[A-Za-z0-9\-_]{40}$`)
	deletionTokenRe     = regexp.MustCompile(`^[A-Za-z0-9]+$`)
	ownerDeleteTokenRe  = regexp.MustCompile(`^[A-Za-z0-9\-_]{43}$`)
	deletionTokenHashRe = regexp.MustCompile(`^[A-Za-z0-9+/=]+$`)
	localeRe            = regexp.MustCompile(`^[a-zA-Z0-9_-]+$`)
)

func ValidMemoID(memoID string) bool {
	return memoIDRe.MatchString(memoID)
}

func ValidDeletionToken(token string) bool {
	return len(token) >= 32 && len(token) <= 64 && deletionTokenRe.MatchString(token)
}

func ValidOwnerDeleteToken(token string) bool {
	return ownerDeleteTokenRe.MatchString(token)
}

func ValidDeletionTokenHash(hash string) bool {
	return len(hash) == 44 && deletionTokenHashRe.MatchString(hash)
}

func ValidExpiryHours(input string) bool {
	hours, err := strconv.Atoi(input)
	if err != nil {
		return false
	}
	switch hours {
	case 8, 24, 48, 168, 720:
		return true
	default:
		return false
	}
}

func SanitizeEncryptedMessage(input string) (string, bool) {
	if input == "" || len(input) > 50000 || strings.ContainsRune(input, 0) {
		return "", false
	}
	var b strings.Builder
	b.Grow(len(input))
	for _, r := range input {
		if r == '\n' || r == '\r' || r == '\t' {
			b.WriteRune(r)
			continue
		}
		if unicode.IsControl(r) {
			return "", false
		}
		b.WriteRune(r)
	}
	out := strings.TrimSpace(b.String())
	if out == "" || len(out) > 50000 {
		return "", false
	}
	return out, true
}

func NormalizeCiphertext(input string) string {
	if input == "" {
		return ""
	}
	var b strings.Builder
	b.Grow(len(input))
	for _, r := range input {
		if r == 0 {
			continue
		}
		if r == '\n' || r == '\r' || r == '\t' || !unicode.IsControl(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func SanitizeLocale(locale string) string {
	if locale == "" || len(locale) > 10 || !localeRe.MatchString(locale) {
		return "en"
	}
	return locale
}
