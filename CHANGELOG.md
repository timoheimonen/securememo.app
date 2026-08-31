# Changelog

All notable changes to this project are documented here.

Version identifiers match the application `assetVersion`.

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
