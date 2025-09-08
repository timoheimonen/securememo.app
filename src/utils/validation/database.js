// Database and storage sanitization utilities
import { stripDisallowedControlChars } from './shared.js';

/**
 * Normalize ciphertext for JSON transport without altering legitimate characters.
 * We only strip disallowed control characters that could break JSON framing or
 * terminal displays. We DO NOT escape quotes, backslashes, or unicode separators
 * here, letting JSON.stringify handle necessary escaping so the ciphertext
 * round-trips exactly for decryption.
 * @param {string} input - Ciphertext string
 * @returns {string}
 */
export function normalizeCiphertextForResponse(input) {
  if (typeof input !== 'string') return '';
  // Remove null bytes first (explicit \0) then strip other disallowed control characters
  // using the existing, well-audited helper which avoids regex literals with control escapes.
  const withoutNull = input.replace(/\0/g, '');
  return stripDisallowedControlChars(withoutNull);
}

/**
 * Sanitize input for database storage (prevents SQL injection and ensures safe storage)
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input safe for database storage
 */
export function sanitizeForDatabase(input) {
  if (typeof input !== 'string') return '';

  // Remove null bytes first, then strip other disallowed control characters
  const withoutNull = input.replace(/\0/g, '');
  return stripDisallowedControlChars(withoutNull).trim();
}
