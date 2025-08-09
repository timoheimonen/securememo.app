import { getStyles } from './styles/styles.js';
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
  handleCleanupMemos
} from './handlers/auth.js';
import { getErrorMessage } from './utils/errorMessages.js';
import { 
  extractLocaleFromPath, 
  getLocaleRedirectPath,
  getCanonicalUrl,
  buildLocalizedPath,
  t
} from './utils/localization.js';
import { getClientLocalizationJS } from './utils/clientLocalization.js';

// Allowed origins for CORS
const allowedOrigins = [
  'https://securememo.app',
  'https://www.securememo.app',
  'https://securememo-dev.timo-heimonen.workers.dev'
];

// Security headers with CSP for XSS protection (without CORS origin)
const baseSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'none'; script-src 'self' https://challenges.cloudflare.com 'sha384-8tTMUpBXDOsQTxlbB/LdlISG/7nPjF1RWr/rNDxPsh5quEpybtbFHO/flV79t6uO'; style-src 'self'; img-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self';",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin'
};

// Function to validate origin and get security headers with proper CORS origin
function getSecurityHeaders(request) {
  const origin = request.headers.get('origin');
  const headers = { ...baseSecurityHeaders };
  
  // Only set CORS headers if origin is in allowed list
  if (origin && allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  
  return headers;
}

// Function to validate origin for CORS requests
function isValidOrigin(request) {
  const origin = request.headers.get('origin');
  return origin && allowedOrigins.includes(origin);
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

      // Skip locale handling for static assets and API routes
      const isStaticAsset = pathname.startsWith('/styles.css') || 
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
        locale = localeResult.locale;
        pathWithoutLocale = localeResult.pathWithoutLocale;
        
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
        
        // Validate origin for API requests
        if (!isValidOrigin(request)) {
          return new Response(JSON.stringify({ error: getErrorMessage('FORBIDDEN', locale) }), {
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
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED', locale) }), {
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
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED', locale) }), {
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
            return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED', locale) }), {
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
            return new Response(JSON.stringify({ error: getErrorMessage('REQUEST_TOO_LARGE', locale) }), {
              status: 413,
              headers: { 
                'Content-Type': 'application/json',
                ...getSecurityHeaders(request)
              }
            });
          }
        }
        
        switch (apiPath) {
          case 'create-memo':
            return await handleCreateMemo(request, env, locale);
          case 'read-memo':
            return await handleReadMemo(request, env, locale);
          case 'confirm-delete':
            return await handleConfirmDelete(request, env, locale);
          default:
            return new Response(getErrorMessage('NOT_FOUND', locale), { 
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
        const supportedLocales = ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ptPT', 'ptBR'];
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
            'Last-Modified': 'Mon, 05 Aug 2025 00:00:00 GMT',
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
        return new Response(getStyles(), {
          headers: { 
            'Content-Type': 'text/css',
            'Cache-Control': 'public, max-age=3600',
            ...getSecurityHeaders(request)
          }
        });
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
        const jsContent = getCreateMemoJS()
          .replace(/{{TURNSTILE_SITE_KEY}}/g, env.TURNSTILE_SITE_KEY)
          .replace(/{{MISSING_MESSAGE_ERROR}}/g, getErrorMessage('MISSING_MESSAGE', jsLocale))
          .replace(/{{MESSAGE_TOO_LONG_ERROR}}/g, getErrorMessage('MESSAGE_TOO_LONG', jsLocale))
          .replace(/{{MISSING_SECURITY_CHALLENGE_ERROR}}/g, getErrorMessage('MISSING_SECURITY_CHALLENGE', jsLocale))
          .replace(/{{CREATE_MEMO_FAILED_ERROR}}/g, getErrorMessage('CREATE_MEMO_FAILED', jsLocale))
          .replace(/{{CREATE_MEMO_ERROR}}/g, getErrorMessage('CREATE_MEMO_ERROR', jsLocale))
          .replace(/{{DECRYPTION_ERROR}}/g, getErrorMessage('DECRYPTION_ERROR', jsLocale))
          .replace(/{{READ_MEMO_ERROR}}/g, getErrorMessage('READ_MEMO_ERROR', jsLocale))
          .replace(/{{PASSWORD_COPIED_MESSAGE}}/g, t('msg.passwordCopied', jsLocale))
          .replace(/{{URL_COPIED_MESSAGE}}/g, t('msg.urlCopied', jsLocale))
          .replace(/{{COPY_MANUAL_MESSAGE}}/g, t('msg.copyManual', jsLocale))
          .replace(/{{MSG_ENCRYPTING}}/g, t('msg.encrypting', jsLocale))
          .replace(/{{BTN_CREATE}}/g, t('btn.create', jsLocale))
          .replace(/{{BTN_COPIED}}/g, t('btn.copied', jsLocale))
          .replace(/{{BTN_SHOW}}/g, t('btn.show', jsLocale))
          .replace(/{{BTN_HIDE}}/g, t('btn.hide', jsLocale))
          .replace(/{{BTN_COPY}}/g, t('btn.copy', jsLocale));
        return new Response(jsContent, {
          headers: { 
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
            ...getSecurityHeaders(request)
          }
        });
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
        const jsContent = getReadMemoJS()
          .replace(/{{TURNSTILE_SITE_KEY}}/g, env.TURNSTILE_SITE_KEY)
          .replace(/{{MISSING_MEMO_ID_ERROR}}/g, getErrorMessage('MISSING_MEMO_ID', jsLocale))
          .replace(/{{MISSING_PASSWORD_ERROR}}/g, getErrorMessage('MISSING_PASSWORD_ERROR', jsLocale))
          .replace(/{{INVALID_MEMO_URL_ERROR}}/g, getErrorMessage('INVALID_MEMO_URL_ERROR', jsLocale))
          .replace(/{{MISSING_SECURITY_CHALLENGE_ERROR}}/g, getErrorMessage('MISSING_SECURITY_CHALLENGE_ERROR', jsLocale))
          .replace(/{{MEMO_ALREADY_READ_DELETED_ERROR}}/g, getErrorMessage('MEMO_ALREADY_READ_DELETED_ERROR', jsLocale))
          .replace(/{{MEMO_EXPIRED_DELETED_ERROR}}/g, getErrorMessage('MEMO_EXPIRED_DELETED_ERROR', jsLocale))
          .replace(/{{INVALID_PASSWORD_CHECK_ERROR}}/g, getErrorMessage('INVALID_PASSWORD_CHECK_ERROR', jsLocale))
          .replace(/{{READ_MEMO_ERROR}}/g, getErrorMessage('READ_MEMO_ERROR', jsLocale))
          .replace(/{{DECRYPTION_ERROR}}/g, getErrorMessage('DECRYPTION_ERROR', jsLocale))
          .replace(/{{MEMO_DECRYPTED_MESSAGE}}/g, t('msg.memoDecrypted', jsLocale))
          .replace(/{{MEMO_DELETED_MESSAGE}}/g, t('msg.memoDeleted', jsLocale))
          .replace(/{{BTN_SHOW}}/g, t('btn.show', jsLocale))
          .replace(/{{BTN_HIDE}}/g, t('btn.hide', jsLocale))
          .replace(/{{BTN_COPIED}}/g, t('btn.copied', jsLocale))
          .replace(/{{DELETION_ERROR_MESSAGE}}/g, t('msg.deletionError', jsLocale));
        return new Response(jsContent, {
          headers: { 
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
            ...getSecurityHeaders(request)
          }
        });
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
        return new Response(getCommonJS(), {
          headers: { 
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
            ...getSecurityHeaders(request)
          }
        });
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
        
        // Serve the client localization utility
        return new Response(getClientLocalizationJS(), {
          headers: { 
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
            ...getSecurityHeaders(request)
          }
        });
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
      let cacheHeaders = {};
      
      // Use pathWithoutLocale for route matching to support localized URLs
      switch (pathWithoutLocale) {
        case '/':
          response = await getIndexHTML(locale, url.origin);
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/about.html':
          response = await getAboutHTML(locale, url.origin);
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/create-memo.html':
          const siteKey = env.TURNSTILE_SITE_KEY || 'MISSING_SITE_KEY';
          response = (await getCreateMemoHTML(locale, url.origin)).replace('{{TURNSTILE_SITE_KEY}}', siteKey);
          break;
        case '/read-memo.html':
          const readSiteKey = env.TURNSTILE_SITE_KEY || 'MISSING_SITE_KEY';
          response = (await getReadMemoHTML(locale, url.origin)).replace('{{TURNSTILE_SITE_KEY}}', readSiteKey);
          break;
        case '/tos.html':
          response = await getToSHTML(locale, url.origin);
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        case '/privacy.html':
          response = await getPrivacyHTML(locale, url.origin);
          cacheHeaders = { 'Cache-Control': 'public, max-age=604800' };
          break;
        default:
          return new Response(getErrorMessage('NOT_FOUND', locale), { 
            status: 404,
            headers: getSecurityHeaders(request)
          });
      }

      return new Response(response, {
        headers: { 
          'Content-Type': 'text/html',
          ...cacheHeaders,
          ...getSecurityHeaders(request)
        }
      });
    } catch (error) {
      return new Response(getErrorMessage('INTERNAL_SERVER_ERROR', locale), { 
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