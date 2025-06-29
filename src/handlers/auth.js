import { 
  validateMemoId, 
  validateEncryptedMessage, 
  validateExpiryTime,
  validatePassword,
  sanitizeInput 
} from '../utils/validation.js';
import { getErrorMessage, getSecurityErrorMessage } from '../utils/errorMessages.js';

// Generate a random memo ID
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

// Security logging function
function logSecurityEvent(event, details, request) {
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || 'unknown';
    const timestamp = new Date().toISOString();
    
    console.log(`[SECURITY] ${timestamp} | ${event} | IP: ${clientIP} | UA: ${userAgent} | Details: ${JSON.stringify(details)}`);
}

// Create a new memo
export async function handleCreateMemo(request, env) {
    try {
        // Validate request content type
        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return new Response(JSON.stringify({ error: getErrorMessage('CONTENT_TYPE_ERROR') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Parse request body with error handling
        let requestData;
        try {
            requestData = await request.json();
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_JSON') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { encryptedMessage, expiryTime, cfTurnstileResponse } = requestData;
        
        // Input validation with sanitization
        if (!validateEncryptedMessage(encryptedMessage)) {
            logSecurityEvent('INVALID_MESSAGE_FORMAT', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', messageLength: encryptedMessage?.length }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MESSAGE_FORMAT') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (!validateExpiryTime(expiryTime)) {
            logSecurityEvent('INVALID_EXPIRY_TIME', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', expiryTime }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_EXPIRY_TIME') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Verify Turnstile token
        if (!cfTurnstileResponse) {
            logSecurityEvent('MISSING_TURNSTILE', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown' }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('MISSING_TURNSTILE') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Verify Turnstile with Cloudflare
        try {
            const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    secret: env.TURNSTILE_SECRET,
                    response: cfTurnstileResponse,
                }),
            });

            if (!turnstileResponse.ok) {
                console.error('Turnstile API error:', turnstileResponse.status, turnstileResponse.statusText);
                logSecurityEvent('TURNSTILE_API_ERROR', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', status: turnstileResponse.status }, request);
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_API_ERROR') }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            const turnstileResult = await turnstileResponse.json();
            
            if (!turnstileResult.success) {
                logSecurityEvent('TURNSTILE_FAILED', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', turnstileResult }, request);
                return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_FAILED') }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (turnstileError) {
            console.error('Turnstile verification error:', turnstileError);
            logSecurityEvent('TURNSTILE_VERIFICATION_ERROR', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', error: turnstileError.message }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('TURNSTILE_VERIFICATION_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Generate unique memo ID
        const memoId = generateMemoId();
        
        // Insert memo into database
        try {
            const stmt = env.DB.prepare(`
                INSERT INTO memos (memo_id, encrypted_message, expiry_time)
                VALUES (?, ?, ?)
            `);
            
            await stmt.bind(memoId, encryptedMessage, expiryTime).run();
        } catch (dbError) {
            console.error('Database error during memo creation:', dbError);
            logSecurityEvent('DATABASE_ERROR', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', error: dbError.message }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        logSecurityEvent('MEMO_CREATED', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', memoId, expiryTime }, request);
        
        return new Response(JSON.stringify({ 
            success: true, 
            memoId: memoId 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Error creating memo:', error);
        logSecurityEvent('MEMO_CREATION_ERROR', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', error: error.message }, request);
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_CREATION_ERROR') }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Read a memo (and delete it after reading)
export async function handleReadMemo(request, env) {
    try {
        const url = new URL(request.url);
        const memoId = url.searchParams.get('id');
        
        // Input validation
        if (!memoId || !validateMemoId(memoId)) {
            logSecurityEvent('INVALID_MEMO_ID', { memoId, clientIP: request.headers.get('CF-Connecting-IP') || 'unknown' }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_MEMO_ID') }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Get memo from database
        let memo;
        try {
            const stmt = env.DB.prepare(`
                SELECT encrypted_message, expiry_time, is_read
                FROM memos 
                WHERE memo_id = ?
            `);
            
            memo = await stmt.bind(memoId).first();
        } catch (dbError) {
            console.error('Database error during memo read:', dbError);
            logSecurityEvent('DATABASE_READ_ERROR', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', error: dbError.message }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_READ_ERROR') }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        if (!memo) {
            logSecurityEvent('MEMO_NOT_FOUND', { memoId, clientIP: request.headers.get('CF-Connecting-IP') || 'unknown' }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_NOT_FOUND') }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check if memo has already been read
        if (memo.is_read) {
            logSecurityEvent('MEMO_ALREADY_READ', { memoId, clientIP: request.headers.get('CF-Connecting-IP') || 'unknown' }, request);
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_ALREADY_READ') }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        // Check if memo has expired
        if (memo.expiry_time) {
            const expiryTime = new Date(memo.expiry_time);
            const now = new Date();
            
            if (now > expiryTime) {
                // Delete expired memo
                const deleteStmt = env.DB.prepare('DELETE FROM memos WHERE memo_id = ?');
                await deleteStmt.bind(memoId).run();
                
                logSecurityEvent('MEMO_EXPIRED', { memoId, clientIP: request.headers.get('CF-Connecting-IP') || 'unknown' }, request);
                return new Response(JSON.stringify({ error: getErrorMessage('MEMO_EXPIRED') }), {
                    status: 404,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }
        
        // Mark memo as read and delete it
        const deleteStmt = env.DB.prepare('DELETE FROM memos WHERE memo_id = ?');
        await deleteStmt.bind(memoId).run();
        
        logSecurityEvent('MEMO_READ', { memoId, clientIP: request.headers.get('CF-Connecting-IP') || 'unknown' }, request);
        
        return new Response(JSON.stringify({ 
            success: true, 
            encryptedMessage: memo.encrypted_message 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Error reading memo:', error);
        logSecurityEvent('MEMO_READ_ERROR', { clientIP: request.headers.get('CF-Connecting-IP') || 'unknown', error: error.message }, request);
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_READ_ERROR') }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Cleanup expired memos (called by cron job)
export async function handleCleanupMemos(env) {
    try {
        const stmt = env.DB.prepare(`
            DELETE FROM memos 
            WHERE expiry_time IS NOT NULL 
            AND expiry_time < datetime('now')
        `);
        
        const result = await stmt.run();
        console.log(`Cleaned up ${result.changes} expired memos`);
        
        return new Response(JSON.stringify({ 
            success: true, 
            cleanedUp: result.changes 
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        console.error('Error cleaning up memos:', error);
        return new Response(JSON.stringify({ error: 'Failed to cleanup memos' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
} 