// Timing security utilities to prevent timing attacks
// These functions add artificial delays and provide constant-time operations

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} minMs - Minimum delay in milliseconds
 * @param {number} maxMs - Maximum delay in milliseconds
 * @returns {number} - Random delay in milliseconds
 */
function getRandomDelay(minMs = 50, maxMs = 100) {
  const array = new Uint32Array(1);
  // Use globalThis to avoid ESLint no-undef in Worker environment
  globalThis.crypto.getRandomValues(array);
  const randomValue = array[0] / (0xffffffff + 1);
  return Math.floor(randomValue * (maxMs - minMs + 1)) + minMs;
}

/**
 * Add artificial delay to normalize response times
 * @param {number} minMs - Minimum delay in milliseconds (default: 50)
 * @param {number} maxMs - Maximum delay in milliseconds (default: 100)
 * @returns {Promise<void>}
 */
export async function addArtificialDelay(minMs = 50, maxMs = 100) {
  const delay = getRandomDelay(minMs, maxMs);
  return new Promise((resolve) => globalThis.setTimeout(resolve, delay));
}

// Standardized response delay window for security-sensitive paths (enumeration resistance)
export const STANDARD_DELAY_WINDOW = { MIN: 70, MAX: 110 };

/**
 * Apply a standardized delay for all comparable success and failure response paths.
 * Keeps jitter (randomness) while ensuring comparable distributions.
 */
export async function uniformResponseDelay() {
  return addArtificialDelay(STANDARD_DELAY_WINDOW.MIN, STANDARD_DELAY_WINDOW.MAX);
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
