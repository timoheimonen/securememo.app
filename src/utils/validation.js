// Input validation and sanitization utilities
import { addArtificialDelay, constantTimeCompare } from './timingSecurity.js';

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
 * Sanitize input for JSON context (prevents JSON injection and control character issues)
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input safe for JSON
 */
export function sanitizeForJSON(input) {
  if (typeof input !== 'string') return '';
  
  // Remove or escape control characters that could break JSON parsing
  return input
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters except newlines/tabs
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t') // Escape tabs
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/\u2028/g, '\\u2028') // Escape line separator (prevents JSON injection)
    .replace(/\u2029/g, '\\u2029') // Escape paragraph separator (prevents JSON injection)
    .trim();
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

/**
 * Sanitize input for URL parameters (prevents URL injection)
 * @param {string} input - The input to sanitize
 * @returns {string} - Sanitized input safe for URL parameters
 */
export function sanitizeForURL(input) {
  if (typeof input !== 'string') return '';
  
  // Remove characters that could be used for URL injection
  return input
    .replace(/[<>\"'%]/g, '') // Remove potentially dangerous characters
    .replace(/\s+/g, '') // Remove whitespace
    .trim();
}



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
    await addArtificialDelay();
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
 * Secure encrypted message validation with artificial delay for error paths
 * @param {string} message - The encrypted message to validate
 * @returns {Promise<boolean>} - Whether the message is valid
 */
export async function validateEncryptedMessageSecure(message) {
  const result = validateEncryptedMessage(message);
  
  // Add artificial delay if validation fails
  if (!result) {
    await addArtificialDelay();
  }
  
  return result;
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
 * Secure password validation with artificial delay for error paths
 * @param {string} password - The password to validate
 * @returns {Promise<boolean>} - Whether the password is valid
 */
export async function validatePasswordSecure(password) {
  const result = validatePassword(password);
  
  // Add artificial delay if validation fails
  if (!result) {
    await addArtificialDelay();
  }
  
  return result;
}

/**
 * Comprehensive validation and sanitization for encrypted messages
 * This function validates the message and returns a sanitized version safe for all contexts
 * @param {string} message - The encrypted message to validate and sanitize
 * @returns {object} - Object with isValid boolean and sanitized message
 */
export function validateAndSanitizeEncryptedMessage(message) {
  // First validate the message
  if (!validateEncryptedMessage(message)) {
    return { isValid: false, sanitizedMessage: null };
  }
  
  // Sanitize for database storage (removes problematic characters)
  const sanitizedForDB = sanitizeForDatabase(message);
  
  // Additional validation after sanitization
  if (sanitizedForDB.length === 0) {
    return { isValid: false, sanitizedMessage: null };
  }
  
  return { isValid: true, sanitizedMessage: sanitizedForDB };
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
    await addArtificialDelay();
    return { isValid: false, sanitizedMessage: null };
  }
  
  // Sanitize for database storage (removes problematic characters)
  const sanitizedForDB = sanitizeForDatabase(message);
  
  // Additional validation after sanitization
  if (sanitizedForDB.length === 0) {
    await addArtificialDelay();
    return { isValid: false, sanitizedMessage: null };
  }
  
  return { isValid: true, sanitizedMessage: sanitizedForDB };
} 