/**
 * Security header helpers centralizing CSP, nonce generation and CORS validation.
 *
 * Global declarations for Cloudflare Worker environment objects so ESLint understands
 * they are provided at runtime (Response, crypto, TextDecoder, btoa).
 */
/* eslint-env worker */

// Allowed origins for CORS
export const allowedOrigins = [
  'https://securememo.app',
  'https://www.securememo.app',
  'https://securememo-dev.timo-heimonen.workers.dev',
];

// Base security headers applied to every response (CSP appended per-response with nonce)
export const baseSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

/**
 * Generate a cryptographically random nonce (base64url, 16 bytes) for CSP.
 * @returns {string} nonce value
 */
export function generateNonce() {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  const binary = new globalThis.TextDecoder('latin1').decode(bytes);
  return globalThis.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Build the Content-Security-Policy header string for a given nonce.
 * @param {string} nonce CSP nonce
 * @returns {string} CSP header value
 */
export function buildContentSecurityPolicy(nonce) {
  const directives = [
    "default-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self' https://challenges.cloudflare.com https://www.youtube-nocookie.com https://youtube.googleapis.com https://s.ytimg.com",
    'frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com blob:',
    'child-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com blob:',
    "img-src 'self' https://challenges.cloudflare.com https://s.ytimg.com data:",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' blob:`,
    "require-trusted-types-for 'script'",
  ];
  return directives.join('; ') + ';';
}

/**
 * Build full security headers (adds CSP). Adds CORS origin if valid.
 * @param {Request} request Fetch request
 * @param {string} [nonce] Optional pre-generated nonce
 * @returns {Record<string,string>} headers object
 */
export function getSecurityHeaders(request, nonce) {
  const origin = request.headers.get('origin');
  const headers = { ...baseSecurityHeaders };
  headers['Content-Security-Policy'] = buildContentSecurityPolicy(nonce || generateNonce());
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

/**
 * Merge security headers into an existing response ensuring JSON is not cached.
 * @param {Response} response existing response
 * @param {Request} request original request
 * @returns {Response} new response with merged headers
 */
export function mergeSecurityHeadersIntoResponse(response, request) {
  const existingHeaders = Object.fromEntries(response.headers);
  const mergedHeaders = { ...getSecurityHeaders(request), ...existingHeaders };
  const ct = mergedHeaders['Content-Type'] || mergedHeaders['content-type'] || '';
  if (ct.startsWith('application/json')) {
    mergedHeaders['Cache-Control'] = 'no-store';
  }
  return new globalThis.Response(response.body, { status: response.status, headers: mergedHeaders });
}

/**
 * Validate if origin is allowed for CORS.
 * @param {Request} request fetch request
 * @returns {boolean} true if origin header is allowed
 */
export function isValidOrigin(request) {
  const origin = request.headers.get('origin');
  return !!(origin && allowedOrigins.includes(origin));
}
