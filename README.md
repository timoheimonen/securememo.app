# securememo.app

securememo.app is a simple, privacy-focused service for sharing sensitive memos securely. All encryption occurs client-side in your browser using AES-256-GCM with PBKDF2 key derivation—ensuring that plaintext is never transmitted or stored on the server. Each memo self-destructs permanently after being read or upon expiration.
securememo.app will run the latest main version of this repo.

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

## Architecture

### Tech Stack

- **Runtime**: Cloudflare Workers for serverless execution.
- **Database**: Cloudflare D1 (SQLite-based) for secure, efficient storage.
- **Frontend**: Vanilla JavaScript with ES6+ features for a lightweight, no-framework experience.
- **Security**: Cloudflare Turnstile CAPTCHA, Content Security Policy (CSP) headers, and comprehensive input sanitization.
- **Encryption**: Client-side AES-256-GCM with PBKDF2 (1,200,000+ iterations) for key derivation.

### Project Structure

```
securememo/
├── src/
│   ├── handlers/               # API request handlers
│   │   └── auth.js             # Handles memo creation, reading, confirmation, and cleanup
│   ├── templates/              # HTML and JavaScript templates
│   │   ├── pages.js            # HTML page templates (e.g., index, about, create/read memo)
│   │   └── js.js               # JavaScript templates (e.g., create/read memo logic)
│   ├── utils/                  # Utility functions
│   │   ├── errorMessages.js    # Centralized error handling with generic messages
│   │   ├── timingSecurity.js   # Timing attack protections (e.g., constant-time comparisons, artificial delays)
│   │   ├── validation.js       # Input validation, sanitization, and secure checks
│   │   ├── localization.js     # Server-side localization utilities
│   │   ├── clientLocalization.js # Client-side localization utilities
│   │   ├── translations.js     # Translation registry
│   │   ├── en_translations.js  # English translations
│   │   ├── de_translations.js  # German translations
│   │   ├── es_translations.js  # Spanish translations
│   │   ├── fr_translations.js  # French translations
│   │   ├── hi_translations.js  # Hindi translations
│   │   ├── ptPT_translations.js # Portuguese (Portugal) translations
│   │   ├── ptBR_translations.js # Portuguese (Brazil) translations
│   │   ├── zh_translations.js  # Chinese translations
│   │   ├── ko_translations.js  # Korean translations
│   │   └── ja_translations.js  # Japanese translations
│   ├── screenshots/            # Screenshots
│   │   └──  screenshot_001.png # Screenshot 001
│   ├── styles/                 # CSS styling
│   │   └── styles.js           # Dynamic CSS generation
│   └── index.js                # Main Worker entry point (routing, security headers, cron jobs)
├── db/
│   └── schema.sql              # Database schema definition
├── public/                     # Static assets
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── android-chrome-192x192.png
│   └── android-chrome-512x512.png
├── package.json                # Project dependencies and configuration
├── package-lock.json           # Dependency lock file
├── wrangler.toml               # Cloudflare Workers configuration
├── deploy.sh                   # Deployment script
├── README.md                   # Project documentation
├── LICENSE                     # License
├── SECURITY.md                 # Security policy and vulnerability reporting
├── CODE_OF_CONDUCT.md          # Community guidelines
└── CONTRIBUTING.md             # Contribution guidelines
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

## Author

Timo Heimonen (timo.heimonen@gmail.com)

## Tags

- #privacy
- #encryption
- #security
- #cloudflare
- #memos
