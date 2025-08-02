import { 
  validateMemoId, 
  validateEncryptedMessage, 
  validateExpiryTime,
  validateExpiryHours,
  validatePassword,
  sanitizeInput 
} from '../utils/validation.js';
import { getErrorMessage, getSecurityErrorMessage, getMemoAccessDeniedMessage } from '../utils/errorMessages.js';

/**
 * Calculate expiry time based on expiry hours
 * @param {string|number} expiryHours - The expiry hours value from client (0, 8, 24, 48)
 * @returns {string|null} - ISO string of calculated expiry time or null if invalid
 */
function calculateExpiryTime(expiryHours) {
    // Parse expiry hours as integer
    const hours = parseInt(expiryHours);
    
    // Validate that it's a valid option
    if (!validateExpiryHours(expiryHours)) {
        return null;
    }
    
    const now = new Date();
    let expiryTime;
    
    if (hours === 0) {
        // Delete on read: set to 30 days maximum
        expiryTime = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
        // Specific expiry: calculate based on hours
        expiryTime = new Date(now.getTime() + hours * 60 * 60 * 1000);
    }
    
    return expiryTime.toISOString();
}

// Generate cryptographically secure random 32-char memo ID
function generateMemoId() {
    // Use a larger character set for better entropy
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
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
    return result;
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
        const sanitizedContentType = sanitizeInput(contentType);
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

        const { encryptedMessage, expiryHours, cfTurnstileResponse } = requestData;
        
        // Sanitize all user inputs
        const sanitizedEncryptedMessage = sanitizeInput(encryptedMessage);
        const sanitizedExpiryHours = String(expiryHours); // Convert to string for validation
        const sanitizedTurnstileResponse = sanitizeInput(cfTurnstileResponse);
        
        // Validate inputs
        if (!validateEncryptedMessage(sanitizedEncryptedMessage)) {
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MESSAGE_FORMAT') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Validate expiry hours
        if (!validateExpiryHours(sanitizedExpiryHours)) {
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
        
        // Generate unique memo ID
        const memoId = generateMemoId();
        
        // Insert memo into DB
        try {
            const stmt = env.DB.prepare(`
                INSERT INTO memos (memo_id, encrypted_message, expiry_time)
                VALUES (?, ?, ?)
            `);
            
            await stmt.bind(memoId, sanitizedEncryptedMessage, calculatedExpiryTime).run();
        } catch (dbError) {
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
        const sanitizedContentType = sanitizeInput(contentType);
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
        const sanitizedTurnstileResponse = sanitizeInput(cfTurnstileResponse);
        
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
        
        // Sanitize memo ID from URL
        const sanitizedMemoId = sanitizeInput(memoId);
        
        // Validate memo ID
        if (!sanitizedMemoId || !validateMemoId(sanitizedMemoId)) {
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MEMO_ID') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Fetch memo from DB (no lock needed; we'll use conditional delete)
        let memo;
        try {
            const stmt = env.DB.prepare(`
                SELECT encrypted_message, expiry_time, is_read
                FROM memos 
                WHERE memo_id = ?
            `);
            
            memo = await stmt.bind(sanitizedMemoId).first();
        } catch (dbError) {
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_READ_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // SECURITY: Use consistent error handling to prevent enumeration attacks
        // Don't distinguish between different failure reasons to avoid timing attacks
        if (!memo || memo.is_read || (memo.expiry_time && new Date() > new Date(memo.expiry_time))) {
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Attempt conditional delete (atomic check for is_read and expiry)
        const deleteStmt = env.DB.prepare(`
            DELETE FROM memos 
            WHERE memo_id = ? 
            AND is_read = 0 
            AND (expiry_time IS NULL OR expiry_time > datetime('now'))
        `);
        
        const deleteResult = await deleteStmt.bind(sanitizedMemoId).run();
        
        // If no rows affected, it was already read/expired by a concurrent request
        if (deleteResult.meta.changes !== 1) {
            return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), {  // Use generic message to avoid leaking timing info
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Delete succeeded; return the fetched data
        return new Response(JSON.stringify({ 
            success: true, 
            encryptedMessage: memo.encrypted_message 
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
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_READ_ERROR') }), {
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
            AND expiry_time < datetime('now')
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
        return new Response(JSON.stringify({ error: 'Failed to cleanup memos' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 