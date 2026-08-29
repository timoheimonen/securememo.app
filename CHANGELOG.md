# Changelog

All notable changes to this project are documented here.

Version identifiers match the application `assetVersion`.

## 20260829a - 2026-08-29

### Changed
- Change the maximum memo expiry from 30 days to 2 weeks across application behavior and documentation.
- Replace document-wide translation-value substitution with explicit, context-safe localization keys for HTML text and display attributes.
- Return stable API error codes and translate them in the browser without exposing raw server error text.

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
