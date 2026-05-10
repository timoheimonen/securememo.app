# Go runtime notes

securememo.app runs as a Go HTTP service backed by SQLite. These notes describe the application runtime for maintainers.

## Build

```sh
go test ./...
go build -o securememo ./cmd/securememo
```

The SQLite driver is `github.com/mattn/go-sqlite3`, so the build host needs CGO support and a C compiler.

## Runtime Configuration

Minimal environment:

```sh
SECUREMEMO_ADDR=127.0.0.1:3005
SECUREMEMO_DB_PATH=/var/lib/securememo/securememo.sqlite
PUBLIC_ORIGIN=https://securememo.example.com
SECUREMEMO_TRUST_PROXY_HEADERS=false
```

By default, the service uses the socket remote address for abuse-rate-limit identity.
Set `SECUREMEMO_TRUST_PROXY_HEADERS=true` only when the service is behind a trusted
local reverse proxy that overwrites `CF-Connecting-IP` and `X-Forwarded-For`.
