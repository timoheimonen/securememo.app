import { getStyles } from './styles/styles.js';
import { getSupportedLocales } from './utils/localization.js';

/**
 * Escape a string for safe injection into JavaScript string literals
 * @param {string} str - The string to escape
 * @returns {string} - Escaped string safe for JS
 */
function escapeJavaScript(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/'/g, "\\'")    // Escape single quotes
    .replace(/"/g, '\\"')    // Escape double quotes
    .replace(/\r/g, '\\r')   // Escape carriage returns
    .replace(/\n/g, '\\n')   // Escape newlines
    .replace(/\t/g, '\\t')   // Escape tabs
    .replace(/\u2028/g, '\\u2028') // Escape line separator
    .replace(/\u2029/g, '\\u2029'); // Escape paragraph separator
}
import {
  getIndexHTML,
  getAboutHTML,
  getCreateMemoHTML,
  getReadMemoHTML,
  getToSHTML,
  getPrivacyHTML
} from './templates/pages.js';
import {
  getCreateMemoJS,
  getReadMemoJS,
  getCommonJS
} from './templates/js.js';
import {
  handleCreateMemo,
  handleReadMemo,
  handleConfirmDelete,
  handleCleanupMemos,
  adminListApiKeys,
  adminCreateApiKey,
  adminDeleteApiKey
} from './handlers/auth.js';
import { getErrorMessage } from './utils/errorMessages.js';
import {
  extractLocaleFromPath,
  getLocaleRedirectPath,
  buildLocalizedPath,
  t,
  extractLocaleFromRequest,
  getDefaultLocale
} from './utils/localization.js';
import { getClientLocalizationJS } from './utils/clientLocalization.js';

// Immutable asset version for cache-busting (bump on asset changes)
const ASSET_VERSION = '20250818';

// Tiny, safe JS minifier for generated strings (removes comments and trims/collapses intra-line whitespace)
function minifyJS(code) {
  try {
    return code
      // Remove line comments that start at line-begin
      .replace(/^\s*\/\/.*$/gm, '')
      // Remove block comments that start at line-begin or after whitespace
      // This avoids stripping sequences inside regex literals like /\/\* foo \*\//
      .replace(/(^|\s)\/\*[\s\S]*?\*\//g, '$1')
      // Process per line to preserve newlines (avoid ASI issues)
      .split('\n')
      // Collapse multiple spaces/tabs within a line and trim ends
      .map(line => line.replace(/[ \t]+/g, ' ').trim())
      // Drop empty lines
      .filter(Boolean)
      // Keep newlines to avoid ASI pitfalls
      .join('\n')
      .trim();
  } catch (_) {
    // In case of any unexpected issue, return original code
    return code;
  }
}

// Tiny CSS minifier: strips comments, collapses whitespace safely between tokens
function minifyCSS(css) {
  try {
    return css
      // Remove block comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      // Collapse whitespace
      .replace(/[\t\r\n]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      // Trim around punctuation
      .replace(/\s*([{}:;,>])\s*/g, '$1')
      // Preserve spaces in calc() and similar by re-adding a single space where double removal could break
      .replace(/calc\(([^)]*)\)/g, (m, inner) => `calc(${inner.replace(/\s{2,}/g, ' ')})`)
      .trim();
  } catch (_) {
    return css;
  }
}

// Version asset URLs in generated HTML without touching templates
function versionAssetUrls(html) {
  try {
    return html
      // styles.css
      .replace(/\/(styles\.css)(\b)/g, `/styles.css?v=${ASSET_VERSION}$2`)
      // common.js
      .replace(/\/(js\/common\.js)(\b)/g, `/js/common.js?v=${ASSET_VERSION}$2`)
      // create-memo.js?locale=xx
      .replace(/\/js\/create-memo\.js\?locale=([A-Za-z-_.]+)/g, `/js/create-memo.js?locale=$1&v=${ASSET_VERSION}`)
      // read-memo.js?locale=xx
      .replace(/\/(js\/read-memo\.js)\?locale=([A-Za-z-_.]+)/g, `/js/read-memo.js?locale=$2&v=${ASSET_VERSION}`)
      // version icons to enable immutable caching on clients/CDN
      .replace(/\/(favicon\.ico)(\b)/g, `/favicon.ico?v=${ASSET_VERSION}$2`)
      .replace(/\/(apple-touch-icon\.png)(\b)/g, `/apple-touch-icon.png?v=${ASSET_VERSION}$2`)
      .replace(/\/(android-chrome-192x192\.png)(\b)/g, `/android-chrome-192x192.png?v=${ASSET_VERSION}$2`)
      .replace(/\/(android-chrome-512x512\.png)(\b)/g, `/android-chrome-512x512.png?v=${ASSET_VERSION}$2`);
  } catch (_) {
    return html;
  }
}

// Allowed origins for CORS
const allowedOrigins = [
  'https://securememo.app',
  'https://www.securememo.app',
  'https://securememo-dev.timo-heimonen.workers.dev'
];

// Security headers base (CSP is added dynamically per-response to include a nonce)
const baseSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

// Generate a cryptographically strong base64 nonce
function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64 encode
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Build CSP header string with provided nonce
function buildContentSecurityPolicy(nonce) {
  const directives = [
    "default-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "connect-src 'self' https://challenges.cloudflare.com https://www.youtube-nocookie.com https://youtube.googleapis.com https://s.ytimg.com",
    "frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com blob:",
    "child-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com blob:",
    "img-src 'self' https://challenges.cloudflare.com https://s.ytimg.com data:",
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    `script-src 'nonce-${nonce}' 'strict-dynamic' blob:`,
    "require-trusted-types-for 'script'"
  ];
  return directives.join('; ') + ';';
}

// Function to validate origin and get security headers with proper CORS origin
function getSecurityHeaders(request, nonce) {
  const origin = request.headers.get('origin');
  const headers = { ...baseSecurityHeaders };
  if (nonce) {
    headers['Content-Security-Policy'] = buildContentSecurityPolicy(nonce);
  } else {
    // Generate a nonce even for non-HTML responses; harmless and consistent
    headers['Content-Security-Policy'] = buildContentSecurityPolicy(generateNonce());
  }

  // Only set CORS headers if origin is in allowed list
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

// Merge full security headers into an existing Response from handlers
function mergeSecurityHeadersIntoResponse(response, request) {
  const existingHeaders = Object.fromEntries(response.headers);
  const mergedHeaders = { ...getSecurityHeaders(request), ...existingHeaders };
  return new Response(response.body, { status: response.status, headers: mergedHeaders });
}

// Function to validate origin for CORS requests
function isValidOrigin(request) {
  const origin = request.headers.get('origin');
  if (origin) return allowedOrigins.includes(origin);
  try {
    const selfOrigin = new URL(request.url).origin;
    return allowedOrigins.includes(selfOrigin);
  } catch {
    return false;
  }
}

export default {
  async fetch(request, env, ctx) {
    try {
      // Check DB availability
      if (!env.DB) {
        return new Response(getErrorMessage('SERVICE_UNAVAILABLE', 'en'), {
          status: 503,
          headers: getSecurityHeaders(request)
        });
      }

      // Parse and validate URL
      let url;
      try {
        url = new URL(request.url);
      } catch (urlError) {
        return new Response(getErrorMessage('BAD_REQUEST', 'en'), {
          status: 400,
          headers: getSecurityHeaders(request)
        });
      }

      const pathname = url.pathname;

      // Skip locale handling for static assets and API routes (also admin path)
      const isStaticAsset = pathname.startsWith('/styles.css') ||
        pathname.startsWith('/js/') ||
        pathname.startsWith('/api/') ||
        pathname.startsWith('/admin') ||
        pathname === '/sitemap.xml' ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.png') ||
        pathname.includes('.ico');

      // Handle locale-based routing with /en prefix (only for HTML pages)
      let locale = 'en';
      let pathWithoutLocale = pathname;

      if (!isStaticAsset) {
        const localeResult = extractLocaleFromPath(pathname);
        locale = localeResult.locale;
        pathWithoutLocale = localeResult.pathWithoutLocale;

        // Check for nested locale patterns and redirect to normalized path
        if (localeResult.needsRedirect) {
          // Redirect nested locale paths to proper single locale paths
          // localeResult.pathWithoutLocale is already clean, just add default locale prefix
          const normalizedPath = buildLocalizedPath(getDefaultLocale(), localeResult.pathWithoutLocale);
          return Response.redirect(url.origin + normalizedPath, 301);
        }

        // Check if redirect to localized path is needed (add /en prefix to non-localized URLs)
        const redirectPath = getLocaleRedirectPath(pathname);
        if (redirectPath && redirectPath !== pathname) {
          return Response.redirect(url.origin + redirectPath, 301);
        }
      }

      // Handle CORS preflight with proper origin validation
      if (request.method === 'OPTIONS') {
        // Only allow preflight for valid origins
        if (!isValidOrigin(request)) {
          return new Response(null, {
            status: 403,
            headers: { 'Vary': 'Origin' }
          });
        }
        return new Response(null, {
          status: 200,
          headers: getSecurityHeaders(request)
        });
      }

      // Route API requests
      if (pathname.startsWith('/api/')) {
        const apiPath = pathname.substring(5);

        // Extract locale for API calls from headers/query params instead of URL path
        const apiLocale = extractLocaleFromRequest(request);

        // Validate origin for API requests
        if (!isValidOrigin(request)) {
          return new Response(JSON.stringify({ error: getErrorMessage('FORBIDDEN', apiLocale) }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Vary': 'Origin',
              ...getSecurityHeaders(request)
            }
          });
        }

        // Validate request method for API endpoints
        if (apiPath === 'create-memo' && request.method !== 'POST') {
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED', apiLocale) }), {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              'Allow': 'POST',
              ...getSecurityHeaders(request)
            }
          });
        }



        // Check allowed methods for read-memo endpoint
        if (apiPath === 'read-memo' && request.method !== 'POST') {
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED', apiLocale) }), {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              'Allow': 'POST',
              ...getSecurityHeaders(request)
            }
          });
        }

        // Check allowed methods for confirm-delete endpoint
        if (apiPath === 'confirm-delete' && request.method !== 'POST') {
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED', apiLocale) }), {
            status: 405,
            headers: {
              'Content-Type': 'application/json',
              'Allow': 'POST',
              ...getSecurityHeaders(request)
            }
          });
        }

        // Check request size limit (100KB) for POST requests
        if (request.method === 'POST') {
          const contentLength = request.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 100000) {
            return new Response(JSON.stringify({ error: getErrorMessage('REQUEST_TOO_LARGE', apiLocale) }), {
              status: 413,
              headers: {
                'Content-Type': 'application/json',
                ...getSecurityHeaders(request)
              }
            });
          }
        }

        // Admin API endpoints (behind Cloudflare Zero Trust – no extra auth here)
        if (apiPath === 'admin/api-keys' && request.method === 'GET') {
          const res = await adminListApiKeys(env);
          return mergeSecurityHeadersIntoResponse(res, request);
        }
        if (apiPath === 'admin/api-keys' && request.method === 'POST') {
          const res = await adminCreateApiKey(request, env);
          return mergeSecurityHeadersIntoResponse(res, request);
        }
        if (apiPath === 'admin/api-keys/delete' && request.method === 'POST') {
          const res = await adminDeleteApiKey(request, env);
          return mergeSecurityHeadersIntoResponse(res, request);
        }

        switch (apiPath) {
          case 'create-memo': {
            const res = await handleCreateMemo(request, env, apiLocale);
            return mergeSecurityHeadersIntoResponse(res, request);
          }
          case 'read-memo': {
            const res = await handleReadMemo(request, env, apiLocale);
            return mergeSecurityHeadersIntoResponse(res, request);
          }
          case 'confirm-delete': {
            const res = await handleConfirmDelete(request, env, apiLocale);
            return mergeSecurityHeadersIntoResponse(res, request);
          }
          default:
            return new Response(getErrorMessage('NOT_FOUND', apiLocale), {
              status: 404,
              headers: getSecurityHeaders(request)
            });
        }
      }

      // Serve sitemap.xml
      if (pathname === '/sitemap.xml') {
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED', locale), {
            status: 405,
            headers: {
              'Allow': 'GET',
              ...getSecurityHeaders(request)
            }
          });
        }

        // Generate multilingual sitemap for all supported languages
        const supportedLocales = getSupportedLocales();
        const pages = [
          { path: '', priority: '1.0', changefreq: 'weekly' },
          { path: '/about.html', priority: '0.8', changefreq: 'monthly' },
          { path: '/create-memo.html', priority: '0.9', changefreq: 'monthly' },
          { path: '/tos.html', priority: '0.3', changefreq: 'yearly' },
          { path: '/privacy.html', priority: '0.3', changefreq: 'yearly' }
        ];

        let sitemapUrls = '';
        pages.forEach(page => {
          supportedLocales.forEach(lang => {
            const url = `https://securememo.app/${lang}${page.path}`;
            const hreflangs = supportedLocales.map(hreflang =>
              `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="https://securememo.app/${hreflang}${page.path}"/>`
            ).join('\n');

            sitemapUrls += `  <url>
    <loc>${url}</loc>
    <lastmod>2025-08-09</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${hreflangs}
  </url>
`;
          });
        });

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${sitemapUrls}</urlset>`;
        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
            'ETag': '"sitemap-v1"',
            'Last-Modified': 'Tue, 19 Aug 2025 16:15:00 GMT',
            ...getSecurityHeaders(request)
          }
        });
      }

      // Serve static assets (use pathname for non-localized assets)
      if (pathname === '/styles.css') {
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED', locale), {
            status: 405,
            headers: {
              'Allow': 'GET',
              ...getSecurityHeaders(request)
            }
          });
        }
        // Cache versioned CSS aggressively at the edge
        const isVersioned = url.searchParams.has('v');
        if (isVersioned) {
          const cached = await caches.default.match(request);
          if (cached) return cached;
        }
        const css = minifyCSS(getStyles());
        const cssEtag = `"styles-${ASSET_VERSION}"`;
        if (request.headers.get('if-none-match') === cssEtag) {
          return new Response(null, { status: 304, headers: { ...getSecurityHeaders(request), ETag: cssEtag } });
        }
        const cssResp = new Response(css, {
          headers: {
            'Content-Type': 'text/css',
            // Versioned -> immutable long cache; Unversioned -> short cache
            'Cache-Control': isVersioned
              ? 'public, max-age=31536000, immutable'
              : 'public, max-age=3600',
            'ETag': cssEtag,
            ...getSecurityHeaders(request)
          }
        });
        if (isVersioned) {
          ctx.waitUntil(caches.default.put(request, cssResp.clone()));
        }
        return cssResp;
      }

      // Serve JS files with dynamic content injection
      if (pathname === '/js/create-memo.js') {
        // Extract locale from query parameter for JavaScript files
        const jsLocale = url.searchParams.get('locale') || 'en';
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED', locale), {
            status: 405,
            headers: {
              'Allow': 'GET',
              ...getSecurityHeaders(request)
            }
          });
        }
        // Edge cache per-locale + version
        const cached = await caches.default.match(request);
        if (cached) return cached;
        const jsContent = getCreateMemoJS()
          .replace(/{{TURNSTILE_SITE_KEY}}/g, env.TURNSTILE_SITE_KEY)
          .replace(/{{MISSING_MESSAGE_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_MESSAGE', jsLocale)))
          .replace(/{{MESSAGE_TOO_LONG_ERROR}}/g, escapeJavaScript(getErrorMessage('MESSAGE_TOO_LONG', jsLocale)))
          .replace(/{{MISSING_SECURITY_CHALLENGE_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_SECURITY_CHALLENGE', jsLocale)))
          .replace(/{{RATE_LIMITED_ERROR}}/g, escapeJavaScript(getErrorMessage('RATE_LIMITED', jsLocale)))
          .replace(/{{CREATE_MEMO_FAILED_ERROR}}/g, escapeJavaScript(getErrorMessage('CREATE_MEMO_FAILED', jsLocale)))
          .replace(/{{CREATE_MEMO_ERROR}}/g, escapeJavaScript(getErrorMessage('CREATE_MEMO_ERROR', jsLocale)))
          .replace(/{{DECRYPTION_ERROR}}/g, escapeJavaScript(getErrorMessage('DECRYPTION_ERROR', jsLocale)))
          .replace(/{{READ_MEMO_ERROR}}/g, escapeJavaScript(getErrorMessage('READ_MEMO_ERROR', jsLocale)))
          .replace(/{{PASSWORD_COPIED_MESSAGE}}/g, escapeJavaScript(t('msg.passwordCopied', jsLocale)))
          .replace(/{{URL_COPIED_MESSAGE}}/g, escapeJavaScript(t('msg.urlCopied', jsLocale)))
          .replace(/{{COPY_MANUAL_MESSAGE}}/g, escapeJavaScript(t('msg.copyManual', jsLocale)))
          .replace(/{{MSG_ENCRYPTING}}/g, escapeJavaScript(t('msg.encrypting', jsLocale)))
          .replace(/{{BTN_CREATING}}/g, escapeJavaScript(t('btn.creating', jsLocale)))
          .replace(/{{BTN_CREATE}}/g, escapeJavaScript(t('btn.create', jsLocale)))
          .replace(/{{BTN_COPIED}}/g, escapeJavaScript(t('btn.copied', jsLocale)))
          .replace(/{{BTN_SHOW}}/g, escapeJavaScript(t('btn.show', jsLocale)))
          .replace(/{{BTN_HIDE}}/g, escapeJavaScript(t('btn.hide', jsLocale)))
          .replace(/{{BTN_COPY}}/g, escapeJavaScript(t('btn.copy', jsLocale)));
        const jsEtag = `"create-${ASSET_VERSION}-${jsLocale}"`;
        if (request.headers.get('if-none-match') === jsEtag) {
          return new Response(null, { status: 304, headers: { ...getSecurityHeaders(request), ETag: jsEtag } });
        }
        const jsResp = new Response(minifyJS(jsContent), {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': jsEtag,
            ...getSecurityHeaders(request)
          }
        });
        ctx.waitUntil(caches.default.put(request, jsResp.clone()));
        return jsResp;
      }

      if (pathname === '/js/read-memo.js') {
        // Extract locale from query parameter for JavaScript files
        const jsLocale = url.searchParams.get('locale') || 'en';
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED', locale), {
            status: 405,
            headers: {
              'Allow': 'GET',
              ...getSecurityHeaders(request)
            }
          });
        }
        // Edge cache per-locale + version
        const cached = await caches.default.match(request);
        if (cached) return cached;
        const jsContent = getReadMemoJS()
          .replace(/{{TURNSTILE_SITE_KEY}}/g, env.TURNSTILE_SITE_KEY)
          .replace(/{{MISSING_MEMO_ID_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_MEMO_ID', jsLocale)))
          .replace(/{{MISSING_PASSWORD_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_PASSWORD_ERROR', jsLocale)))
          .replace(/{{INVALID_MEMO_URL_ERROR}}/g, escapeJavaScript(getErrorMessage('INVALID_MEMO_URL_ERROR', jsLocale)))
          .replace(/{{MISSING_SECURITY_CHALLENGE_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_SECURITY_CHALLENGE_ERROR', jsLocale)))
          .replace(/{{MEMO_ALREADY_READ_DELETED_ERROR}}/g, escapeJavaScript(getErrorMessage('MEMO_ALREADY_READ_DELETED_ERROR', jsLocale)))
          .replace(/{{MEMO_EXPIRED_DELETED_ERROR}}/g, escapeJavaScript(getErrorMessage('MEMO_EXPIRED_DELETED_ERROR', jsLocale)))
          .replace(/{{INVALID_PASSWORD_CHECK_ERROR}}/g, escapeJavaScript(getErrorMessage('INVALID_PASSWORD_CHECK_ERROR', jsLocale)))
          .replace(/{{RATE_LIMITED_ERROR}}/g, escapeJavaScript(getErrorMessage('RATE_LIMITED', jsLocale)))
          .replace(/{{READ_MEMO_ERROR}}/g, escapeJavaScript(getErrorMessage('READ_MEMO_ERROR', jsLocale)))
          .replace(/{{DECRYPTION_ERROR}}/g, escapeJavaScript(getErrorMessage('DECRYPTION_ERROR', jsLocale)))
          .replace(/{{MEMO_DECRYPTED_MESSAGE}}/g, escapeJavaScript(t('msg.memoDecrypted', jsLocale)))
          .replace(/{{MEMO_DELETED_MESSAGE}}/g, escapeJavaScript(t('msg.memoDeleted', jsLocale)))
          .replace(/{{BTN_DECRYPTING}}/g, escapeJavaScript(t('btn.decrypting', jsLocale)))
          .replace(/{{BTN_DECRYPT}}/g, escapeJavaScript(t('btn.decrypt', jsLocale)))
          .replace(/{{BTN_SHOW}}/g, escapeJavaScript(t('btn.show', jsLocale)))
          .replace(/{{BTN_HIDE}}/g, escapeJavaScript(t('btn.hide', jsLocale)))
          .replace(/{{BTN_COPIED}}/g, escapeJavaScript(t('btn.copied', jsLocale)))
          .replace(/{{DELETION_ERROR_MESSAGE}}/g, escapeJavaScript(t('msg.deletionError', jsLocale)));
        const jsEtag = `"read-${ASSET_VERSION}-${jsLocale}"`;
        if (request.headers.get('if-none-match') === jsEtag) {
          return new Response(null, { status: 304, headers: { ...getSecurityHeaders(request), ETag: jsEtag } });
        }
        const jsResp = new Response(minifyJS(jsContent), {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': jsEtag,
            ...getSecurityHeaders(request)
          }
        });
        ctx.waitUntil(caches.default.put(request, jsResp.clone()));
        return jsResp;
      }

      if (pathname === '/js/common.js') {
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED', locale), {
            status: 405,
            headers: {
              'Allow': 'GET',
              ...getSecurityHeaders(request)
            }
          });
        }
        const cached = await caches.default.match(request);
        if (cached) return cached;
        const cmnEtag = `"common-${ASSET_VERSION}"`;
        if (request.headers.get('if-none-match') === cmnEtag) {
          return new Response(null, { status: 304, headers: { ...getSecurityHeaders(request), ETag: cmnEtag } });
        }
        const commonResp = new Response(minifyJS(getCommonJS()), {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': cmnEtag,
            ...getSecurityHeaders(request)
          }
        });
        ctx.waitUntil(caches.default.put(request, commonResp.clone()));
        return commonResp;
      }

      if (pathname === '/js/clientLocalization.js') {
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED', locale), {
            status: 405,
            headers: {
              'Allow': 'GET',
              ...getSecurityHeaders(request)
            }
          });
        }

        // Extract locale from Referer header (e.g., https://securememo.app/en/about.html -> 'en')
        let jsLocale = 'en';
        const referer = request.headers.get('referer');
        if (referer) {
          try {
            const refererUrl = new URL(referer);
            const refererLocaleInfo = extractLocaleFromPath(refererUrl.pathname);
            if (refererLocaleInfo.locale && getSupportedLocales().includes(refererLocaleInfo.locale)) {
              jsLocale = refererLocaleInfo.locale;
            }
          } catch { }
        }

        // Serve the optimized client localization utility with only the relevant translations
        const secHeaders = getSecurityHeaders(request);
        // Ensure caches vary on Referer since content depends on it (header-based for browsers)
        secHeaders['Vary'] = 'Origin, Referer';

        // Edge cache by synthetic key including locale + version
        const cacheKeyUrl = new URL('/js/clientLocalization.js', url.origin);
        cacheKeyUrl.searchParams.set('locale', jsLocale);
        cacheKeyUrl.searchParams.set('v', ASSET_VERSION);
        const cacheMatch = await caches.default.match(cacheKeyUrl.toString());
        if (cacheMatch) return cacheMatch;

        const locEtag = `"clientloc-${ASSET_VERSION}-${jsLocale}"`;
        if (request.headers.get('if-none-match') === locEtag) {
          return new Response(null, { status: 304, headers: { ...secHeaders, ETag: locEtag } });
        }
        const locResp = new Response(minifyJS(getClientLocalizationJS(jsLocale)), {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'ETag': locEtag,
            ...secHeaders
          }
        });
        ctx.waitUntil(caches.default.put(cacheKeyUrl.toString(), locResp.clone()));
        return locResp;
      }

      // Admin page (simple HTML) /admin & /api/admin Behind Cloudflare Zero Trust
      if (pathname === '/admin') {
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', { status: 405, headers: { 'Allow': 'GET', ...getSecurityHeaders(request) } });
        }
        const adminNonce = generateNonce();
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
          :root { font-family: system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif; color-scheme: light dark; }
          body { margin: 1.5rem; }
          h1 { margin-top: 0; }
          section { margin-bottom: 2.5rem; }
          fieldset { border: 1px solid #8884; border-radius: 8px; padding: 1rem 1.25rem; }
          legend { padding: 0 .5rem; font-weight: 600; }
          button { cursor: pointer; }
          table { width: 100%; border-collapse: collapse; margin-top: .75rem; font-size: .9rem; }
          thead { background: #00000008; position: sticky; top: 0; }
          th, td { padding: .5rem .6rem; text-align: left; border-bottom: 1px solid #ddd6; vertical-align: middle; }
          tbody tr:hover { background: #f5f5f580; }
          .muted { opacity: .65; font-size: .75rem; }
          .actions { display: flex; gap: .4rem; }
          .status { white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; background: #00000008; padding: .5rem .75rem; border-radius: 6px; max-height: 220px; overflow: auto; }
          .pill { display: inline-block; padding: 2px 6px; border-radius: 999px; background:#4441; font-size:.65rem; letter-spacing:.5px; }
          .danger { background:#b0002015; color:#b00020; }
          .keyCell { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .75rem; }
          .fade { animation: fade .25s ease-in; }
          @keyframes fade { from { opacity:0; transform: translateY(-2px);} to { opacity:1; transform: none;} }
          #loadingRow td { text-align:center; font-style: italic; }
        </style></head><body><h1>API Key Admin</h1>
        <section>
          <form id="createForm" onsubmit="return false;">
            <fieldset><legend>Create Key</legend>
              <label>Validity (days 1-30): <input id="days" type="number" min="1" max="30" value="30" style="width:4rem"></label>
              <button id="create" type="button">Create</button>
              <button id="resetCreate" type="button" style="display:none">Clear</button>
              <div class="status" id="createResult" style="display:none;margin-top:.75rem"></div>
            </fieldset>
          </form>
        </section>
        <section>
          <fieldset><legend>Existing Keys</legend>
            <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;margin-bottom:.5rem">
              <button id="refresh" type="button">Refresh</button>
              <span class="muted" id="lastRefreshed"></span>
              <span class="muted" id="keyCount"></span>
            </div>
            <div style="overflow:auto;max-height:60vh;border:1px solid #8884;border-radius:6px;">
              <table aria-label="API keys list">
                <thead><tr><th style="width:38%">Key</th><th>Expires</th><th>TTL</th><th>Usage</th><th style="width:150px">Actions</th></tr></thead>
                <tbody id="keys"><tr id="loadingRow"><td colspan="5">Loading…</td></tr></tbody>
              </table>
            </div>
            <div id="msg" class="status" style="display:none;margin-top:.75rem"></div>
          </fieldset>
        </section>
        <script nonce="${adminNonce}">(function(){
          // Debug log to verify script executes
          try { console.log('[admin] script start'); } catch(_){ }
          // Escape helper (avoid inline object literal complexities for Safari)
          var ESC_AMP = '&amp;'; var ESC_LT = '&lt;'; var ESC_GT='&gt;'; var ESC_QUOT='&quot;';
          function esc(s){
            if(s==null) return '';
            return String(s).replace(/["&<>]/g,function(c){
              if(c==='&') return ESC_AMP; if(c==='<' ) return ESC_LT; if(c==='>') return ESC_GT; if(c==='"') return ESC_QUOT; return c;
            });
          }
          const fmtTTL = function(ttl){ if(ttl==null) return '-'; if(ttl<=0) return 'expired'; var d=Math.floor(ttl/86400); var h=Math.floor((ttl%86400)/3600); var m=Math.floor((ttl%3600)/60); if(d>0) return d+'d '+h+'h'; if(h>0) return h+'h '+m+'m'; return m+'m'; };
            const fmtExpire = function(unix){ return unix ? new Date(unix*1000).toISOString().replace('T',' ').replace(/:\\d+\\.\\d+Z$/,' UTC') : '-'; };
            var currentKeys = [];
            var refreshInFlight = 0;
            var els = function(id){ return document.getElementById(id); };
            var keysTbody = els('keys');
            var msgBox = els('msg');
            function setStatus(obj, box){ if(!box) box=msgBox; if(!obj){ box.style.display='none'; box.textContent=''; return;} box.style.display='block'; box.textContent = (typeof obj === 'string') ? obj : JSON.stringify(obj,null,2); }
            function renderKeys(){
              keysTbody.innerHTML='';
              if(!currentKeys.length){ var trEmpty=document.createElement('tr'); trEmpty.innerHTML='<td colspan="5" style="text-align:center;font-style:italic">No keys</td>'; keysTbody.appendChild(trEmpty); }
              for(var i=0;i<currentKeys.length;i++){
                var k = currentKeys[i];
                var tr=document.createElement('tr');
                tr.className='fade';
                tr.setAttribute('data-key', k.apiKey);
                tr.innerHTML = '<td class="keyCell"><span title="Click to copy" data-copy="'+esc(k.apiKey)+'">'+esc(k.apiKey)+'</span></td>'+
                               '<td>'+esc(fmtExpire(k.expire))+'</td>'+
                               '<td>'+esc(fmtTTL(k.ttl))+'</td>'+
                               '<td>'+(k.usage!=null? esc(k.usage):'0')+'</td>'+
                               '<td><div class="actions">'+
                                 '<button data-act="copy" data-k="'+esc(k.apiKey)+'">Copy</button>'+
                                 '<button data-act="delete" data-k="'+esc(k.apiKey)+'" class="danger">Delete</button>'+
                               '</div></td>';
                keysTbody.appendChild(tr);
              }
              els('keyCount').textContent = currentKeys.length ? (currentKeys.length+' key'+(currentKeys.length===1?'':'s')) : '';
            }
            async function refresh(){
              if(refreshInFlight) return; refreshInFlight=1; setStatus(null); els('lastRefreshed').textContent='';
              keysTbody.innerHTML='<tr id="loadingRow"><td colspan="5">Loading…</td></tr>';
              try {
                var r = await fetch('/api/admin/api-keys?t=' + Date.now(), {cache:'no-store'});
                var j = await r.json();
                if(!j.success){ setStatus(j); currentKeys=[]; renderKeys(); }
                else { currentKeys = j.keys.sort(function(a,b){ return (a.expire||0)-(b.expire||0); }); renderKeys(); els('lastRefreshed').textContent='Updated '+ new Date().toLocaleTimeString(); }
              } catch(e){ setStatus('ERR: '+ e); }
              finally { refreshInFlight=0; }
            }
            keysTbody.addEventListener('click', async function(e){
              var btn = e.target.closest('button');
              if(!btn) return;
              var act = btn.getAttribute('data-act');
              var key = btn.getAttribute('data-k');
              if(!key) return;
              if(act==='copy'){
                try { await navigator.clipboard.writeText(key); btn.textContent='Copied'; setTimeout(function(){ btn.textContent='Copy'; }, 1200); }
                catch(_){ setStatus('Clipboard copy failed'); }
                return;
              }
              if(act==='delete'){
                if(!confirm('Delete this key?')) return;
                btn.disabled=true; btn.textContent='…';
                try {
                  var rDel = await fetch('/api/admin/api-keys/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({apiKey:key}),cache:'no-store'});
                  var jDel = await rDel.json();
                  if(jDel.success){ currentKeys = currentKeys.filter(function(k){return k.apiKey!==key;}); renderKeys(); setStatus({deleted:key}); }
                  else { setStatus(jDel); }
                } catch(eDel){ setStatus('ERR: '+ eDel); }
              }
            });
            els('refresh').onclick=function(){ refresh(); };
            els('create').onclick=async function(){
              var days=parseInt(els('days').value,10);
              if(!Number.isFinite(days)||days<1||days>30){ setStatus('Invalid days value', els('createResult')); return; }
              setStatus(null, els('createResult'));
              els('createResult').style.display='block';
              els('createResult').textContent='Creating…';
              try {
                var rC = await fetch('/api/admin/api-keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({days:days}),cache:'no-store'});
                var jC = await rC.json();
                if(jC.success){
                  els('createResult').textContent = JSON.stringify(jC,null,2);
                  els('resetCreate').style.display='inline-block';
                  currentKeys.push({apiKey:jC.apiKey, expire:jC.expire, usage:jC.usage||0, ttl:(jC.expire? Math.max(0, jC.expire - Math.floor(Date.now()/1000)) : null)});
                  renderKeys();
                } else { els('createResult').textContent = JSON.stringify(jC,null,2); }
              } catch(eC){ els('createResult').textContent='ERR: '+ eC; }
            };
            els('resetCreate').onclick=function(){ els('createResult').textContent=''; els('createResult').style.display='none'; els('resetCreate').style.display='none'; };
            refresh();
        })();</script></body></html>`;
        return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html', ...getSecurityHeaders(request, adminNonce) } });
      }

      // Route page requests
      if (request.method !== 'GET') {
        return new Response(getErrorMessage('METHOD_NOT_ALLOWED', locale), {
          status: 405,
          headers: {
            'Allow': 'GET',
            ...getSecurityHeaders(request)
          }
        });
      }

      let response;
      // Nonce for HTML responses (injected into CSP and script tags)
      let cspNonce = null;
      let cacheHeaders = {};

      // Edge cache static HTML pages (locale-aware) to improve hit ratio
      const isCacheablePage = ['/', '/about.html', '/tos.html', '/privacy.html'].includes(pathWithoutLocale);
      if (isCacheablePage) {
        // Support browser revalidation via strong ETag
        const pageKeyEarly = pathWithoutLocale === '/' ? 'home' : pathWithoutLocale.replace(/^\//, '').replace(/\W+/g, '-');
        const expectedETag = `"html-${ASSET_VERSION}-${locale}-${pageKeyEarly}"`;
        if (request.headers.get('if-none-match') === expectedETag) {
          return new Response(null, { status: 304, headers: { ...getSecurityHeaders(request), ETag: expectedETag } });
        }
        const cacheKeyUrl = new URL(pathname, url.origin);
        cacheKeyUrl.searchParams.set('v', ASSET_VERSION);
        const cachedHtml = await caches.default.match(cacheKeyUrl.toString());
        if (cachedHtml) {
          return cachedHtml;
        }
      }

      // Use pathWithoutLocale for route matching to support localized URLs
      switch (pathWithoutLocale) {
        case '/':
          cspNonce = generateNonce();
          response = versionAssetUrls((await getIndexHTML(locale, url.origin)).replace(/{{CSP_NONCE}}/g, cspNonce));
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/about.html':
          cspNonce = cspNonce || generateNonce();
          response = versionAssetUrls((await getAboutHTML(locale, url.origin)).replace(/{{CSP_NONCE}}/g, cspNonce));
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/create-memo.html':
          const siteKey = env.TURNSTILE_SITE_KEY || 'MISSING_SITE_KEY';
          cspNonce = cspNonce || generateNonce();
          response = versionAssetUrls((await getCreateMemoHTML(locale, url.origin))
            .replace('{{TURNSTILE_SITE_KEY}}', siteKey)
            .replace(/{{CSP_NONCE}}/g, cspNonce));
          cacheHeaders = { 'Cache-Control': 'no-store' };
          break;
        case '/read-memo.html':
          const readSiteKey = env.TURNSTILE_SITE_KEY || 'MISSING_SITE_KEY';
          cspNonce = cspNonce || generateNonce();
          response = versionAssetUrls((await getReadMemoHTML(locale, url.origin))
            .replace('{{TURNSTILE_SITE_KEY}}', readSiteKey)
            .replace(/{{CSP_NONCE}}/g, cspNonce));
          cacheHeaders = { 'Cache-Control': 'no-store' };
          break;
        case '/tos.html':
          cspNonce = cspNonce || generateNonce();
          response = versionAssetUrls((await getToSHTML(locale, url.origin)).replace(/{{CSP_NONCE}}/g, cspNonce));
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/privacy.html':
          cspNonce = cspNonce || generateNonce();
          response = versionAssetUrls((await getPrivacyHTML(locale, url.origin)).replace(/{{CSP_NONCE}}/g, cspNonce));
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        default:
          return new Response(getErrorMessage('NOT_FOUND', locale), {
            status: 404,
            headers: getSecurityHeaders(request)
          });
      }

      const htmlResp = new Response(response, {
        headers: {
          'Content-Type': 'text/html',
          ...cacheHeaders,
          ...getSecurityHeaders(request, cspNonce || generateNonce())
        }
      });

      // Store cacheable HTML at edge with versioned key; skip create/read pages
      if (isCacheablePage) {
        const cacheKeyUrl = new URL(pathname, url.origin);
        cacheKeyUrl.searchParams.set('v', ASSET_VERSION);
        // Add a simple ETag so browsers can revalidate too
        const pageKey = pathWithoutLocale === '/' ? 'home' : pathWithoutLocale.replace(/^\//, '').replace(/\W+/g, '-');
        htmlResp.headers.set('ETag', `"html-${ASSET_VERSION}-${locale}-${pageKey}"`);
        // Helpful for intermediaries (even though Worker cache uses explicit put)
        if (cacheHeaders['Cache-Control'] && cacheHeaders['Cache-Control'] !== 'no-store') {
          htmlResp.headers.set('Cache-Control', `${cacheHeaders['Cache-Control']}, stale-while-revalidate=604800`);
        }
        ctx.waitUntil(caches.default.put(cacheKeyUrl.toString(), htmlResp.clone()));
      }
      return htmlResp;
    } catch (error) {
      return new Response(getErrorMessage('INTERNAL_SERVER_ERROR', 'en'), {
        status: 500,
        headers: getSecurityHeaders(request)
      });
    }
  },

  // Cron job: cleanup expired memos
  async scheduled(event, env, ctx) {
    try {
      const result = await handleCleanupMemos(env);
      return result;
    } catch (error) {
      return new Response(getErrorMessage('CLEANUP_FAILED', 'en'), { status: 500 });
    }
  }
}; 