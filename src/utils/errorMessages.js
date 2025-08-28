// Centralized error message mapping for consistent UX
// SECURITY: Generic error messages prevent information leakage and enumeration attacks
// LOCALIZATION: Integrated with localization system - error messages now support multiple locales

import { t, isLocaleSupported } from '../lang/localization.js';

/**
 * Error message mapping by error code
 * @deprecated Use getErrorMessage() with locale parameter instead
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
  'MISSING_DELETION_TOKEN': 'Deletion token required.',
  'INVALID_DELETION_TOKEN_HASH': 'Invalid deletion token hash.',
  
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
  'SERVICE_UNAVAILABLE': 'Service temporarily unavailable. Please try again later.',
  'RATE_LIMITED': 'Too many requests. Please wait a moment and try again.',
  
  // Client-side validation errors
  'MISSING_MESSAGE': 'Please enter a memo',
  'MESSAGE_TOO_LONG': 'Memo is too long (max 10,000 characters)',
  'MISSING_SECURITY_CHALLENGE': 'Please complete the security challenge',
  'CREATE_MEMO_FAILED': 'Failed to create memo',
  'CREATE_MEMO_ERROR': 'An error occurred while creating the memo',
  'READ_MEMO_ERROR': 'An error occurred while reading the memo',
  'DECRYPTION_ERROR': 'Failed to decrypt message. Invalid password or corrupted data.',
  'MEMO_ID_GENERATION_MAX_RETRIES': 'Failed to generate unique memo_id after maximum retries',
  'MISSING_PASSWORD': 'Please enter the encryption password',
  'INVALID_MEMO_URL': 'Invalid memo URL',
  'MEMO_ALREADY_READ_DELETED': 'This memo has already been read and deleted, or it has expired.',
  'MEMO_EXPIRED_DELETED': 'This memo has expired and has been deleted.',
  'INVALID_PASSWORD_CHECK': 'Invalid password. Please check the password you received separately.',
  'MISSING_PASSWORD_ERROR': 'Please enter the encryption password',
  'INVALID_MEMO_URL_ERROR': 'Invalid memo URL',
  'MEMO_ALREADY_READ_DELETED_ERROR': 'This memo has already been read and deleted, or it has expired.',
  'MEMO_EXPIRED_DELETED_ERROR': 'This memo has expired and has been deleted.',
  'INVALID_PASSWORD_CHECK_ERROR': 'Invalid password. Please check the password you received separately.',
  'MISSING_SECURITY_CHALLENGE_ERROR': 'Please complete the security challenge',

  
  // HTTP status errors
  'INTERNAL_SERVER_ERROR': 'Internal Server Error',
  'NOT_FOUND': 'Not Found',
  'BAD_REQUEST': 'Bad Request',
  'CLEANUP_FAILED': 'Cleanup failed'
};

/**
 * Get user-friendly error message by error code
 * @param {string} errorCode - The error code
 * @param {string} locale - Locale code (defaults to 'en')
 * @param {string} fallback - Fallback message if code not found
 * @returns {string} - User-friendly error message
 */
export function getErrorMessage(errorCode, locale = 'en', fallback) {
  // Handle backward compatibility - if second parameter is a string but not a supported locale, treat it as fallback
  if (typeof locale === 'string' && !isLocaleSupported(locale) && !fallback) {
    fallback = locale;
    locale = 'en';
  }
  
  // Use localized fallback if no custom fallback provided
  if (!fallback) {
    fallback = t('error.DEFAULT_FALLBACK', locale);
  }
  
  // Try to get localized error message
  const translationKey = `error.${errorCode}`;
  const localizedMessage = t(translationKey, locale);
  
  // If translation exists (key doesn't equal returned value), use it
  if (localizedMessage !== translationKey) {
    return localizedMessage;
  }
  
  // Fallback to hardcoded errorMessages for backward compatibility
  return errorMessages[errorCode] || fallback;
}

/**
 * Get a generic memo access error message to prevent enumeration attacks
 * This function returns the same message regardless of the specific failure reason
 * to avoid leaking information about memo states through error messages or timing
 * @param {string} locale - Locale code (defaults to 'en')
 * @returns {string} - Generic memo access denied message
 */
export function getMemoAccessDeniedMessage(locale = 'en') {
  return getErrorMessage('MEMO_ACCESS_DENIED', locale);
} 