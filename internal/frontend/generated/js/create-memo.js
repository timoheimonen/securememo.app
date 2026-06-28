function initializePage() {
  hideElement('result');
  showElement('memoForm');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
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

function generateOwnerDeleteToken() {
  return bytesToBase64URL(crypto.getRandomValues(new Uint8Array(32)));
}

async function hashDeletionToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64(new Uint8Array(hashBuffer));
}

async function encryptMessage(payload, password) {
  const config = MemoCryptoConfig.getCurrentVersion();
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const salt = crypto.getRandomValues(new Uint8Array(config.saltLength));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: config.kdf },
    false,
    ['deriveBits', 'deriveKey']
  );
  const key = await crypto.subtle.deriveKey(
    {
      name: config.kdf,
      salt: salt,
      iterations: config.iterations,
      hash: config.hash
    },
    keyMaterial,
    { name: config.cipher, length: config.keyLength },
    false,
    ['encrypt']
  );
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
  return config.prefix + btoa(String.fromCharCode(...result));
}

const fallbackText = Object.freeze({
  'msg.revokeLinkCopied': 'Revoke link copied to clipboard!'
});

const t = (key) => {
  if (typeof window.t === 'function') {
    const translated = window.t(key);
    if (translated && translated !== key) {
      return translated;
    }
  }
  return fallbackText[key] || key;
};

function showElement(id, display = 'block') {
  const element = document.getElementById(id);
  if (element) {
    element.classList.remove('hidden');
    element.style.display = display;
  }
}

function hideElement(id) {
  const element = document.getElementById(id);
  if (element) {
    element.classList.add('hidden');
    element.style.display = 'none';
  }
}

function cryptoWorkerURL() {
  const workerURL = new URL('/js/memo-crypto-worker.js', window.location.origin);
  const currentScript = document.currentScript || Array.from(document.scripts).find(script => script.src.includes('/js/create-memo.js'));
  if (currentScript && currentScript.src) {
    const version = new URL(currentScript.src).searchParams.get('v');
    if (version) {
      workerURL.searchParams.set('v', version);
    }
  }
  return workerURL;
}

function runMemoCryptoWorker(type, payload) {
  return new Promise((resolve, reject) => {
    if (!window.Worker) {
      reject(new Error('Crypto worker unavailable.'));
      return;
    }
    let worker;
    try {
      worker = new Worker(cryptoWorkerURL(), { name: 'memo-crypto-worker' });
    } catch (error) {
      reject(error);
      return;
    }
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random();
    const cleanup = () => {
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };
    worker.onmessage = (event) => {
      const data = event.data || {};
      if (data.id !== id) {
        return;
      }
      cleanup();
      if (data.ok) {
        resolve(data.result);
      } else {
        reject(new Error(data.error || 'Crypto worker failed.'));
      }
    };
    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || 'Crypto worker failed.'));
    };
    worker.postMessage({ id: id, type: type, payload: payload });
  });
}

async function encryptMemo(message) {
  try {
    return await runMemoCryptoWorker('encryptMemo', {
      message: message,
      config: MemoCryptoConfig.getCurrentVersion()
    });
  } catch (error) {
    const password = generatePassword();
    const deletionToken = generatePassword();
    const ownerDeleteToken = generateOwnerDeleteToken();
    const payload = { message: message, deletionToken: deletionToken };
    const encryptedMessage = await encryptMessage(payload, password);
    const deletionTokenHash = await hashDeletionToken(deletionToken);
    const ownerDeletionTokenHash = await hashDeletionToken(ownerDeleteToken);
    return { encryptedMessage, password, deletionTokenHash, ownerDeleteToken, ownerDeletionTokenHash };
  }
}

document.getElementById('memoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const resultSection = document.getElementById('result');
  if (resultSection && !resultSection.classList.contains('hidden')) {
    return;
  }
  const message = document.getElementById('message').value.trim();
  const expiryHours = parseInt(document.getElementById('expiryHours').value);
  if (!message) {
    showMessage(t('msg.emptyMemo'), 'error');
    return;
  }
  if (message.length > 10000) {
    showMessage(t('msg.memoTooLong'), 'error');
    return;
  }
  const submitButton = document.getElementById('submitButton');
  const loadingIndicator = document.getElementById('loadingIndicator');
  submitButton.disabled = true;
  submitButton.textContent = t('btn.creating');
  showElement('loadingIndicator');
  try {
    const memoCrypto = await encryptMemo(message);
    const requestBody = {
      encryptedMessage: memoCrypto.encryptedMessage,
      expiryHours,
      deletionTokenHash: memoCrypto.deletionTokenHash,
      ownerDeletionTokenHash: memoCrypto.ownerDeletionTokenHash
    };
    const response = await fetch('/api/create-memo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    if (response.status === 429) {
      showMessage(t('msg.tooManyRequests'), 'error');
      return;
    }
    const result = await response.json();
    if (response.ok) {
      const currentLocale = window.location.pathname.split('/')[1] || 'en';
      const memoUrl = window.location.origin + '/' + currentLocale + '/read-memo.html?id=' + result.memoId;
      const ownerDeleteUrl = window.location.origin + '/' + currentLocale + '/revoke-memo.html?id=' + result.memoId + '#token=' + encodeURIComponent(memoCrypto.ownerDeleteToken);
      document.getElementById('memoUrl').value = memoUrl;
      document.getElementById('memoPassword').value = memoCrypto.password;
      document.getElementById('ownerDeleteUrl').value = ownerDeleteUrl;
      showElement('result');
      hideElement('memoForm');
      document.getElementById('message').value = '';
    } else {
      if (response.status === 429) {
        showMessage(t('msg.tooManyRequests'), 'error');
      } else {
        showMessage(result.error || t('msg.createFailed'), 'error');
      }
    }
  } catch (error) {
    showMessage(t('msg.createError'), 'error');
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = t('btn.create');
    hideElement('loadingIndicator');
  }
});

document.getElementById('copyUrl').addEventListener('click', async () => {
  const urlInput = document.getElementById('memoUrl');
  const url = urlInput.value;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(url);
      showMessage(t('msg.urlCopied'), 'success');
      const copyBtn = document.getElementById('copyUrl');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = t('btn.copied');
      copyBtn.classList.add('btn-copied');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('btn-copied');
      }, 2000);
    } else {
      urlInput.select();
      urlInput.setSelectionRange(0, 99999);
      document.execCommand('copy');
      showMessage(t('msg.urlCopied'), 'success');
    }
  } catch (err) {
    urlInput.select();
    urlInput.setSelectionRange(0, 99999);
    showMessage(t('msg.copyManual'), 'warning');
  }
});

document.getElementById('togglePassword').addEventListener('click', () => {
  const passwordInput = document.getElementById('memoPassword');
  const toggleBtn = document.getElementById('togglePassword');
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleBtn.textContent = t('btn.hide');
  } else {
    passwordInput.type = 'password';
    toggleBtn.textContent = t('btn.show');
  }
});

document.getElementById('copyPassword').addEventListener('click', async () => {
  const passwordInput = document.getElementById('memoPassword');
  const password = passwordInput.value;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(password);
      showMessage(t('msg.passwordCopied'), 'success');
      const copyBtn = document.getElementById('copyPassword');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = t('btn.copied');
      copyBtn.classList.add('btn-copied');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('btn-copied');
      }, 2000);
    } else {
      passwordInput.select();
      passwordInput.setSelectionRange(0, 99999);
      document.execCommand('copy');
      showMessage(t('msg.passwordCopied'), 'success');
    }
  } catch (err) {
    passwordInput.select();
    passwordInput.setSelectionRange(0, 99999);
    showMessage(t('msg.copyManual'), 'warning');
  }
});

document.getElementById('copyOwnerDeleteUrl').addEventListener('click', async () => {
  const ownerDeleteUrlInput = document.getElementById('ownerDeleteUrl');
  const ownerDeleteUrl = ownerDeleteUrlInput.value;
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(ownerDeleteUrl);
      showMessage(t('msg.revokeLinkCopied'), 'success');
      const copyBtn = document.getElementById('copyOwnerDeleteUrl');
      const originalText = copyBtn.textContent;
      copyBtn.textContent = t('btn.copied');
      copyBtn.classList.add('btn-copied');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('btn-copied');
      }, 2000);
    } else {
      ownerDeleteUrlInput.select();
      ownerDeleteUrlInput.setSelectionRange(0, 99999);
      document.execCommand('copy');
      showMessage(t('msg.revokeLinkCopied'), 'success');
    }
  } catch (err) {
    ownerDeleteUrlInput.select();
    ownerDeleteUrlInput.setSelectionRange(0, 99999);
    showMessage(t('msg.copyManual'), 'warning');
  }
});

function showMessage(message, type) {
  const messageDiv = document.getElementById('statusMessage');
  messageDiv.className = 'message ' + type;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}

function showTranslatedMessage(key, type) {
  showMessage(t(key), type);
}
