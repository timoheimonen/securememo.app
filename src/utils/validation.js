// Input validation and sanitization utilities

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input
 */
export function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  
  // Remove HTML tags and event handlers
  return input
    .replace(/<[^>]*>/g, '') // Remove all tags
    .replace(/javascript:/gi, '') 
    .replace(/on\w+=/gi, '')
    .trim();
}

/**
 * Validate memo ID format (16 alphanumeric chars)
 * @param {string} memoId - The memo ID to validate
 * @returns {boolean} - Whether the memo ID is valid
 */
export function validateMemoId(memoId) {
  return /^[A-Za-z0-9]{16}$/.test(memoId);
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