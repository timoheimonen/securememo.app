import { 
  validateMemoId, 
  validateEncryptedMessage, 
  validateExpiryTime,
  validatePassword,
  sanitizeInput 
} from '../utils/validation.js';
import { getErrorMessage, getSecurityErrorMessage } from '../utils/errorMessages.js';

// Generate random 16-char memo ID
function generateMemoId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < 16; i++) {
        result += chars[array[i] % chars.length];
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

        const { encryptedMessage, expiryTime, cfTurnstileResponse } = requestData;
        
        // Sanitize all user inputs
        const sanitizedEncryptedMessage = sanitizeInput(encryptedMessage);
        const sanitizedExpiryTime = sanitizeInput(expiryTime);
        const sanitizedTurnstileResponse = sanitizeInput(cfTurnstileResponse);
        
        // Validate inputs
        if (!validateEncryptedMessage(sanitizedEncryptedMessage)) {
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MESSAGE_FORMAT') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (!validateExpiryTime(sanitizedExpiryTime)) {
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
            
            await stmt.bind(memoId, sanitizedEncryptedMessage, sanitizedExpiryTime).run();
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
            headers: { 'Content-Type': 'application/json' }
        });
        
            } catch (error) {
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_CREATION_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
}

// Read memo and delete it after reading
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
        
        // Fetch memo from DB
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
        
        if (!memo) {
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_NOT_FOUND') }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check if already read
        if (memo.is_read) {
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_ALREADY_READ') }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check expiry
        if (memo.expiry_time) {
            const expiryTime = new Date(memo.expiry_time);
            const now = new Date();
            
            if (now > expiryTime) {
                // Delete expired memo
                const deleteStmt = env.DB.prepare('DELETE FROM memos WHERE memo_id = ?');
                await deleteStmt.bind(sanitizedMemoId).run();
                
                return new Response(JSON.stringify({ error: getErrorMessage('MEMO_EXPIRED') }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // Delete memo after reading
        const deleteStmt = env.DB.prepare('DELETE FROM memos WHERE memo_id = ?');
        await deleteStmt.bind(sanitizedMemoId).run();
        
        
        return new Response(JSON.stringify({ 
            success: true, 
            encryptedMessage: memo.encrypted_message 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
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