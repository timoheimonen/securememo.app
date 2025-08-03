// Timing security utilities to prevent timing attacks
// These functions add artificial delays and provide constant-time operations

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} minMs - Minimum delay in milliseconds
 * @param {number} maxMs - Maximum delay in milliseconds
 * @returns {number} - Random delay in milliseconds
 */
function getRandomDelay(minMs = 50, maxMs = 100) {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

/**
 * Add artificial delay to normalize response times
 * @param {number} minMs - Minimum delay in milliseconds (default: 50)
 * @param {number} maxMs - Maximum delay in milliseconds (default: 100)
 * @returns {Promise<void>}
 */
export async function addArtificialDelay(minMs = 50, maxMs = 100) {
  const delay = getRandomDelay(minMs, maxMs);
  return new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Constant-time string comparison to prevent timing attacks
 * @param {string} a - First string to compare
 * @param {string} b - Second string to compare
 * @returns {boolean} - True if strings are equal, false otherwise
 */
export function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }
  
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

/**
 * Constant-time array comparison to prevent timing attacks
 * @param {Uint8Array|Array} a - First array to compare
 * @param {Uint8Array|Array} b - Second array to compare
 * @returns {boolean} - True if arrays are equal, false otherwise
 */
export function constantTimeArrayCompare(a, b) {
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  
  return result === 0;
}

/**
 * Secure memo ID comparison with artificial delay
 * @param {string} memoId1 - First memo ID to compare
 * @param {string} memoId2 - Second memo ID to compare
 * @returns {Promise<boolean>} - True if memo IDs are equal, false otherwise
 */
export async function secureMemoIdCompare(memoId1, memoId2) {
  const result = constantTimeCompare(memoId1, memoId2);
  
  // Add artificial delay regardless of comparison result
  await addArtificialDelay();
  
  return result;
}

/**
 * Secure password comparison with artificial delay
 * @param {string} password1 - First password to compare
 * @param {string} password2 - Second password to compare
 * @returns {Promise<boolean>} - True if passwords are equal, false otherwise
 */
export async function securePasswordCompare(password1, password2) {
  const result = constantTimeCompare(password1, password2);
  
  // Add artificial delay regardless of comparison result
  await addArtificialDelay();
  
  return result;
}

/**
 * Secure validation with artificial delay for error paths
 * @param {Function} validationFn - The validation function to call
 * @param {...any} args - Arguments to pass to the validation function
 * @returns {Promise<boolean>} - Result of validation with artificial delay on failure
 */
export async function secureValidation(validationFn, ...args) {
  const result = validationFn(...args);
  
  // Add artificial delay if validation fails
  if (!result) {
    await addArtificialDelay();
  }
  
  return result;
}

/**
 * Secure memo access check with artificial delay
 * @param {Function} accessCheckFn - The access check function to call
 * @param {...any} args - Arguments to pass to the access check function
 * @returns {Promise<boolean>} - Result of access check with artificial delay on failure
 */
export async function secureMemoAccessCheck(accessCheckFn, ...args) {
  const result = accessCheckFn(...args);
  
  // Add artificial delay if access is denied
  if (!result) {
    await addArtificialDelay();
  }
  
  return result;
} 