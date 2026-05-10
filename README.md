# securememo.app

securememo.app is a hosted service for sharing encrypted memos with automatic deletion. The browser encrypts every memo with AES-256-GCM before upload, so the server stores only ciphertext and deletion metadata. Memos are deleted after a successful read confirmation or after their configured expiry time.

## Features

- Client-side encryption with AES-256-GCM and PBKDF2 key derivation.
- Random browser-generated passwords that are never sent to the server.
- Delete-on-read flow with a client-side deletion token.
- Expiry options: 8 hours, 1 day, 2 days, 1 week, or 30 days.
- SQLite storage with WAL mode and automatic cleanup.
- Strict security headers, input validation, timing delays, and generic access-denied responses.
- No accounts, no analytics, no ads.
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
