package security

import (
	"encoding/base64"
	"regexp"
	"strconv"
	"strings"
	"unicode"
)

const (
	encryptedMessagePrefix    = "v1:"
	maxEncryptedMessageBytes  = 41_000
	minEncryptedEnvelopeBytes = 16 + 12 + 16 // salt + IV + AES-GCM tag
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
	case 8, 24, 48, 168, 336:
		return true
	default:
		return false
	}
}

func ValidEncryptedMessage(input string) bool {
	if len(input) > maxEncryptedMessageBytes || !strings.HasPrefix(input, encryptedMessagePrefix) {
		return false
	}

	encoded := input[len(encryptedMessagePrefix):]
	decoded, err := base64.StdEncoding.Strict().DecodeString(encoded)
	if err != nil || len(decoded) < minEncryptedEnvelopeBytes {
		return false
	}

	return base64.StdEncoding.EncodeToString(decoded) == encoded
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
