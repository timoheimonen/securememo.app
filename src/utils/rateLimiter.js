// Future rate limiting helper
// CF WAF allows two ratelimiting configurations in Pro-tier, this is for Worker Paid -tier.
// -------------------------------------------------
// Raw IP extractor (kept separate for potential future proxy chain parsing)
function getRawClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

/**
 * Hash an IP (or any identifier) using SHA-256 → hex string.
 * Returns null for falsy inputs.
 * @param {string} ip
 * @returns {Promise<string|null>}
 */
export async function hashIp(ip) {
  if (!ip) return null; // Handle missing IP
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Perform a rate limit lookup.
 * DOES NOT throw — returns a structured object so callers can decide behavior.
 * @param {Request} request
 * @param {any} env
 * @returns {Promise<{ skipped: boolean, limit?: any, error?: Error, key?: string }>}
 */
export async function checkRateLimit(request, env) {
  try {
    if (!env || !env.API_RATE_LIMITER || typeof env.API_RATE_LIMITER.limit !== 'function') {
      return { skipped: true };
    }
    const rawIp = getRawClientIp(request);
    const hashedIp = rawIp === 'unknown' ? 'unknown' : await hashIp(rawIp);
    const key = hashedIp || 'unknown';
    const limit = await env.API_RATE_LIMITER.limit({ key });
    return { skipped: false, limit, key };
  } catch (error) {
    // Fail open (do not block requests if the limiter has issues)
    return { skipped: true, error };
  }
}

// Example usage:
/*
  const rate = await checkRateLimit(request, env); // Uses hashed IP as key
  if (rate.limit && !rate.limit.isAllowed) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': Math.max(0, Math.ceil((rate.limit.reset - Date.now()) / 1000)).toString()
      }
    });
  }
*/
