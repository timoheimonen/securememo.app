// Shared validation and sanitization utilities

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
  return (
    password &&
    typeof password === 'string' &&
    password.length >= 32 &&
    password.length <= 64 &&
    /^[A-Za-z0-9]+$/.test(password)
  );
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

/**
 * Remove disallowed control characters (excluding tab, newline, carriage return) from a string.
 * @param {string} str - Input string
 * @returns {string} Sanitized string without disallowed control characters
 */
export function stripDisallowedControlChars(str) {
  if (typeof str !== 'string' || !str) return '';
  let out = '';
  for (let i = 0; i < str.length; i++) {
    // Direct indexing + charCodeAt to avoid false positive "object injection" pattern; strings are immutable primitives
    const code = str.charCodeAt(i);
    if (code === 9 || code === 10 || code === 13) {
      // allowed controls
      // Use charAt instead of bracket notation to avoid SAST generic object injection false positives.
      // str is guaranteed to be a primitive string above, so charAt(i) returns a one-character string.
      out += str.charAt(i);
      continue;
    }
    if ((code >= 1 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31) || code === 127) {
      continue; // skip disallowed
    }
    // Same rationale: explicit charAt clarifies we're reading a character, not a dynamic property.
    out += str.charAt(i);
  }
  return out;
}
