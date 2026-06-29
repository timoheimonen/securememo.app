# securememo.app Security Model and Message Lifecycle

This document describes the security model used by securememo.app for creating,
storing, reading, decrypting, and deleting encrypted memos. It is intended for
maintainers, reviewers, and technically oriented users who want to understand
what the service protects, what it does not protect, and where its trust
boundaries are.

## Scope

securememo.app is designed for short-lived encrypted memos. The browser encrypts
memo contents before upload, and the server stores only ciphertext plus the
metadata needed to retrieve, expire, and delete the memo.

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
- The server should avoid exposing whether a guessed memo ID exists.
- Memos should be removed after a successful client-side read confirmation or
  after expiry.
- The service should avoid user tracking, accounts, cookies, analytics,
  advertising, third-party beacons, and persistent browser identifiers.

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
- Encrypt plaintext before upload.
- Decrypt ciphertext after a user provides the memo password.
- Send the deletion token back to the server after successful decryption.

The server is trusted to:

- Store only encrypted memo payloads and deletion metadata.
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
5. Creates an encrypted payload containing the memo text and deletion token.
6. Uploads the encrypted payload, expiry setting, deletion-token hash, and
   sender revoke-token hash to the
   server.

The server generates a random memo ID and stores:

- Memo ID.
- Encrypted payload.
- Expiry timestamp.
- Hash of the deletion token.
- Hash of the sender revoke token.

Current memo IDs are 40-character URL-safe random strings.

The server does not receive the plaintext memo, memo password, raw deletion
token, or raw sender revoke token during creation.

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

### 3. Reading

When a recipient opens a memo URL, the browser asks for the memo password. The
browser then requests the encrypted payload from the server by memo ID.

If the memo ID is valid and the memo has not expired, the server returns the
stored ciphertext. The server still does not receive the password.

The browser derives the encryption key from the provided password and attempts to
decrypt the payload locally. If decryption succeeds, the browser displays the
memo content and extracts the deletion token from the decrypted payload.

### 4. Deletion Confirmation

After successful decryption, the normal browser client sends the memo ID and raw
deletion token to the server. The server hashes the provided deletion token and
compares it with the stored deletion-token hash using constant-time comparison.
If the token is valid, the server deletes the memo.

If the deletion confirmation fails due to a transient error, the browser retries
the deletion request a small number of times.

### 5. Sender Revocation

The sender can delete an unread memo by opening the private revoke URL and
confirming deletion. The browser reads the sender revoke token from the URL
fragment, removes the fragment from the visible URL, and sends the memo ID plus
raw sender revoke token to the server.

The server hashes the provided sender revoke token and compares it with the
stored sender revoke-token hash using constant-time comparison. If the token is
valid and the memo is still active, the server deletes the memo.

### 6. Expiry Cleanup

Each memo has an expiry timestamp selected at creation time. Expired memos are no
longer returned by the read endpoint. A cleanup process removes expired memos at
startup and periodically while the service is running.

## Password Generation

Memo passwords are generated in the browser with `crypto.getRandomValues`. The
current password format is a 32-character string drawn from uppercase letters,
lowercase letters, and digits.

This gives approximately 190 bits of entropy for generated passwords:

```text
log2(62^32) ~= 190.5 bits
```

The password is displayed to the sender but is not sent to the server.

## Key Derivation

The browser derives an AES key from the memo password using the only supported
memo crypto configuration, v1. Version 1 uses PBKDF2 with SHA-256, a per-memo
random salt, and 3,500,000 iterations. Versioned payloads outside v1 fail
decryption.

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

AES-GCM provides confidentiality and integrity for the encrypted payload. If an
attacker modifies the ciphertext, salt, IV, or authentication tag, decryption
should fail.

The plaintext payload currently contains:

- Memo message.
- Deletion token.

Including the deletion token inside the encrypted payload means the normal
client only learns the raw deletion token after successfully decrypting the
memo.

## Storage Model

The server stores memo records in SQLite. Stored memo data includes:

- Random memo ID.
- Encrypted message payload.
- Expiry timestamp.
- Deletion-token hash.
- Sender revoke-token hash.

The server does not store plaintext memo contents, memo passwords, raw deletion
tokens, or raw sender revoke tokens.

The database is still sensitive. A database disclosure exposes ciphertext,
expiry data, deletion-token hashes, sender revoke-token hashes, and rate-limit
state. Confidentiality of memo contents depends on the secrecy and strength of
the memo password.

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

The service intentionally avoids accounts, cookies, browser-side analytics,
advertising tags, third-party beacons, and behavioral profiling.

Operational data is limited to what is needed to run and protect the service,
such as normalized route metrics, status codes, coarse country labels when
provided by trusted infrastructure, and rate-limit counters. Operational metrics
must not include memo contents, memo passwords, deletion tokens, memo IDs, full
URLs, query strings, IP addresses, user agents, cookies, session IDs, email
addresses, or persistent user identifiers.

Even with encrypted memo contents, some metadata can still exist during normal
operation:

- Memo creation time.
- Expiry time.
- Memo size within server-side validation limits.
- Hashed source network address used for abuse rate limiting.
- Whether a memo has been deleted or expired.

## Operational Protections

The application uses several server-side protections around the encrypted memo
flow:

- Strict HTTP method and JSON content-type handling.
- Request body size limits.
- Memo ID, expiry, ciphertext, and deletion-token validation.
- Origin checks for API requests.
- Generic access-denied responses for missing, expired, invalid, or unauthorized
  memo reads.
- Rate limits for create, read, delete, and failed-access paths.
- Security headers, including a restrictive Content Security Policy.
- Automatic cleanup of expired memos and expired rate-limit records.

These protections reduce abuse and accidental exposure, but they do not replace
the client-side encryption model.

## Important Limitations

- If malicious JavaScript is served to the browser, it can read plaintext before
  encryption or after decryption.
- If a browser extension, endpoint malware, or compromised operating system can
  inspect page contents, it can read plaintext.
- If the memo URL and password are sent through the same compromised channel,
  the memo can be decrypted by whoever controls that channel.
- If the recipient is malicious or uses a modified client, they can retain the
  plaintext and can choose not to send the deletion confirmation.
- Server-side deletion does not guarantee removal from all backups, filesystem
  remnants, hosting snapshots, logs outside this application, or external
  infrastructure.
- AES-GCM protects the encrypted payload, but it does not hide metadata such as
  approximate payload size or memo lifetime.
