# securememo.app

**securememo.app** is a simple, private memo service for sharing sensitive messages. Everything is encrypted right in your browser with AES-256 — and each note disappears forever once it’s read or when the time limit expires.

---

## Features

- True end-to-end encryption in your browser — nothing stored in plain text
- One-time readable notes — they self-destruct automatically after being read or when the time limit expires.
- Runs on Cloudflare Workers, fast and lightweight
- Turnstile CAPTCHA to block bots and spam
- Strong security headers by default

---

## Security

- All encryption happens **client-side**, so your message is never visible to the server.
- Turnstile CAPTCHA stops bots from misusing the service.
- Strict security headers help keep everything safe by default.

---

## License

This project is open source under the [MIT License](LICENSE).

---

## Author

Timo Heimonen  (timo.heimonen@gmail.com)