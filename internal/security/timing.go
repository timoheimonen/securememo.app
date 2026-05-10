package security

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/binary"
	"time"
)

func UniformDelay() {
	var b [4]byte
	_, _ = rand.Read(b[:])
	n := binary.BigEndian.Uint32(b[:])
	delayMs := 70 + int(n%41)
	time.Sleep(time.Duration(delayMs) * time.Millisecond)
}

func ConstantTimeEqual(a, b string) bool {
	if len(a) != len(b) {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(a), []byte(b)) == 1
}
