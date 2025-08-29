# securememo.app

securememo.app is a simple, privacy-focused service for sharing sensitive memos securely. All encryption occurs client-side in your browser using AES-256-GCM with PBKDF2 key derivation—ensuring that plaintext is never transmitted or stored on the server. Each memo self-destructs permanently after being read or upon expiration.
securememo.app will run the main branch of this repo.

[![License](https://img.shields.io/github/license/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/blob/main/LICENSE)
[![Stars](https://img.shields.io/github/stars/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/stargazers)
[![Watchers](https://img.shields.io/github/watchers/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/watchers)
[![Forks](https://img.shields.io/github/forks/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/network/members)
[![Contributors](https://img.shields.io/github/contributors/timoheimonen/securememo.app)](https://github.com/timoheimonen/securememo.app/graphs/contributors)
[![Codacy Badge](https://app.codacy.com/project/badge/Grade/5a670d56d40e4774a3166ccabb290952)](https://app.codacy.com/gh/timoheimonen/securememo.app/dashboard?utm_source=gh&utm_medium=referral&utm_content=&utm_campaign=Badge_grade)

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
    │   └── auth.js             # Handles memo creation, reading, confirmation, and cleanup
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