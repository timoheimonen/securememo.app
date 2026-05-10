# AGENTS.md

## Privacy First

Privacy comes first, always.

- Cookies are completely forbidden. Do not add, set, read, depend on, or recommend cookies anywhere in this project.
- Do not add tracking, analytics, fingerprinting, advertising, third-party beacons, or behavioral profiling.
- Keep client-side storage minimal and avoid persistent identifiers unless the user explicitly requests them and the privacy impact is reviewed first.
- Prefer explicit URL state and server-side behavior that does not identify or remember users.
- Do not introduce external services or assets that can observe visitors unless they are strictly necessary and explicitly approved.
- Treat memo contents, passwords, deletion tokens, and derived secrets as sensitive. Never log, expose, persist, or transmit plaintext secrets outside the intended encrypted flow.

## Development

- Keep changes small and aligned with the existing Go and embedded-frontend structure.
- Preserve the client-side encryption model: plaintext memo content must never leave the browser.
- Run `go test ./...` after behavior changes.
