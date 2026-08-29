package security

import (
	"strconv"
	"testing"
)

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
