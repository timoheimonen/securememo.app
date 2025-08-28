// Input validation and sanitization utilities
import { uniformResponseDelay } from './timingSecurity.js';

/**
 * Sanitize user input for HTML context (prevents XSS)
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input safe for HTML
 */
export function sanitizeForHTML(input) {
  if (typeof input !== 'string') return '';

  // First decode HTML entities to catch encoded malicious content
  let decoded = input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#39;/g, "'")
    .replace(/&#47;/g, '/');

  // Remove HTML tags and event handlers
  let sanitized = decoded
    .replace(/<[^>]*>/g, '') // Remove all tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/expression\(/gi, '')
    .replace(/eval\(/gi, '')
    .replace(/setTimeout\(/gi, '')
    .replace(/setInterval\(/gi, '')
    .trim();

  // Re-encode any remaining < > & " ' to prevent XSS
  return sanitized
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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
  // Remove null byte and other non-printable control chars except \n, \r, \t
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Sanitize input for database storage (prevents SQL injection and ensures safe storage)
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input safe for database storage
 */
export function sanitizeForDatabase(input) {
  if (typeof input !== 'string') return '';

  // Remove null bytes and other problematic characters for database storage
  return input
    .replace(/\x00/g, '') // Remove null bytes
    .replace(/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();
}

// sanitizeForURL removed (identifier inputs are strictly validated instead of transformed)

/**
 * Validate memo ID format (32 or 40 chars with alphanumeric, hyphens, underscores)
 * @param {string} memoId - The memo ID to validate
 * @returns {boolean} - Whether the memo ID is valid
 */
export function validateMemoId(memoId) {
  return /^[A-Za-z0-9\-_]{32}$/.test(memoId) || /^[A-Za-z0-9\-_]{40}$/.test(memoId);
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
  if (/\x00/.test(message)) {
    return false; // Null bytes are not allowed
  }

  // Check for other problematic control characters (except newlines, tabs, carriage returns)
  if (/[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(message)) {
    return false;
  }

  return true;
}

/**
 * Validate expiry hours (must be valid option: 8, 24, 48, 168, 720)
 * @param {string|number} expiryHours - The expiry hours to validate
 * @returns {boolean} - Whether the expiry hours is valid
 */
export function validateExpiryHours(expiryHours) {
  if (expiryHours === null || expiryHours === undefined) return false;

  const hours = parseInt(expiryHours);
  const validOptions = [8, 24, 48, 168, 720]; // 8h, 24h (1 day), 48h (2 days), 168h (1 week), 720h (30 days)

  return !isNaN(hours) && validOptions.includes(hours);
}

/**
 * Validate password format (32-64 alphanumeric chars)
 * @param {string} password - The password to validate
 * @returns {boolean} - Whether the password is valid
 */
export function validatePassword(password) {
  return password &&
    typeof password === 'string' &&
    password.length >= 32 &&
    password.length <= 64 &&
    /^[A-Za-z0-9]+$/.test(password);
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

/**
 * Sanitize locale input to prevent injection attacks
 * @param {string} locale - The locale string to sanitize
 * @returns {string} - Sanitized locale or 'en' as fallback
 */
export function sanitizeLocale(locale) {
  if (!locale || typeof locale !== 'string') return 'en';
  if (locale.length > 10) return 'en'; // Prevent extremely long inputs
  // Only allow alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(locale)) return 'en';
  return locale;
} 