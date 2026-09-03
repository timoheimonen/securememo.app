package security

import "net/netip"

// TrustedLocalProxyPeer reports whether proxy-provided headers may be trusted
// for a request received from remoteAddr.
func TrustedLocalProxyPeer(enabled bool, remoteAddr string) bool {
	if !enabled {
		return false
	}
	addrPort, err := netip.ParseAddrPort(remoteAddr)
	if err != nil {
		return false
	}
	return addrPort.Addr().Unmap().IsLoopback()
}
