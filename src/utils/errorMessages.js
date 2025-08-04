// Centralized error message mapping for consistent UX
// SECURITY: Generic error messages prevent information leakage and enumeration attacks

/**
 * Error message mapping by error code
 */
export const errorMessages = {
  // Memo creation errors
  'INVALID_MESSAGE_FORMAT': 'Invalid request. Please check your input and try again.',
  'INVALID_EXPIRY_TIME': 'Invalid request. Please check your input and try again.',
  'MISSING_TURNSTILE': 'Security verification required. Please try again.',
  'TURNSTILE_FAILED': 'Security verification failed. Please try again.',
  'TURNSTILE_API_ERROR': 'Service temporarily unavailable. Please try again later.',
  'TURNSTILE_VERIFICATION_ERROR': 'Security verification failed. Please try again.',
  'DATABASE_ERROR': 'Service temporarily unavailable. Please try again.',
  'MEMO_ID_GENERATION_ERROR': 'Service temporarily unavailable. Please try again.',
  'MEMO_ID_COLLISION_ERROR': 'Service temporarily unavailable. Please try again.',
  'MEMO_CREATION_ERROR': 'Unable to process your request. Please try again.',
  
  // Memo reading errors - SECURITY: Use generic messages to prevent enumeration attacks
  'INVALID_MEMO_ID': 'Invalid request. Please check your input and try again.',
  'MISSING_MEMO_ID': 'Invalid request. Please check your input and try again.',
  'MEMO_ACCESS_DENIED': 'This memo is no longer available.',
  'MEMO_NOT_FOUND': 'This memo is no longer available.',
  'MEMO_ALREADY_READ': 'This memo is no longer available.',
  'MEMO_EXPIRED': 'This memo is no longer available.',
  'DATABASE_READ_ERROR': 'Service temporarily unavailable. Please try again.',
  'MEMO_READ_ERROR': 'Unable to process your request. Please try again.',
  'MEMO_DELETION_ERROR': 'Service temporarily unavailable. Please try again.',
  
  // General errors
  'INVALID_JSON': 'Invalid request. Please check your input and try again.',
  'REQUEST_TOO_LARGE': 'Request too large. Please try again.',
  'CONTENT_TYPE_ERROR': 'Invalid request. Please check your input and try again.',
  'METHOD_NOT_ALLOWED': 'Invalid request method.',
  'FORBIDDEN': 'Access denied.',
  'GENERAL_ERROR': 'Service temporarily unavailable. Please try again.',
  
  // Decryption errors
  'DECRYPTION_FAILED': 'Invalid request. Please check your input and try again.',
  'INVALID_PASSWORD': 'Invalid request. Please check your input and try again.',
  
  // Network errors
  'NETWORK_ERROR': 'Service temporarily unavailable. Please try again.',
  'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again later.'
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
    'INVALID_MESSAGE_FORMAT': 'Invalid request.',
    'INVALID_EXPIRY_TIME': 'Invalid request.',
    'MISSING_TURNSTILE': 'Security verification required.',
    'TURNSTILE_FAILED': 'Security verification failed.',
    'TURNSTILE_API_ERROR': 'Service temporarily unavailable.',
    'TURNSTILE_VERIFICATION_ERROR': 'Security verification failed.',
    'DATABASE_ERROR': 'Service temporarily unavailable.',
    'MEMO_ID_GENERATION_ERROR': 'Service temporarily unavailable.',
    'MEMO_ID_COLLISION_ERROR': 'Service temporarily unavailable.',
    'MEMO_CREATION_ERROR': 'Unable to process your request.',
    'INVALID_MEMO_ID': 'Invalid request.',
    'MISSING_MEMO_ID': 'Invalid request.',
    'MEMO_NOT_FOUND': 'This memo is no longer available.',
    'MEMO_ALREADY_READ': 'This memo is no longer available.',
    'MEMO_EXPIRED': 'This memo is no longer available.',
    'DATABASE_READ_ERROR': 'Service temporarily unavailable.',
    'MEMO_READ_ERROR': 'Unable to process your request.',
    'METHOD_NOT_ALLOWED': 'Invalid request method.',
    'FORBIDDEN': 'Access denied.'
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