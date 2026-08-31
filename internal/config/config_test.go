package config

import "testing"

func TestStorageLimitsDefaultToOneHundredDecimalGigabytes(t *testing.T) {
	t.Setenv("SECUREMEMO_STORAGE_LIMIT_BYTES", "")
	t.Setenv("SECUREMEMO_MIN_FREE_DISK_BYTES", "")

	cfg, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}
	if cfg.StorageLimitBytes != 100_000_000_000 {
		t.Fatalf("StorageLimitBytes = %d, want 100000000000", cfg.StorageLimitBytes)
	}
	if cfg.StorageMemoLimit != 2_439_024 {
		t.Fatalf("StorageMemoLimit = %d, want 2439024", cfg.StorageMemoLimit)
	}
	if cfg.MinFreeDiskBytes != 5_000_000_000 {
		t.Fatalf("MinFreeDiskBytes = %d, want 5000000000", cfg.MinFreeDiskBytes)
	}
}

func TestStorageLimitsCanBeOverriddenOrDisabled(t *testing.T) {
	t.Setenv("SECUREMEMO_STORAGE_LIMIT_BYTES", "82000")
	t.Setenv("SECUREMEMO_MIN_FREE_DISK_BYTES", "0")

	cfg, err := FromEnv()
	if err != nil {
		t.Fatalf("FromEnv: %v", err)
	}
	if cfg.StorageLimitBytes != 82_000 || cfg.StorageMemoLimit != 2 || cfg.MinFreeDiskBytes != 0 {
		t.Fatalf("storage config = bytes:%d memos:%d reserve:%d", cfg.StorageLimitBytes, cfg.StorageMemoLimit, cfg.MinFreeDiskBytes)
	}

	t.Setenv("SECUREMEMO_STORAGE_LIMIT_BYTES", "0")
	cfg, err = FromEnv()
	if err != nil {
		t.Fatalf("FromEnv with disabled storage limit: %v", err)
	}
	if cfg.StorageLimitBytes != 0 || cfg.StorageMemoLimit != 0 {
		t.Fatalf("disabled storage config = bytes:%d memos:%d", cfg.StorageLimitBytes, cfg.StorageMemoLimit)
	}
}

func TestStorageLimitsRejectInvalidValues(t *testing.T) {
	invalid := []string{"-1", "1.5", "100GB", "9223372036854775808"}
	for _, value := range invalid {
		t.Run(value, func(t *testing.T) {
			t.Setenv("SECUREMEMO_STORAGE_LIMIT_BYTES", value)
			if _, err := FromEnv(); err == nil {
				t.Fatalf("FromEnv accepted invalid storage limit %q", value)
			}
		})
	}

	t.Setenv("SECUREMEMO_STORAGE_LIMIT_BYTES", "0")
	t.Setenv("SECUREMEMO_MIN_FREE_DISK_BYTES", "-1")
	if _, err := FromEnv(); err == nil {
		t.Fatal("FromEnv accepted a negative free-disk reserve")
	}
}

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
