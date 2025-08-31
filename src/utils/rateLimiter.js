// KV-based rate limiting helper for Cloudflare Workers
// Implements sliding and fixed window rate limiting using Workers KV
// -------------------------------------------------

/**
 * Hash an IP (or any identifier) using SHA-256 → hex string.
 * Returns null for falsy inputs.
 * @param {string} ip
 * @returns {Promise<string|null>}
 */
export async function hashIp(ip) {
  if (!ip) return null; // Handle missing IP
  // Use explicit globalThis for Worker runtime compatibility & to satisfy lint (no-undef)
  const encoder = new globalThis.TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// -------------------------------------------------
// In-memory fallback (per-isolate) when KV unavailable
// NOTE: Workers are ephemeral; this only provides best-effort protection
// during transient KV outages or free-tier limits. Data is NOT shared across
// isolates and should not be relied upon for strict global enforcement.
// -------------------------------------------------
const LOCAL_BUCKET_MAX = 5000; // soft cap on entries
const localBuckets = new Map(); // key -> { count, first }
let lastSweep = 0;
let kvDisabledUntil = 0; // circuit breaker timestamp (ms)

/**
 * Sanitize a KV key prefix to an allow‑list of safe characters.
 * Falls back to 'fail' if invalid after stripping.
 * This is defensive; existing usage already controls prefix, but
 * constraining the character set silences generic object/prop injection SAST rules.
 * @param {string} prefix
 * @returns {string}
 */
function sanitizePrefix(prefix) {
  if (typeof prefix !== 'string') return 'fail';
  // Allow only alphanumerics, colon, hyphen and underscore (common key separators)
  const cleaned = prefix.replace(/[^A-Za-z0-9:_-]/g, '').slice(0, 40);
  return cleaned || 'fail';
}

/**
 * Opportunistically sweep expired local buckets.
 * Runs at most once every windowSeconds (or 30s min) to keep memory bounded.
 * @param {number} windowSeconds
 */
function sweepLocal(windowSeconds) {
  const now = Date.now();
  if (now - lastSweep < Math.min(30000, windowSeconds * 1000)) return;
  lastSweep = now;
  const threshold = Math.floor(now / 1000) - windowSeconds;
  for (const [k, v] of localBuckets) {
    if (!v || typeof v.first !== 'number') {
      localBuckets.delete(k);
      continue;
    }
    if (v.first < threshold) localBuckets.delete(k);
  }
  // If still above max, prune oldest
  if (localBuckets.size > LOCAL_BUCKET_MAX) {
    // Sort by first-seen timestamp and delete oldest until under cap.
    // Use structured iteration instead of bracket indexing to avoid SAST false positives
    // about generic object injection on dynamic property access via [0].
    const entries = [...localBuckets.entries()].sort((a, b) => a[1].first - b[1].first);
    for (const [oldestKey] of entries) {
      if (localBuckets.size <= LOCAL_BUCKET_MAX) break;
      localBuckets.delete(oldestKey);
    }
  }
}

/**
 * Apply local (in-memory) rate limiting logic mirroring fixed/sliding window.
 * @param {string} key
 * @param {Object} params
 * @param {boolean} params.sliding
 * @param {number} params.windowSeconds
 * @param {number} params.allowedFailures
 * @returns {{ limited: boolean, count: number, remaining: number, key: string, fallback: true }}
 */
function localLimit(key, { sliding, windowSeconds, allowedFailures }) {
  const nowSec = Math.floor(Date.now() / 1000);
  let state = localBuckets.get(key);
  if (!state) {
    state = { count: 1, first: nowSec };
    localBuckets.set(key, state);
    sweepLocal(windowSeconds);
    return { limited: false, count: 1, remaining: Math.max(0, allowedFailures - 1), key, fallback: true };
  }
  if (sliding) {
    // For sliding we treat first as last update to simplify local variant
    state.count += 1;
    state.first = nowSec; // acts as refreshed TTL marker
  } else {
    // Fixed window semantics
    if (nowSec - state.first >= windowSeconds) {
      state.count = 1;
      state.first = nowSec;
    } else {
      state.count += 1;
    }
  }
  const limited = state.count > allowedFailures;
  return {
    limited,
    count: state.count,
    remaining: limited ? 0 : Math.max(0, allowedFailures - state.count),
    key,
    fallback: true,
  };
}

/**
 * KV-backed sliding (or fixed) window failure counter with resilient fail-open.
 * If KV operations throw (e.g. free tier limits, transient network) the function
 * uses an in-memory best-effort fallback so clients are not blocked.
 * Circuit breaker avoids hammering KV after repeated failures.
 *
 * @param {Request} request
 * @param {any} env - Worker env (expects env.KV binding)
 * @param {Object} opts
 * @param {string} [opts.prefix='fail'] - Key prefix
 * @param {number} [opts.windowSeconds=60] - TTL window in seconds
 * @param {number} [opts.allowedFailures=2] - Failures allowed inside window before limiting; on (allowedFailures+1)th returns limited=true
 * @param {boolean} [opts.sliding=true] - Refresh TTL on each failure (sliding) or only first (fixed window)
 * @param {function} [opts.onError] - Optional error observer callback (never throws)
 * @param {number} [opts.kvRetryMs=30000] - Circuit breaker: wait this many ms after a KV failure before retrying
 * @param {boolean} [opts.enforceOnFallback=true] - Whether to still enforce limits using per-isolate memory when KV down
 * @returns {Promise<{ limited: boolean, count: number, remaining: number, key?: string, fallback?: boolean, error?: boolean }>}
 */
export async function recordKvFailureAndCheckLimit(
  request,
  env,
  {
    prefix = 'fail',
    windowSeconds = 600,
    allowedFailures = 2,
    sliding = true,
    onError,
    kvRetryMs = 30000,
    enforceOnFallback = true,
    /**
     * Optional error handler invoked when an unexpected exception occurs while
     * interacting with KV or computing the hash. The original error is not
     * rethrown to avoid breaking request handling, but this callback allows the
     * caller to observe/log/trace it centrally (e.g. to an analytics service).
     * NOTE: The callback MUST NOT throw.
     * @param {Error} err
     */
  } = {}
) {
  // Input validation
  if (typeof windowSeconds !== 'number' || windowSeconds <= 0) {
    throw new Error('windowSeconds must be a positive number');
  }
  if (typeof allowedFailures !== 'number' || allowedFailures < 0) {
    throw new Error('allowedFailures must be a non-negative number');
  }
  if (typeof prefix !== 'string') {
    throw new Error('prefix must be a string');
  }
  if (typeof sliding !== 'boolean') {
    throw new Error('sliding must be a boolean');
  }

  // Sanitize prefix defensively to a constrained character set.
  prefix = sanitizePrefix(prefix);

  try {
    const nowMs = Date.now();
    const kvAvailable = env && env.KV && nowMs >= kvDisabledUntil;
    if (!kvAvailable) {
      if (enforceOnFallback) {
        const rawIpLocal = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (rawIpLocal === 'unknown') {
          return { limited: false, count: 0, remaining: allowedFailures, fallback: true };
        }
        const ipHashLocal = await hashIp(rawIpLocal);
        const keyLocal = `${prefix}:${ipHashLocal}`;
        return localLimit(keyLocal, { sliding, windowSeconds, allowedFailures });
      }
      return { limited: false, count: 0, remaining: allowedFailures, fallback: true };
    }
    // Normal KV path
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
      if (
        typeof state !== 'object' ||
        state === null ||
        typeof state.count !== 'number' ||
        typeof state.first !== 'number'
      ) {
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
      key,
    };
  } catch (err) {
    // Open circuit to avoid hammering KV repeatedly
    kvDisabledUntil = Date.now() + (typeof kvRetryMs === 'number' && kvRetryMs > 0 ? kvRetryMs : 30000);
    // Invoke optional error handler (never let it throw)
    try {
      if (typeof onError === 'function') onError(err);
      // Intentionally avoid console.* logging by default to comply with strict lint/security policy.
    } catch (_) {
      /* swallow secondary errors */
    }
    // Fall back to local memory logic if enabled
    if (enforceOnFallback) {
      try {
        const rawIpLocal = request.headers.get('CF-Connecting-IP') || 'unknown';
        if (rawIpLocal !== 'unknown') {
          const ipHashLocal = await hashIp(rawIpLocal);
          const keyLocal = `${prefix}:${ipHashLocal}`;
          const res = localLimit(keyLocal, { sliding, windowSeconds, allowedFailures });
          return { ...res, error: true };
        }
      } catch (_) {
        /* ignore secondary issues */
      }
    }
    return { limited: false, count: 0, remaining: allowedFailures, error: true, fallback: true };
  }
}
