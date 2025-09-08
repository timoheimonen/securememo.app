/* eslint-env worker, browser, serviceworker */
// Explicitly reference runtime-provided globals to satisfy static analysis (Codacy ESLint no-undef)
// without disabling the rule. This is a safe destructuring of globalThis provided by the
// Cloudflare Workers / browser environment. Only symbols actually used in this module are listed.
const { Response, fetch, URLSearchParams, TextEncoder, crypto, btoa } = globalThis;
import { validateMemoIdSecure, validateExpiryHours, sanitizeForHTML } from '../utils/validation.js';
import { getErrorMessage, getMemoAccessDeniedMessage } from '../utils/errorMessages.js';
import { uniformResponseDelay } from '../utils/timingSecurity.js';
import { recordKvFailureAndCheckLimit } from '../utils/rateLimiter.js';

// Maximum allowed JSON request body size in bytes (defense-in-depth against large payload DoS)
const MAX_REQUEST_BYTES = 64 * 1024; // 64 KB

// Uniform delayed error helper to reduce timing side-channel variance
async function delayedJsonError(bodyObj, status = 400, extraHeaders = {}) {
    await uniformResponseDelay();
    return new Response(JSON.stringify(bodyObj), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders },
    });
}

/**
 * Verify Turnstile token with Cloudflare API
 * @param {string} token - The Turnstile response token
 * @param {object} env - Environment variables
 * @param {string} requestLocale - Request locale for error messages
 * @returns {Promise<{success: boolean, error?: Response}>}
 */
async function verifyTurnstileToken(token, env, requestLocale) {
    const isValidTurnstile = /^[A-Za-z0-9._-]{10,}$/.test(token);

    if (!isValidTurnstile) {
        await uniformResponseDelay();
        return {
            success: false,
            error: new Response(JSON.stringify({ error: getErrorMessage('MISSING_TURNSTILE', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            }),
        };
    }

    try {
        const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                secret: env.TURNSTILE_SECRET,
                response: token,
            }),
        });

        if (!turnstileResponse.ok) {
            await uniformResponseDelay();
            return {
                success: false,
                error: new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_API_ERROR', requestLocale) }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                }),
            };
        }

        const turnstileResult = await turnstileResponse.json();

        if (!turnstileResult.success) {
            await uniformResponseDelay();
            return {
                success: false,
                error: new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED', requestLocale) }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                }),
            };
        }

        return { success: true };
    } catch (turnstileError) {
        await uniformResponseDelay();
        return {
            success: false,
            error: new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            }),
        };
    }
}

/**
 * Handle rate limiting for failed operations
 * @param {Request} request - The request object
 * @param {object} env - Environment variables
 * @param {string} requestLocale - Request locale for error messages
 * @returns {Promise<{limited: boolean, error?: Response}>}
 */
async function handleRateLimited(request, env, requestLocale) {
    const rate = await recordKvFailureAndCheckLimit(request, env, {
        prefix: 'delFail',
        allowedFailures: 2,
        windowSeconds: 600,
        sliding: true,
    });
    if (rate.limited) {
        await uniformResponseDelay();
        return {
            limited: true,
            error: new Response(JSON.stringify({ error: getErrorMessage('RATE_LIMITED', requestLocale) }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
            }),
        };
    }
    return { limited: false };
}

/**
 * Create standardized access denied error response
 * @param {string} requestLocale - Request locale
 * @returns {Promise<Response>}
 */
async function createAccessDeniedResponse(requestLocale) {
    await uniformResponseDelay();
    return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage(requestLocale) }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
}

/**
 * Validate memo ID with rate limiting
 * @param {string} memoId - The memo ID to validate
 * @param {Request} request - The request object
 * @param {object} env - Environment variables
 * @param {string} requestLocale - Request locale for error messages
 * @returns {Promise<{valid: boolean, error?: Response}>}
 */
async function validateMemoIdWithRateLimit(memoId, request, env, requestLocale) {
    if (typeof memoId !== 'string' || !(await validateMemoIdSecure(memoId))) {
        const rateResult = await handleRateLimited(request, env, requestLocale);
        if (rateResult.limited) {
            return { valid: false, error: rateResult.error };
        }
        await uniformResponseDelay();
        return {
            valid: false,
            error: new Response(JSON.stringify({ error: getMemoAccessDeniedMessage(requestLocale) }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            }),
        };
    }
    return { valid: true };
}

/**
 * Validate that request has JSON content-type.
 * Returns null if valid, otherwise a delayed JSON error Response.
 * @param {Request} request
 * @param {string} requestLocale
 * @returns {Promise<Response|null>}
 */
async function ensureJsonContentType(request, requestLocale) {
    const contentType = request.headers.get('content-type');
    const sanitizedContentType = sanitizeForHTML(contentType);
    if (!sanitizedContentType || !sanitizedContentType.includes('application/json')) {
        return delayedJsonError({ error: getErrorMessage('CONTENT_TYPE_ERROR', requestLocale) });
    }
    return null;
}

/**
 * Parse JSON body with size limit; centralizes duplicated logic in handlers.
 * Provides consistent error handling and timing semantics.
 * @param {Request} request
 * @param {string} requestLocale
 * @returns {Promise<{data: any}|{errorResponse: Response}>}
 */
async function parseJsonRequest(request, requestLocale) {
    const parsed = await safeParseJson(request, MAX_REQUEST_BYTES);
    if (parsed?.error) {
        if (parsed.error === 'SIZE_LIMIT') {
            // Maintain explicit uniform delay + 413 semantics
            await uniformResponseDelay();
            return {
                errorResponse: new Response(JSON.stringify({ error: getErrorMessage('REQUEST_TOO_LARGE', requestLocale) }), {
                    status: 413,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                }),
            };
        }
        return { errorResponse: await delayedJsonError({ error: getErrorMessage('INVALID_JSON', requestLocale) }) };
    }
    return { data: parsed.data };
}

/**
 * Return rate-limited or generic access denied response; consolidates repetition.
 * @param {Request} request
 * @param {any} env
 * @param {string} requestLocale
 * @returns {Promise<Response>}
 */
async function rateLimitOrAccessDenied(request, env, requestLocale) {
    const rateResult = await handleRateLimited(request, env, requestLocale);
    if (rateResult.limited) return rateResult.error;
    return await createAccessDeniedResponse(requestLocale);
}

/**
 * Safely parse JSON with size limit enforcement.
 * Uses content-length header (if present) and actual decoded byte length.
 * Returns null on error; caller handles uniform error response.
 * @param {Request} request
 * @param {number} limitBytes
 * @returns {Promise<object|null>}
 */
async function safeParseJson(request, limitBytes) {
    try {
        const contentLengthHeader = request.headers.get('content-length');
        if (contentLengthHeader) {
            const declared = parseInt(contentLengthHeader, 10);
            if (!Number.isNaN(declared) && declared > limitBytes) {
                return { error: 'SIZE_LIMIT' };
            }
        }
        // Read raw text once (can't reuse body afterwards)
        const text = await request.text();
        // Compute actual UTF-8 byte length
        const byteLen = new TextEncoder().encode(text).length;
        if (byteLen > limitBytes) {
            return { error: 'SIZE_LIMIT' };
        }
        try {
            const data = JSON.parse(text);
            return { data };
        } catch (e) {
            return { error: 'PARSE' };
        }
    } catch (e) {
        return { error: 'PARSE' };
    }
}

// Hash token (SHA-256 base64)
async function hashDeletionToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray));
}

/**
 * Calculate expiry time based on expiry hours
 * @param {string|number} expiryHours - The expiry hours value from client (8, 24, 48, 168, 720)
 * @returns {number|null} - UNIX timestamp (seconds since epoch) or null if invalid
 */
function calculateExpiryTime(expiryHours) {
    // Parse expiry hours as integer
    const hours = parseInt(expiryHours);

    // Validate that it's a valid option
    if (!validateExpiryHours(expiryHours)) {
        return null;
    }

    const now = new Date();
    // Calculate expiry time based on hours (all options now use hours)
    const expiryTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

    // Return UNIX timestamp (seconds since epoch)
    return Math.floor(expiryTime.getTime() / 1000);
}

/**
 * Generate cryptographically secure random 40-char memo ID with collision detection.
 * Returns null instead of throwing on exhaustion to keep error handling unified at call site.
 * @param {any} env
 * @param {number} maxRetries
 * @returns {Promise<string|null>}
 */
async function generateMemoId(env, maxRetries = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        let result = '';
        const biasThreshold = 256 - (256 % chars.length);
        for (let i = 0; i < 40; i++) {
            let value;
            do {
                const array = new Uint8Array(1);
                crypto.getRandomValues(array);
                value = array[0];
            } while (value >= biasThreshold);
            result += chars[value % chars.length];
        }
        try {
            const checkStmt = env.DB.prepare('SELECT 1 FROM memos WHERE memo_id = ? LIMIT 1');
            const existing = await checkStmt.bind(result).first();
            if (!existing) return result; // unique
        } catch (_) {
            // On DB error fall back to optimistic return; UNIQUE constraint will enforce safety
            return result;
        }
    }
    return null; // signal failure
}

export {
    delayedJsonError,
    verifyTurnstileToken,
    handleRateLimited,
    createAccessDeniedResponse,
    validateMemoIdWithRateLimit,
    ensureJsonContentType,
    parseJsonRequest,
    rateLimitOrAccessDenied,
    safeParseJson,
    hashDeletionToken,
    calculateExpiryTime,
    generateMemoId,
};
