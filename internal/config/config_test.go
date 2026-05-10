package config

import "testing"

func TestProxyHeadersAreNotTrustedByDefault(t *testing.T) {
	t.Setenv("SECUREMEMO_TRUST_PROXY_HEADERS", "")

	cfg, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}
	if cfg.TrustedProxyLocal {
		t.Fatal("proxy headers should not be trusted by default")
	}
}

func TestProxyHeadersCanBeExplicitlyTrusted(t *testing.T) {
	t.Setenv("SECUREMEMO_TRUST_PROXY_HEADERS", "true")

	cfg, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}
	if !cfg.TrustedProxyLocal {
		t.Fatal("expected proxy headers to be trusted when explicitly enabled")
	}
}
