# securememo.app

securememo.app is a simple, privacy-focused service for sharing sensitive memos securely. All encryption occurs client-side in your browser using AES-256-GCM with PBKDF2 key derivation—ensuring that plaintext is never transmitted or stored on the server. Each memo self-destructs permanently after being read or upon expiration.
securememo.app will run the main branch of this repo.

[![License](https://img.shields.io/github/license/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/stargazers)
[![CI](https://github.com/timoheimonen/securememo.app/workflows/CI/badge.svg)](https://github.com/timoheimonen/securememo.app/actions/workflows/ci.yml)
[![CodeQL](https://github.com/timoheimonen/securememo.app/workflows/CodeQL/badge.svg)](https://github.com/timoheimonen/securememo.app/security/code-scanning)
[![Forks](https://img.shields.io/github/forks/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/network/members)
[![Contributors](https://img.shields.io/github/contributors/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/graphs/contributors)

## Features

- Client-side encryption with AES-256-GCM and PBKDF2 key derivation.
- Random browser-generated passwords that are never sent to the server.
- Delete-on-read flow with a client-side deletion token.
- Expiry options: 8 hours, 1 day, 2 days, 1 week, or 30 days.
- SQLite storage with WAL mode and automatic cleanup.
- Strict security headers, input validation, timing delays, and generic access-denied responses.
- No accounts, no analytics, no ads.
- Localized generated frontend assets embedded into the Go binary.

## Build

The SQLite driver uses CGO, so the build host needs Go, CGO support, and a C compiler.

```sh
go test ./...
go build -o securememo ./cmd/securememo
```

## Runtime Configuration

Minimal environment:

```sh
SECUREMEMO_ADDR=127.0.0.1:3000
SECUREMEMO_DB_PATH=/var/lib/securememo/securememo.sqlite
PUBLIC_ORIGIN=https://securememo.example.com
```
securememo/
├── CODE_OF_CONDUCT.md          # Community guidelines
├── CONTRIBUTING.md             # Contribution guidelines
├── LICENSE                     # License
├── README.md                   # Project documentation
├── SECURITY.md                 # Security policy and vulnerability reporting
├── deploy.sh                   # Deployment script
├── package.json                # Project dependencies and configuration
├── package-lock.json           # Dependency lock file
├── wrangler.toml               # Cloudflare Workers configuration
├── db/
│   └── schema.sql              # Database schema definition
├── public/                     # Static assets
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   └── robots.txt
├── screenshots/                # Screenshots
│   ├── screenshot_001.png      # Screenshot 001
│   └── screenshot_002.png      # Screenshot 002
└── src/
    ├── index.js                # Main Worker entry point (routing, security headers, cron jobs)
    ├── handlers/               # API request handlers
    │   ├── auth-utils.js       # Shared utilities for authentication handlers
    │   ├── memo-cleanup.js     # Handles cleanup of expired memos
    │   ├── memo-create.js      # Handles memo creation
    │   ├── memo-delete.js      # Handles memo deletion confirmation
    │   └── memo-read.js        # Handles memo reading
    ├── styles/                 # CSS styling
    │   └── styles.js           # Dynamic CSS generation
    ├── templates/              # HTML and JavaScript templates
    │   ├── js.js               # JavaScript templates (e.g., create/read memo logic)
    │   └── pages.js            # HTML page templates (e.g., index, about, create/read memo)
    ├── lang/                   # Localization and translation files
    │   ├── ar_translations.js  # Arabic translations
    │   ├── bn_translations.js  # Bengali translations
    │   ├── clientLocalization.js # Client-side localization utilities
    │   ├── cs_translations.js  # Czech translations
    │   ├── da_translations.js  # Danish translations
    │   ├── de_translations.js  # German translations
    │   ├── el_translations.js  # Greek translations
    │   ├── en_translations.js  # English translations
    │   ├── es_translations.js  # Spanish translations
    │   ├── fi_translations.js  # Finnish translations
    │   ├── fr_translations.js  # French translations
    │   ├── hi_translations.js  # Hindi translations
    │   ├── hu_translations.js  # Hungarian translations
    │   ├── id_translations.js  # Indonesian translations
    │   ├── it_translations.js  # Italian translations
    │   ├── ja_translations.js  # Japanese translations
    │   ├── ko_translations.js  # Korean translations
    │   ├── language_names.js   # Language names utility
    │   ├── localization.js     # Server-side localization utilities
    │   ├── nl_translations.js  # Dutch translations
    │   ├── no_translations.js  # Norwegian translations
    │   ├── pl_translations.js  # Polish translations
    │   ├── ptBR_translations.js # Portuguese (Brazil) translations
    │   ├── ptPT_translations.js # Portuguese (Portugal) translations
    │   ├── ro_translations.js  # Romanian translations
    │   ├── ru_translations.js  # Russian translations
    │   ├── sv_translations.js  # Swedish translations
    │   ├── th_translations.js  # Thai translations
    │   ├── tl_translations.js  # Tagalog translations
    │   ├── tr_translations.js  # Turkish translations
    │   ├── translations.js     # Translation registry
    │   ├── uk_translations.js  # Ukrainian translations
    │   ├── vi_translations.js  # Vietnamese translations
    │   └── zh_translations.js  # Chinese translations
    └── utils/                  # Utility functions
        ├── errorMessages.js    # Centralized error handling with generic messages
        ├── rateLimiter.js      # Rate limiting utilities
        ├── timingSecurity.js   # Timing attack protections (e.g., constant-time comparisons, artificial delays)
        └── validation.js       # Input validation, sanitization, and secure checks
```
## Security

```text
cmd/securememo/              Go entrypoint
internal/config/             Environment configuration
internal/store/              SQLite schema, queries, cleanup, rate-limit storage
internal/memo/               Memo API handlers
internal/security/           Security headers, validation, timing helpers
internal/server/             Routing, localization paths, embedded asset serving
internal/frontend/           Embedded generated frontend assets
```

## API

This project uses GPL-3.0 license.

## Contributing

You are welcome to contribute to the project in any way you can. This includes reporting bugs, auditing, suggesting features, or submitting pull requests via GitHub. Please ensure your contributions respect the project's security focus and follow standard open-source practices.

For detailed contribution guidelines, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Supported languages in the application

securememo.app supports **30 languages** with automatic translation from English:

<details>
<summary>Click to view all supported languages</summary>

| Language | Code | Language | Code |
|----------|------|----------|------|
| Arabic | `ar` | Japanese | `ja` |
| Bengali | `bn` | Korean | `ko` |
| Chinese | `zh` | Norwegian | `no` |
| Czech | `cs` | Polish | `pl` |
| Danish | `da` | Portuguese (Brazil) | `pt-BR` |
| Dutch | `nl` | Portuguese (Portugal) | `pt-PT` |
| English | `en` | Romanian | `ro` |
| Finnish | `fi` | Russian | `ru` |
| French | `fr` | Spanish | `es` |
| German | `de` | Swedish | `sv` |
| Greek | `el` | Tagalog | `tl` |
| Hindi | `hi` | Thai | `th` |
| Hungarian | `hu` | Turkish | `tr` |
| Indonesian | `id` | Ukrainian | `uk` |
| Italian | `it` | Vietnamese | `vi` |

</details>

> **Note:** These translations are auto-generated from English. Some errors may occur. Contributions for translation improvements are welcome!

The public browser flow uses the first three endpoints. Cleanup also runs periodically inside the process.

## Security Model

- Plaintext memo content never leaves the browser.
- The memo password is generated and displayed only in the browser.
- The server stores ciphertext, expiry time, memo ID, and a deletion-token hash.
- Failed or invalid reads use generic responses to avoid memo enumeration.
- API rate limits use short and long windows per client IP. Normal API actions are limited to 10/minute and 100/hour; failed access attempts are limited to 10/minute and 20/hour.
- Expired memo cleanup runs at startup and hourly after that.

## License

GPL-3.0. See [LICENSE](LICENSE).

## Author

Timo Heimonen
