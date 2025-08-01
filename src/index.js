import { getStyles } from './styles/styles.js';
import { 
  getIndexHTML, 
  getAboutHTML, 
  getCreateMemoHTML,
  getReadMemoHTML,
  getToSHTML
} from './templates/pages.js';
import {
  getCreateMemoJS,
  getReadMemoJS,
  getCommonJS
} from './templates/js.js';
import {
  handleCreateMemo,
  handleReadMemo,
  handleCleanupMemos
} from './handlers/auth.js';
import { getErrorMessage } from './utils/errorMessages.js';

// Security headers with CSP for XSS protection
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com https://*.cloudflareinsights.com blob:; style-src 'self' 'unsafe-inline' blob:; img-src 'self' data: https://challenges.cloudflare.com https://*.cloudflareinsights.com blob:; frame-src https://challenges.cloudflare.com https://*.cloudflareinsights.com; connect-src 'self' https://challenges.cloudflare.com https://*.cloudflareinsights.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self';",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request, env, ctx) {
    try {
      // Check DB availability
      if (!env.DB) {
        return new Response('Service Unavailable', { 
          status: 503,
          headers: securityHeaders
        });
      }

      // Parse and validate URL
      let url;
      try {
        url = new URL(request.url);
      } catch (urlError) {
        return new Response('Bad Request', { 
          status: 400,
          headers: securityHeaders
        });
      }

      const pathname = url.pathname;

      // Handle CORS preflight
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: securityHeaders
        });
      }

      // Route API requests
      if (pathname.startsWith('/api/')) {
        const apiPath = pathname.substring(5);
        
        // Validate request method for API endpoints
        if (apiPath === 'create-memo' && request.method !== 'POST') {
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED') }), {
            status: 405,
            headers: { 
              'Content-Type': 'application/json',
              'Allow': 'POST',
              ...securityHeaders
            }
          });
        }
        
        if (apiPath === 'read-memo' && request.method !== 'GET') {
          return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED') }), {
            status: 405,
            headers: { 
              'Content-Type': 'application/json',
              'Allow': 'GET',
              ...securityHeaders
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
                ...securityHeaders
              }
            });
          }
        }
        
        switch (apiPath) {
          case 'create-memo':
            return await handleCreateMemo(request, env);
          case 'read-memo':
            return await handleReadMemo(request, env);
          default:
            return new Response('Not Found', { 
              status: 404,
              headers: securityHeaders
            });
        }
      }

      // Serve static assets
      if (pathname === '/styles.css') {
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', {
            status: 405,
            headers: { 
              'Allow': 'GET',
              ...securityHeaders
            }
          });
        }
        return new Response(getStyles(), {
          headers: { 
            'Content-Type': 'text/css',
            ...securityHeaders
          }
        });
      }

      // Serve JS files with dynamic content injection
      if (pathname === '/js/create-memo.js') {
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', {
            status: 405,
            headers: { 
              'Allow': 'GET',
              ...securityHeaders
            }
          });
        }
        const jsContent = getCreateMemoJS().replace('{{TURNSTILE_SITE_KEY}}', env.TURNSTILE_SITE_KEY);
        return new Response(jsContent, {
          headers: { 
            'Content-Type': 'application/javascript',
            ...securityHeaders
          }
        });
      }
      
      if (pathname === '/js/read-memo.js') {
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', {
            status: 405,
            headers: { 
              'Allow': 'GET',
              ...securityHeaders
            }
          });
        }
        return new Response(getReadMemoJS(), {
          headers: { 
            'Content-Type': 'application/javascript',
            ...securityHeaders
          }
        });
      }
      
      if (pathname === '/js/common.js') {
        if (request.method !== 'GET') {
          return new Response('Method Not Allowed', {
            status: 405,
            headers: { 
              'Allow': 'GET',
              ...securityHeaders
            }
          });
        }
        return new Response(getCommonJS(), {
          headers: { 
            'Content-Type': 'application/javascript',
            ...securityHeaders
          }
        });
      }

      // Route page requests
      if (request.method !== 'GET') {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: { 
            'Allow': 'GET',
            ...securityHeaders
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
          response = await getReadMemoHTML();
          break;
        case '/tos.html':
          response = await getToSHTML();
          break;
        default:
          return new Response('Not Found', { 
            status: 404,
            headers: securityHeaders
          });
      }

      return new Response(response, {
        headers: { 
          'Content-Type': 'text/html',
          ...securityHeaders
        }
      });
    } catch (error) {
      return new Response('Internal Server Error', { 
        status: 500,
        headers: securityHeaders
      });
    }
  },

  // Cron job: cleanup expired memos
  async scheduled(event, env, ctx) {
    try {
      const result = await handleCleanupMemos(env);
      return result;
    } catch (error) {
      return new Response('Cleanup failed', { status: 500 });
    }
  }
}; 