// Retrieve memo for client-side decryption (deletion handled separately via confirm-delete after successful decryption).
/**
 * Handle memo reading with security measures to prevent enumeration attacks
 *
 * SECURITY FEATURES:
 * - Uses generic error messages to prevent distinguishing between different failure reasons
 * - Combines all access checks into a single condition to avoid timing attacks
 * - Returns consistent HTTP status codes (404) for all access failures
 * - Prevents information leakage about memo existence, read status, or expiry
 */
import {
  delayedJsonError,
  verifyTurnstileToken,
  ensureJsonContentType,
  parseJsonRequest,
  createAccessDeniedResponse,
} from './auth-utils.js';
import { validateMemoIdSecure, normalizeCiphertextForResponse } from '../utils/validation.js';
import { getErrorMessage } from '../utils/errorMessages.js';
import { uniformResponseDelay } from '../utils/timingSecurity.js';
import { extractLocaleFromRequest } from '../lang/localization.js';

export async function handleReadMemo(request, env) {
  // Extract requestLocale from request headers/query for better UX
  const requestLocale = extractLocaleFromRequest(request);
  try {
    // Validate request method
    if (request.method !== 'POST') {
      return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { Allow: 'POST' });
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
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
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
    return new Response(
      JSON.stringify({
        success: true,
        encryptedMessage: sanitizedResponseMessage,
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
    return new Response(JSON.stringify({ error: getErrorMessage('MEMO_READ_ERROR', requestLocale) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  }
}
