const MEMO_ID_PATTERN = /^[A-Za-z0-9_-]{40}$/;
const OWNER_DELETE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

let memoId = null;
let ownerDeleteToken = null;

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

function initializePage() {
  hideElement('confirmContent');
  hideElement('successContent');
  hideElement('errorContent');
  hideElement('statusMessage');

  memoId = getMemoId();
  ownerDeleteToken = getOwnerDeleteToken();
  clearURLFragment();

  if (!memoId || !ownerDeleteToken) {
    showError('This revoke link is invalid or incomplete.');
    return;
  }

  showElement('confirmContent');
}

async function revokeMemo() {
  if (!memoId || !ownerDeleteToken) {
    showError('This revoke link is invalid or incomplete.');
    return;
  }

  const revokeButton = document.getElementById('revokeButton');
  const revokeLoadingIndicator = document.getElementById('revokeLoadingIndicator');
  if (revokeButton) {
    revokeButton.disabled = true;
    revokeButton.textContent = 'Deleting...';
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
      })
    });

    if (response.ok) {
      ownerDeleteToken = null;
      hideElement('confirmContent');
      showElement('successContent');
      return;
    }

    if (response.status === 429) {
      showMessage('Too many attempts. Please try again later.', 'error');
      return;
    }

    showMessage('Memo not found, already deleted, expired, or the revoke link is invalid.', 'error');
  } catch (error) {
    showMessage('Could not revoke the memo. Please check your connection and try again.', 'error');
  } finally {
    if (revokeButton) {
      revokeButton.disabled = false;
      revokeButton.textContent = 'Delete Memo';
    }
    if (revokeLoadingIndicator) {
      hideElement('revokeLoadingIndicator');
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePage);
} else {
  initializePage();
}

document.getElementById('revokeButton').addEventListener('click', revokeMemo);
