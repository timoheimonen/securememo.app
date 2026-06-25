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

async function hashDeletionToken(token) {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
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

const t = (key) => (typeof window.t === 'function' ? window.t(key) : key);

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
    const payload = { message: message, deletionToken: deletionToken };
    const encryptedMessage = await encryptMessage(payload, password);
    const deletionTokenHash = await hashDeletionToken(deletionToken);
    return { encryptedMessage, password, deletionTokenHash };
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
      deletionTokenHash: memoCrypto.deletionTokenHash
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
      document.getElementById('memoUrl').value = memoUrl;
      document.getElementById('memoPassword').value = memoCrypto.password;
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

function showMessage(message, type) {
  const messageDiv = document.getElementById('statusMessage');
  messageDiv.className = 'message ' + type;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}
