// KV-based rate limiting helper for Cloudflare Workers
// Implements sliding and fixed window rate limiting using Workers KV
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
  windowSeconds = 600,
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
