# securememo.app

securememo.app is a small self-hosted service for sharing encrypted, self-destructing memos. The browser encrypts every memo with AES-256-GCM before upload, so the server stores only ciphertext and deletion metadata. Memos are deleted after a successful read confirmation or after their configured expiry time.

## Features

- Client-side encryption with AES-256-GCM and PBKDF2 key derivation.
- Random browser-generated passwords that are never sent to the server.
- Delete-on-read flow with a client-side deletion token.
- Expiry options: 8 hours, 1 day, 2 days, 1 week, or 30 days.
- Local SQLite storage with WAL mode and automatic cleanup.
- Strict security headers, input validation, timing delays, and generic access-denied responses.
- No accounts, no analytics, no ads.
- Localized generated frontend assets embedded into the Go binary.

## Build

The SQLite driver uses CGO, so the build host needs Go, CGO support, and a C compiler.

```sh
go test ./...
go build -o securememo ./cmd/securememo
```

## Runtime

Minimal environment:

```sh
SECUREMEMO_ADDR=127.0.0.1:3000
SECUREMEMO_DB_PATH=/var/lib/securememo/securememo.sqlite
PUBLIC_ORIGIN=https://securememo.example.com
```

Run:

```sh
./securememo
```

The service should listen on localhost only when exposed through a tunnel or reverse proxy.

## cloudflared

Example tunnel ingress:

```yaml
ingress:
  - hostname: securememo.example.com
    service: http://127.0.0.1:3000
  - service: http_status:404
```

The app uses `CF-Connecting-IP`, `X-Forwarded-For`, or the socket remote address only for abuse-rate-limit identity. Keep the service bound to `127.0.0.1` when trusting proxy headers.

## Project Structure

```text
cmd/securememo/              Go entrypoint
internal/config/             Environment configuration
internal/store/              SQLite schema, queries, cleanup, rate-limit storage
internal/memo/               Memo API handlers
internal/security/           Security headers, validation, timing helpers
internal/server/             Routing, localization paths, embedded asset serving
internal/frontend/           Embedded generated frontend assets
docs/                        Self-hosting notes
```

## API

- `POST /api/create-memo`
- `POST /api/read-memo?id=<memo_id>`
- `POST /api/confirm-delete`
- `POST /api/cleanup`

The public browser flow uses the first three endpoints. Cleanup also runs periodically inside the process.

## Security Model

- Plaintext memo content never leaves the browser.
- The memo password is generated and displayed only in the browser.
- The server stores ciphertext, expiry time, memo ID, and a deletion-token hash.
- Failed or invalid reads use generic responses to avoid memo enumeration.
- Expired memo cleanup runs at startup and hourly after that.

## License

GPL-3.0. See [LICENSE](LICENSE).

## Author

Timo Heimonen
