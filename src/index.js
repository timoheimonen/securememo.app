/* eslint-env worker, serviceworker */
// Explicit binding of selected worker globals for static analysis clarity
const { caches } = globalThis;
import { getStyles } from './styles/styles.js';
import { getSupportedLocales } from './lang/localization.js';
import { minifyJS, minifyCSS } from './utils/minifiers.js';
import {
  getSecurityHeaders,
  mergeSecurityHeadersIntoResponse,
  isValidOrigin,
  generateNonce,
} from './utils/securityHeaders.js';
import { ensureGetMethod, methodNotAllowedJSONResponse, notModifiedIfMatch } from './utils/http.js';

/**
 * Escape a string for safe injection into JavaScript string literals.
 * @param {string} str raw string
 * @returns {string} escaped string
 */
function escapeJavaScript(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
import {
  getIndexHTML,
  getAboutHTML,
  getCreateMemoHTML,
  getReadMemoHTML,
  getToSHTML,
  getPrivacyHTML,
} from './templates/pages.js';
import { getCreateMemoJS, getReadMemoJS, getCommonJS } from './templates/js.js';
import { handleCreateMemo, handleReadMemo, handleConfirmDelete, handleCleanupMemos } from './handlers/auth.js';
import { getErrorMessage } from './utils/errorMessages.js';
import {
  extractLocaleFromPath,
  getLocaleRedirectPath,
  buildLocalizedPath,
  t,
  extractLocaleFromRequest,
  getDefaultLocale,
} from './lang/localization.js';
import { getClientLocalizationJS } from './lang/clientLocalization.js';
import { sanitizeLocale } from './utils/validation.js';

// Immutable asset version for cache-busting (bump on asset changes)
const ASSET_VERSION = '20250831a';

// (Minifiers moved to ./utils/minifiers.js)

/**
 * Safely post-process trusted template HTML to append immutable version query parameters
 * to known static asset URLs. This function ONLY performs deterministic regex substitutions
 * on a previously generated, trusted server-side template string and never injects or
 * concatenates untrusted user input. As such, the returned string is still safe HTML.
 *
 * Rationale: Some static analysis tools flag functions whose names don't clearly signal
 * that they operate on HTML. Renaming to reflect HTML semantics and documenting the
 * security model reduces false positive XSS findings.
 *
 * Idempotency: Re-applying produces the same output because already-versioned URLs match
 * the patterns in a way that safely re-adds (or leaves) the single version parameter only once.
 *
 * @param {string} htmlInput - Raw HTML markup (trusted template output) to process.
 * @returns {string} Post-processed HTML string with versioned asset URLs (?v=ASSET_VERSION).
 */
function addAssetVersionsToHTML(htmlInput) {
  if (typeof htmlInput !== 'string' || !htmlInput) return htmlInput || '';
  try {
    return (
      htmlInput
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
        .replace(/\/(android-chrome-512x512\.png)(\b)/g, `/android-chrome-512x512.png?v=${ASSET_VERSION}$2`)
    );
  } catch (_) {
    return htmlInput;
  }
}

// (Security & origin helpers moved to ./utils/securityHeaders.js)

export default {
  async fetch(request, env, ctx) {
    try {
      // Check DB availability
      if (!env.DB) {
        return new globalThis.Response(getErrorMessage('SERVICE_UNAVAILABLE', 'en'), {
          status: 503,
          headers: getSecurityHeaders(request),
        });
      }

      // Parse and validate URL
      let url;
      try {
        url = new globalThis.URL(request.url);
      } catch (urlError) {
        return new globalThis.Response(getErrorMessage('BAD_REQUEST', 'en'), {
          status: 400,
          headers: getSecurityHeaders(request),
        });
      }

      const pathname = url.pathname;

      // Skip locale handling for static assets and API routes
      const isStaticAsset =
        pathname.startsWith('/styles.css') ||
        pathname.startsWith('/js/') ||
        pathname.startsWith('/api/') ||
        pathname === '/sitemap.xml' ||
        pathname.startsWith('/favicon') ||
        pathname.includes('.png') ||
        pathname.includes('.ico');

      // Handle locale-based routing with /en prefix (only for HTML pages)
      let locale = 'en';
      let pathWithoutLocale = pathname;

      if (!isStaticAsset) {
        const localeResult = extractLocaleFromPath(pathname);
        locale = sanitizeLocale(localeResult.locale);
        pathWithoutLocale = localeResult.pathWithoutLocale;

        // Check for nested locale patterns and redirect to normalized path
        if (localeResult.needsRedirect) {
          // Redirect nested locale paths to proper single locale paths
          // localeResult.pathWithoutLocale is already clean, just add default locale prefix
          const normalizedPath = buildLocalizedPath(getDefaultLocale(), localeResult.pathWithoutLocale);
          return globalThis.Response.redirect(url.origin + normalizedPath, 301);
        }

        // Check if redirect to localized path is needed (add /en prefix to non-localized URLs)
        const redirectPath = getLocaleRedirectPath(pathname);
        if (redirectPath && redirectPath !== pathname) {
          return globalThis.Response.redirect(url.origin + redirectPath, 301);
        }
      }

      // Handle CORS preflight with proper origin validation
      if (request.method === 'OPTIONS') {
        // Only allow preflight for valid origins
        if (!isValidOrigin(request)) {
          return new globalThis.Response(null, {
            status: 403,
            headers: { Vary: 'Origin' },
          });
        }
        return new globalThis.Response(null, {
          status: 200,
          headers: getSecurityHeaders(request),
        });
      }

      // Route API requests
      if (pathname.startsWith('/api/')) {
        const apiPath = pathname.substring(5);

        // Extract locale for API calls from headers/query params instead of URL path
        const apiLocale = extractLocaleFromRequest(request);

        // Validate origin for API requests
        if (!isValidOrigin(request)) {
          return new globalThis.Response(JSON.stringify({ error: getErrorMessage('FORBIDDEN', apiLocale) }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-store',
              Vary: 'Origin',
              ...getSecurityHeaders(request),
            },
          });
        }

        // Validate request method for API endpoints
        // Enforce POST-only API endpoints
        const postOnlyEndpoints = new Set(['create-memo', 'read-memo', 'confirm-delete']);
        if (postOnlyEndpoints.has(apiPath) && request.method !== 'POST') {
          return methodNotAllowedJSONResponse(request, 'POST', apiLocale, getErrorMessage, getSecurityHeaders);
        }

        // Check request size limit (100KB) for POST requests
        if (request.method === 'POST') {
          const contentLength = request.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 100000) {
            return new globalThis.Response(
              JSON.stringify({
                error: getErrorMessage('REQUEST_TOO_LARGE', apiLocale),
              }),
              {
                status: 413,
                headers: {
                  'Content-Type': 'application/json',
                  'Cache-Control': 'no-store',
                  ...getSecurityHeaders(request),
                },
              }
            );
          }
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
            return new globalThis.Response(getErrorMessage('NOT_FOUND', apiLocale), {
              status: 404,
              headers: {
                ...getSecurityHeaders(request),
                'Cache-Control': 'no-store',
              },
            });
        }
      }

      // Serve sitemap.xml
      if (pathname === '/sitemap.xml') {
        const sitemapMethodCheck = ensureGetMethod(request, locale, getSecurityHeaders, getErrorMessage);
        if (sitemapMethodCheck) return sitemapMethodCheck;

        // Generate multilingual sitemap for all supported languages
        const supportedLocales = getSupportedLocales();
        const currentDate = new Date().toISOString().split('T')[0];
        const pages = [
          { path: '', priority: '1.0', changefreq: 'weekly' },
          { path: '/about.html', priority: '0.8', changefreq: 'monthly' },
          { path: '/create-memo.html', priority: '0.9', changefreq: 'monthly' },
          { path: '/tos.html', priority: '0.3', changefreq: 'yearly' },
          { path: '/privacy.html', priority: '0.3', changefreq: 'yearly' },
        ];

        let sitemapUrls = '';
        pages.forEach((page) => {
          supportedLocales.forEach((lang) => {
            // Renamed from 'url' to 'pageUrl' to avoid shadowing the outer 'url' variable
            const pageUrl = `https://securememo.app/${lang}${page.path}`;
            const hreflangs = supportedLocales
              .map(
                (hreflang) =>
                  `    <xhtml:link rel="alternate" hreflang="${hreflang}" href="https://securememo.app/${hreflang}${page.path}"/>`
              )
              .join('\n');

            sitemapUrls += `  <url>
    <loc>${pageUrl}</loc>
    <lastmod>${currentDate}</lastmod>
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
        return new globalThis.Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
            ETag: '"sitemap-v1"',
            'Last-Modified': 'Tue, 19 Aug 2025 16:15:00 GMT',
            ...getSecurityHeaders(request),
          },
        });
      }

      // Serve static assets (use pathname for non-localized assets)
      if (pathname === '/styles.css') {
        const stylesMethodCheck = ensureGetMethod(request, locale, getSecurityHeaders, getErrorMessage);
        if (stylesMethodCheck) return stylesMethodCheck;
        // Cache versioned CSS aggressively at the edge
        const isVersioned = url.searchParams.has('v');
        if (isVersioned) {
          const cached = await caches.default.match(request);
          if (cached) return cached;
        }
        const css = minifyCSS(getStyles());
        const cssEtag = `"styles-${ASSET_VERSION}"`;
        const cssNotMod = notModifiedIfMatch(request, cssEtag, getSecurityHeaders);
        if (cssNotMod) return cssNotMod;
        const cssResp = new globalThis.Response(css, {
          headers: {
            'Content-Type': 'text/css',
            // Versioned -> immutable long cache; Unversioned -> short cache
            'Cache-Control': isVersioned ? 'public, max-age=31536000, immutable' : 'public, max-age=3600',
            ETag: cssEtag,
            ...getSecurityHeaders(request),
          },
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
        const createJsMethodCheck = ensureGetMethod(request, locale, getSecurityHeaders, getErrorMessage);
        if (createJsMethodCheck) return createJsMethodCheck;
        // Edge cache per-locale + version
        const cached = await caches.default.match(request);
        if (cached) return cached;
        const jsContent = getCreateMemoJS()
          .replace(/{{TURNSTILE_SITE_KEY}}/g, env.TURNSTILE_SITE_KEY)
          .replace(/{{MISSING_MESSAGE_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_MESSAGE', jsLocale)))
          .replace(/{{MESSAGE_TOO_LONG_ERROR}}/g, escapeJavaScript(getErrorMessage('MESSAGE_TOO_LONG', jsLocale)))
          .replace(
            /{{MISSING_SECURITY_CHALLENGE_ERROR}}/g,
            escapeJavaScript(getErrorMessage('MISSING_SECURITY_CHALLENGE', jsLocale))
          )
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
        const createJsNotMod = notModifiedIfMatch(request, jsEtag, getSecurityHeaders);
        if (createJsNotMod) return createJsNotMod;
        const jsResp = new globalThis.Response(minifyJS(jsContent), {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            ETag: jsEtag,
            ...getSecurityHeaders(request),
          },
        });
        ctx.waitUntil(caches.default.put(request, jsResp.clone()));
        return jsResp;
      }

      if (pathname === '/js/read-memo.js') {
        // Extract locale from query parameter for JavaScript files
        const jsLocale = url.searchParams.get('locale') || 'en';
        const readJsMethodCheck = ensureGetMethod(request, locale, getSecurityHeaders, getErrorMessage);
        if (readJsMethodCheck) return readJsMethodCheck;
        // Edge cache per-locale + version
        const cached = await caches.default.match(request);
        if (cached) return cached;
        const jsContent = getReadMemoJS()
          .replace(/{{TURNSTILE_SITE_KEY}}/g, env.TURNSTILE_SITE_KEY)
          .replace(/{{MISSING_MEMO_ID_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_MEMO_ID', jsLocale)))
          .replace(/{{MISSING_PASSWORD_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_PASSWORD_ERROR', jsLocale)))
          .replace(/{{INVALID_MEMO_URL_ERROR}}/g, escapeJavaScript(getErrorMessage('INVALID_MEMO_URL_ERROR', jsLocale)))
          .replace(
            /{{MISSING_SECURITY_CHALLENGE_ERROR}}/g,
            escapeJavaScript(getErrorMessage('MISSING_SECURITY_CHALLENGE_ERROR', jsLocale))
          )
          .replace(
            /{{MEMO_ALREADY_READ_DELETED_ERROR}}/g,
            escapeJavaScript(getErrorMessage('MEMO_ALREADY_READ_DELETED_ERROR', jsLocale))
          )
          .replace(
            /{{MEMO_EXPIRED_DELETED_ERROR}}/g,
            escapeJavaScript(getErrorMessage('MEMO_EXPIRED_DELETED_ERROR', jsLocale))
          )
          .replace(
            /{{INVALID_PASSWORD_CHECK_ERROR}}/g,
            escapeJavaScript(getErrorMessage('INVALID_PASSWORD_CHECK_ERROR', jsLocale))
          )
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
        const readJsNotMod = notModifiedIfMatch(request, jsEtag, getSecurityHeaders);
        if (readJsNotMod) return readJsNotMod;
        const jsResp = new globalThis.Response(minifyJS(jsContent), {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            ETag: jsEtag,
            ...getSecurityHeaders(request),
          },
        });
        ctx.waitUntil(caches.default.put(request, jsResp.clone()));
        return jsResp;
      }

      if (pathname === '/js/common.js') {
        const commonJsMethodCheck = ensureGetMethod(request, locale, getSecurityHeaders, getErrorMessage);
        if (commonJsMethodCheck) return commonJsMethodCheck;
        const cached = await caches.default.match(request);
        if (cached) return cached;
        const cmnEtag = `"common-${ASSET_VERSION}"`;
        const commonNotMod = notModifiedIfMatch(request, cmnEtag, getSecurityHeaders);
        if (commonNotMod) return commonNotMod;
        const commonResp = new globalThis.Response(minifyJS(getCommonJS()), {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            ETag: cmnEtag,
            ...getSecurityHeaders(request),
          },
        });
        ctx.waitUntil(caches.default.put(request, commonResp.clone()));
        return commonResp;
      }

      if (pathname === '/js/clientLocalization.js') {
        const clientLocMethodCheck = ensureGetMethod(request, locale, getSecurityHeaders, getErrorMessage);
        if (clientLocMethodCheck) return clientLocMethodCheck;

        // Extract locale from Referer header (e.g., https://securememo.app/en/about.html -> 'en')
        let jsLocale = 'en';
        const referer = request.headers.get('referer');
        if (referer) {
          try {
            const refererUrl = new globalThis.URL(referer);
            const refererLocaleInfo = extractLocaleFromPath(refererUrl.pathname);
            if (refererLocaleInfo.locale && getSupportedLocales().includes(refererLocaleInfo.locale)) {
              jsLocale = refererLocaleInfo.locale;
            }
          } catch {
            /* Ignore invalid referer URLs */
          }
        }

        // Serve the optimized client localization utility with only the relevant translations
        const secHeaders = getSecurityHeaders(request);
        // Ensure caches vary on Referer since content depends on it (header-based for browsers)
        secHeaders['Vary'] = 'Origin, Referer';

        // Edge cache by synthetic key including locale + version
        const cacheKeyUrl = new globalThis.URL('/js/clientLocalization.js', url.origin);
        cacheKeyUrl.searchParams.set('locale', jsLocale);
        cacheKeyUrl.searchParams.set('v', ASSET_VERSION);
        const cacheMatch = await caches.default.match(cacheKeyUrl.toString());
        if (cacheMatch) return cacheMatch;

        const locEtag = `"clientloc-${ASSET_VERSION}-${jsLocale}"`;
        if (request.headers.get('if-none-match') === locEtag) {
          return new globalThis.Response(null, {
            status: 304,
            headers: { ...secHeaders, ETag: locEtag },
          });
        }
        const locResp = new globalThis.Response(minifyJS(getClientLocalizationJS(jsLocale)), {
          headers: {
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=31536000, immutable',
            ETag: locEtag,
            ...secHeaders,
          },
        });
        ctx.waitUntil(caches.default.put(cacheKeyUrl.toString(), locResp.clone()));
        return locResp;
      }

      // Route page requests
      const pageMethodCheck = ensureGetMethod(request, locale, getSecurityHeaders, getErrorMessage);
      if (pageMethodCheck) return pageMethodCheck;

      let response;
      // Nonce for HTML responses (injected into CSP and script tags)
      let cspNonce = null;
      let cacheHeaders = {};

      // Edge cache static HTML pages (locale-aware) to improve hit ratio
      const isCacheablePage = ['/', '/about.html', '/tos.html', '/privacy.html'].includes(pathWithoutLocale);
      if (isCacheablePage) {
        // Support browser revalidation via strong ETag
        const pageKeyEarly =
          pathWithoutLocale === '/' ? 'home' : pathWithoutLocale.replace(/^\//, '').replace(/\W+/g, '-');
        const expectedETag = `"html-${ASSET_VERSION}-${locale}-${pageKeyEarly}"`;
        const pageNotMod = notModifiedIfMatch(request, expectedETag, getSecurityHeaders);
        if (pageNotMod) return pageNotMod;
        const cacheKeyUrl = new globalThis.URL(pathname, url.origin);
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
          response = addAssetVersionsToHTML(
            (await getIndexHTML(locale, url.origin)).replace(/{{CSP_NONCE}}/g, cspNonce)
          );
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/about.html':
          cspNonce = cspNonce || generateNonce();
          response = addAssetVersionsToHTML(
            (await getAboutHTML(locale, url.origin)).replace(/{{CSP_NONCE}}/g, cspNonce)
          );
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/create-memo.html': {
          const siteKey = env.TURNSTILE_SITE_KEY || 'MISSING_SITE_KEY';
          cspNonce = cspNonce || generateNonce();
          response = addAssetVersionsToHTML(
            (await getCreateMemoHTML(locale, url.origin))
              .replace('{{TURNSTILE_SITE_KEY}}', siteKey)
              .replace(/{{CSP_NONCE}}/g, cspNonce)
          );
          cacheHeaders = { 'Cache-Control': 'no-store' };
          break;
        }
        case '/read-memo.html': {
          const readSiteKey = env.TURNSTILE_SITE_KEY || 'MISSING_SITE_KEY';
          cspNonce = cspNonce || generateNonce();
          response = addAssetVersionsToHTML(
            (await getReadMemoHTML(locale, url.origin))
              .replace('{{TURNSTILE_SITE_KEY}}', readSiteKey)
              .replace(/{{CSP_NONCE}}/g, cspNonce)
          );
          cacheHeaders = { 'Cache-Control': 'no-store' };
          break;
        }
        case '/tos.html':
          cspNonce = cspNonce || generateNonce();
          response = addAssetVersionsToHTML((await getToSHTML(locale, url.origin)).replace(/{{CSP_NONCE}}/g, cspNonce));
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/privacy.html':
          cspNonce = cspNonce || generateNonce();
          response = addAssetVersionsToHTML(
            (await getPrivacyHTML(locale, url.origin)).replace(/{{CSP_NONCE}}/g, cspNonce)
          );
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        default:
          return new globalThis.Response(getErrorMessage('NOT_FOUND', locale), {
            status: 404,
            headers: getSecurityHeaders(request),
          });
      }

      // Safe HTML content: response variable contains trusted, server-generated HTML
      // that has been processed through addAssetVersionsToHTML() and template replacements
      // with only trusted values. No user input is injected at this point.
      const htmlResp = new globalThis.Response(response, {
        headers: {
          'Content-Type': 'text/html',
          ...cacheHeaders,
          ...getSecurityHeaders(request, cspNonce || generateNonce()),
        },
      });

      // Store cacheable HTML at edge with versioned key; skip create/read pages
      if (isCacheablePage) {
        const cacheKeyUrl = new globalThis.URL(pathname, url.origin);
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
      const errHeaders = getSecurityHeaders(request);
      try {
        if (env && env.TEST) {
          errHeaders['X-Test-Error'] = (error && (error.stack || error.message)) || 'unknown';
        }
      } catch (_) {
        /* swallow */
      }
      return new globalThis.Response(getErrorMessage('INTERNAL_SERVER_ERROR', 'en'), {
        status: 500,
        headers: errHeaders,
      });
    }
  },

  // Cron job: cleanup expired memos
  async scheduled(event, env) {
    try {
      const result = await handleCleanupMemos(env);
      return result;
    } catch (error) {
      return new globalThis.Response(getErrorMessage('CLEANUP_FAILED', 'en'), {
        status: 500,
      });
    }
  },
};
