# securememo.app

A secure, encrypted memo service that self-destructs after being read.

## Features
- Client-side AES-256 encryption
- Self-destructing messages
- No password storage on servers
- Built on Cloudflare Workers

## Setup
1. Clone this repository
2. Create your own `wrangler.toml`
3. Fill in your Cloudflare D1 database and Turnstile credentials
4. Run `npm install`
5. Deploy with `npx wrangler deploy`

## Security
- All encryption happens client-side
- Cloudflare Turnstile CAPTCHA protection
- Comprehensive security headers

## License

This project is licensed under the [MIT License](LICENSE).

## Author
Timo Heimonen (timo.heimonen@gmail.com) 