let createLifecycleEpoch = 0;
let createPageHidden = false;
let createOperationController = null;

function createAbortError() {
  const error = new Error('Create operation cancelled.');
  error.name = 'AbortError';
  return error;
}

function createOperationIsCurrent(epoch) {
  return !createPageHidden && epoch === createLifecycleEpoch;
}

const fallbackText = Object.freeze({
  'msg.revokeLinkCopied': 'Revoke link copied to clipboard!'
});

const createAPIErrorTranslationKeys = Object.freeze({
  INVALID_MESSAGE_FORMAT: 'error.INVALID_MESSAGE_FORMAT',
  INVALID_EXPIRY_TIME: 'error.INVALID_EXPIRY_TIME',
  INVALID_DELETION_TOKEN_HASH: 'error.INVALID_DELETION_TOKEN_HASH',
  MEMO_ID_GENERATION_ERROR: 'error.MEMO_ID_GENERATION_ERROR',
  DATABASE_ERROR: 'error.DATABASE_ERROR',
  CONTENT_TYPE_ERROR: 'error.CONTENT_TYPE_ERROR',
  INVALID_JSON: 'error.INVALID_JSON',
  REQUEST_TOO_LARGE: 'error.REQUEST_TOO_LARGE',
  METHOD_NOT_ALLOWED: 'error.METHOD_NOT_ALLOWED',
  FORBIDDEN: 'error.FORBIDDEN',
  RATE_LIMITED: 'error.RATE_LIMITED',
  STORAGE_LIMIT_REACHED: 'error.STORAGE_LIMIT_REACHED',
  GENERAL_ERROR: 'error.GENERAL_ERROR'
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

function translatedCreateAPIError(errorCode) {
  const translationKey = typeof errorCode === 'string' && Object.prototype.hasOwnProperty.call(createAPIErrorTranslationKeys, errorCode)
    ? createAPIErrorTranslationKeys[errorCode]
    : 'error.CREATE_MEMO_ERROR';
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

function cryptoWorkerURL() {
  const workerURL = new URL('/js/memo-crypto-worker.js', window.location.origin);
  const currentScript = document.currentScript || Array.from(document.scripts).find(script => script.src.includes('/js/create-memo.js'));
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
      reject(createAbortError());
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

async function encryptMemo(message, signal) {
  return runMemoCryptoWorker('encryptMemo', {
    message: message,
    config: MemoCryptoConfig.getCurrentVersion()
  }, signal);
}

async function handleCreateSubmit(e) {
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
  if (message.length > 5000) {
    showMessage(t('msg.memoTooLong'), 'error');
    return;
  }
  const operationEpoch = createLifecycleEpoch;
  const operationController = typeof AbortController === 'function' ? new AbortController() : null;
  if (createOperationController) {
    createOperationController.abort();
  }
  createOperationController = operationController;
  const submitButton = document.getElementById('submitButton');
  const loadingIndicator = document.getElementById('loadingIndicator');
  submitButton.disabled = true;
  submitButton.textContent = t('btn.creating');
  showElement('loadingIndicator');
  try {
    const memoCrypto = await encryptMemo(message, operationController ? operationController.signal : null);
    if (!createOperationIsCurrent(operationEpoch)) {
      return;
    }
    const requestBody = {
      encryptedMessage: memoCrypto.encryptedMessage,
      expiryHours,
      deletionTokenHash: memoCrypto.deletionTokenHash,
      ownerDeletionTokenHash: memoCrypto.ownerDeletionTokenHash
    };
    const response = await fetch('/api/create-memo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: operationController ? operationController.signal : undefined
    });
    if (!createOperationIsCurrent(operationEpoch)) {
      return;
    }
    const result = await response.json();
    if (!createOperationIsCurrent(operationEpoch)) {
      return;
    }
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
      showMessage(translatedCreateAPIError(result.errorCode), 'error');
    }
  } catch (error) {
    if (createOperationIsCurrent(operationEpoch) && error.name !== 'AbortError') {
      showMessage(t('msg.createError'), 'error');
    }
  } finally {
    if (createOperationController === operationController) {
      createOperationController = null;
    }
    if (createOperationIsCurrent(operationEpoch)) {
      submitButton.disabled = false;
      submitButton.textContent = t('btn.create');
      hideElement('loadingIndicator');
    }
  }
}

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

function hasRequiredCreateCapabilities() {
  return typeof globalThis.fetch === 'function' &&
    typeof globalThis.Worker === 'function' &&
    typeof globalThis.AbortController === 'function' &&
    globalThis.crypto &&
    globalThis.MemoCryptoConfig &&
    typeof globalThis.MemoCryptoConfig.getCurrentVersion === 'function' &&
    typeof globalThis.MemoCryptoConfig.createWorkerScriptURL === 'function';
}

function resetCreateButton(id) {
  const button = document.getElementById(id);
  if (!button) {
    return;
  }
  if (!button.dataset.resetText) {
    button.dataset.resetText = button.textContent;
  }
  button.textContent = button.dataset.resetText;
  button.classList.remove('btn-copied');
}

function resetCreateSensitiveState() {
  for (const id of ['message', 'memoUrl', 'memoPassword', 'ownerDeleteUrl']) {
    const input = document.getElementById(id);
    if (input) {
      input.value = '';
    }
  }
  const passwordInput = document.getElementById('memoPassword');
  if (passwordInput) {
    passwordInput.type = 'password';
  }
  for (const id of ['submitButton', 'togglePassword', 'copyUrl', 'copyPassword', 'copyOwnerDeleteUrl']) {
    resetCreateButton(id);
  }
  const submitButton = document.getElementById('submitButton');
  if (submitButton) {
    submitButton.disabled = false;
  }
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.className = 'message';
    statusMessage.textContent = '';
  }
  const memoForm = document.getElementById('memoForm');
  const memoFormControls = document.getElementById('memoFormControls');
  if (memoFormControls) {
    memoFormControls.disabled = true;
  }
  if (memoForm) {
    memoForm.setAttribute('aria-busy', 'true');
  }
  hideElement('result');
  hideElement('loadingIndicator');
  hideElement('statusMessage');
  showElement('memoForm');
  showElement('memoFormStatus');
}

function deactivateCreatePage() {
  createPageHidden = true;
  createLifecycleEpoch++;
  if (createOperationController) {
    createOperationController.abort();
    createOperationController = null;
  }
  resetCreateSensitiveState();
}

function initializeCreatePage() {
  createPageHidden = false;
  resetCreateSensitiveState();

  const memoForm = document.getElementById('memoForm');
  const memoFormControls = document.getElementById('memoFormControls');
  if (!memoForm || !memoFormControls || !hasRequiredCreateCapabilities()) {
    return;
  }

  memoForm.addEventListener('submit', handleCreateSubmit);
  memoFormControls.disabled = false;
  memoForm.setAttribute('aria-busy', 'false');
  hideElement('memoFormStatus');
}

window.addEventListener('pagehide', deactivateCreatePage);
window.addEventListener('pageshow', initializeCreatePage);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCreatePage, { once: true });
} else {
  initializeCreatePage();
}
