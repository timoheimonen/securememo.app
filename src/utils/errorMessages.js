// Centralized error message mapping for consistent UX
// SECURITY: Generic error messages prevent information leakage and enumeration attacks

/**
 * Error message mapping by error code
 */
export const errorMessages = {
  // Memo creation errors
  'INVALID_MESSAGE_FORMAT': 'The message format is invalid or the message is too large. Please try again.',
  'INVALID_EXPIRY_TIME': 'The expiry time is invalid. Please select a valid time period.',
  'MISSING_TURNSTILE': 'Please complete the security verification to create your memo.',
  'TURNSTILE_FAILED': 'Security verification failed. Please try again.',
  'TURNSTILE_API_ERROR': 'Security verification is temporarily unavailable. Please try again later.',
  'TURNSTILE_VERIFICATION_ERROR': 'Security verification encountered an error. Please try again.',
  'DATABASE_ERROR': 'Unable to save your memo. Please try again.',
  'MEMO_CREATION_ERROR': 'An error occurred while creating your memo. Please try again.',
  
  // Memo reading errors - SECURITY: Use generic messages to prevent enumeration attacks
  'INVALID_MEMO_ID': 'The memo link appears to be invalid or corrupted.',
  'MISSING_MEMO_ID': 'Missing memo ID. Please check the URL you received.',
  'MEMO_ACCESS_DENIED': 'This memo is no longer available. It may have been read, expired, or never existed.',
  'MEMO_NOT_FOUND': 'This memo is no longer available. It may have been read, expired, or never existed.',
  'MEMO_ALREADY_READ': 'This memo is no longer available. It may have been read, expired, or never existed.',
  'MEMO_EXPIRED': 'This memo is no longer available. It may have been read, expired, or never existed.',
  'DATABASE_READ_ERROR': 'Unable to read the memo. Please try again.',
  'MEMO_READ_ERROR': 'An error occurred while reading the memo.',
  
  // General errors
  'INVALID_JSON': 'The request format is invalid. Please try again.',
  'REQUEST_TOO_LARGE': 'The request is too large. Please reduce the message size.',
  'CONTENT_TYPE_ERROR': 'Invalid request format. Please try again.',
  'METHOD_NOT_ALLOWED': 'This endpoint does not support the requested HTTP method.',
  'GENERAL_ERROR': 'An unexpected error occurred. Please try again.',
  
  // Decryption errors
  'DECRYPTION_FAILED': 'Unable to decrypt the message. Please check the password and try again.',
  'INVALID_PASSWORD': 'The password appears to be incorrect. Please check the URL and try again.',
  
  // Network errors
  'NETWORK_ERROR': 'Network connection error. Please check your internet connection and try again.',
  'SERVICE_UNAVAILABLE': 'The service is temporarily unavailable. Please try again later.'
};

/**
 * Get user-friendly error message by error code
 * @param {string} errorCode - The error code
 * @param {string} fallback - Fallback message if code not found
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(errorCode, fallback = 'An error occurred. Please try again.') {
  return errorMessages[errorCode] || fallback;
}

/**
 * Get error message for security events
 * @param {string} event - The security event
 * @returns {string} - User-friendly error message
 */
export function getSecurityErrorMessage(event) {
  const securityErrorMap = {
    'INVALID_MESSAGE_FORMAT': 'The message format is invalid or the message is too large.',
    'INVALID_EXPIRY_TIME': 'The expiry time is invalid.',
    'MISSING_TURNSTILE': 'Please complete the security verification.',
    'TURNSTILE_FAILED': 'Security verification failed.',
    'TURNSTILE_API_ERROR': 'Security verification is temporarily unavailable.',
    'TURNSTILE_VERIFICATION_ERROR': 'Security verification encountered an error.',
    'DATABASE_ERROR': 'Unable to save your memo.',
    'MEMO_CREATION_ERROR': 'An error occurred while creating your memo.',
    'INVALID_MEMO_ID': 'The memo link appears to be invalid.',
    'MISSING_MEMO_ID': 'Missing memo ID. Please check the URL you received.',
    'MEMO_NOT_FOUND': 'This memo is no longer available. It may have been read, expired, or never existed.',
    'MEMO_ALREADY_READ': 'This memo is no longer available. It may have been read, expired, or never existed.',
    'MEMO_EXPIRED': 'This memo is no longer available. It may have been read, expired, or never existed.',
    'DATABASE_READ_ERROR': 'Unable to read the memo.',
    'MEMO_READ_ERROR': 'An error occurred while reading the memo.',
    'METHOD_NOT_ALLOWED': 'This endpoint does not support the requested HTTP method.'
  };
  
  return securityErrorMap[event] || 'An error occurred. Please try again.';
}

/**
 * Get a generic memo access error message to prevent enumeration attacks
 * This function returns the same message regardless of the specific failure reason
 * to avoid leaking information about memo states through error messages or timing
 * @returns {string} - Generic memo access denied message
 */
export function getMemoAccessDeniedMessage() {
  return getErrorMessage('MEMO_ACCESS_DENIED');
} 