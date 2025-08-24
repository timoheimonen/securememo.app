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
import { extractLocaleFromRequest } from '../utils/localization.js';
// import { checkRateLimit } from '../utils/rateLimiter.js'; //Ratelimiting disabled for now in here, enabled in WAF.

// Maximum allowed JSON request body size in bytes (defense-in-depth against large payload DoS)
const MAX_REQUEST_BYTES = 64 * 1024; // 64 KB

// Uniform delayed error helper to reduce timing side-channel variance
async function delayedJsonError(bodyObj, status = 400, extraHeaders = {}) {
    await uniformResponseDelay();
    return new Response(JSON.stringify(bodyObj), {
        status,
        headers: { 'Content-Type': 'application/json', ...extraHeaders }
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
    try {
        // Extract requestLocale from request headers/query for better UX
        const requestLocale = extractLocaleFromRequest(request);
        // (future) Rate limiting placeholder
        /*
        const rate = await checkRateLimit(request, env);
        if (rate.limit && !rate.limit.isAllowed) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': Math.max(0, Math.ceil((rate.limit.reset - Date.now()) / 1000)).toString()
                }
            });
        }
        */
        
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
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return delayedJsonError({ error: getErrorMessage('INVALID_JSON', requestLocale) });
        }
        const requestData = parsedCreate.data;

        const { encryptedMessage, expiryHours, cfTurnstileResponse, deletionTokenHash } = requestData;
        
        // Comprehensive validation and sanitization of encrypted message
        const messageValidation = await validateAndSanitizeEncryptedMessageSecure(encryptedMessage);
        if (!messageValidation.isValid) {
            // Add additional artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MESSAGE_FORMAT', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const sanitizedEncryptedMessage = messageValidation.sanitizedMessage;
        const sanitizedExpiryHours = String(expiryHours);
        const turnstileToken = typeof cfTurnstileResponse === 'string' ? cfTurnstileResponse : '';
        const isValidTurnstile = /^[A-Za-z0-9._-]{10,}$/.test(turnstileToken);
        
        // Validate deletionTokenHash (base64, ~44 chars for SHA-256)
        if (!deletionTokenHash || typeof deletionTokenHash !== 'string' || deletionTokenHash.length !== 44 || !/^[A-Za-z0-9+/=]+$/.test(deletionTokenHash)) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_DELETION_TOKEN_HASH', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Validate expiry hours
        if (!validateExpiryHours(sanitizedExpiryHours)) {
            // Add artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_EXPIRY_TIME', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
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
                headers: { 'Content-Type': 'application/json' }
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
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const turnstileResult = await turnstileResponse.json();
            
            if (!turnstileResult.success) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED', requestLocale) }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (turnstileError) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
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
                headers: { 'Content-Type': 'application/json' }
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
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Add artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
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
                headers: { 'Content-Type': 'application/json' }
            });
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
        // (future) Rate limiting placeholder
        /*
        const rate = await checkRateLimit(request, env);
        if (rate.limit && !rate.limit.isAllowed) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': Math.max(0, Math.ceil((rate.limit.reset - Date.now()) / 1000)).toString()
                }
            });
        }
        */
        
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
                    headers: { 'Content-Type': 'application/json' }
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
                headers: { 'Content-Type': 'application/json' }
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
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const turnstileResult = await turnstileResponse.json();
            
            if (!turnstileResult.success) {
                await uniformResponseDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED', requestLocale) }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (turnstileError) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
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
                headers: { 'Content-Type': 'application/json' }
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
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // SECURITY: Use consistent error handling to prevent enumeration attacks
        // Single check ensures constant-time failure regardless of memo state
        if (!memo) {
            // Add artificial delay for security to normalize response times (standard window)
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
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
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Confirm successful memo reading and delete the memo
/**
 * Handle memo deletion after successful decryption
 * This endpoint is called only after the user successfully decrypts the memo
 */
export async function handleConfirmDelete(request, env, locale = 'en') {
    try {
        // Extract requestLocale from request headers/query for better UX
        const requestLocale = extractLocaleFromRequest(request);
        // (future) Rate limiting placeholder
        /*
        const rate = await checkRateLimit(request, env);
        if (rate.limit && !rate.limit.isAllowed) {
            return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'Retry-After': Math.max(0, Math.ceil((rate.limit.reset - Date.now()) / 1000)).toString()
                }
            });
        }
        */
        
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
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return delayedJsonError({ error: getErrorMessage('INVALID_JSON', requestLocale) });
        }
        const requestData = parsedDelete.data;

    const { memoId, deletionToken } = requestData;
    // Strict memoId validation: reject invalid instead of transforming
    if (typeof memoId !== 'string' || !(await validateMemoIdSecure(memoId))) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage(requestLocale) }), { status: 404 });
        }
        
        // Fetch memo details
    const fetchStmt = env.DB.prepare('SELECT deletion_token_hash FROM memos WHERE memo_id = ? AND (expiry_time IS NULL OR expiry_time > unixepoch(\'now\'))');
    const row = await fetchStmt.bind(memoId).first();

        if (!row) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404 });
        }

        // Require deletion token
        if (!deletionToken) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404 });
        }

        // Validate format using existing password validator without altering the token value
        if (!validatePassword(deletionToken)) {  // Reuse validator for token format
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404 });
        }

        // Compute hash over the exact provided token (no sanitization) to match stored hash
        const computedHash = await hashDeletionToken(deletionToken);
        if (!constantTimeCompare(computedHash, row.deletion_token_hash)) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404 });
        }

        // Delete if validation passes (common for both cases)
    const deleteStmt = env.DB.prepare('DELETE FROM memos WHERE memo_id = ?');
    const result = await deleteStmt.bind(memoId).run();
        if (result.changes === 0) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404 });
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
            headers: { 'Content-Type': 'application/json' }
        });
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
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 