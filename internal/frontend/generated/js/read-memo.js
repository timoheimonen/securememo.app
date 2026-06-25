const t = (key) => (typeof window.t === 'function' ? window.t(key) : key);
const MEMO_ID_PATTERN = /^[A-Za-z0-9_-]{40}$/;

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

function getMemoId() {
  const urlParams = new URLSearchParams(window.location.search);
  const memoId = urlParams.get('id');
  if (!memoId || !MEMO_ID_PATTERN.test(memoId)) {
    return null;
  }
  return memoId;
}

async function decryptMessage(encryptedData, password) {
  try {
    const parsed = MemoCryptoConfig.parseEncryptedMessage(encryptedData);
    const encryptedBytes = Uint8Array.from(atob(parsed.ciphertext), c => c.charCodeAt(0));
    const salt = encryptedBytes.slice(0, parsed.config.saltLength);
    const iv = encryptedBytes.slice(parsed.config.saltLength, parsed.config.saltLength + parsed.config.ivLength);
    const encrypted = encryptedBytes.slice(parsed.config.saltLength + parsed.config.ivLength);
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      { name: parsed.config.kdf },
      false,
      ['deriveBits', 'deriveKey']
    );
    const key = await crypto.subtle.deriveKey(
      {
        name: parsed.config.kdf,
        salt: salt,
        iterations: parsed.config.iterations,
        hash: parsed.config.hash
      },
      keyMaterial,
      { name: parsed.config.cipher, length: parsed.config.keyLength },
      false,
      ['decrypt']
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: parsed.config.cipher, iv: iv },
      key,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    throw new Error('Failed to decrypt memo.');
  }
}

function cryptoWorkerURL() {
  const workerURL = new URL('/js/memo-crypto-worker.js', window.location.origin);
  const currentScript = document.currentScript || Array.from(document.scripts).find(script => script.src.includes('/js/read-memo.js'));
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

async function decryptMemo(encryptedMessage, password) {
  try {
    const parsed = MemoCryptoConfig.parseEncryptedMessage(encryptedMessage);
    const result = await runMemoCryptoWorker('decryptMemo', {
      ciphertext: parsed.ciphertext,
      config: parsed.config,
      password: password
    });
    return result.decryptedMessage;
  } catch (error) {
    if (error.message.includes('Failed to decrypt')) {
      throw error;
    }
    return decryptMessage(encryptedMessage, password);
  }
}

function initializePage() {
  showElement('passwordForm');
  hideElement('memoContent');
  hideElement('errorContent');
  hideElement('statusMessage');
}

window.addEventListener('load', () => {
  initializePage();
  const memoId = getMemoId();
  if (!memoId) {
    showError(t('error.missingMemoId'));
    return;
  }
  const decryptForm = document.getElementById('decryptForm');
  if (decryptForm) {
    decryptForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value.trim();
      const memoId = getMemoId();
      if (!password) {
        showError(t('error.missingPassword'));
        return;
      }
      if (!memoId) {
        showError(t('error.invalidMemoUrl'));
        return;
      }
      const decryptButton = document.getElementById('decryptButton');
      const decryptLoadingIndicator = document.getElementById('decryptLoadingIndicator');
      if (decryptButton) {
        decryptButton.disabled = true;
        decryptButton.textContent = t('btn.decrypting');
      }
      if (decryptLoadingIndicator) {
        showElement('decryptLoadingIndicator');
      }
      try {
        const requestBody = {};
        const readParams = new URLSearchParams({ id: memoId });
        const response = await fetch('/api/read-memo?' + readParams.toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });
        if (response.status === 429) {
          showError(t('msg.tooManyRequests'));
          return;
        }
        const result = await response.json();
        if (response.ok) {
          const decryptedMessage = await decryptMemo(result.encryptedMessage, password);
          let decryptedPayload;
          try {
            decryptedPayload = JSON.parse(decryptedMessage);
            if (typeof decryptedPayload.message !== 'string' || (result.requiresDeletionToken && !decryptedPayload.deletionToken)) {
              throw new Error();
            }
          } catch {
            decryptedPayload = { message: decryptedMessage };
          }
          document.getElementById('decryptedMessage').textContent = decryptedPayload.message;
          showElement('memoContent');
          hideElement('passwordForm');
          const memoStatus = document.getElementById('memoStatus');
          const deletionSpinner = document.getElementById('deletionSpinner');
          if (memoStatus) {
            memoStatus.textContent = t('msg.memoDecrypted');
          }
          if (deletionSpinner) {
            showElement('deletionSpinner');
          }
          document.getElementById('password').value = '';
          if (errorContent) hideElement('errorContent');
          if (statusMessage) hideElement('statusMessage');
          const deleteBody = {};
          if (!decryptedPayload.deletionToken) {
            throw new Error('Missing deletion token in payload');
          }
          deleteBody.deletionToken = decryptedPayload.deletionToken;
          deleteBody.memoId = memoId;
          const maxAttempts = 3;
          const delayMs = 3000;
          let deleteResponse;
          for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
              deleteResponse = await fetch('/api/confirm-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(deleteBody)
              });
              if (deleteResponse.ok || [429, 403, 404].includes(deleteResponse.status)) {
                break;
              }
            } catch (e) {
            }
            if (attempt < maxAttempts) {
              await new Promise(res => setTimeout(res, delayMs));
            }
          }
          if (deleteResponse && deleteResponse.status === 429) {
            showMessage(t('msg.tooManyRequests'), 'error');
            const deletionSpinner = document.getElementById('deletionSpinner');
            if (deletionSpinner) {
              hideElement('deletionSpinner');
            }
          } else if (deleteResponse && deleteResponse.ok) {
            const memoStatus = document.getElementById('memoStatus');
            const deletionSpinner = document.getElementById('deletionSpinner');
            if (memoStatus) {
              memoStatus.textContent = t('msg.memoDeleted');
            }
            if (deletionSpinner) {
              hideElement('deletionSpinner');
            }
          } else {
            showMessage(t('msg.deletionError'), 'warning');
            const deletionSpinner = document.getElementById('deletionSpinner');
            if (deletionSpinner) {
              hideElement('deletionSpinner');
            }
          }
        } else {
          if (response.status === 429) {
            showError(t('msg.tooManyRequests'));
          } else if (result.error === 'Memo not found') {
            showError(t('error.memoAlreadyRead'));
          } else if (result.error === 'Memo expired') {
            showError(t('error.memoExpired'));
          } else {
            showError(result.error || t('error.readMemoError'));
          }
        }
      } catch (error) {
        if (error.message.includes('Failed to decrypt')) {
          showError(t('error.invalidPassword'));
        } else {
          showError(t('error.readMemoError'));
        }
      } finally {
        const decryptButton = document.getElementById('decryptButton');
        const decryptLoadingIndicator = document.getElementById('decryptLoadingIndicator');
        if (decryptButton) {
          decryptButton.disabled = false;
          decryptButton.textContent = t('btn.decrypt');
        }
        if (decryptLoadingIndicator) {
          hideElement('decryptLoadingIndicator');
        }
      }
    });
  }
  const toggleReadPasswordBtn = document.getElementById('toggleReadPassword');
  if (toggleReadPasswordBtn) {
    toggleReadPasswordBtn.addEventListener('click', () => {
      const passwordInput = document.getElementById('password');
      const toggleBtn = document.getElementById('toggleReadPassword');
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = t('btn.hide');
      } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = t('btn.show');
      }
    });
  }
});

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  showElement('errorContent');
  hideElement('passwordForm');
}

function showMessage(message, type) {
  const messageDiv = document.getElementById('statusMessage');
  messageDiv.className = 'message ' + type;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}
