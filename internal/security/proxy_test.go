package security

import "testing"

func TestTrustedLocalProxyPeer(t *testing.T) {
	tests := []struct {
		name       string
		enabled    bool
		remoteAddr string
		want       bool
	}{
		{name: "disabled IPv4 loopback", remoteAddr: "127.0.0.1:1234"},
		{name: "enabled IPv4 loopback", enabled: true, remoteAddr: "127.0.0.1:1234", want: true},
		{name: "enabled IPv6 loopback", enabled: true, remoteAddr: "[::1]:1234", want: true},
		{name: "enabled mapped loopback", enabled: true, remoteAddr: "[::ffff:127.0.0.1]:1234", want: true},
		{name: "non-loopback", enabled: true, remoteAddr: "203.0.113.10:1234"},
		{name: "malformed", enabled: true, remoteAddr: "127.0.0.1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := TrustedLocalProxyPeer(tt.enabled, tt.remoteAddr); got != tt.want {
				t.Fatalf("TrustedLocalProxyPeer(%t, %q) = %t, want %t", tt.enabled, tt.remoteAddr, got, tt.want)
			}
		})
	}
}
