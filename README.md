# securememo.app

securememo.app is a simple, privacy-focused service for sharing sensitive memos securely. All encryption occurs client-side in your browser using AES-256-GCM with PBKDF2 key derivation—ensuring that plaintext is never transmitted or stored on the server. Each memo self-destructs permanently after being read or upon expiration.
securememo.app will run the main branch of this repo.

[![Codacy Badge](https://app.codacy.com/project/badge/Grade/beffc716bdc14df49649b6dcbc69a051)](https://app.codacy.com/gh/timoheimonen/securememo.app/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)
[![License](https://img.shields.io/github/license/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/stargazers)
[![Watchers](https://img.shields.io/github/watchers/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/watchers)
[![Forks](https://img.shields.io/github/forks/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/network/members)
[![Contributors](https://img.shields.io/github/contributors/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/graphs/contributors)

## Features

- **True end-to-end encryption**: Performed entirely in the browser; servers handle only encrypted data.
- **Password protection**: Random passwords are generated client-side and never sent to or stored on the server.
- **One-time access**: Memos automatically delete after being read or when the selected time limit expires.
- **Flexible expiry options**: Choose from delete-on-read with timeouts of 8 hours, 1 day, 2 days, 1 week, or 30 days.
- **Powered by Cloudflare Workers**: Ensures fast, scalable, and globally distributed performance.
- **D1 Database**: Utilizes SQLite-compatible storage for reliable, encrypted memo persistence.
- **Turnstile CAPTCHA**: Prevents bot abuse and spam while maintaining user privacy (no tracking).
- **Robust security headers**: Includes strict CSP, HSTS, and other policies to mitigate common web vulnerabilities.
- **Automated cleanup**: Expired or read memos are permanently removed via scheduled cron jobs.
- **Localization**: Currently supports 30 languages.

## Architecture

### Tech Stack

- **Runtime**: Cloudflare Workers for serverless execution.
- **Database**: Cloudflare D1 (SQLite-based) for secure, efficient storage.
- **Frontend**: Vanilla JavaScript with ES6+ features for a lightweight, no-framework experience.
- **Security**: Cloudflare Turnstile CAPTCHA, Content Security Policy (CSP) headers, and comprehensive input sanitization.
- **Encryption**: Client-side AES-256-GCM with PBKDF2 (3,500,000+ iterations) for key derivation.

### Project Structure

```
securememo/
├── CODE_OF_CONDUCT.md            # Community guidelines
├── CONTRIBUTING.md               # Contribution guidelines
├── LICENSE                       # License
├── README.md                     # Project documentation
├── SECURITY.md                   # Security policy & vuln reporting
├── deploy.sh                     # Deployment script (wrangler publish + migrations)
├── package.json                  # Dependencies & scripts
├── package-lock.json             # Locked dependency tree
├── wrangler.toml                 # Cloudflare Workers configuration
├── .eslintrc.json                # ESLint configuration
├── .gitattributes                # Git attributes (e.g. LF normalization)
├── .codacy/                      # Codacy configuration & metadata
├── .github/                      # GitHub configs (workflows, instructions)
├── db/
│   └── schema.sql                # D1 database schema definition
├── public/                       # Static assets served as-is
│   ├── android-chrome-192x192.png
│   ├── android-chrome-512x512.png
│   ├── apple-touch-icon.png
│   ├── favicon.ico
│   └── robots.txt
├── screenshots/                  # Visual documentation
│   ├── screenshot_001.png
│   └── screenshot_002.png
├── src/
│   ├── index.js                  # Worker entry: routing, cron, security headers
│   ├── handlers/
│   │   └── auth.js               # Memo lifecycle (create/read/confirm/cleanup)
│   ├── schemas/                  # OpenAPI specs for endpoints
│   │   ├── confirm-delete.openapi.yaml
│   │   ├── create-memo.openapi.yaml
│   │   └── read-memo.openapi.yaml
│   ├── styles/
│   │   └── styles.js             # Minimal CSS (string templates)
│   ├── templates/                # HTML & client JS templates
│   │   ├── js.js                 # Front-end logic snippets (encryption, form handling)
│   │   └── pages.js              # Page layout templates
│   ├── lang/                     # Localization (auto-translated + helpers)
│   │   ├── clientLocalization.js # Client-side localization utilities
│   │   ├── language_names.js     # Language name mapping
│   │   ├── localization.js       # Server-side localization utilities
│   │   ├── translations.js       # Translation registry export
│   │   ├── ar_translations.js    # Arabic
│   │   ├── bn_translations.js    # Bengali
│   │   ├── cs_translations.js    # Czech
│   │   ├── da_translations.js    # Danish
│   │   ├── de_translations.js    # German
│   │   ├── el_translations.js    # Greek
│   │   ├── en_translations.js    # English
│   │   ├── es_translations.js    # Spanish
│   │   ├── fi_translations.js    # Finnish
│   │   ├── fr_translations.js    # French
│   │   ├── hi_translations.js    # Hindi
│   │   ├── hu_translations.js    # Hungarian
│   │   ├── id_translations.js    # Indonesian
│   │   ├── it_translations.js    # Italian
│   │   ├── ja_translations.js    # Japanese
│   │   ├── ko_translations.js    # Korean
│   │   ├── nl_translations.js    # Dutch
│   │   ├── no_translations.js    # Norwegian
│   │   ├── pl_translations.js    # Polish
│   │   ├── ptBR_translations.js  # Portuguese (Brazil)
│   │   ├── ptPT_translations.js  # Portuguese (Portugal)
│   │   ├── ro_translations.js    # Romanian
│   │   ├── ru_translations.js    # Russian
│   │   ├── sv_translations.js    # Swedish
│   │   ├── th_translations.js    # Thai
│   │   ├── tl_translations.js    # Tagalog
│   │   ├── tr_translations.js    # Turkish
│   │   ├── uk_translations.js    # Ukrainian
│   │   ├── vi_translations.js    # Vietnamese
│   │   └── zh_translations.js    # Chinese
│   └── utils/                    # Reusable utilities
│       ├── errorMessages.js      # Generic error messaging (no sensitive leaks)
│       ├── http.js               # HTTP helpers (responses, status)
│       ├── minifiers.js          # Lightweight JS/CSS minimization
│       ├── rateLimiter.js        # Rate limiting primitives
│       ├── securityHeaders.js    # CSP & security header construction
│       ├── timingSecurity.js     # Timing attack mitigations
│       └── validation.js         # Input validation & sanitization
└── tests/                        # Automated tests (lifecycle & E2E)
    ├── memo.lifecycle.test.js
    ├── memo.e2e.test.js
    └── helpers/
        └── testUtils.js
```

## Code Quality
This project uses Codacy to automatically analyze code quality, security, and duplication. The badge at the top of this README reflects the current grade of the main branch. 
The target for this project's code quality is always an A grade. This is pursued by using the Codacy addon in VS Code to ensure new code meets these standards before being committed.

## Security

- **Client-side encryption**: Memos are encrypted in-browser using AES-256-GCM; servers receive only ciphertext.
- **Input sanitization**: Multi-context protection (HTML, JSON, database, URL) with entity encoding to prevent XSS and injection attacks.
- **Turnstile CAPTCHA**: Blocks automated abuse without user tracking or cookies.
- **Security headers**: Enforces strict CSP, HSTS, X-Frame-Options, and Permissions-Policy to defend against common threats.
- **Request validation**: Includes size limits (e.g., 100KB max), method checks, and secure origin validation for CORS.
- **Timing attack protection**: Implements constant-time comparisons, artificial delays, and secure validation to prevent information leakage.
- **Automatic cleanup**: Memos are deleted immediately after reading (via confirmation) or expiration, with no recovery possible.

## License

This project uses GPL-3.0 license.

## Contributing

You are welcome to contribute to the project in any way you can. This includes reporting bugs, auditing, suggesting features, or submitting pull requests via GitHub. Please ensure your contributions respect the project's security focus and follow standard open-source practices.

For detailed contribution guidelines, please see [CONTRIBUTING.md](CONTRIBUTING.md).

## Supported languages in the application

The supported languages are:

- Arabic (ar)
- Bengali (bn)
- Chinese (zh)
- Danish (da)
- Dutch (nl)
- English (en)
- Finnish (fi)
- French (fr)
- German (de)
- Greek (el)
- Hindi (hi)
- Hungarian (hu)
- Indonesian (id)
- Italian (it)
- Japanese (ja)
- Korean (ko)
- Norwegian (no)
- Polish (pl)
- Portuguese (Brazil) (pt-BR)
- Portuguese (Portugal) (pt-PT)
- Russian (ru)
- Romanian (ro)
- Spanish (es)
- Swedish (sv)
- Tagalog (tl)
- Thai (th)
- Turkish (tr)
- Ukrainian (uk)
- Vietnamese (vi)
- Czech (cs)

These are auto-translated from english, errors may occur.

## Author

🇫🇮 Timo Heimonen (timo.heimonen@proton.me)

## Tags

- #privacy
- #encryption
- #security
- #cloudflare
- #memos
- #note
- #secure
