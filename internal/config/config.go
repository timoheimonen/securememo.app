package config

import (
	"errors"
	"os"
	"strings"
)

type Config struct {
	Addr              string
	DBPath            string
	PublicOrigin      string
	AllowedOrigins    []string
	TrustedProxyLocal bool
}

func FromEnv() (Config, error) {
	cfg := Config{
		Addr:              envOrDefault("SECUREMEMO_ADDR", "127.0.0.1:3005"),
		DBPath:            envOrDefault("SECUREMEMO_DB_PATH", "./data/securememo.sqlite"),
		PublicOrigin:      strings.TrimRight(envOrDefault("PUBLIC_ORIGIN", "https://securememo.app"), "/"),
		TrustedProxyLocal: true,
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

func envOrDefault(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
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
