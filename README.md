# securememo.app

securememo.app is a hosted service for sharing encrypted memos with automatic deletion. The browser encrypts every memo with AES-256-GCM before upload, so the server stores only ciphertext and deletion metadata. Memos are deleted after a successful read confirmation or after their configured expiry time.

## Features

- Client-side encryption with AES-256-GCM and PBKDF2 key derivation.
- Random browser-generated passwords that are never sent to the server.
- Delete-on-read flow with a client-side deletion token.
- Expiry options: 8 hours, 1 day, 2 days, 1 week, or 30 days.
- SQLite storage with WAL mode and automatic cleanup.
- Strict security headers, input validation, timing delays, and generic access-denied responses.
- No accounts, no tracking, no third-party analytics, no ads.
- Optional Prometheus-compatible operational metrics for monitoring service health and hosting status.
- Localized generated frontend assets embedded into the Go binary.

## Build

The SQLite driver uses CGO, so the build host needs Go, CGO support, and a C compiler.

```sh
go test ./...
go build -o securememo ./cmd/securememo
```

## Runtime Configuration

Minimal environment:

```sh
SECUREMEMO_ADDR=127.0.0.1:3005
SECUREMEMO_DB_PATH=/var/lib/securememo/securememo.sqlite
PUBLIC_ORIGIN=https://securememo.example.com
SECUREMEMO_TRUST_PROXY_HEADERS=false
```

Run the service process:

```sh
./securememo
```

By default, the app uses the socket remote address for abuse-rate-limit identity. Set
`SECUREMEMO_TRUST_PROXY_HEADERS=true` only when the service is behind a trusted local
reverse proxy that overwrites `CF-Connecting-IP` and `X-Forwarded-For`.


## Operational Metrics

securememo.app can expose optional Prometheus-compatible operational metrics on a separate metrics listener. This is intended for monitoring service health, hosting status, capacity, and abuse patterns. Keep the metrics listener private, for example bound to `127.0.0.1`, and scrape it from a local Prometheus instance. Do not expose `/metrics` on the public application origin.

Example configuration:

```sh
SECUREMEMO_METRICS_ADDR=127.0.0.1:9305
```

The metrics are aggregated technical counters and histograms, such as:

- HTTP request counts by method, normalized route group, status code, and coarse country code from `CF-IPCountry` when provided by a trusted proxy.
- HTTP response byte totals by the same low-cardinality labels.
- HTTP request duration histograms by the same low-cardinality labels.
- Total successfully created and read memos.

Metrics deliberately do not include IP addresses, user agents, cookies, session IDs, full URLs or query strings, memo IDs, memo contents, passwords, deletion tokens, email addresses, or persistent user identifiers. Route labels are normalized, for example `/api/read-memo?id=...` is reported only as `/api/read-memo`.

These operational metrics are separate from analytics or tracking: they are server-side, aggregated, low-cardinality measurements for running and protecting the service, not browser-side tracking or behavioral profiling.

## Project Structure

```text
cmd/securememo/              Go entrypoint
internal/config/             Environment configuration
internal/store/              SQLite schema, queries, cleanup, rate-limit storage
internal/memo/               Memo API handlers
internal/security/           Security headers, validation, timing helpers
internal/server/             Routing, localization paths, embedded asset serving
internal/frontend/           Embedded generated frontend assets
```

## API

- `POST /api/create-memo`
- `POST /api/read-memo?id=<memo_id>`
- `POST /api/confirm-delete`

The public browser flow uses these endpoints. Expired memo cleanup runs internally at startup and hourly after that.

## Security Model

For the detailed technical model, see [docs/security-model.md](docs/security-model.md).

- Plaintext memo content never leaves the browser.
- The memo password is generated and displayed only in the browser.
- The server stores ciphertext, expiry time, memo ID, and a deletion-token hash.
- Failed or invalid reads use generic responses to avoid memo enumeration.
- API rate limits use short and long windows per client IP. Normal API actions are limited to 10/minute and 100/hour; failed access attempts are limited to 10/minute and 20/hour.
- Expired memo cleanup runs at startup and hourly after that.

## License

GPL-3.0. See [LICENSE](LICENSE).

## Author

Timo Heimonen <timo.heimonen@proton.me>
