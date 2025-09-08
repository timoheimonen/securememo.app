// HTML sanitization utilities

/**
 * Sanitize user input for HTML context (prevents XSS)
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input safe for HTML
 */
export function sanitizeForHTML(input) {
  if (typeof input !== 'string') return '';

  // Decode HTML entities to catch encoded malicious content
  const decoded = decodeHtmlEntities(input);

  // Remove HTML tags and event handlers
  const sanitized = removeHtmlTagsAndScripts(decoded);

  // Re-encode any remaining dangerous characters to prevent XSS
  return encodeHtmlEntities(sanitized);
}

/**
 * Decode common HTML entities to their character equivalents
 * @param {string} input - Input string with HTML entities
 * @returns {string} - String with HTML entities decoded
 */
function decodeHtmlEntities(input) {
  // Important: decode ampersand first to avoid double-decoding vulnerabilities
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#47;/g, '/');
}

/**
 * Remove HTML tags and dangerous script patterns
 * @param {string} input - Input string to clean
 * @returns {string} - String with HTML tags and scripts removed
 */
function removeHtmlTagsAndScripts(input) {
  return input
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/vbscript:/gi, '') // Remove vbscript: URLs
    .replace(/data:/gi, '') // Remove data: URLs
    .replace(/expression\(/gi, '') // Remove CSS expressions
    .replace(/eval\(/gi, '') // Remove eval calls
    .replace(/setTimeout\(/gi, '') // Remove setTimeout calls
    .replace(/setInterval\(/gi, '') // Remove setInterval calls
    .trim();
}

/**
 * Encode dangerous characters as HTML entities
 * @param {string} input - Input string to encode
 * @returns {string} - String with dangerous characters encoded
 */
function encodeHtmlEntities(input) {
  // Important: encode ampersand first to avoid double-encoding of existing entities
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
