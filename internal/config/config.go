package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/timoheimonen/securememo/internal/security"
)

const (
	DefaultStorageLimitBytes = int64(100_000_000_000)
	DefaultMinFreeDiskBytes  = int64(5_000_000_000)
)

type Config struct {
	Addr              string
	MetricsAddr       string
	DBPath            string
	PublicOrigin      string
	AllowedOrigins    []string
	TrustedProxyLocal bool
	StorageLimitBytes int64
	StorageMemoLimit  int64
	MinFreeDiskBytes  int64
}

func FromEnv() (Config, error) {
	storageLimitBytes, err := envNonNegativeInt64("SECUREMEMO_STORAGE_LIMIT_BYTES", DefaultStorageLimitBytes)
	if err != nil {
		return Config{}, err
	}
	minFreeDiskBytes, err := envNonNegativeInt64("SECUREMEMO_MIN_FREE_DISK_BYTES", DefaultMinFreeDiskBytes)
	if err != nil {
		return Config{}, err
	}
	trustedProxyLocal, err := envBool("SECUREMEMO_TRUST_PROXY_HEADERS", false)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		Addr:              envOrDefault("SECUREMEMO_ADDR", "127.0.0.1:3005"),
		MetricsAddr:       strings.TrimSpace(os.Getenv("SECUREMEMO_METRICS_ADDR")),
		DBPath:            envOrDefault("SECUREMEMO_DB_PATH", "./data/securememo.sqlite"),
		PublicOrigin:      strings.TrimRight(envOrDefault("PUBLIC_ORIGIN", "https://securememo.app"), "/"),
		TrustedProxyLocal: trustedProxyLocal,
		StorageLimitBytes: storageLimitBytes,
		StorageMemoLimit:  storageMemoLimit(storageLimitBytes),
		MinFreeDiskBytes:  minFreeDiskBytes,
	}

	if cfg.PublicOrigin == "" {
		return Config{}, errors.New("PUBLIC_ORIGIN must not be empty")
	}
	if cfg.DBPath == "" {
		return Config{}, errors.New("SECUREMEMO_DB_PATH must not be empty")
	}

	cfg.AllowedOrigins = allowedOrigins(cfg.PublicOrigin, os.Getenv("SECUREMEMO_ALLOWED_ORIGINS"))
	return cfg, nil
}

func envNonNegativeInt64(key string, fallback int64) (int64, error) {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback, nil
	}
	value, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || value < 0 {
		return 0, fmt.Errorf("%s must be a non-negative base-10 integer", key)
	}
	return value, nil
}

func storageMemoLimit(storageLimitBytes int64) int64 {
	if storageLimitBytes == 0 {
		return 0
	}
	limit := storageLimitBytes / int64(security.MaxEncryptedMessageBytes)
	if limit < 1 {
		return 1
	}
	return limit
}

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func envBool(key string, fallback bool) (bool, error) {
	value := strings.ToLower(strings.TrimSpace(os.Getenv(key)))
	switch value {
	case "":
		return fallback, nil
	case "1", "true", "yes", "on":
		return true, nil
	case "0", "false", "no", "off":
		return false, nil
	default:
		return false, fmt.Errorf("%s must be a boolean (true/false, 1/0, yes/no, or on/off)", key)
	}
}

func allowedOrigins(publicOrigin, extra string) []string {
	seen := map[string]bool{}
	add := func(origin string, out *[]string) {
		origin = strings.TrimRight(strings.TrimSpace(origin), "/")
		if origin == "" || seen[origin] {
			return
		}
		seen[origin] = true
		*out = append(*out, origin)
	}

	var origins []string
	add(publicOrigin, &origins)
	add("https://securememo.app", &origins)
	add("https://www.securememo.app", &origins)
	add("http://127.0.0.1:3005", &origins)
	add("http://localhost:3005", &origins)

	for _, part := range strings.Split(extra, ",") {
		add(part, &origins)
	}
	return origins
}
