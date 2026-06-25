const SECURITY_CONFIG = {
  ENCRYPTION_VERSION: 1,
  PBKDF2_ITERATIONS: 3500000,
  SALT_LENGTH: 16,
  IV_LENGTH: 12,
  KEY_LENGTH: 256
};

const ENCRYPTED_MESSAGE_PREFIX = 'v' + SECURITY_CONFIG.ENCRYPTION_VERSION + ':';

function bytesToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(input) {
  return Uint8Array.from(atob(input), c => c.charCodeAt(0));
}

function extractVersionedCiphertext(encryptedData) {
  if (typeof encryptedData !== 'string' || !encryptedData) {
    throw new Error('Failed to decrypt memo.');
  }
  if (!encryptedData.startsWith(ENCRYPTED_MESSAGE_PREFIX)) {
    if (encryptedData.includes(':')) {
      throw new Error('Failed to decrypt memo.');
    }
    return encryptedData;
  }
  const ciphertext = encryptedData.slice(ENCRYPTED_MESSAGE_PREFIX.length);
  if (!ciphertext) {
    throw new Error('Failed to decrypt memo.');
  }
  return ciphertext;
}

function generatePassword() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const passwordLength = 32;
  const array = new Uint8Array(passwordLength);
  crypto.getRandomValues(array);
  let password = '';
  const biasThreshold = 256 - (256 % chars.length);
  for (let i = 0; i < passwordLength; i++) {
    let value = array[i];
    while (value >= biasThreshold) {
      const refill = new Uint8Array(1);
      crypto.getRandomValues(refill);
      value = refill[0];
    }
    password += chars[value % chars.length];
  }
  return password;
}

async function hashDeletionToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64(new Uint8Array(hashBuffer));
}

async function deriveKey(password, salt, iterations, usages) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: SECURITY_CONFIG.KEY_LENGTH },
    false,
    usages
  );
}

async function encryptMessage(payload, password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const salt = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.SALT_LENGTH));
  const key = await deriveKey(password, salt, SECURITY_CONFIG.PBKDF2_ITERATIONS, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.IV_LENGTH));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    data
  );
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  return ENCRYPTED_MESSAGE_PREFIX + bytesToBase64(result);
}

async function decryptMessage(encryptedData, password) {
  try {
    const encryptedBytes = base64ToBytes(extractVersionedCiphertext(encryptedData));
    const salt = encryptedBytes.slice(0, SECURITY_CONFIG.SALT_LENGTH);
    const iv = encryptedBytes.slice(SECURITY_CONFIG.SALT_LENGTH, SECURITY_CONFIG.SALT_LENGTH + SECURITY_CONFIG.IV_LENGTH);
    const encrypted = encryptedBytes.slice(SECURITY_CONFIG.SALT_LENGTH + SECURITY_CONFIG.IV_LENGTH);
    const key = await deriveKey(password, salt, SECURITY_CONFIG.PBKDF2_ITERATIONS, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt memo.');
  }
}

async function encryptMemo(message) {
  const password = generatePassword();
  const deletionToken = generatePassword();
  const encryptedMessage = await encryptMessage({ message: message, deletionToken: deletionToken }, password);
  const deletionTokenHash = await hashDeletionToken(deletionToken);
  return { encryptedMessage, password, deletionTokenHash };
}

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  try {
    let result;
    if (data.type === 'encryptMemo') {
      result = await encryptMemo(data.payload.message);
    } else if (data.type === 'decryptMemo') {
      result = {
        decryptedMessage: await decryptMessage(data.payload.encryptedMessage, data.payload.password)
      };
    } else {
      throw new Error('Unknown crypto worker task.');
    }
    self.postMessage({ id: data.id, ok: true, result: result });
  } catch (error) {
    self.postMessage({
      id: data.id,
      ok: false,
      error: error && error.message ? error.message : 'Crypto worker failed.'
    });
  }
});
