import {
    delayedJsonError,
    verifyTurnstileToken,
    ensureJsonContentType,
    parseJsonRequest,
    calculateExpiryTime,
    generateMemoId,
} from './auth-utils.js';
import {
    validateAndSanitizeEncryptedMessageSecure,
    validateExpiryHours,
    sanitizeLocale,
} from '../utils/validation.js';
import { getErrorMessage } from '../utils/errorMessages.js';
import { uniformResponseDelay } from '../utils/timingSecurity.js';
import { extractLocaleFromRequest } from '../lang/localization.js';

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
            return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { Allow: 'POST' });
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
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            });
        }

        sanitizedEncryptedMessage = messageValidation.sanitizedMessage;
        const sanitizedExpiryHours = String(expiryHours);
        const turnstileToken = typeof cfTurnstileResponse === 'string' ? cfTurnstileResponse : '';

        // Validate deletionTokenHash (base64, ~44 chars for SHA-256)
        if (
            !deletionTokenHash ||
            typeof deletionTokenHash !== 'string' ||
            deletionTokenHash.length !== 44 ||
            !/^[A-Za-z0-9+/=]+$/.test(deletionTokenHash)
        ) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_DELETION_TOKEN_HASH', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            });
        }

        // Validate expiry hours
        if (!validateExpiryHours(sanitizedExpiryHours)) {
            // Add artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('INVALID_EXPIRY_TIME', requestLocale) }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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
        const memoId = await generateMemoId(env, 10);
        if (!memoId) {
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('MEMO_ID_GENERATION_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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
                    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
                });
            }

            // Add artificial delay for security
            await uniformResponseDelay();
            return new Response(JSON.stringify({ error: getErrorMessage('DATABASE_ERROR', requestLocale) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
            });
        }

        // Success-path delay to reduce timing differential
        await uniformResponseDelay();
        return new Response(
            JSON.stringify({
                success: true,
                memoId,
            }),
            {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Content-Type-Options': 'nosniff',
                    'X-Frame-Options': 'DENY',
                },
            }
        );
    } catch (error) {
        // Add artificial delay for security
        await uniformResponseDelay();
        return new Response(JSON.stringify({ error: getErrorMessage('MEMO_CREATION_ERROR', requestLocale) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        });
    } finally {
        // Best-effort erase of confidential data
        if (sanitizedEncryptedMessage) {
            sanitizedEncryptedMessage = null;
        }
        if (deletionTokenHash) {
            deletionTokenHash = null;
        }
        if (requestData && typeof requestData === 'object') {
            if ('encryptedMessage' in requestData) requestData.encryptedMessage = null;
            if ('deletionTokenHash' in requestData) requestData.deletionTokenHash = null;
            requestData = null;
        }
    }
}
