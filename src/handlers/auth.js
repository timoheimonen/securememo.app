/* eslint-env worker, browser, serviceworker */
// Explicitly reference runtime-provided globals to satisfy static analysis (Codacy ESLint no-undef)
// without disabling the rule. This is a safe destructuring of globalThis provided by the
// Cloudflare Workers / browser environment. Only symbols actually used in this module are listed.
const {
    Response,
    URL,
    URLSearchParams,
    TextEncoder,
    crypto,
    btoa
} = globalThis; // Intentionally not destructuring fetch so tests can mock globalThis.fetch
import {
    validateMemoIdSecure,
    validateAndSanitizeEncryptedMessageSecure,
    validateExpiryHours,
    validatePassword,
    sanitizeForHTML,
    normalizeCiphertextForResponse,
    sanitizeLocale
} from '../utils/validation.js';
import { getErrorMessage, getMemoAccessDeniedMessage } from '../utils/errorMessages.js';
import { uniformResponseDelay, constantTimeCompare } from '../utils/timingSecurity.js';
import { extractLocaleFromRequest } from '../lang/localization.js';
import { recordKvFailureAndCheckLimit } from '../utils/rateLimiter.js';

// Maximum allowed JSON request body size in bytes (defense-in-depth against large payload DoS)
const MAX_REQUEST_BYTES = 64 * 1024; // 64 KB

// Uniform delayed error helper to reduce timing side-channel variance
async function delayedJsonError(bodyObj, status = 400, extraHeaders = {}) {
    await uniformResponseDelay();
    return new Response(JSON.stringify(bodyObj), {
        status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extraHeaders }
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
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            })
        };
    }

    try {
    // Use dynamic globalThis.fetch so test environments can monkey-patch (mock) Turnstile calls
    const turnstileResponse = await globalThis.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
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
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                })
            };
        }

        const turnstileResult = await turnstileResponse.json();

        if (!turnstileResult.success) {
            await uniformResponseDelay();
            return {
                success: false,
                error: new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED', requestLocale) }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                })
            };
        }

        return { success: true };
    } catch (turnstileError) {
        await uniformResponseDelay();
        return {
            success: false,
            error: new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            })
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
    const rate = await recordKvFailureAndCheckLimit(request, env, { prefix: 'delFail', allowedFailures: 2, windowSeconds: 600, sliding: true });
    if (rate.limited) {
        await uniformResponseDelay();
        return {
            limited: true,
            error: new Response(JSON.stringify({ error: getErrorMessage('RATE_LIMITED', requestLocale) }), {
                status: 429,
                headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
            })
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
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
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
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            })
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
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                })
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

// Create new memo with validation and Turnstile verification
export async function handleCreateMemo(request, env) {
    // Best-effort memory wiping (limitations: GC & string immutability in JS)
    let sanitizedEncryptedMessage; // declare up-front so we can wipe in finally
    let deletionTokenHash; // shadow for wiping
    let requestData; // for wiping fields post-use
    // Extract requestLocale from request headers/query for better UX
    const requestLocale = sanitizeLocale(extractLocaleFromRequest(request));
    try {

        // Validate request method
        if (request.method !== 'POST') {
            return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { 'Allow': 'POST' });
        }

    // Validate content type
    const ctError = await ensureJsonContentType(request, requestLocale);
    if (ctError) return ctError;

    // Parse request body with size limit
    const parsedCreate = await parseJsonRequest(request, requestLocale);
    if ('errorResponse' in parsedCreate) return parsedCreate.errorResponse;
    requestData = parsedCreate.data;

        const { encryptedMessage, expiryHours, cfTurnstileResponse } = requestData;
        deletionTokenHash = requestData.deletionTokenHash; // capture explicitly for wiping

        // Comprehensive validation and sanitization of encrypted message
        const messageValidation = await validateAndSanitizeEncryptedMessageSecure(encryptedMessage);
        if (!messageValidation.isValid) {
            // Add additional artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MESSAGE_FORMAT', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        sanitizedEncryptedMessage = messageValidation.sanitizedMessage;
        const sanitizedExpiryHours = String(expiryHours);
        const turnstileToken = typeof cfTurnstileResponse === 'string' ? cfTurnstileResponse : '';

        // Validate deletionTokenHash (base64, ~44 chars for SHA-256)
        if (!deletionTokenHash || typeof deletionTokenHash !== 'string' || deletionTokenHash.length !== 44 || !/^[A-Za-z0-9+/=]+$/.test(deletionTokenHash)) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_DELETION_TOKEN_HASH', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        // Validate expiry hours
        if (!validateExpiryHours(sanitizedExpiryHours)) {
            // Add artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_EXPIRY_TIME', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        // Calculate expiry time server-side
        const calculatedExpiryTime = calculateExpiryTime(sanitizedExpiryHours);
        if (!calculatedExpiryTime) {
            return delayedJsonError({ error: getErrorMessage('INVALID_EXPIRY_TIME', requestLocale) });
        }

        // Verify Turnstile token
        const turnstileResult = await verifyTurnstileToken(turnstileToken, env, requestLocale);
        if (!turnstileResult.success) {
            return turnstileResult.error;
        }

        // Generate unique memo ID with collision detection
        const memoId = await generateMemoId(env, 10, requestLocale);
        if (!memoId) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_ID_GENERATION_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        // Insert memo into DB
        try {
            const stmt = env.DB.prepare(`
                INSERT INTO memos (memo_id, encrypted_message, expiry_time, deletion_token_hash)
                VALUES (?, ?, ?, ?)
            `);

            await stmt.bind(memoId, sanitizedEncryptedMessage, calculatedExpiryTime, deletionTokenHash).run();
        } catch (dbError) {
            // Check if this is a UNIQUE constraint violation
            if (dbError.message && dbError.message.includes('UNIQUE constraint failed')) {
                // This should be extremely rare with our collision detection
                // but handle it gracefully by returning an error
                // Add artificial delay for security
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('MEMO_ID_COLLISION_ERROR', requestLocale) }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                });
            }

            // Add artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }


        // Success-path delay to reduce timing differential
        await uniformResponseDelay();
        return new Response(JSON.stringify({
            success: true,
            memoId: memoId
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            }
        });

    } catch (error) {
        // Add artificial delay for security
        await uniformResponseDelay();
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_CREATION_ERROR', requestLocale) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    } finally {
        // Best-effort erase of confidential data
        if (sanitizedEncryptedMessage) {
            try { sanitizedEncryptedMessage = ''.padEnd(sanitizedEncryptedMessage.length, '\u0000'); } catch (_) { /* Ignore cleanup errors */ }
            sanitizedEncryptedMessage = null;
        }
        if (deletionTokenHash) {
            try { deletionTokenHash = ''.padEnd(44, '\u0000'); } catch (_) { /* Ignore cleanup errors */ }
            deletionTokenHash = null;
        }
        if (requestData) {
            try {
                if (requestData.encryptedMessage) requestData.encryptedMessage = null;
                if (requestData.deletionTokenHash) requestData.deletionTokenHash = null;
            } catch (_) { /* Ignore cleanup errors */ }
            requestData = null;
        }
    }
}

// Read memo and delete it after reading
/**
 * Handle memo reading with security measures to prevent enumeration attacks
 * 
 * SECURITY FEATURES:
 * - Uses generic error messages to prevent distinguishing between different failure reasons
 * - Combines all access checks into a single condition to avoid timing attacks
 * - Returns consistent HTTP status codes (404) for all access failures
 * - Prevents information leakage about memo existence, read status, or expiry
 */
export async function handleReadMemo(request, env) {
    // Extract requestLocale from request headers/query for better UX
    const requestLocale = extractLocaleFromRequest(request);
    try {

        // Validate request method
        if (request.method !== 'POST') {
            return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { 'Allow': 'POST' });
        }

    // Validate content type
    const ctError = await ensureJsonContentType(request, requestLocale);
    if (ctError) return ctError;

    // Parse request body with size limit
    const parsedRead = await parseJsonRequest(request, requestLocale);
    if ('errorResponse' in parsedRead) return parsedRead.errorResponse;
    const requestData = parsedRead.data;

        const { cfTurnstileResponse } = requestData;

        // Sanitize user inputs
        // Validate Turnstile response token by pattern, do not mutate it
        const turnstileToken = typeof cfTurnstileResponse === 'string' ? cfTurnstileResponse : '';

        // Verify Turnstile token
        const turnstileResult = await verifyTurnstileToken(turnstileToken, env, requestLocale);
        if (!turnstileResult.success) {
            return turnstileResult.error;
        }

        const url = new URL(request.url);
        const memoId = url.searchParams.get('id');
        // Strict validation: do NOT mutate or sanitize the identifier; reject if it does not match expected pattern
        if (typeof memoId !== 'string' || !(await validateMemoIdSecure(memoId))) {
            // Add additional artificial delay for security
            return await createAccessDeniedResponse(requestLocale);
        }

        // SECURITY: Combine all access checks into a single atomic operation to prevent timing side-channels
        // This ensures constant-time failure paths regardless of memo state (non-existent, read, or expired)
        let memo;
        try {
            const stmt = env.DB.prepare(`
                SELECT encrypted_message, deletion_token_hash
                FROM memos 
                WHERE memo_id = ? 
                AND (expiry_time IS NULL OR expiry_time > unixepoch('now'))
            `);

            memo = await stmt.bind(memoId).first();
        } catch (dbError) {
            // Add artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_READ_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        // SECURITY: Use consistent error handling to prevent enumeration attacks
        // Single check ensures constant-time failure regardless of memo state
        if (!memo) {
            // Add artificial delay for security to normalize response times (standard window)
            return await createAccessDeniedResponse(requestLocale);
        }

        // Minimal normalization (no escaping) so ciphertext round-trips intact
        const sanitizedResponseMessage = normalizeCiphertextForResponse(memo.encrypted_message);

        // Success-path delay to align timing with failures
        await uniformResponseDelay();
        return new Response(JSON.stringify({
            success: true,
            encryptedMessage: sanitizedResponseMessage
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            }
        });

    } catch (error) {
        // Add artificial delay for security
        await uniformResponseDelay();
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_READ_ERROR', requestLocale) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    }
}

// Confirm successful memo reading and delete the memo
/**
 * Handle memo deletion after successful decryption
 * This endpoint is called only after the user successfully decrypts the memo
 */
export async function handleConfirmDelete(request, env) {
    let deletionToken; // capture for wipe
    let computedHash; // capture for wipe
    let memoId; // to wipe
    let row; // db row ref
    // Extract requestLocale from request headers/query for better UX
    const requestLocale = extractLocaleFromRequest(request);
    try {
        // Validate request method
        if (request.method !== 'POST') {
            return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { 'Allow': 'POST' });
        }

    // Validate content type
    const ctError = await ensureJsonContentType(request, requestLocale);
    if (ctError) return ctError;

    // Parse request body with size limit
    const parsedDelete = await parseJsonRequest(request, requestLocale);
    if ('errorResponse' in parsedDelete) return parsedDelete.errorResponse;
    const requestData = parsedDelete.data;
        ({ memoId, deletionToken } = requestData);
        // Strict memoId validation: reject invalid instead of transforming
        const memoIdValidation = await validateMemoIdWithRateLimit(memoId, request, env, requestLocale);
        if (!memoIdValidation.valid) {
            return memoIdValidation.error;
        }

        // Fetch memo details
        const fetchStmt = env.DB.prepare('SELECT deletion_token_hash FROM memos WHERE memo_id = ? AND (expiry_time IS NULL OR expiry_time > unixepoch(\'now\'))');
        row = await fetchStmt.bind(memoId).first();

    if (!row) return await rateLimitOrAccessDenied(request, env, requestLocale);

        // Require deletion token
    if (!deletionToken) return await rateLimitOrAccessDenied(request, env, requestLocale);

        // Validate format using existing password validator without altering the token value
    if (!validatePassword(deletionToken)) return await rateLimitOrAccessDenied(request, env, requestLocale); // Reuse validator for token format

        // Compute hash over the exact provided token (no sanitization) to match stored hash
        computedHash = await hashDeletionToken(deletionToken);
    if (!constantTimeCompare(computedHash, row.deletion_token_hash)) return await rateLimitOrAccessDenied(request, env, requestLocale);

        // Delete if validation passes (common for both cases)
        const deleteStmt = env.DB.prepare('DELETE FROM memos WHERE memo_id = ?');
        const result = await deleteStmt.bind(memoId).run();
        if (result.changes === 0) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
        }

        // Success-path delay to reduce timing differential
        await uniformResponseDelay();
        return new Response(JSON.stringify({
            success: true,
            message: 'Memo deleted successfully'
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY'
            }
        });

    } catch (error) {
        // Add artificial delay for security
        await uniformResponseDelay();
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_DELETION_ERROR', requestLocale) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    } finally {
        // Best-effort wiping of sensitive variables
        if (deletionToken) {
            try { deletionToken = ''.padEnd(deletionToken.length, '\u0000'); } catch (_) { /* Ignore cleanup errors */ }
            deletionToken = null;
        }
        if (computedHash) {
            try { computedHash = ''.padEnd(44, '\u0000'); } catch (_) { /* Ignore cleanup errors */ }
            computedHash = null;
        }
        if (memoId) { try { memoId = null; } catch (_) { /* Ignore cleanup errors */ } }
        if (row) { try { row.deletion_token_hash = null; row = null; } catch (_) { /* Ignore cleanup errors */ } }
    }
}

// Cleanup expired memos (cron job)
export async function handleCleanupMemos(env) {
    try {
        const stmt = env.DB.prepare(`
            DELETE FROM memos 
            WHERE expiry_time IS NOT NULL 
            AND expiry_time < unixepoch('now')
        `);

        const result = await stmt.run();

        return new Response(JSON.stringify({
            success: true,
            cleanedUp: result.changes
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        // Add artificial delay for security
        await uniformResponseDelay();
        return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_ERROR', 'en') }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
        });
    }
} 