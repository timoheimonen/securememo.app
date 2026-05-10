# Go self-hosting notes

securememo runs as a local Go HTTP service backed by SQLite. It is designed to sit behind a `cloudflared` tunnel or another reverse proxy and listen only on localhost.

## Build

```sh
go test ./...
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

## cloudflared

Example tunnel ingress:

```yaml
ingress:
  - hostname: securememo.example.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

Keep the service bound to `127.0.0.1` when using proxy identity headers for rate limiting.
