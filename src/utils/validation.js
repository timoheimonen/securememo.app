// Input validation and sanitization utilities

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
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
 * Validate memo ID format (16 or 32 chars with alphanumeric, hyphens, underscores for backward compatibility)
 * @param {string} memoId - The memo ID to validate
 * @returns {boolean} - Whether the memo ID is valid
 */
export function validateMemoId(memoId) {
  return /^[A-Za-z0-9\-_]{16}$|^[A-Za-z0-9\-_]{32}$/.test(memoId);
}

/**
 * Validate encrypted message format and size (max 50KB)
 * @param {string} message - The encrypted message to validate
 * @returns {boolean} - Whether the message is valid
 */
export function validateEncryptedMessage(message) {
  return message && 
         typeof message === 'string' && 
         message.length > 0 && 
         message.length <= 50000;
}

/**
 * Validate expiry time (must be future date, max 30 days)
 * @param {string} expiryTime - The expiry time to validate
 * @returns {boolean} - Whether the expiry time is valid
 */
export function validateExpiryTime(expiryTime) {
  if (!expiryTime) return false;
  
  try {
    const expiry = new Date(expiryTime);
    const now = new Date();
    const maxExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days max
    
    return expiry > now && expiry <= maxExpiry;
  } catch (error) {
    return false;
  }
}

/**
 * Validate expiry hours (must be valid option: 0, 8, 24, 48)
 * @param {string|number} expiryHours - The expiry hours to validate
 * @returns {boolean} - Whether the expiry hours is valid
 */
export function validateExpiryHours(expiryHours) {
  if (expiryHours === null || expiryHours === undefined) return false;
  
  const hours = parseInt(expiryHours);
  const validOptions = [0, 8, 24, 48]; // 0 (delete on read), 8h, 24h, 48h
  
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