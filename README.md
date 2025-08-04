# securememo.app

**securememo.app** is a simple, private memo service for sharing sensitive messages. Everything is encrypted right in your browser with AES-256 — and each note disappears forever once it's read or when the time limit expires.

---

## Features

- **True end-to-end encryption** in your browser — nothing stored in plain text
- **Password protection** — encryption password is not send or stored to server
- **One-time readable notes** — they self-destruct automatically after being read or when the time limit expires
- **Multiple expiry options** — delete on read, 8 hours, 1 day, 2 days, 1 week or 30 days
- **Runs on Cloudflare Workers** — fast, lightweight, and globally distributed
- **D1 Database** — SQLite-based database for reliable storage
- **Turnstile CAPTCHA** — blocks bots and spam without compromising privacy
- **Strong security headers** — comprehensive CSP and security policies
- **Automatic cleanup** — expired memos are automatically removed via cron jobs

---

## Architecture

### Tech Stack
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Frontend**: Vanilla JavaScript with modern ES6+ features
- **Security**: Turnstile CAPTCHA, CSP headers, input sanitization
- **Encryption**: AES-256 client-side encryption

### Project Structure
```
cloudflare/
├── src/
│   ├── handlers/          # API request handlers
│   │   └── auth.js        # Memo creation, reading, and cleanup
│   ├── templates/         # HTML and JavaScript templates
│   │   ├── pages.js       # HTML page templates
│   │   └── js.js          # JavaScript templates
│   ├── utils/             # Utility functions
│   │   ├── errorMessages.js # Centralized error handling
│   │   ├── timingSecurity.js # Timing attack protection utilities
│   │   └── validation.js  # Input validation and sanitization
│   ├── styles/            # CSS styling
│   │   └── styles.js      # Dynamic styles
│   └── index.js           # Main Worker entry point
├── db/
│   └── schema.sql         # Database schema
├── public/                # Static assets
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   └── android-chrome-*.png
└── package.json           # Project configuration
```

---

## Security

- **Client-side encryption** — All encryption happens in the browser, so your message is never visible to the server
- **Input sanitization** — Comprehensive XSS protection with HTML entity encoding
- **Turnstile CAPTCHA** — Stops bots from misusing the service without tracking users
- **Security headers** — Strict CSP, HSTS, and other security policies
- **Request validation** — Size limits, method validation, and input sanitization
- **Timing attack protection** — Artificial delays and constant-time comparisons prevent timing-based attacks
- **Automatic cleanup** — Expired memos are permanently deleted

---

## License

This project is open source under the [MIT License](LICENSE).

---

## Author

Timo Heimonen (timo.heimonen@gmail.com)