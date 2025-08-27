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

/**
 * KV-backed sliding (or fixed) window failure counter.
 * Increments failure counter for the calling IP hash and determines if limit exceeded.
 * @param {Request} request
 * @param {any} env - Worker env (expects env.KV binding)
 * @param {Object} opts
 * @param {string} [opts.prefix='fail'] - Key prefix
 * @param {number} [opts.windowSeconds=60] - TTL window in seconds
 * @param {number} [opts.allowedFailures=2] - Number of failures allowed inside window before limiting; on (allowedFailures+1)th returns limited=true
 * @param {boolean} [opts.sliding=true] - Refresh TTL on each failure (sliding) or only first (fixed window)
 * @returns {Promise<{ limited: boolean, count: number, remaining: number, key?: string }>}
 */
export async function recordKvFailureAndCheckLimit(request, env, {
  prefix = 'fail',
  windowSeconds = 60,
  allowedFailures = 2,
  sliding = true
} = {}) {
  try {
    if (!env || !env.KV) return { limited: false, count: 0, remaining: allowedFailures };
    const rawIp = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rawIp === 'unknown') {
      // Fail open for unknown IP to avoid global bucket collision
      return { limited: false, count: 0, remaining: allowedFailures };
    }
    const ipHash = await hashIp(rawIp);
    const key = `${prefix}:${ipHash}`;
    const current = await env.KV.get(key);

    // Sliding window implementation (simple counter with refreshed TTL each failure)
    if (sliding) {
      if (!current) {
        await env.KV.put(key, '1', { expirationTtl: windowSeconds });
        return { limited: false, count: 1, remaining: Math.max(0, allowedFailures - 1), key };
      }
      const count = parseInt(current, 10) || 0;
      const next = count + 1;
      if (next <= allowedFailures) {
        await env.KV.put(key, String(next), { expirationTtl: windowSeconds }); // refresh TTL (true sliding)
        return { limited: false, count: next, remaining: Math.max(0, allowedFailures - next), key };
      }
      // Already exceeded
      return { limited: true, count, remaining: 0, key };
    }

    // Fixed window implementation (store JSON {count, first} and preserve original start)
    // Assumes all stored values for fixed windows are JSON objects created by this function.
    const nowSec = Math.floor(Date.now() / 1000);
    let state;
    if (!current) {
      state = { count: 1, first: nowSec };
      await env.KV.put(key, JSON.stringify(state), { expirationTtl: windowSeconds });
      return { limited: false, count: 1, remaining: Math.max(0, allowedFailures - 1), key };
    }
    try {
      state = JSON.parse(current);
      if (typeof state !== 'object' || state === null || typeof state.count !== 'number' || typeof state.first !== 'number') {
        state = { count: 1, first: nowSec }; // fallback to new window if structure unexpected
      }
    } catch (_) {
      state = { count: 1, first: nowSec }; // fallback to new window on parse error
    }
    const elapsed = nowSec - state.first;
    if (elapsed >= windowSeconds) {
      // New fixed window
      state.count = 1;
      state.first = nowSec;
    } else {
      state.count += 1;
    }
    const limited = state.count > allowedFailures;
    // Remaining TTL for this fixed window (at least 1s)
    const ttlRemaining = Math.max(1, windowSeconds - (nowSec - state.first));
    await env.KV.put(key, JSON.stringify(state), { expirationTtl: ttlRemaining });
    return {
      limited,
      count: state.count,
      remaining: limited ? 0 : Math.max(0, allowedFailures - state.count),
      key
    };
  } catch (_) {
    return { limited: false, count: 0, remaining: allowedFailures };
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
