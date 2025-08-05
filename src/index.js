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
  handleConfirmMemoRead,
  handleCleanupMemos
} from './handlers/auth.js';
import { getErrorMessage } from './utils/errorMessages.js';

// Allowed origins for CORS
const allowedOrigins = [
  'https://securememo.app',
  'https://www.securememo.app'
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
        return new Response('Service Unavailable', { 
          status: 503,
          headers: getSecurityHeaders(request)
        });
      }

      // Parse and validate URL
      let url;
      try {
        url = new URL(request.url);
      } catch (urlError) {
        return new Response('Bad Request', { 
          status: 400,
          headers: getSecurityHeaders(request)
        });
      }

      const pathname = url.pathname;

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
          return new Response(JSON.stringify({ error: getErrorMessage('FORBIDDEN') }), {
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
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED') }), {
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
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED') }), {
            status: 405,
            headers: { 
              'Content-Type': 'application/json',
              'Allow': 'POST',
              ...getSecurityHeaders(request)
            }
          });
        }
        
        // Check allowed methods for confirm-memo-read endpoint
        if (apiPath === 'confirm-memo-read' && request.method !== 'POST') {
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED') }), {
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
            return new Response(JSON.stringify({ error: getErrorMessage('REQUEST_TOO_LARGE') }), {
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
            return await handleCreateMemo(request, env);
          case 'read-memo':
            return await handleReadMemo(request, env);
          case 'confirm-memo-read':
            return await handleConfirmMemoRead(request, env);
          default:
            return new Response('Not Found', { 
              status: 404,
              headers: getSecurityHeaders(request)
            });
        }
      }

      // Serve static assets
      if (pathname === '/styles.css') {
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED'), {
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
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED'), {
            status: 405,
            headers: { 
              'Allow': 'GET',
              ...getSecurityHeaders(request)
            }
          });
        }
        const jsContent = getCreateMemoJS()
          .replace('{{TURNSTILE_SITE_KEY}}', env.TURNSTILE_SITE_KEY)
          .replace('{{MISSING_MESSAGE_ERROR}}', getErrorMessage('MISSING_MESSAGE'))
          .replace('{{MESSAGE_TOO_LONG_ERROR}}', getErrorMessage('MESSAGE_TOO_LONG'))
          .replace('{{MISSING_SECURITY_CHALLENGE_ERROR}}', getErrorMessage('MISSING_SECURITY_CHALLENGE'))
          .replace('{{CREATE_MEMO_FAILED_ERROR}}', getErrorMessage('CREATE_MEMO_FAILED'))
          .replace('{{CREATE_MEMO_ERROR}}', getErrorMessage('CREATE_MEMO_ERROR'))
          .replace('{{DECRYPTION_ERROR}}', getErrorMessage('DECRYPTION_ERROR'))
          .replace('{{READ_MEMO_ERROR}}', getErrorMessage('READ_MEMO_ERROR'));
        return new Response(jsContent, {
          headers: { 
            'Content-Type': 'application/javascript',
            'Cache-Control': 'public, max-age=3600',
            ...getSecurityHeaders(request)
          }
        });
      }
      
      if (pathname === '/js/read-memo.js') {
        if (request.method !== 'GET') {
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED'), {
            status: 405,
            headers: { 
              'Allow': 'GET',
              ...getSecurityHeaders(request)
            }
          });
        }
        const jsContent = getReadMemoJS()
          .replace('{{TURNSTILE_SITE_KEY}}', env.TURNSTILE_SITE_KEY)
          .replace('{{MISSING_MEMO_ID_ERROR}}', getErrorMessage('MISSING_MEMO_ID'))
          .replace('{{MISSING_PASSWORD_ERROR}}', getErrorMessage('MISSING_PASSWORD'))
          .replace('{{INVALID_MEMO_URL_ERROR}}', getErrorMessage('INVALID_MEMO_URL'))
          .replace('{{MISSING_SECURITY_CHALLENGE_ERROR}}', getErrorMessage('MISSING_SECURITY_CHALLENGE'))
          .replace('{{MEMO_ALREADY_READ_DELETED_ERROR}}', getErrorMessage('MEMO_ALREADY_READ_DELETED'))
          .replace('{{MEMO_EXPIRED_DELETED_ERROR}}', getErrorMessage('MEMO_EXPIRED_DELETED'))
          .replace('{{INVALID_PASSWORD_CHECK_ERROR}}', getErrorMessage('INVALID_PASSWORD_CHECK'))
          .replace('{{READ_MEMO_ERROR}}', getErrorMessage('READ_MEMO_ERROR'));
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
          return new Response(getErrorMessage('METHOD_NOT_ALLOWED'), {
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

      // Route page requests
      if (request.method !== 'GET') {
        return new Response(getErrorMessage('METHOD_NOT_ALLOWED'), {
          status: 405,
          headers: { 
            'Allow': 'GET',
            ...getSecurityHeaders(request)
          }
        });
      }
      
      let response;
      switch (pathname) {
        case '/':
          response = await getIndexHTML();
          break;
        case '/about.html':
          response = await getAboutHTML();
          break;
        case '/create-memo.html':
          const siteKey = env.TURNSTILE_SITE_KEY || 'MISSING_SITE_KEY';
          response = (await getCreateMemoHTML()).replace('{{TURNSTILE_SITE_KEY}}', siteKey);
          break;
        case '/read-memo.html':
          const readSiteKey = env.TURNSTILE_SITE_KEY || 'MISSING_SITE_KEY';
          response = (await getReadMemoHTML()).replace('{{TURNSTILE_SITE_KEY}}', readSiteKey);
          break;
        case '/tos.html':
          response = await getToSHTML();
          break;
        case '/privacy.html':
          response = await getPrivacyHTML();
          break;
        default:
          return new Response(getErrorMessage('NOT_FOUND'), { 
            status: 404,
            headers: getSecurityHeaders(request)
          });
      }

      return new Response(response, {
        headers: { 
          'Content-Type': 'text/html',
          ...getSecurityHeaders(request)
        }
      });
    } catch (error) {
      return new Response(getErrorMessage('INTERNAL_SERVER_ERROR'), { 
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
      return new Response(getErrorMessage('CLEANUP_FAILED'), { status: 500 });
    }
  }
}; 