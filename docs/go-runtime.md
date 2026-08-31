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
Set `SECUREMEMO_TRUST_PROXY_HEADERS=true` only when the service is behind a trusted
local reverse proxy that overwrites `CF-Connecting-IP` and `X-Forwarded-For`.

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
