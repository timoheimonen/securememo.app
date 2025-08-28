import {
    validateMemoIdSecure,
    validateAndSanitizeEncryptedMessageSecure,
    validateExpiryHours,
    validatePassword,
    sanitizeForHTML,
    normalizeCiphertextForResponse
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

// Generate cryptographically secure random 40-char memo ID with collision detection
async function generateMemoId(env, maxRetries = 10, locale = 'en') {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        let result = '';
        const biasThreshold = 256 - (256 % chars.length);

        // Use proper rejection sampling to avoid modulo bias
        for (let i = 0; i < 40; i++) {
            let value;
            do {
                const array = new Uint8Array(1);
                crypto.getRandomValues(array);
                value = array[0];
            } while (value >= biasThreshold); // Reject biased values

            result += chars[value % chars.length];
        }

        // Check if this memo_id already exists in the database
        try {
            const checkStmt = env.DB.prepare('SELECT 1 FROM memos WHERE memo_id = ? LIMIT 1');
            const existing = await checkStmt.bind(result).first();

            if (!existing) {
                return result; // This memo_id is unique
            }
            // If we get here, there was a collision, try again
        } catch (dbError) {
            // If database check fails, return the generated ID anyway
            // The database UNIQUE constraint will handle any collision
            return result;
        }
    }

    // If we've exhausted all retries, throw an error
    throw new Error(getErrorMessage('MEMO_ID_GENERATION_MAX_RETRIES', locale));
}

// Create new memo with validation and Turnstile verification
export async function handleCreateMemo(request, env, locale = 'en') {
    // Best-effort memory wiping (limitations: GC & string immutability in JS)
    let sanitizedEncryptedMessage; // declare up-front so we can wipe in finally
    let deletionTokenHash; // shadow for wiping
    let requestData; // for wiping fields post-use
    try {
        // Extract requestLocale from request headers/query for better UX
        const requestLocale = extractLocaleFromRequest(request);

        // Validate request method
        if (request.method !== 'POST') {
            return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { 'Allow': 'POST' });
        }

        // Validate content type
        const contentType = request.headers.get('content-type');
        const sanitizedContentType = sanitizeForHTML(contentType);
        if (!sanitizedContentType || !sanitizedContentType.includes('application/json')) {
            return delayedJsonError({ error: getErrorMessage('CONTENT_TYPE_ERROR', requestLocale) });
        }

        // Parse request body with size limit
        const parsedCreate = await safeParseJson(request, MAX_REQUEST_BYTES);
        if (parsedCreate?.error) {
            if (parsedCreate.error === 'SIZE_LIMIT') {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('REQUEST_TOO_LARGE', requestLocale) }), {
                    status: 413,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                });
            }
            return delayedJsonError({ error: getErrorMessage('INVALID_JSON', requestLocale) });
        }
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
        const isValidTurnstile = /^[A-Za-z0-9._-]{10,}$/.test(turnstileToken);

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
        if (!isValidTurnstile) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('MISSING_TURNSTILE', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        // Verify Turnstile with Cloudflare API
        try {
            const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    secret: env.TURNSTILE_SECRET,
                    response: turnstileToken,
                }),
            });

            if (!turnstileResponse.ok) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_API_ERROR', requestLocale) }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                });
            }

            const turnstileResult = await turnstileResponse.json();

            if (!turnstileResult.success) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED', requestLocale) }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                });
            }
        } catch (turnstileError) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        // Generate unique memo ID with collision detection
        let memoId;
        try {
            memoId = await generateMemoId(env, 10, requestLocale);
        } catch (generateError) {
            // Add artificial delay for security
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
            try { sanitizedEncryptedMessage = ''.padEnd(sanitizedEncryptedMessage.length, '\u0000'); } catch (_) { }
            sanitizedEncryptedMessage = null;
        }
        if (deletionTokenHash) {
            try { deletionTokenHash = ''.padEnd(44, '\u0000'); } catch (_) { }
            deletionTokenHash = null;
        }
        if (requestData) {
            try {
                if (requestData.encryptedMessage) requestData.encryptedMessage = null;
                if (requestData.deletionTokenHash) requestData.deletionTokenHash = null;
            } catch (_) { }
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
export async function handleReadMemo(request, env, locale = 'en') {
    try {
        // Extract requestLocale from request headers/query for better UX
        const requestLocale = extractLocaleFromRequest(request);

        // Validate request method
        if (request.method !== 'POST') {
            return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { 'Allow': 'POST' });
        }

        // Validate content type
        const contentType = request.headers.get('content-type');
        const sanitizedContentType = sanitizeForHTML(contentType);
        if (!sanitizedContentType || !sanitizedContentType.includes('application/json')) {
            return delayedJsonError({ error: getErrorMessage('CONTENT_TYPE_ERROR', requestLocale) });
        }

        // Parse request body with size limit
        const parsedRead = await safeParseJson(request, MAX_REQUEST_BYTES);
        if (parsedRead?.error) {
            if (parsedRead.error === 'SIZE_LIMIT') {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('REQUEST_TOO_LARGE', requestLocale) }), {
                    status: 413,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                });
            }
            return delayedJsonError({ error: getErrorMessage('INVALID_JSON', requestLocale) });
        }
        const requestData = parsedRead.data;

        const { cfTurnstileResponse } = requestData;

        // Sanitize user inputs
        // Validate Turnstile response token by pattern, do not mutate it
        const turnstileToken = typeof cfTurnstileResponse === 'string' ? cfTurnstileResponse : '';
        const isValidTurnstile = /^[A-Za-z0-9._-]{10,}$/.test(turnstileToken);

        // Verify Turnstile token
        if (!isValidTurnstile) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('MISSING_TURNSTILE', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        // Verify Turnstile with Cloudflare API
        try {
            const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    secret: env.TURNSTILE_SECRET,
                    response: turnstileToken,
                }),
            });

            if (!turnstileResponse.ok) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_API_ERROR', requestLocale) }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                });
            }

            const turnstileResult = await turnstileResponse.json();

            if (!turnstileResult.success) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED', requestLocale) }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                });
            }
        } catch (turnstileError) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
        }

        const url = new URL(request.url);
        const memoId = url.searchParams.get('id');
        // Strict validation: do NOT mutate or sanitize the identifier; reject if it does not match expected pattern
        if (typeof memoId !== 'string' || !(await validateMemoIdSecure(memoId))) {
            // Add additional artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
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
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
            });
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
export async function handleConfirmDelete(request, env, locale = 'en') {
    let deletionToken; // capture for wipe
    let computedHash; // capture for wipe
    let memoId; // to wipe
    let row; // db row ref
    try {
        // Extract requestLocale from request headers/query for better UX
        const requestLocale = extractLocaleFromRequest(request);
        // Validate request method
        if (request.method !== 'POST') {
            return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { 'Allow': 'POST' });
        }

        // Validate content type
        const contentType = request.headers.get('content-type');
        const sanitizedContentType = sanitizeForHTML(contentType);
        if (!sanitizedContentType || !sanitizedContentType.includes('application/json')) {
            return delayedJsonError({ error: getErrorMessage('CONTENT_TYPE_ERROR', requestLocale) });
        }

        // Parse request body with size limit
        const parsedDelete = await safeParseJson(request, MAX_REQUEST_BYTES);
        if (parsedDelete?.error) {
            if (parsedDelete.error === 'SIZE_LIMIT') {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('REQUEST_TOO_LARGE', requestLocale) }), {
                    status: 413,
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
                });
            }
            return delayedJsonError({ error: getErrorMessage('INVALID_JSON', requestLocale) });
        }
        const requestData = parsedDelete.data;
        ({ memoId, deletionToken } = requestData);
        // Strict memoId validation: reject invalid instead of transforming
        if (typeof memoId !== 'string' || !(await validateMemoIdSecure(memoId))) {
            const rate = await recordKvFailureAndCheckLimit(request, env, { prefix: 'delFail', allowedFailures: 2, windowSeconds: 60, sliding: true });
            if (rate.limited) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('RATE_LIMITED', requestLocale) }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
                });
            }
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage(requestLocale) }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
        }

        // Fetch memo details
        const fetchStmt = env.DB.prepare('SELECT deletion_token_hash FROM memos WHERE memo_id = ? AND (expiry_time IS NULL OR expiry_time > unixepoch(\'now\'))');
        row = await fetchStmt.bind(memoId).first();

        if (!row) {
            const rate = await recordKvFailureAndCheckLimit(request, env, { prefix: 'delFail', allowedFailures: 2, windowSeconds: 60, sliding: true });
            if (rate.limited) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('RATE_LIMITED', requestLocale) }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
                });
            }
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
        }

        // Require deletion token
        if (!deletionToken) {
            const rate = await recordKvFailureAndCheckLimit(request, env, { prefix: 'delFail', allowedFailures: 2, windowSeconds: 60, sliding: true });
            if (rate.limited) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('RATE_LIMITED', requestLocale) }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
                });
            }
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
        }

        // Validate format using existing password validator without altering the token value
        if (!validatePassword(deletionToken)) {  // Reuse validator for token format
            const rate = await recordKvFailureAndCheckLimit(request, env, { prefix: 'delFail', allowedFailures: 2, windowSeconds: 60, sliding: true });
            if (rate.limited) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('RATE_LIMITED', requestLocale) }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
                });
            }
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
        }

        // Compute hash over the exact provided token (no sanitization) to match stored hash
        computedHash = await hashDeletionToken(deletionToken);
        if (!constantTimeCompare(computedHash, row.deletion_token_hash)) {
            const rate = await recordKvFailureAndCheckLimit(request, env, { prefix: 'delFail', allowedFailures: 2, windowSeconds: 60, sliding: true });
            if (rate.limited) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('RATE_LIMITED', requestLocale) }), {
                    status: 429,
                    headers: { 'Content-Type': 'application/json', 'Retry-After': '60' }
                });
            }
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
        }

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
            try { deletionToken = ''.padEnd(deletionToken.length, '\u0000'); } catch (_) { }
            deletionToken = null;
        }
        if (computedHash) {
            try { computedHash = ''.padEnd(44, '\u0000'); } catch (_) { }
            computedHash = null;
        }
        if (memoId) { try { memoId = null; } catch (_) { } }
        if (row) { try { row.deletion_token_hash = null; row = null; } catch (_) { } }
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