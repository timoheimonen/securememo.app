# Go self-hosting notes

This port runs securememo as a local Go HTTP service backed by SQLite. It is intended to sit behind a `cloudflared` tunnel and listen only on localhost.

## Build

```sh
npm run go:assets
go build -o securememo ./cmd/securememo
```

The SQLite driver is `github.com/mattn/go-sqlite3`, so the build host needs CGO support and a C compiler.

## Runtime

Minimal environment:

```sh
SECUREMEMO_ADDR=127.0.0.1:3000
SECUREMEMO_DB_PATH=/var/lib/securememo/securememo.sqlite
PUBLIC_ORIGIN=https://securememo.example.com
```

Turnstile is disabled by default in the Go port. To enable it later:

```sh
SECUREMEMO_TURNSTILE_ENABLED=1
TURNSTILE_SITE_KEY=...
TURNSTILE_SECRET=...
```

For local development only, `SECUREMEMO_TURNSTILE_BYPASS=1` bypasses verification even when Turnstile is enabled.

## cloudflared

Example tunnel ingress:

```yaml
ingress:
  - hostname: securememo.example.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

The app trusts `CF-Connecting-IP` and `X-Forwarded-For` only for rate-limit identity. Keep the service bound to `127.0.0.1`.
