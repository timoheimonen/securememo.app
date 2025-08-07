import { 
  validateMemoId, 
  validateMemoIdSecure,
  validateEncryptedMessage, 
  validateEncryptedMessageSecure,
  validateAndSanitizeEncryptedMessage,
  validateAndSanitizeEncryptedMessageSecure,
  validateExpiryTime,
  validateExpiryHours,
  validatePassword,
  validatePasswordSecure,
  sanitizeForHTML,
  sanitizeForDatabase,
  sanitizeForJSON,
  sanitizeForURL
} from '../utils/validation.js';
import { getErrorMessage, getSecurityErrorMessage, getMemoAccessDeniedMessage } from '../utils/errorMessages.js';
import { addArtificialDelay, constantTimeCompare } from '../utils/timingSecurity.js';

// Generate secure 32-char token
function generateDeletionToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    let token = '';
    for (let i = 0; i < 32; i++) {
        token += chars[array[i] % chars.length];
    }
    return token;
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

// Generate cryptographically secure random 32-char memo ID with collision detection
async function generateMemoId(env, maxRetries = 10) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        // Generate 32 random bytes
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        let result = '';
        
        // Use rejection sampling to avoid modulo bias
        for (let i = 0; i < 32; i++) {
            let randomIndex;
            do {
                randomIndex = array[i] % chars.length;
            } while (randomIndex >= chars.length - (256 % chars.length)); // Reject biased values
            
            result += chars[randomIndex];
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
    throw new Error(getErrorMessage('MEMO_ID_GENERATION_MAX_RETRIES'));
}

// Create new memo with validation and Turnstile verification
export async function handleCreateMemo(request, env) {
    try {
        // Validate request method
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED') }), {
                status: 405,
                headers: { 
                    'Content-Type': 'application/json',
                    'Allow': 'POST'
                }
            });
        }
        
        // Validate content type
        const contentType = request.headers.get('content-type');
        const sanitizedContentType = sanitizeForHTML(contentType);
        if (!sanitizedContentType || !sanitizedContentType.includes('application/json')) {
            return new Response(JSON.stringify({ error: getErrorMessage('CONTENT_TYPE_ERROR') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_JSON') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { encryptedMessage, expiryHours, cfTurnstileResponse, deletionTokenHash } = requestData;
        
        // Comprehensive validation and sanitization of encrypted message
        const messageValidation = await validateAndSanitizeEncryptedMessageSecure(encryptedMessage);
        if (!messageValidation.isValid) {
            // Add additional artificial delay for security
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MESSAGE_FORMAT') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const sanitizedEncryptedMessage = messageValidation.sanitizedMessage;
        const sanitizedExpiryHours = String(expiryHours); // Convert to string for validation
        const sanitizedTurnstileResponse = sanitizeForJSON(cfTurnstileResponse);
        
        // Validate deletionTokenHash (base64, ~44 chars for SHA-256)
        if (!deletionTokenHash || typeof deletionTokenHash !== 'string' || deletionTokenHash.length !== 44 || !/^[A-Za-z0-9+/=]+$/.test(deletionTokenHash)) {
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_DELETION_TOKEN_HASH') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Validate expiry hours
        if (!validateExpiryHours(sanitizedExpiryHours)) {
            // Add artificial delay for security
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_EXPIRY_TIME') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Calculate expiry time server-side
        const calculatedExpiryTime = calculateExpiryTime(sanitizedExpiryHours);
        if (!calculatedExpiryTime) {
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_EXPIRY_TIME') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Verify Turnstile token
        if (!sanitizedTurnstileResponse) {
            return new Response(JSON.stringify({ error: getErrorMessage('MISSING_TURNSTILE') }), {
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
                    response: sanitizedTurnstileResponse,
                }),
            });

            if (!turnstileResponse.ok) {
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_API_ERROR') }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const turnstileResult = await turnstileResponse.json();
            
            if (!turnstileResult.success) {
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED') }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (turnstileError) {
            return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Generate unique memo ID with collision detection
        let memoId;
        try {
            memoId = await generateMemoId(env);
        } catch (generateError) {
            // Add artificial delay for security
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_ID_GENERATION_ERROR') }), {
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
                await addArtificialDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('MEMO_ID_COLLISION_ERROR') }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            
            // Add artificial delay for security
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        
        return new Response(JSON.stringify({ 
            success: true, 
            memoId: memoId 
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            }
        });
        
            } catch (error) {
            // Add artificial delay for security
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_CREATION_ERROR') }), {
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
export async function handleReadMemo(request, env) {
    try {
        // Validate request method
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED') }), {
                status: 405,
                headers: { 
                    'Content-Type': 'application/json',
                    'Allow': 'POST'
                }
            });
        }
        
        // Validate content type
        const contentType = request.headers.get('content-type');
        const sanitizedContentType = sanitizeForHTML(contentType);
        if (!sanitizedContentType || !sanitizedContentType.includes('application/json')) {
            return new Response(JSON.stringify({ error: getErrorMessage('CONTENT_TYPE_ERROR') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_JSON') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { cfTurnstileResponse } = requestData;
        
        // Sanitize user inputs
        const sanitizedTurnstileResponse = sanitizeForJSON(cfTurnstileResponse);
        
        // Verify Turnstile token
        if (!sanitizedTurnstileResponse) {
            return new Response(JSON.stringify({ error: getErrorMessage('MISSING_TURNSTILE') }), {
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
                    response: sanitizedTurnstileResponse,
                }),
            });

            if (!turnstileResponse.ok) {
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_API_ERROR') }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const turnstileResult = await turnstileResponse.json();
            
            if (!turnstileResult.success) {
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED') }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (turnstileError) {
            return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        const url = new URL(request.url);
        const memoId = url.searchParams.get('id');
        
        // Sanitize memo ID from URL parameters
        const sanitizedMemoId = sanitizeForURL(memoId);
        
        // Validate memo ID with secure validation
        if (!sanitizedMemoId || !(await validateMemoIdSecure(sanitizedMemoId))) {
            // Add additional artificial delay for security
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MEMO_ID') }), {
                status: 400,
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
            
            memo = await stmt.bind(sanitizedMemoId).first();
        } catch (dbError) {
            // Add artificial delay for security
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_READ_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // SECURITY: Use consistent error handling to prevent enumeration attacks
        // Single check ensures constant-time failure regardless of memo state
        if (!memo) {
            // Add artificial delay for security to normalize response times
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Sanitize encrypted message for JSON response to prevent injection
        const sanitizedResponseMessage = sanitizeForJSON(memo.encrypted_message);
        
        // Return the memo data without deleting it
        return new Response(JSON.stringify({ 
            success: true, 
            encryptedMessage: sanitizedResponseMessage,
            requiresDeletionToken: !!memo.deletion_token_hash
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            }
        });
        
    } catch (error) {
        // Add artificial delay for security
        await addArtificialDelay();
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_READ_ERROR') }), {
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
export async function handleConfirmDelete(request, env) {
    try {
        // Validate request method
        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: getErrorMessage('METHOD_NOT_ALLOWED') }), {
                status: 405,
                headers: { 
                    'Content-Type': 'application/json',
                    'Allow': 'POST'
                }
            });
        }
        
        // Validate content type
        const contentType = request.headers.get('content-type');
        const sanitizedContentType = sanitizeForHTML(contentType);
        if (!sanitizedContentType || !sanitizedContentType.includes('application/json')) {
            return new Response(JSON.stringify({ error: getErrorMessage('CONTENT_TYPE_ERROR') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request body
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_JSON') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { memoId, deletionToken, cfTurnstileResponse } = requestData;
        
        // Sanitize user inputs
        const sanitizedMemoId = sanitizeForURL(memoId);
        
        // Validate memo ID with secure validation
        if (!sanitizedMemoId || !(await validateMemoIdSecure(sanitizedMemoId))) {
            // Add additional artificial delay for security
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MEMO_ID') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Fetch memo details
        const fetchStmt = env.DB.prepare('SELECT deletion_token_hash FROM memos WHERE memo_id = ? AND (expiry_time IS NULL OR expiry_time > unixepoch(\'now\'))');
        const row = await fetchStmt.bind(sanitizedMemoId).first();

        if (!row) {
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404 });
        }

        const hasTokenHash = !!row.deletion_token_hash;

        if (hasTokenHash) {
            // New memo: Require and validate token (no Turnstile)
            if (!deletionToken) {
                await addArtificialDelay();
                return new Response(JSON.stringify({ error: getErrorMessage('MISSING_DELETION_TOKEN') }), { status: 400 });
            }
            const sanitizedToken = sanitizeForDatabase(deletionToken);
            if (!validatePassword(sanitizedToken)) {  // Reuse validator for token format
                await addArtificialDelay();
                return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 403 });
            }
            const computedHash = await hashDeletionToken(sanitizedToken);
            if (!constantTimeCompare(computedHash, row.deletion_token_hash)) {
                await addArtificialDelay();
                return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 403 });
            }
        } else {
            // Old memo (NULL hash): Fall back to Turnstile validation
            const sanitizedTurnstile = sanitizeForJSON(cfTurnstileResponse);
            if (!sanitizedTurnstile) {
                return new Response(JSON.stringify({ error: getErrorMessage('MISSING_TURNSTILE') }), { status: 400 });
            }
            // Verify Turnstile
            try {
                const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: sanitizedTurnstile })
                });
                const turnstileResult = await turnstileResponse.json();
                if (!turnstileResult.success) {
                    return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED') }), { status: 400 });
                }
            } catch (error) {
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR') }), { status: 500 });
            }
        }

        // Delete if validation passes (common for both cases)
        const deleteStmt = env.DB.prepare('DELETE FROM memos WHERE memo_id = ?');
        const result = await deleteStmt.bind(sanitizedMemoId).run();
        if (result.changes === 0) {
            await addArtificialDelay();
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), { status: 404 });
        }
        
        // Return success confirmation
        return new Response(JSON.stringify({ 
            success: true, 
            message: 'Memo deleted successfully' 
        }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block'
            }
        });
        
    } catch (error) {
        // Add artificial delay for security
        await addArtificialDelay();
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_DELETION_ERROR') }), {
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
        await addArtificialDelay();
        return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_ERROR') }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 