package security

import (
	"strings"
	"testing"
)

func TestContentSecurityPolicyAllowsOnlyMemoCryptoTrustedTypePolicy(t *testing.T) {
	policy := contentSecurityPolicy("test-nonce")
	for _, required := range []string{
		"worker-src 'self' blob:",
		"trusted-types securememo-crypto-worker",
		"require-trusted-types-for 'script'",
	} {
		if !strings.Contains(policy, required) {
			t.Errorf("content security policy missing %q", required)
		}
	}
	if strings.Contains(policy, "trusted-types *") {
		t.Fatal("content security policy permits arbitrary Trusted Types policies")
	}
}
