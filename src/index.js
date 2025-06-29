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

// Security headers configuration with improved CSP
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self' data: https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self' https://challenges.cloudflare.com; object-src 'none'; base-uri 'self'; form-action 'self';",
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
      // Validate required environment variables
      if (!env.DB) {
        console.error('Database not available');
        return new Response('Service Unavailable', { 
          status: 503,
          headers: securityHeaders
        });
      }

      // Validate request URL
      let url;
      try {
        url = new URL(request.url);
      } catch (urlError) {
        console.error('Invalid URL:', request.url, urlError);
        return new Response('Bad Request', { 
          status: 400,
          headers: securityHeaders
        });
      }

      const pathname = url.pathname;

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: securityHeaders
        });
      }

      // Handle API routes
      if (pathname.startsWith('/api/')) {
        const apiPath = pathname.substring(5);
        
        // Check request size for API endpoints
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 100000) { // 100KB limit
          return new Response(JSON.stringify({ error: getErrorMessage('REQUEST_TOO_LARGE') }), {
            status: 413,
            headers: { 
              'Content-Type': 'application/json',
              ...securityHeaders
            }
          });
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

      // Handle static assets
      if (pathname === '/styles.css') {
        return new Response(getStyles(), {
          headers: { 
            'Content-Type': 'text/css',
            ...securityHeaders
          }
        });
      }

      // Serve JavaScript files
      if (pathname === '/js/create-memo.js') {
        const jsContent = getCreateMemoJS().replace('{{TURNSTILE_SITE_KEY}}', env.TURNSTILE_SITE_KEY);
        return new Response(jsContent, {
          headers: { 
            'Content-Type': 'application/javascript',
            ...securityHeaders
          }
        });
      }
      
      if (pathname === '/js/read-memo.js') {
        return new Response(getReadMemoJS(), {
          headers: { 
            'Content-Type': 'application/javascript',
            ...securityHeaders
          }
        });
      }
      
      if (pathname === '/js/common.js') {
        return new Response(getCommonJS(), {
          headers: { 
            'Content-Type': 'application/javascript',
            ...securityHeaders
          }
        });
      }

      // Handle page routes
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
      console.error('Unhandled error in fetch handler:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: securityHeaders
      });
    }
  },

  // Scheduled function that runs every 8 hours
  async scheduled(event, env, ctx) {
    try {
      console.log('Running scheduled cleanup of expired memos...');
      const result = await handleCleanupMemos(env);
      const resultData = await result.json();
      console.log(`Cleanup completed: ${resultData.deletedCount} expired memos deleted`);
      return result;
    } catch (error) {
      console.error('Error during scheduled cleanup:', error);
      return new Response('Cleanup failed', { status: 500 });
    }
  }
}; 