function bytesToBase64(bytes) {
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function bytesToBase64URL(bytes) {
  return bytesToBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64ToBytes(input) {
  return Uint8Array.from(atob(input), c => c.charCodeAt(0));
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

function generateOwnerDeleteToken() {
  return bytesToBase64URL(crypto.getRandomValues(new Uint8Array(32)));
}

async function hashDeletionToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64(new Uint8Array(hashBuffer));
}

async function deriveKey(password, salt, config, usages) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: config.kdf },
    false,
    ['deriveBits', 'deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: config.kdf,
      salt: salt,
      iterations: config.iterations,
      hash: config.hash
    },
    keyMaterial,
    { name: config.cipher, length: config.keyLength },
    false,
    usages
  );
}

async function encryptMessage(payload, password, config) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const salt = crypto.getRandomValues(new Uint8Array(config.saltLength));
  const key = await deriveKey(password, salt, config, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(config.ivLength));
  const encrypted = await crypto.subtle.encrypt(
    { name: config.cipher, iv: iv },
    key,
    data
  );
  const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(encrypted), salt.length + iv.length);
  return config.prefix + bytesToBase64(result);
}

async function decryptMessage(ciphertext, password, config) {
  try {
    const encryptedBytes = base64ToBytes(ciphertext);
    const salt = encryptedBytes.slice(0, config.saltLength);
    const iv = encryptedBytes.slice(config.saltLength, config.saltLength + config.ivLength);
    const encrypted = encryptedBytes.slice(config.saltLength + config.ivLength);
    const key = await deriveKey(password, salt, config, ['decrypt']);
    const decrypted = await crypto.subtle.decrypt(
      { name: config.cipher, iv: iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt memo.');
  }
}

async function encryptMemo(message, config) {
  const password = generatePassword();
  const deletionToken = generatePassword();
  const ownerDeleteToken = generateOwnerDeleteToken();
  const encryptedMessage = await encryptMessage({ message: message, deletionToken: deletionToken }, password, config);
  const deletionTokenHash = await hashDeletionToken(deletionToken);
  const ownerDeletionTokenHash = await hashDeletionToken(ownerDeleteToken);
  return { encryptedMessage, password, deletionTokenHash, ownerDeleteToken, ownerDeletionTokenHash };
}

self.addEventListener('message', async (event) => {
  const data = event.data || {};
  try {
    let result;
    if (data.type === 'encryptMemo') {
      result = await encryptMemo(data.payload.message, data.payload.config);
    } else if (data.type === 'decryptMemo') {
      result = {
        decryptedMessage: await decryptMessage(data.payload.ciphertext, data.payload.password, data.payload.config)
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
