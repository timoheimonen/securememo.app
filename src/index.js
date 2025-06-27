import { getStyles } from './styles/styles.js';
import { 
  getIndexHTML, 
  getAboutHTML, 
  getCreateMemoHTML,
  getReadMemoHTML,
  getToSHTML
} from './templates/pages.js';
import {
  handleCreateMemo,
  handleReadMemo,
  handleCleanupMemos
} from './handlers/auth.js';

// Security headers configuration
const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://challenges.cloudflare.com https://assets.hcaptcha.com; frame-src https://challenges.cloudflare.com https://assets.hcaptcha.com; connect-src 'self' https://challenges.cloudflare.com https://assets.hcaptcha.com;",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
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

      const path = url.pathname;

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 200,
          headers: securityHeaders
        });
      }

      // Handle API routes
      if (path.startsWith('/api/')) {
        const apiPath = path.substring(5);
        
        // Check request size for API endpoints
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 100000) { // 100KB limit
          return new Response(JSON.stringify({ error: 'Request too large' }), {
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
      if (path === '/styles.css') {
        return new Response(getStyles(), {
          headers: { 
            'Content-Type': 'text/css',
            ...securityHeaders
          }
        });
      }

      // Handle favicon and app icons
      if (path === '/favicon.ico') {
        return new Response(env.ASSETS.get('favicon.ico'), {
          headers: { 
            'Content-Type': 'image/x-icon',
            'Cache-Control': 'public, max-age=31536000',
            ...securityHeaders
          }
        });
      }

      if (path === '/apple-touch-icon.png') {
        return new Response(env.ASSETS.get('apple-touch-icon.png'), {
          headers: { 
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000',
            ...securityHeaders
          }
        });
      }

      if (path === '/android-chrome-192x192.png') {
        return new Response(env.ASSETS.get('android-chrome-192x192.png'), {
          headers: { 
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000',
            ...securityHeaders
          }
        });
      }

      if (path === '/android-chrome-512x512.png') {
        return new Response(env.ASSETS.get('android-chrome-512x512.png'), {
          headers: { 
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000',
            ...securityHeaders
          }
        });
      }

      // Handle page routes
      let response;
      switch (path) {
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