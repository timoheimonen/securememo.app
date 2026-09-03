# securememo.app Security Model and Message Lifecycle

This document describes the security model used by securememo.app for creating,
storing, reading, decrypting, and deleting encrypted memos. It is intended for
maintainers, reviewers, and technically oriented users who want to understand
what the service protects, what it does not protect, and where its trust
boundaries are.

## Scope

securememo.app is designed for short-lived encrypted memos. The browser encrypts
memo contents before upload. For each memo, the server stores ciphertext plus
the metadata needed to retrieve, expire, account for, and delete it.

This document covers the browser and server behavior implemented by this
repository. It does not cover hosting-provider controls, endpoint device
security, user sharing practices, or independent audits of the runtime
environment.

## Security Goals

- Plaintext memo contents must not leave the browser during normal operation.
- Memo passwords must be generated and handled client-side, not sent to or
  stored by the server.
- Stored memo payloads must remain confidential if the database is disclosed
  without the corresponding memo password.
- Memo payloads must be integrity-protected so tampering is detected during
  decryption.
- Memo IDs should have high entropy, and failed memo access should not reveal
  whether an ID was invalid, missing, expired, or paired with the wrong deletion
  capability.
- Memos should be removed after a successful client-side read confirmation.
  Expired memos should become unreadable immediately and be removed by scheduled
  cleanup.
- Application code must not use cookies, user tracking, analytics, advertising,
  third-party beacons, or persistent browser identifiers, and the service must
  not require accounts.
- Sensitive browser state should be kept only for the active page lifecycle and
  cleared on navigation on a best-effort basis.

## Non-Goals

securememo.app is not digital rights management. A recipient who can decrypt a
memo can copy it, screenshot it, save it, or use a modified client.

The service also cannot protect plaintext if the sender's or recipient's device
is compromised, if the page's JavaScript is replaced by malicious code, or if the
memo password and memo URL are shared through the same compromised channel.

## Trust Boundaries

The main trust boundary is between the browser and the server.

The browser is trusted to:

- Generate the memo password, deletion token, and sender revoke token.
- Encrypt plaintext before upload and decrypt ciphertext after a user provides
  the memo password, using the bundled cryptographic worker.
- Send the deletion token back to the server after successful decryption.
- Keep sensitive forms disabled until their JavaScript handlers and required
  cryptographic capabilities are ready.
- Clear displayed secrets and cancel active work when the page is deactivated.

The server is trusted to:

- Store encrypted memo payloads and the metadata needed to retrieve, expire,
  account for, and delete them.
- Enforce memo ID validation, expiry, rate limits, and origin checks.
- Delete memos when presented with the correct deletion token or sender revoke token.
- Periodically remove expired memos.

The server is not trusted with plaintext memo contents or memo passwords during
normal operation.

## Message Lifecycle

### 1. Creation

When a user creates a memo, the browser:

1. Reads the plaintext memo from the form.
2. Generates a random memo password.
3. Generates a random deletion token.
4. Generates a random sender revoke token.
5. Creates an encrypted payload containing the memo text and deletion token in a
   dedicated Web Worker.
6. Uploads the encrypted payload, expiry setting, deletion-token hash, and
   sender revoke-token hash to the server.

The server generates a random memo ID and stores:

- Memo ID.
- Encrypted payload.
- Creation timestamp.
- Expiry timestamp.
- Hash of the deletion token.
- Hash of the sender revoke token.

The server does not receive the plaintext memo, memo password, raw deletion
token, or raw sender revoke token during creation.

The normal client limits plaintext input to 5,000 characters. This is a browser
limit rather than a server-side plaintext check, because the server cannot
inspect the encrypted content.

### 2. Sharing

The browser displays three values to the sender:

- Memo URL, containing the memo ID.
- Memo password, generated separately from the URL.
- Revoke URL, containing the memo ID in the query string and the sender revoke
  token in the URL fragment.

The password should be shared through a different channel from the URL. If the
same attacker obtains both the memo URL and the memo password before deletion or
expiry, the attacker can decrypt the memo.

The revoke URL should be kept private by the sender. Anyone who has both the memo
ID and the sender revoke token can delete the unread memo. The revoke token is
placed in the URL fragment so it is not sent to the server during normal page
loading; the browser sends it only when the sender confirms revocation.

The creation page clears the plaintext, password, memo URL, and revoke URL when
the page is deactivated. Values explicitly copied by the user may remain in the
operating-system clipboard and are outside the page's control.

### 3. Reading

When a recipient opens a memo URL, the browser asks for the memo password. The
browser then requests the encrypted payload from the server by memo ID.

If the memo ID is valid and the memo has not expired, the server returns the
stored ciphertext. The server still does not receive the password.

The browser derives the encryption key from the provided password and attempts to
decrypt the payload in a dedicated Web Worker. If decryption succeeds, the
browser renders the memo as text, clears the password input, displays the memo
content, and extracts the deletion token from the decrypted payload.

### 4. Deletion Confirmation

After successful decryption, the normal browser client sends the memo ID and raw
deletion token to the server. The server hashes the provided deletion token and
compares it with the stored deletion-token hash using constant-time comparison.
If the token is valid, the server deletes the memo.

If the deletion confirmation fails due to a transient error, the browser makes
up to three attempts, with three seconds between attempts, while the page remains
active. Navigating away aborts the request and retry timer and clears application
references to the deletion token. If no confirmation reached the server, the
memo remains available until another valid confirmation, sender revocation, or
expiry.

### 5. Sender Revocation

The sender can delete an unread memo by opening the private revoke URL and
confirming deletion. The browser reads the sender revoke token from the URL
fragment, immediately removes the fragment from the visible URL, and sends the
memo ID plus raw sender revoke token to the server only after confirmation.

The server hashes the provided sender revoke token and compares it with the
stored sender revoke-token hash using constant-time comparison. If the token is
valid and the memo is still active, the server deletes the memo.

Leaving the revoke page aborts an active request and clears the memo ID and
revoke token from application state. Restoring the page from the back-forward
cache does not restore the cleared revoke capability.

### 6. Expiry Cleanup

Each memo expires after 8, 24, 48, 168, or 336 hours, as selected at creation.
Expired memos are no longer returned by the read endpoint. Cleanup removes
expired rows in bounded batches at startup and once per hour while the service is
running.

## Secret and Identifier Generation

Memo passwords and deletion tokens are generated in the cryptographic worker
with `crypto.getRandomValues` and rejection sampling. Each is a 32-character
string drawn from uppercase letters, lowercase letters, and digits.

Each generated value has approximately 190 bits of entropy:

```text
log2(62^32) ~= 190.5 bits
```

The sender revoke token contains 32 random bytes encoded as a 43-character
unpadded Base64URL string, providing 256 bits of entropy. The server independently
generates memo IDs as 40 characters from a 64-symbol URL-safe alphabet, providing
240 bits of entropy.

The password and raw tokens are displayed or used by the browser as needed, but
are not sent to the server during creation. Only hashes of the deletion and
sender revoke tokens are uploaded. These hashes are SHA-256 digests encoded with
standard Base64; their inputs are random high-entropy capabilities.

## Key Derivation

The browser derives an AES key from the memo password using crypto configuration
v1. Version 1 uses PBKDF2 with SHA-256, a per-memo random salt, and 3,500,000
iterations. New uploads must carry the `v1:` prefix. For compatibility, the read
client interprets stored ciphertext without any version prefix as v1; unknown
versioned payloads fail decryption.

PBKDF2 primarily protects weaker user-provided passwords from fast offline
guessing. In securememo.app, the generated memo password already has high
entropy, so the security margin mainly comes from the random password. PBKDF2
still adds useful defense in depth and preserves compatibility with the Web
Crypto API.

## Encryption

Memo payloads are encrypted in the browser with AES-GCM using a 256-bit key and
a random 96-bit IV.

The encrypted payload contains:

- Random salt.
- Random IV.
- AES-GCM ciphertext and authentication tag.

The current wire format is `v1:` followed by canonical, padded standard Base64
of `salt || IV || ciphertext-and-tag`. New create requests must use this format,
must decode to at least the 16-byte salt, 12-byte IV, and 16-byte GCM tag, and are
capped at 41,000 bytes including the version prefix.

AES-GCM provides confidentiality and integrity for the encrypted payload. If an
attacker modifies the ciphertext, salt, IV, or authentication tag, decryption
should fail.

The plaintext payload currently contains:

- Memo message.
- Deletion token.

Including the deletion token inside the encrypted payload means the normal
client only learns the raw deletion token after successfully decrypting the
memo.

## Browser Secret Lifecycle

The create and read pages fail closed until their local protections are ready.
Their sensitive fieldsets are disabled in the initial HTML, secret inputs do not
have `name` attributes that a native form submission could serialize, and the
JavaScript submit guards are attached before the controls are enabled. If the
required Worker or AbortController capabilities are unavailable, the forms stay
disabled. Autocomplete attributes also ask the browser not to retain memo text,
generated links, or passwords.

Each create or read cryptographic operation runs in a new dedicated Web Worker;
there is no main-thread cryptographic fallback. The worker is terminated after
success, failure, or cancellation. Its script URL must resolve to the exact
same-origin `/js/memo-crypto-worker.js` path with at most one validated version
parameter. The Content Security Policy restricts worker sources and permits only
the named `securememo-crypto-worker` Trusted Types policy for script URLs.

When a create, read, or revoke page receives `pagehide`, it increments a
lifecycle generation, aborts active fetches, terminates active workers, cancels
deletion retries, and clears the sensitive DOM values and application references
held by that page. `pageshow` resets the page instead of restoring secrets from
the back-forward cache. Generation checks prevent a stale asynchronous result
from repopulating state after it has been cleared.

This cleanup shortens the useful lifetime of plaintext, passwords, generated
links, and deletion capabilities, but it is best-effort reference and DOM
clearing rather than guaranteed memory zeroization. If a create request commits
immediately before navigation cancels the client operation, the newly generated
password and links can be lost while the encrypted memo remains stored until
expiry.

Sensitive memo pages and API JSON responses use `Cache-Control: no-store`.
Decrypted memo content is assigned as text rather than interpreted as HTML.

## Storage Model

The server stores memo records in SQLite. Stored memo data includes:

- Random memo ID.
- Encrypted message payload.
- Creation timestamp.
- Expiry timestamp.
- Deletion-token hash.
- Sender revoke-token hash.

The server does not store plaintext memo contents, memo passwords, raw deletion
tokens, or raw sender revoke tokens.

The database is still sensitive. A database disclosure exposes ciphertext,
expiry data, deletion-token hashes, sender revoke-token hashes, and aggregate
lifetime counters. Confidentiality of memo contents depends on the secrecy and
strength of the memo password.

The backend maintains a service-wide storage budget. Each memo creation reserves
the exact ciphertext byte length and one memo slot in the same SQLite transaction
as the insert. Metadata overhead is not part of the logical byte charge, but the
SQLite main-file page ceiling also limits that overhead. Deletion, revocation,
and expiry cleanup release their exact charges only when the corresponding delete
commits. Startup reconciles the aggregate counters from every physically retained
memo, including expired rows not yet removed by cleanup.

The default decimal 100 GB byte limit derives a memo-count limit of
`floor(limit / 41000)`, or 2,439,024 memos at the default, and also configures the
SQLite main-file page ceiling. Setting the byte limit to zero disables the byte,
memo-count, and page limits but keeps accounting enabled.

A separate default 5 GB free-filesystem reserve preserves headroom for WAL and
recovery work. A create requires room for the incoming ciphertext plus 1 MB of
write headroom; a persistent lifetime-counter update requires the same 1 MB
headroom. Valid reads, deletions, revocations, and cleanup remain available in
drain mode. Expiry cleanup uses transactions of at most 250 rows and truncating
WAL checkpoints between batches.

These controls bound aggregate storage abuse but do not inspect encrypted
content or identify senders. The deployment intentionally runs one backend
writer per SQLite database. Cloudflare and application rate limits reduce the
rate at which distributed clients can consume the finite budget; they do not
replace it.

When upgrading a schema-v1 database, the schema-v2 migration removes the former
persistent rate-limit table and its historical remnants. Before dropping the
table, startup requires free space for twice the larger of the physical and
logical database size plus the configured reserve. It then enables full SQLite
`secure_delete`, drops the table, runs `VACUUM`, restores the configured deletion
mode, and truncates the WAL. If the capacity check fails, startup stops before
dropping the legacy table. This database-level scrub does not cover external
backups, snapshots, or storage media behavior.

## Delete-on-Read Semantics

The phrase "delete on read" means:

The normal securememo.app browser client requests deletion after it has
successfully decrypted and displayed the memo.

This is intentionally more precise than saying the server deletes a memo as soon
as the ciphertext is fetched. The server cannot know whether decryption
succeeded, because the password is never sent to the server and decryption
happens in the browser.

This has an important limitation: a recipient who has both the memo URL and the
memo password can technically fetch the ciphertext, decrypt it using their own
code, and choose not to send the deletion confirmation. In that case, the memo
will remain available until another valid deletion confirmation is sent or until
the memo expires.

Therefore, delete-on-read is a client-confirmed deletion behavior, not a
cryptographic guarantee against a malicious or modified recipient.

## Metadata and Privacy

The application does not create accounts or set, read, repurpose, or depend on
cookies. It also avoids browser-side analytics, advertising tags, third-party
beacons, behavioral profiling, and persistent browser identifiers.

Operational data is limited to what is needed to run and protect the service,
such as normalized route metrics, status codes, coarse country labels received
through the explicitly trusted loopback proxy boundary, and process-local
rate-limit counters.

Even with encrypted memo contents, some metadata can still exist during normal
operation:

- Memo creation time.
- Expiry time.
- Encrypted memo size within server-side validation limits.
- A normalized source network address processed transiently with a
  process-random HMAC key to derive an opaque RAM-only rate-limit bucket key.
  The raw address is not retained in the limiter.
- Whether a memo has been deleted or expired.

### Operational metrics

If configured, a separate Prometheus-compatible listener exposes request counts,
response-byte totals, and duration histograms using low-cardinality method,
normalized-route, status, and country labels. A country label is accepted only
as exactly one two-letter ASCII `CF-IPCountry` value received from the explicitly
trusted loopback proxy boundary; otherwise it is `unknown`.

For metrics, SQLite persists only aggregate lifetime counts for successful memo
creation and successful ciphertext retrieval. The latter does not prove that
browser-side decryption succeeded. Unlabeled gauges report aggregate ciphertext
charges, memo counts and limits, SQLite main/freelist/WAL sizes, and filesystem
capacity. The shared in-memory metrics lock is released before serialized
lifetime-counter writes, and those database operations use bounded timeouts, so
a blocked write does not hold the lock used by unrelated request metrics.

Metrics do not contain memo contents, passwords, deletion or revoke tokens, memo
IDs, full URLs, query strings, IP addresses, user agents, cookies, session IDs,
email addresses, or persistent user identifiers. Routes are normalized before
labeling, and storage gauges have no per-memo labels or records.

The metrics listener has no application-provided authentication or TLS. It must
be bound to a private interface or protected by deployment controls and must not
be exposed on the public application origin. Aggregate values and their changes
can still reveal service activity or approximate payload sizes to anyone who can
scrape them.

## Operational Protections

### Request validation and response behavior

Every memo API action requires POST and a non-empty `Origin` that matches the
configured allowlist. Requests must identify JSON content, are limited to 64 KiB,
and reject unknown JSON fields. Memo IDs, expiry choices, ciphertext envelopes,
and deletion capabilities receive format and size validation. Origin checks are
a browser security boundary, not authentication; a non-browser client can choose
its own `Origin` header.

The API returns stable error codes that the browser maps through an explicit
translation allowlist instead of displaying raw server error text. Invalid,
missing, expired, or ambiguous memo reads and failed deletion or revocation
capabilities use the same HTTP 404 `MEMO_ACCESS_DENIED` response. A valid active
memo still returns HTTP 200 and ciphertext, so the service does not claim to hide
the existence of an active ID from someone who already possesses that
high-entropy ID.

Most JSON responses after admission, including successful, validation, database,
capacity, and generic access-denied responses, receive a cryptographically random
70–110 ms delay. Method rejections, origin rejections, invalid trusted-proxy
identity rejections, rate-limit rejections, and OPTIONS responses return without
that delay. The delay adds timing noise around memo-state-sensitive behavior; it
does not make total request handling constant-time.

The server also applies HSTS, frame denial, same-origin opener and resource
policies, a restrictive Permissions Policy, MIME sniffing protection, and the
Content Security Policy described in the browser lifecycle section.

### Rate limiting and proxy identity

Rate limits are separated by operation and apply both minute and hour windows:

- Creation: 5 requests per minute and 30 per hour.
- Read, deletion confirmation, and sender revocation: 10 requests per minute and
  100 per hour for each operation.
- Failed deletion or revocation capabilities: an additional 5 attempts per
  minute and 20 per hour. Read misses do not use this failure bucket.

Operation admission occurs before JSON parsing. Delete and revoke failures are
also counted before returning lookup or capability failures. Both windows are
updated atomically, and a rejection returns the longest applicable `Retry-After`.

The limiter holds at most 65,536 active entries in process memory. Bucket keys are
domain-separated by action and window and derived with a random per-process HMAC
key; raw network identities and counter state are never written to SQLite. Active
entries are not evicted to admit new attacker-controlled identities. If capacity
is exhausted, new identities fail closed with a rate-limit response until an
entry expires. Each backend process enforces an independent allowance, and all
active windows reset on process restart.

By default, the socket peer address is the rate-limit identity and forwarded
headers are ignored. With `SECUREMEMO_TRUST_PROXY_HEADERS=true`, a loopback peer
must provide exactly one valid `CF-Connecting-IP`. A Cloudflare Pseudo IPv4 value
in `240.0.0.0/4` additionally requires exactly one valid
`CF-Connecting-IPv6`, which becomes the identity. Missing, malformed, duplicated,
or comma-separated values fail closed; `X-Forwarded-For` is never a fallback.
Forwarded headers from non-loopback peers remain ignored. IPv4 addresses are
canonicalized and IPv6 identities are grouped by `/64`.

Trusted-proxy mode therefore treats every process able to reach the local
listener as part of the deployment trust boundary. The application listener must
remain bound to loopback and must not be publicly exposed in this mode.

### Capacity behavior

When storage capacity or the free-space reserve is reached, new creates fail with
HTTP 507 and the stable `STORAGE_LIMIT_REACHED` code. Existing memos remain
readable, while valid deletion, revocation, and cleanup paths continue to free
capacity. Rate-limit identity and counter state remain independent of disk
capacity because they exist only in RAM.

These protections reduce abuse and accidental exposure, but they do not replace
the client-side encryption model.

## Important Limitations

- If malicious JavaScript is served to the browser, it can read plaintext before
  encryption or after decryption.
- If a browser extension, endpoint malware, or compromised operating system can
  inspect page contents, it can read plaintext.
- Worker termination, request cancellation, DOM/reference clearing, and
  autocomplete hints do not guarantee memory erasure. JavaScript runtimes,
  browser internals, operating-system services, and the clipboard may retain
  copies outside the application's control.
- If the memo URL and password are sent through the same compromised channel,
  the memo can be decrypted by whoever controls that channel.
- If the recipient is malicious or uses a modified client, they can retain the
  plaintext and can choose not to send the deletion confirmation.
- Server-side deletion does not guarantee removal from all backups, filesystem
  remnants, hosting snapshots, logs outside this application, or external
  infrastructure.
- Expiry makes a memo unavailable to the read API, but its database row remains
  until the next startup or hourly cleanup pass completes.
- AES-GCM protects the encrypted payload, but it does not hide metadata such as
  approximate payload size or memo lifetime.
- A finite global quota bounds disk growth but does not prevent distributed
  clients from temporarily filling that quota and denying new memo creation.
- SQLite `max_page_count` does not cap WAL files, backups, snapshots, temporary
  files, or other processes on the same filesystem.
