# securememo.app

securememo.app is a hosted service for sharing encrypted memos with automatic deletion. The browser encrypts every memo with AES-256-GCM before upload, so the server stores only ciphertext and deletion metadata. Memos are deleted after a successful read confirmation or after their configured expiry time.

## Features

- Client-side encryption with AES-256-GCM and PBKDF2 key derivation.
- Random browser-generated passwords that are never sent to the server.
- Delete-on-read flow with a client-side deletion token.
- Sender revoke link for deleting an unread memo before expiry.
- Expiry options: 8 hours, 1 day, 2 days, 1 week, or 2 weeks.
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
SECUREMEMO_STORAGE_LIMIT_BYTES=100000000000
SECUREMEMO_MIN_FREE_DISK_BYTES=5000000000
```

Run the service process:

```sh
./securememo
```

By default, the app uses the socket remote address for abuse-rate-limit identity. For
a same-host Cloudflare Tunnel, keep the service bound to loopback and set
`SECUREMEMO_TRUST_PROXY_HEADERS=true`. In this mode, requests received from a loopback
peer must contain exactly one valid `CF-Connecting-IP`; malformed or missing values
fail closed, and `X-Forwarded-For` is never used as a fallback. Requests from any
non-loopback peer ignore forwarded headers. Do not enable this mode if other local
processes are outside the deployment trust boundary, and do not expose the origin
listener publicly.

IPv4 addresses are normalized and IPv6 clients are grouped by `/64` for rate-limit
purposes. Minute and hour counters are updated in one SQLite transaction. If the
filesystem reserve prevents rate-limit persistence, a bounded in-memory limiter keeps
enforcing the same rules for the lifetime of the process instead of failing open.

`SECUREMEMO_STORAGE_LIMIT_BYTES` defaults to decimal 100 GB and limits both
retained ciphertext admission and SQLite main-database page allocation. The
service also derives a memo-count limit as `floor(limit / 41000)` (2,439,024 at
the default) to bound row and index overhead. Metadata means the effective
ciphertext capacity can be lower than 100 GB. Setting the byte limit to `0`
disables both logical and SQLite page limits; accounting remains enabled.

`SECUREMEMO_MIN_FREE_DISK_BYTES` defaults to decimal 5 GB. New memos are rejected
before consuming that filesystem reserve, and attacker-driven rate-limit and
lifetime-counter writes stop as well; set it to `0` to disable the reserve.
The SQLite page limit does not include WAL files, backups, or other files, so the
deployment should also use a dedicated volume or hosting quota. Run only one
securememo backend process per SQLite database; the global usage accounting is
owned by that process. At capacity, creation returns HTTP 507 with the stable
`STORAGE_LIMIT_REACHED` code, while reads and deletion paths remain available.
Expiry cleanup uses bounded transactions and truncating WAL checkpoints between
batches. A lowered limit permits reuse of already allocated SQLite freelist
pages but does not allow the main file to grow further.


## Operational Metrics

securememo.app can expose optional Prometheus-compatible operational metrics on a separate metrics listener. This is intended for monitoring service health, hosting status, capacity, and abuse patterns. Keep the metrics listener private, for example bound to `127.0.0.1`, and scrape it from a local Prometheus instance. Do not expose `/metrics` on the public application origin.

Example configuration:

```sh
SECUREMEMO_METRICS_ADDR=127.0.0.1:9305
```

The metrics are aggregated technical counters, gauges, and histograms, such as:

- HTTP request counts by method, normalized route group, status code, and coarse country code from `CF-IPCountry` when provided by a trusted proxy.
- HTTP response byte totals by the same low-cardinality labels.
- HTTP request duration histograms by the same low-cardinality labels.
- Total successfully created and read memos.
- Unlabeled service-wide gauges for charged ciphertext bytes and memo count,
  configured limits, SQLite main/freelist/WAL bytes, and filesystem
  availability/reserve.

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
- `POST /api/revoke-memo`

The public browser flow uses these endpoints. Expired memo cleanup runs internally at startup and hourly after that.

## Security Model

For the detailed technical model, see [docs/security-model.md](docs/security-model.md).

- Plaintext memo content never leaves the browser.
- The memo password is generated and displayed only in the browser.
- The server stores ciphertext, expiry time, memo ID, a deletion-token hash, and a sender revoke-token hash.
- Failed or invalid reads use generic responses to avoid memo enumeration.
- API rate limits use short and long windows per normalized client network. Normal API actions, including delete and revoke admission before body or database work, are limited to 10/minute and 100/hour; failed access attempts are additionally limited to 10/minute and 20/hour.
- Expired memo cleanup runs at startup and hourly after that.

## License

GPL-3.0. See [LICENSE](LICENSE).

## Author

Timo Heimonen <timo.heimonen@proton.me>
