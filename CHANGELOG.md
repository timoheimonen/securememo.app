# Changelog

All notable changes to this project are documented here.

Version identifiers match the application `assetVersion`.

## 20260903b - 2026-09-03

### Changed
- Clarify across project documentation and the Privacy Notice that securememo.app does not use `cf_clearance` or any other cookies, removing the obsolete conditional cookie exception.
- Update the security model for worker-only cryptography, fail-closed secret forms, page-lifecycle clearing, response timing, operation-specific rate limits, trusted-proxy handling, storage controls, and metrics boundaries.
- Streamline the README around essential setup, deployment, privacy, and security guidance while linking detailed documentation.

## 20260903a - 2026-09-03

### Security
- Return method, origin, invalid trusted-proxy identity, and rate-limit rejection errors without the randomized response delay, while retaining timing equalization for state-sensitive memo responses.
- Persist lifetime memo counters only after releasing the shared in-memory metrics lock, preventing SQLite contention from blocking unrelated request metrics.
- Keep rate-limit identities and counters only in bounded process memory, keyed by a process-random HMAC; schema v2 capacity-checks and vacuums the database while securely removing the legacy persistent `rate_limits` table and prior freelist remnants.
- Accept `CF-IPCountry` metrics only from a single well-formed header supplied through the explicitly trusted loopback proxy boundary.
- Wipe memo plaintext, passwords, generated links, and revoke capabilities on page navigation; abort deletion retries; and keep cryptography in terminable workers so stale asynchronous work cannot retain or restore cleared secrets.

## 20260831b - 2026-08-31

### Security
- Harden Cloudflare Tunnel client identification by accepting one canonical `CF-Connecting-IP` only from the explicitly trusted loopback proxy boundary, rejecting ambiguous values, removing the spoofable `X-Forwarded-For` fallback, and grouping IPv6 clients by `/64`.
- Apply delete and revoke admission limits before request parsing and memo lookup.

### Changed
- Use cost-aware backend limits: memo creation 5/minute and 30/hour; read, delete, and revoke 10/minute and 100/hour; failed delete or revoke attempts 5/minute and 20/hour.
- Commit minute and hour rate-limit counters atomically, return the longest blocking `Retry-After`, and use a bounded concurrency-safe in-memory fallback when disk-reserve protection prevents SQLite counter writes.
- Reject invalid `SECUREMEMO_TRUST_PROXY_HEADERS` values during startup instead of silently disabling proxy-header trust.
- Log the selected client-identity mode at startup, including an actionable warning when proxy-header trust is disabled behind Cloudflare Tunnel.
- Disclose Cloudflare's strictly necessary `cf_clearance` security cookie and session verification in the Privacy Notice.
- Add an atomic service-wide retained-ciphertext and memo-count quota with a default decimal 100 GB limit, SQLite page ceiling, service-wide 5 GB free-disk reserve, and startup reconciliation.
- Return a localized HTTP 507 `STORAGE_LIMIT_REACHED` response for new creates at capacity while preserving read, revoke, deletion, and cleanup paths.
- Expose private unlabeled aggregate capacity gauges for quota, SQLite, WAL, and filesystem monitoring.
- Bound cleanup transactions and truncate WAL between batches while allowing safe reuse of allocated SQLite freelist pages during drain-mode recovery.

## 20260831a - 2026-08-31

### Changed
- Reduce the maximum memo length from 10,000 to 5,000 characters across the frontend and localized content.
- Require canonical Base64 ciphertext with the current `v1:` prefix and cap encrypted memo payloads at 41,000 bytes.

## 20260829a - 2026-08-29

### Changed
- Change the maximum memo expiry from 30 days to 2 weeks across application behavior and documentation.
- Replace document-wide translation-value substitution with explicit, context-safe localization keys for HTML text and display attributes.
- Return stable API error codes and translate them in the browser without exposing raw server error text.
- Correct English remnants, inconsistent security and privacy terminology, and meaning-changing language errors across all 29 translated catalogs, including a full European Portuguese pass for `pt-PT`.
- Use valid BCP 47 `pt-BR` and `pt-PT` language tags in rendered HTML while keeping the existing locale URL paths stable.
- Add right-to-left rendering for Arabic navigation, forms, lists, callouts, mixed-direction memo fields, and language-menu metadata.
- Remove invisible zero-width characters from Polish translations.
- Document key-specific localization exceptions and retain audited legacy keys until deterministic runtime and browser-path coverage makes their removal safe.

## 20260713a - 2026-07-13

### Security
- Make browser-only memo and password forms fail closed until their local encryption or decryption handlers are ready.
- Prevent native form fallback from serializing memo plaintext or decryption passwords into request URLs.

## 20260712a - 2026-07-12

### Changed
- Use accurate sitemap modification dates and omit unsupported priority and change-frequency hints.
- Replace About page FAQ structured data with structured data that matches its visible content.
- Make localized memo creation pages indexable and add privacy details for search visitors.

## 20260628a - 2026-06-28

### Baseline
- Current securememo.app baseline.
- Browser-side encrypted memo creation and reading.
- Automatic memo deletion after confirmed read or expiry.
- Sender revoke links for deleting unread memos.
- Localized UI across supported languages.
- Privacy-first operation: no accounts, no cookies, no tracking.
