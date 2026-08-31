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
SECUREMEMO_STORAGE_LIMIT_BYTES=100000000000
SECUREMEMO_MIN_FREE_DISK_BYTES=5000000000
```

By default, the service uses the socket remote address for abuse-rate-limit identity.
For `cloudflared` running on the same host, bind the service to loopback and set
`SECUREMEMO_TRUST_PROXY_HEADERS=true`. The backend then trusts exactly one valid
`CF-Connecting-IP` only when the immediate socket peer is loopback. A missing,
malformed, duplicated, or comma-separated value fails closed; `X-Forwarded-For` is
not accepted as a fallback. Forwarded headers from non-loopback peers are ignored.
Keep the origin listener private, since any process that can connect through the
trusted local boundary could otherwise forge the header. Invalid boolean values make
startup fail instead of silently disabling proxy mode.

Rate-limit identities use canonical IPv4 addresses and IPv6 `/64` networks. The
minute and hour rules commit together in one SQLite transaction and return the
longest applicable `Retry-After`. A bounded, concurrency-safe in-memory fallback
enforces the same rules if the filesystem reserve prevents SQLite rate-limit writes;
active entries are never evicted to admit attacker-controlled identities.

For a systemd service that already loads `/etc/securememo/securememo.env` through
`EnvironmentFile=`, add the setting directly to that file:

```sh
SECUREMEMO_TRUST_PROXY_HEADERS=true
```

Restart the service after changing the environment file. A systemd daemon reload is
not required unless the unit file itself also changed. If the unit has no environment
file, use a drop-in instead:

```ini
# /etc/systemd/system/securememo.service.d/cloudflare-tunnel.conf
[Service]
Environment=SECUREMEMO_TRUST_PROXY_HEADERS=true
```

Apply a new or changed drop-in with `sudo systemctl daemon-reload`, then restart
`securememo.service`. On the next start, the service logs the selected rate-limit
client-identity mode. The expected message contains `CF-Connecting-IP from loopback
proxy peers`.

The storage byte limit is a decimal byte value. It defaults to 100 GB, controls
the retained-ciphertext quota and SQLite `max_page_count`, and derives a memo
limit with `floor(bytes / 41000)`. A positive value smaller than one SQLite
database plus its metadata leaves the service in create-drain mode. `0` disables
the byte, memo-count, and page limits without disabling usage accounting.

The free-disk reserve defaults to decimal 5 GB and is checked using filesystem
space available to the service process. Memo creation, attacker-keyed rate-limit
writes, and lifetime-counter writes stop before consuming the reserve. `0`
disables this circuit breaker. It does not replace a hosting or volume quota
because SQLite WAL, backups, snapshots, temporary files, and unrelated processes
are outside the main-file page limit.

Only one securememo backend process may write a given SQLite database. Startup
reconciles the global usage row from all retained memos, including expired rows
that cleanup has not yet removed. If a lowered limit is already exceeded, the
backend starts in drain mode: creates return HTTP 507 / `STORAGE_LIMIT_REACHED`,
but reads, revocation, deletion confirmation, and cleanup remain available.
Cleanup deletes expired memo and rate-limit rows in bounded batches and performs
a truncating WAL checkpoint between batches. Deletion-created freelist pages may
be reused under the logical quota even when the main file is still larger than a
new lower limit; `max_page_count` prevents further file growth.
