// Memo-specific validation functions
import { uniformResponseDelay } from '../timingSecurity.js';
import { containsDisallowedControlChars } from './shared.js';
import { sanitizeForDatabase } from './database.js';

/**
 * Validate memo ID format (exactly 40 chars: alphanumeric, hyphen, underscore)
 * @param {string} memoId - The memo ID to validate
 * @returns {boolean} - Whether the memo ID is valid
 */
export function validateMemoId(memoId) {
  return /^[A-Za-z0-9\-_]{40}$/.test(memoId);
}

/**
 * Secure memo ID validation with artificial delay for error paths
 * @param {string} memoId - The memo ID to validate
 * @returns {Promise<boolean>} - Whether the memo ID is valid
 */
export async function validateMemoIdSecure(memoId) {
  const result = validateMemoId(memoId);

  // Add artificial delay if validation fails
  if (!result) {
    await uniformResponseDelay();
  }

  return result;
}

/**
 * Validate encrypted message format and size (max 50KB)
 * @param {string} message - The encrypted message to validate
 * @returns {boolean} - Whether the message is valid
 */
export function validateEncryptedMessage(message) {
  if (!message || typeof message !== 'string' || message.length === 0 || message.length > 50000) {
    return false;
  }

  // Check for null bytes and other control characters that could cause issues
  if (/\0/.test(message)) {
    return false; // Null bytes are not allowed
  }

  // Check for other problematic control characters (except newlines, tabs, carriage returns)
  if (containsDisallowedControlChars(message)) {
    return false;
  }

  return true;
}

/**
 * Secure comprehensive validation and sanitization for encrypted messages with artificial delay
 * This function validates the message and returns a sanitized version safe for all contexts
 * @param {string} message - The encrypted message to validate and sanitize
 * @returns {Promise<object>} - Object with isValid boolean and sanitized message
 */
export async function validateAndSanitizeEncryptedMessageSecure(message) {
  // First validate the message
  if (!validateEncryptedMessage(message)) {
    await uniformResponseDelay();
    return { isValid: false, sanitizedMessage: null };
  }

  // Sanitize for database storage (removes problematic characters)
  const sanitizedForDB = sanitizeForDatabase(message);

  // Additional validation after sanitization
  if (sanitizedForDB.length === 0 || sanitizedForDB.length > 50000) {
    await uniformResponseDelay();
    return { isValid: false, sanitizedMessage: null };
  }

  return { isValid: true, sanitizedMessage: sanitizedForDB };
}
