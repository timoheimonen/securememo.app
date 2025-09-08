// Confirm successful memo reading and delete the memo
/**
 * Handle memo deletion after successful decryption
 * This endpoint is called only after the user successfully decrypts the memo
 */
import {
  delayedJsonError,
  validateMemoIdWithRateLimit,
  ensureJsonContentType,
  parseJsonRequest,
  rateLimitOrAccessDenied,
  hashDeletionToken,
} from './auth-utils.js';
import { validatePassword } from '../utils/validation/index.js';
import { getErrorMessage, getMemoAccessDeniedMessage } from '../utils/errorMessages.js';
import { uniformResponseDelay, constantTimeCompare } from '../utils/timingSecurity.js';
import { extractLocaleFromRequest } from '../lang/localization.js';

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
      return delayedJsonError({ error: getErrorMessage('METHOD_NOT_ALLOWED', requestLocale) }, 405, { Allow: 'POST' });
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
    const fetchStmt = env.DB.prepare(
      "SELECT deletion_token_hash FROM memos WHERE memo_id = ? AND (expiry_time IS NULL OR expiry_time > unixepoch('now'))"
    );
    row = await fetchStmt.bind(memoId).first();

    if (!row) {
      return await rateLimitOrAccessDenied(request, env, requestLocale);
    }

    // Require deletion token
    if (!deletionToken) {
      return await rateLimitOrAccessDenied(request, env, requestLocale);
    }

    // Validate format using existing password validator without altering the token value
    if (!validatePassword(deletionToken)) {
      return await rateLimitOrAccessDenied(request, env, requestLocale); // Reuse validator for token format
    }

    // Compute hash over the exact provided token (no sanitization) to match stored hash
    computedHash = await hashDeletionToken(deletionToken);
    if (!constantTimeCompare(computedHash, row.deletion_token_hash)) {
      return await rateLimitOrAccessDenied(request, env, requestLocale);
    }

    // Delete if validation passes (common for both cases)
    const deleteStmt = env.DB.prepare('DELETE FROM memos WHERE memo_id = ?');
    const result = await deleteStmt.bind(memoId).run();
    if (result.changes === 0) {
      await uniformResponseDelay();
      return new Response(JSON.stringify({ error: getMemoAccessDeniedMessage() }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      });
    }

    // Success-path delay to reduce timing differential
    await uniformResponseDelay();
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Memo deleted successfully',
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
    return new Response(JSON.stringify({ error: getErrorMessage('MEMO_DELETION_ERROR', requestLocale) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
  } finally {
    // Best-effort wiping of sensitive variables
    if (deletionToken) {
      deletionToken = null;
    }
    if (computedHash) {
      computedHash = null;
    }
    if (memoId) {
      memoId = null;
    }
    if (row && typeof row === 'object') {
      if ('deletion_token_hash' in row) row.deletion_token_hash = null;
      row = null;
    }
  }
}
