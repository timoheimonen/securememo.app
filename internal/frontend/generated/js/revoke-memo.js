const MEMO_ID_PATTERN = /^[A-Za-z0-9_-]{40}$/;
const OWNER_DELETE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

let memoId = null;
let ownerDeleteToken = null;
let revokeLifecycleEpoch = 0;
let revokePageHidden = false;
let revokeOperationController = null;

const fallbackText = Object.freeze({
  'btn.deleteMemo': 'Delete Memo',
  'btn.deleting': 'Deleting...',
  'error.invalidRevokeLink': 'This revoke link is invalid or incomplete.',
  'error.revokeNotFound': 'Memo not found, already deleted, expired, or the revoke link is invalid.',
  'error.revokeFailed': 'Could not revoke the memo. Please check your connection and try again.',
  'msg.tooManyRequests': 'Too many requests. Please wait a moment and try again.'
});

const revokeAPIErrorTranslationKeys = Object.freeze({
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

const t = (key) => {
  if (typeof window.t === 'function') {
    const translated = window.t(key);
    if (translated && translated !== key) {
      return translated;
    }
  }
  return fallbackText[key] || key;
};

function translatedRevokeAPIError(errorCode) {
  const translationKey = typeof errorCode === 'string' && Object.prototype.hasOwnProperty.call(revokeAPIErrorTranslationKeys, errorCode)
    ? revokeAPIErrorTranslationKeys[errorCode]
    : 'error.DEFAULT_FALLBACK';
  return t(translationKey);
}

function waitForLocalization() {
  return new Promise((resolve) => {
    if (typeof window.t === 'function') {
      resolve();
      return;
    }
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (typeof window.t === 'function' || attempts >= 80) {
        clearInterval(timer);
        resolve();
      }
    }, 50);
  });
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
  const value = urlParams.get('id');
  if (!value || !MEMO_ID_PATTERN.test(value)) {
    return null;
  }
  return value;
}

function getOwnerDeleteToken() {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
  const hashParams = new URLSearchParams(hash);
  const value = hashParams.get('token');
  if (!value || !OWNER_DELETE_TOKEN_PATTERN.test(value)) {
    return null;
  }
  return value;
}

function clearURLFragment() {
  if (window.location.hash && window.history && window.history.replaceState) {
    window.history.replaceState(null, document.title, window.location.pathname + window.location.search);
  }
}

function revokeOperationIsCurrent(epoch) {
  return !revokePageHidden && epoch === revokeLifecycleEpoch;
}

function hasRequiredRevokeCapabilities() {
  return typeof globalThis.fetch === 'function' &&
    typeof globalThis.AbortController === 'function';
}

memoId = getMemoId();
ownerDeleteToken = getOwnerDeleteToken();
clearURLFragment();

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  showElement('errorContent');
  hideElement('confirmContent');
  hideElement('successContent');
}

function showMessage(message, type) {
  const messageDiv = document.getElementById('statusMessage');
  messageDiv.classList.remove('hidden');
  messageDiv.className = 'message ' + type;
  messageDiv.textContent = message;
  messageDiv.style.display = 'block';
}

function resetRevokeButton() {
  const revokeButton = document.getElementById('revokeButton');
  if (!revokeButton) {
    return;
  }
  if (!revokeButton.dataset.resetText) {
    revokeButton.dataset.resetText = revokeButton.textContent;
  }
  revokeButton.textContent = revokeButton.dataset.resetText;
  revokeButton.disabled = true;
}

function resetRevokeSensitiveState(showExpiredState) {
  memoId = null;
  ownerDeleteToken = null;
  clearURLFragment();
  resetRevokeButton();
  const statusMessage = document.getElementById('statusMessage');
  if (statusMessage) {
    statusMessage.className = 'message';
    statusMessage.textContent = '';
  }
  hideElement('confirmContent');
  hideElement('successContent');
  hideElement('errorContent');
  hideElement('statusMessage');
  hideElement('revokeLoadingIndicator');
  if (showExpiredState) {
    showError(t('error.invalidRevokeLink'));
  }
}

function deactivateRevokePage() {
  revokePageHidden = true;
  revokeLifecycleEpoch++;
  if (revokeOperationController) {
    revokeOperationController.abort();
    revokeOperationController = null;
  }
  resetRevokeSensitiveState(false);
}

function restoreRevokePage(event) {
  if (!revokePageHidden && !event.persisted) {
    return;
  }
  revokePageHidden = false;
  resetRevokeSensitiveState(true);
}

function initializePage() {
  hideElement('confirmContent');
  hideElement('successContent');
  hideElement('errorContent');
  hideElement('statusMessage');
  resetRevokeButton();

  if (!memoId || !ownerDeleteToken || !hasRequiredRevokeCapabilities()) {
    resetRevokeSensitiveState(true);
    return;
  }

  showElement('confirmContent');
  const revokeButton = document.getElementById('revokeButton');
  if (revokeButton) {
    if (!revokeButton.dataset.resetText) {
      revokeButton.dataset.resetText = revokeButton.textContent;
    }
    revokeButton.disabled = false;
  }
}

async function revokeMemo() {
  if (!memoId || !ownerDeleteToken) {
    showError(t('error.invalidRevokeLink'));
    return;
  }
  const operationEpoch = revokeLifecycleEpoch;
  const operationController = typeof AbortController === 'function' ? new AbortController() : null;
  if (revokeOperationController) {
    revokeOperationController.abort();
  }
  revokeOperationController = operationController;

  const revokeButton = document.getElementById('revokeButton');
  const revokeLoadingIndicator = document.getElementById('revokeLoadingIndicator');
  if (revokeButton) {
    revokeButton.disabled = true;
    revokeButton.textContent = t('btn.deleting');
  }
  if (revokeLoadingIndicator) {
    showElement('revokeLoadingIndicator');
  }
  hideElement('statusMessage');

  try {
    const response = await fetch('/api/revoke-memo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memoId: memoId,
        ownerDeleteToken: ownerDeleteToken
      }),
      signal: operationController ? operationController.signal : undefined
    });
    if (!revokeOperationIsCurrent(operationEpoch)) {
      return;
    }

    if (response.ok) {
      ownerDeleteToken = null;
      memoId = null;
      hideElement('confirmContent');
      showElement('successContent');
      return;
    }

    let result = {};
    try {
      result = await response.json();
    } catch (error) {
    }
    if (revokeOperationIsCurrent(operationEpoch)) {
      showMessage(translatedRevokeAPIError(result.errorCode), 'error');
    }
  } catch (error) {
    if (revokeOperationIsCurrent(operationEpoch) && error.name !== 'AbortError') {
      showMessage(t('error.revokeFailed'), 'error');
    }
  } finally {
    if (revokeOperationController === operationController) {
      revokeOperationController = null;
    }
    if (!revokeOperationIsCurrent(operationEpoch)) {
      return;
    }
    if (revokeButton) {
      revokeButton.disabled = false;
      revokeButton.textContent = t('btn.deleteMemo');
    }
    if (revokeLoadingIndicator) {
      hideElement('revokeLoadingIndicator');
    }
  }
}

async function boot() {
  const operationEpoch = revokeLifecycleEpoch;
  await waitForLocalization();
  if (revokeOperationIsCurrent(operationEpoch)) {
    initializePage();
  }
}

window.addEventListener('pagehide', deactivateRevokePage);
window.addEventListener('pageshow', restoreRevokePage);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

document.getElementById('revokeButton').addEventListener('click', revokeMemo);
