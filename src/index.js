import { getStyles } from './styles/styles.js';
import { 
  getIndexHTML, 
  getAboutHTML, 
  getCreateMemoHTML,
  getReadMemoHTML
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
  'Access-Control-Allow-Origin': 'https://securememo.app',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400'
};

// Input validation functions
function validateMemoId(memoId) {
  return /^[A-Za-z0-9]{16}$/.test(memoId);
}

function validateEncryptedMessage(message) {
  return message && typeof message === 'string' && message.length > 0 && message.length <= 50000;
}

function validateExpiryTime(expiryTime) {
  if (!expiryTime) return false;
  const expiry = new Date(expiryTime);
  const now = new Date();
  const maxExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days max
  return expiry > now && expiry <= maxExpiry;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

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
        console.log('TURNSTILE_SITE_KEY:', siteKey);
        response = (await getCreateMemoHTML()).replace('{{TURNSTILE_SITE_KEY}}', siteKey);
        break;
      case '/read-memo.html':
        response = await getReadMemoHTML();
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