package security

import (
	"bytes"
	"encoding/base64"
	"strconv"
	"strings"
	"testing"
)

func TestValidEncryptedMessageAcceptsOnlyCanonicalV1Envelope(t *testing.T) {
	minimumEnvelope := bytes.Repeat([]byte{0xff}, minEncryptedEnvelopeBytes)
	validMinimum := encryptedMessageForTest(minimumEnvelope)
	validWithoutPadding := encryptedMessageForTest(bytes.Repeat([]byte{0x01}, 45))
	nonCanonicalTrailingBits := "v1:" + strings.Repeat("A", 58) + "B="
	urlSafe := strings.Replace(validMinimum, "/", "_", 1)
	withLineBreak := validMinimum[:12] + "\n" + validMinimum[12:]

	tests := []struct {
		name  string
		input string
		want  bool
	}{
		{name: "minimum envelope", input: validMinimum, want: true},
		{name: "canonical encoding without padding", input: validWithoutPadding, want: true},
		{name: "empty", input: ""},
		{name: "prefix only", input: "v1:"},
		{name: "unversioned", input: strings.TrimPrefix(validMinimum, encryptedMessagePrefix)},
		{name: "future version", input: "v2:" + strings.TrimPrefix(validMinimum, encryptedMessagePrefix)},
		{name: "different prefix casing", input: "V1:" + strings.TrimPrefix(validMinimum, encryptedMessagePrefix)},
		{name: "short decoded envelope", input: encryptedMessageForTest(make([]byte, minEncryptedEnvelopeBytes-1))},
		{name: "invalid base64 character", input: validMinimum[:len(validMinimum)-2] + "!="},
		{name: "URL-safe base64", input: urlSafe},
		{name: "missing required padding", input: strings.TrimSuffix(validMinimum, "=")},
		{name: "extra padding", input: validMinimum + "="},
		{name: "non-canonical trailing bits", input: nonCanonicalTrailingBits},
		{name: "base64 line break", input: withLineBreak},
		{name: "leading whitespace", input: " " + validMinimum},
		{name: "trailing whitespace", input: validMinimum + "\t"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := ValidEncryptedMessage(tt.input); got != tt.want {
				t.Errorf("ValidEncryptedMessage() = %t, want %t", got, tt.want)
			}
		})
	}
}

func TestValidEncryptedMessageEnforcesByteLimit(t *testing.T) {
	// A v1 message is three prefix bytes followed by Base64 in four-byte
	// blocks. Therefore 40,999 is the largest canonical message length that
	// can fit within the 41,000-byte limit.
	largest := encryptedMessageForTest(make([]byte, 30_747))
	if got, want := len(largest), maxEncryptedMessageBytes-1; got != want {
		t.Fatalf("largest test message length = %d, want %d", got, want)
	}
	if !ValidEncryptedMessage(largest) {
		t.Fatal("largest canonical message within the byte limit was rejected")
	}

	nextCanonical := encryptedMessageForTest(make([]byte, 30_748))
	if len(nextCanonical) <= maxEncryptedMessageBytes {
		t.Fatalf("next canonical message length = %d, want more than %d", len(nextCanonical), maxEncryptedMessageBytes)
	}
	if ValidEncryptedMessage(nextCanonical) {
		t.Fatal("canonical message over the byte limit was accepted")
	}
}

func encryptedMessageForTest(envelope []byte) string {
	return encryptedMessagePrefix + base64.StdEncoding.EncodeToString(envelope)
}

func TestValidExpiryHoursAllowsOnlySupportedValues(t *testing.T) {
	supported := map[int]struct{}{
		8:   {},
		24:  {},
		48:  {},
		168: {},
		336: {},
	}

	for hours := -1000; hours <= 1000; hours++ {
		_, want := supported[hours]
		if got := ValidExpiryHours(strconv.Itoa(hours)); got != want {
			t.Errorf("ValidExpiryHours(%q) = %t, want %t", strconv.Itoa(hours), got, want)
		}
	}

	for _, input := range []string{"", "invalid", "8.5"} {
		if ValidExpiryHours(input) {
			t.Errorf("ValidExpiryHours(%q) = true, want false", input)
		}
	}
}
