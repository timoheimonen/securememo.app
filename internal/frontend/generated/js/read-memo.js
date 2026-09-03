const t = (key) => (typeof window.t === 'function' ? window.t(key) : key);
const MEMO_ID_PATTERN = /^[A-Za-z0-9_-]{40}$/;

let readLifecycleEpoch = 0;
let readPageHidden = false;
let readOperationController = null;
let readDeletionController = null;

function readAbortError() {
  const error = new Error('Read operation cancelled.');
  error.name = 'AbortError';
  return error;
}

function readOperationIsCurrent(epoch) {
  return !readPageHidden && epoch === readLifecycleEpoch;
}

const readAPIErrorTranslationKeys = Object.freeze({
  MEMO_ACCESS_DENIED: 'error.MEMO_ACCESS_DENIED',
  DATABASE_READ_ERROR: 'error.DATABASE_READ_ERROR',
  MEMO_DELETION_ERROR: 'error.MEMO_DELETION_ERROR',
  CONTENT_TYPE_ERROR: 'error.CONTENT_TYPE_ERROR',
  INVALID_JSON: 'error.INVALID_JSON',
  REQUEST_TOO_LARGE: 'error.REQUEST_TOO_LARGE',
  METHOD_NOT_ALLOWED: 'error.METHOD_NOT_ALLOWED',
  FORBIDDEN: 'error.FORBIDDEN',
  RATE_LIMITED: 'error.RATE_LIMITED',
  GENERAL_ERROR: 'error.GENERAL_ERROR'
});

function translatedReadAPIError(errorCode, fallbackKey = 'error.READ_MEMO_ERROR') {
  const translationKey = typeof errorCode === 'string' && Object.prototype.hasOwnProperty.call(readAPIErrorTranslationKeys, errorCode)
    ? readAPIErrorTranslationKeys[errorCode]
    : fallbackKey;
  return t(translationKey);
}

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

function cryptoWorkerURL() {
  const workerURL = new URL('/js/memo-crypto-worker.js', window.location.origin);
  const currentScript = document.currentScript || Array.from(document.scripts).find(script => script.src.includes('/js/read-memo.js'));
  if (currentScript && currentScript.src) {
    const version = new URL(currentScript.src).searchParams.get('v');
    if (version) {
      workerURL.searchParams.set('v', version);
    }
  }
  return MemoCryptoConfig.createWorkerScriptURL(workerURL.href);
}

function runMemoCryptoWorker(type, payload, signal) {
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
    let settled = false;
    const abortWorker = () => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(readAbortError());
    };
    const cleanup = () => {
      if (signal) {
        signal.removeEventListener('abort', abortWorker);
      }
      worker.onmessage = null;
      worker.onerror = null;
      worker.terminate();
    };
    if (signal) {
      if (signal.aborted) {
        abortWorker();
        return;
      }
      signal.addEventListener('abort', abortWorker, { once: true });
    }
    worker.onmessage = (event) => {
      const data = event.data || {};
      if (data.id !== id) {
        return;
      }
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (data.ok) {
        resolve(data.result);
      } else {
        reject(new Error(data.error || 'Crypto worker failed.'));
      }
    };
    worker.onerror = (event) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(new Error(event.message || 'Crypto worker failed.'));
    };
    try {
      worker.postMessage({ id: id, type: type, payload: payload });
    } catch (error) {
      if (!settled) {
        settled = true;
        cleanup();
      }
      reject(error);
    }
  });
}

async function decryptMemo(encryptedMessage, password, signal) {
  const parsed = MemoCryptoConfig.parseEncryptedMessage(encryptedMessage);
  const result = await runMemoCryptoWorker('decryptMemo', {
    ciphertext: parsed.ciphertext,
    config: parsed.config,
    password: password
  }, signal);
  return result.decryptedMessage;
}

function waitForReadRetry(delayMs, signal) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const finish = (completed) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer !== null) {
        clearTimeout(timer);
      }
      if (signal) {
        signal.removeEventListener('abort', handleAbort);
      }
      resolve(completed);
    };
    const handleAbort = () => finish(false);
    if (signal && signal.aborted) {
      finish(false);
      return;
    }
    if (signal) {
      signal.addEventListener('abort', handleAbort, { once: true });
    }
    timer = setTimeout(() => finish(true), delayMs);
  });
}

async function confirmMemoDeletion(memoId, deletionToken, operationEpoch, signal) {
  const deleteBody = {
    deletionToken: deletionToken,
    memoId: memoId
  };
  const maxAttempts = 3;
  const delayMs = 3000;
  let deleteResponse;
  try {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (signal && signal.aborted) {
        return;
      }
      try {
        deleteResponse = await fetch('/api/confirm-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deleteBody),
          signal: signal || undefined
        });
        if (deleteResponse.ok || [429, 403, 404].includes(deleteResponse.status)) {
          break;
        }
      } catch (error) {
        if ((signal && signal.aborted) || error.name === 'AbortError') {
          return;
        }
      }
      if (attempt < maxAttempts && !await waitForReadRetry(delayMs, signal)) {
        return;
      }
    }

    if (!readOperationIsCurrent(operationEpoch)) {
      return;
    }
    if (deleteResponse && deleteResponse.ok) {
      const memoStatus = document.getElementById('memoStatus');
      const deletionSpinner = document.getElementById('deletionSpinner');
      if (memoStatus) {
        memoStatus.textContent = t('msg.memoDeleted');
      }
      if (deletionSpinner) {
        hideElement('deletionSpinner');
      }
      return;
    }

    let deleteErrorCode = '';
    if (deleteResponse) {
      try {
        const deleteResult = await deleteResponse.json();
        deleteErrorCode = deleteResult.errorCode;
      } catch (error) {
      }
    }
    if (!readOperationIsCurrent(operationEpoch)) {
      return;
    }
    showMessage(translatedReadAPIError(deleteErrorCode, 'error.MEMO_DELETION_ERROR'), 'warning');
    const deletionSpinner = document.getElementById('deletionSpinner');
    if (deletionSpinner) {
      hideElement('deletionSpinner');
    }
  } finally {
    deleteBody.deletionToken = '';
    deleteBody.memoId = '';
    deletionToken = '';
    memoId = '';
  }
}

async function handleDecryptSubmit(e) {
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
  const operationEpoch = readLifecycleEpoch;
  const operationController = typeof AbortController === 'function' ? new AbortController() : null;
  if (readOperationController) {
    readOperationController.abort();
  }
  readOperationController = operationController;
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
      body: JSON.stringify(requestBody),
      signal: operationController ? operationController.signal : undefined
    });
    if (!readOperationIsCurrent(operationEpoch)) {
      return;
    }
    const result = await response.json();
    if (!readOperationIsCurrent(operationEpoch)) {
      return;
    }
    if (response.ok) {
      const decryptedMessage = await decryptMemo(result.encryptedMessage, password, operationController ? operationController.signal : null);
      if (!readOperationIsCurrent(operationEpoch)) {
        return;
      }
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
      const errorContent = document.getElementById('errorContent');
      const statusMessage = document.getElementById('statusMessage');
      if (errorContent) hideElement('errorContent');
      if (statusMessage) hideElement('statusMessage');
      if (!decryptedPayload.deletionToken) {
        throw new Error('Missing deletion token in payload');
      }
      let deletionToken = decryptedPayload.deletionToken;
      decryptedPayload.deletionToken = '';
      const deletionController = new AbortController();
      if (readDeletionController) {
        readDeletionController.abort();
      }
      readDeletionController = deletionController;
      readOperationController = null;
      void confirmMemoDeletion(memoId, deletionToken, operationEpoch, deletionController.signal).finally(() => {
        if (readDeletionController === deletionController) {
          readDeletionController = null;
        }
      });
      deletionToken = '';
    } else {
      showError(translatedReadAPIError(result.errorCode));
    }
  } catch (error) {
    if (readOperationIsCurrent(operationEpoch) && error.name !== 'AbortError') {
      if (error.message.includes('Failed to decrypt')) {
        showError(t('error.invalidPassword'));
      } else {
        showError(t('error.readMemoError'));
      }
    }
  } finally {
    if (readOperationController === operationController) {
      readOperationController = null;
    }
    if (!readOperationIsCurrent(operationEpoch)) {
      return;
    }
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
}

function handleToggleReadPassword() {
  const toggleReadPasswordBtn = document.getElementById('toggleReadPassword');
  const passwordInput = document.getElementById('password');
  if (!toggleReadPasswordBtn || !passwordInput) {
    return;
  }
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    toggleReadPasswordBtn.textContent = t('btn.hide');
  } else {
    passwordInput.type = 'password';
    toggleReadPasswordBtn.textContent = t('btn.show');
  }
}

function hasRequiredReadCapabilities() {
  return typeof globalThis.fetch === 'function' &&
    typeof globalThis.Worker === 'function' &&
    typeof globalThis.AbortController === 'function' &&
    globalThis.crypto &&
    globalThis.MemoCryptoConfig &&
    typeof globalThis.MemoCryptoConfig.parseEncryptedMessage === 'function' &&
    typeof globalThis.MemoCryptoConfig.createWorkerScriptURL === 'function';
}

function resetReadButton(id) {
  const button = document.getElementById(id);
  if (!button) {
    return;
  }
  if (!button.dataset.resetText) {
    button.dataset.resetText = button.textContent;
  }
  button.textContent = button.dataset.resetText;
}

function resetReadSensitiveState() {
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.value = '';
    passwordInput.type = 'password';
  }
  const decryptedMessage = document.getElementById('decryptedMessage');
  if (decryptedMessage) {
    decryptedMessage.textContent = '';
  }
  resetReadButton('decryptButton');
  resetReadButton('toggleReadPassword');
  const decryptButton = document.getElementById('decryptButton');
  if (decryptButton) {
    decryptButton.disabled = false;
  }
  const memoStatus = document.getElementById('memoStatus');
  if (memoStatus) {
    if (!memoStatus.dataset.resetText) {
      memoStatus.dataset.resetText = memoStatus.textContent;
    }
    memoStatus.textContent = memoStatus.dataset.resetText;
  }
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.className = 'message';
    statusMessage.textContent = '';
  }
  const decryptForm = document.getElementById('decryptForm');
  const decryptFormControls = document.getElementById('decryptFormControls');
  if (decryptFormControls) {
    decryptFormControls.disabled = true;
  }
  if (decryptForm) {
    decryptForm.setAttribute('aria-busy', 'true');
  }
  showElement('passwordForm');
  showElement('decryptFormStatus');
  hideElement('memoContent');
  hideElement('errorContent');
  hideElement('statusMessage');
  hideElement('decryptLoadingIndicator');
  hideElement('deletionSpinner');
}

function deactivateReadPage() {
  readPageHidden = true;
  readLifecycleEpoch++;
  if (readOperationController) {
    readOperationController.abort();
    readOperationController = null;
  }
  if (readDeletionController) {
    readDeletionController.abort();
    readDeletionController = null;
  }
  resetReadSensitiveState();
}

function initializeReadPage() {
  readPageHidden = false;
  resetReadSensitiveState();

  const memoId = getMemoId();
  if (!memoId) {
    const errorMessage = document.getElementById('errorMessage');
    showError(errorMessage && errorMessage.textContent ? errorMessage.textContent : t('error.missingMemoId'));
    return;
  }

  const decryptForm = document.getElementById('decryptForm');
  const decryptFormControls = document.getElementById('decryptFormControls');
  const toggleReadPasswordBtn = document.getElementById('toggleReadPassword');
  if (!decryptForm || !decryptFormControls || !toggleReadPasswordBtn || !hasRequiredReadCapabilities()) {
    return;
  }

  decryptForm.addEventListener('submit', handleDecryptSubmit);
  toggleReadPasswordBtn.addEventListener('click', handleToggleReadPassword);
  decryptFormControls.disabled = false;
  decryptForm.setAttribute('aria-busy', 'false');
  hideElement('decryptFormStatus');
}

window.addEventListener('pagehide', deactivateReadPage);
window.addEventListener('pageshow', initializeReadPage);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeReadPage, { once: true });
} else {
  initializeReadPage();
}

function showError(message) {
  const passwordInput = document.getElementById('password');
  if (passwordInput) {
    passwordInput.value = '';
    passwordInput.type = 'password';
  }
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
