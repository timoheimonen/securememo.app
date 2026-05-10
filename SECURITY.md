# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in securememo.app, please report it responsibly.

## How to Report

- Email: timo.heimonen@proton.me
- Use a descriptive subject line such as `Security Vulnerability Report`.
- Do not disclose the vulnerability publicly until there has been time to investigate and mitigate it.

## What to Include

- Clear vulnerability description.
- Steps to reproduce.
- Potential impact.
- Proof-of-concept details, if available.
- Your preferred contact information for follow-up.

## Supported Version

Only the current main branch is supported. The current deployment target is the Go + SQLite self-hosted service in this repository.

## Security Properties

- Memo content is encrypted client-side before upload.
- The server stores only encrypted memo payloads and metadata needed for expiry and deletion.
- Passwords are generated in the browser and are never sent to the server.
- Memos are deleted after successful read confirmation or expiry.
- The service applies strict security headers and validates request size, method, origin, memo IDs, and payload formats.
- Rate limiting is stored locally in SQLite.

## Bug Bounty

There is no formal bug bounty program at this time.

## Policy Updates

This policy may be updated periodically.

Last updated: May 10, 2026
