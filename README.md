# securememo.app

securememo.app is a service for sharing short-lived encrypted memos. The browser
encrypts memo contents before upload and does not send plaintext or the memo
password to the server. Stored memo records contain ciphertext and only the
metadata needed for retrieval, expiry, and deletion.

## Highlights

- AES-256-GCM encryption with browser-generated passwords.
- Memos expire after 8 hours, 1 day, 2 days, 1 week, or 2 weeks.
- After successful local decryption, the normal client requests deletion; senders
  can revoke unread memos.
- No accounts, cookies, user analytics, behavioral tracking, ads, or third-party beacons.
- A self-contained Go service with SQLite storage, abuse controls, and a localized embedded frontend.

## Build and run

The SQLite driver uses CGO, so Go, CGO support, and a C compiler are required.

```sh
go test ./...
go build -o securememo ./cmd/securememo
```

Example production environment:

```sh
export SECUREMEMO_ADDR=127.0.0.1:3005
export SECUREMEMO_DB_PATH=/var/lib/securememo/securememo.sqlite
export PUBLIC_ORIGIN=https://securememo.example.com
export SECUREMEMO_TRUST_PROXY_HEADERS=false
export SECUREMEMO_STORAGE_LIMIT_BYTES=100000000000
export SECUREMEMO_MIN_FREE_DISK_BYTES=5000000000

./securememo
```

Deployment notes:

- Only set `SECUREMEMO_TRUST_PROXY_HEADERS=true` for a trusted same-host
  Cloudflare Tunnel connected to the loopback-bound service. Keep the origin private.
- Run only one backend process per SQLite database.
- The SQLite page limit excludes WAL files, backups, and other filesystem use;
  keep the free-space reserve enabled and enforce a suitable volume or hosting quota.

For full configuration and deployment guidance, see
[Go runtime notes](docs/go-runtime.md).

## Optional metrics

Set `SECUREMEMO_METRICS_ADDR`, for example to `127.0.0.1:9305`, to expose
Prometheus-compatible operational metrics on a separate private listener. Do not
publish `/metrics` on the application origin. Metrics contain aggregate request
and storage measurements and can include coarse country labels from the trusted
proxy. They exclude memo contents, passwords, tokens, memo IDs, IP addresses,
user agents, cookies, full URLs or query strings, and persistent identifiers.

## Security and privacy

- The server stores ciphertext, expiry data, a memo ID, and hashes of the deletion
  and sender revoke tokens.
- Passwords should be shared separately from memo URLs.
- Delete-on-read is client-confirmed, not cryptographically guaranteed: a modified
  client can skip the deletion request. Memos become unreadable at expiry, and
  scheduled cleanup later removes expired rows.
- Invalid reads use generic responses to reduce memo enumeration.

For trust boundaries, cryptographic details, limitations, and operational
protections, see the [security model](docs/security-model.md).

## API

The browser flow uses `POST /api/create-memo`, `POST /api/read-memo?id=<memo_id>`,
`POST /api/confirm-delete`, and `POST /api/revoke-memo`.

Localization contributors can find the translation workflow in
[Localization](docs/localization.md).

## License and author

GPL-3.0. See [LICENSE](LICENSE). Created by Timo Heimonen
<timo.heimonen@proton.me>.
