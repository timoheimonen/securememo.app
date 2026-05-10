const NEW_PBKDF2_ITERATIONS = 3500000;
const OLD_PBKDF2_ITERATIONS = 2200000;
const SECURITY_CONFIG = {
  PBKDF2_ITERATIONS: NEW_PBKDF2_ITERATIONS,
  SALT_LENGTH: 16,
  IV_LENGTH: 12,
  KEY_LENGTH: 256
};

const t = (key) => (typeof window.t === 'function' ? window.t(key) : key);

function getMemoId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

async function decryptMessage(encryptedData, password) {
  try {
    const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const salt = encryptedBytes.slice(0, SECURITY_CONFIG.SALT_LENGTH);
    const iv = encryptedBytes.slice(SECURITY_CONFIG.SALT_LENGTH, SECURITY_CONFIG.SALT_LENGTH + SECURITY_CONFIG.IV_LENGTH);
    const encrypted = encryptedBytes.slice(SECURITY_CONFIG.SALT_LENGTH + SECURITY_CONFIG.IV_LENGTH);
    const attempts = [
      { iterations: NEW_PBKDF2_ITERATIONS },
      { iterations: OLD_PBKDF2_ITERATIONS }
    ];
    for (const attempt of attempts) {
      try {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode(password),
          { name: 'PBKDF2' },
          false,
          ['deriveBits', 'deriveKey']
        );
        const key = await crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: attempt.iterations,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: 'AES-GCM', length: SECURITY_CONFIG.KEY_LENGTH },
          false,
          ['decrypt']
        );
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          encrypted
        );
        return new TextDecoder().decode(decrypted);
      } catch (innerError) {
        if (attempt !== attempts[attempts.length - 1]) {
          continue;
        }
        throw innerError;
      }
    }
  } catch (error) {
    throw new Error(t('error.decryptionError'));
  }
}

function initializePage() {
  const passwordForm = document.getElementById('passwordForm');
  const memoContent = document.getElementById('memoContent');
  const errorContent = document.getElementById('errorContent');
  const statusMessage = document.getElementById('statusMessage');
  if (passwordForm) passwordForm.style.display = 'block';
  if (memoContent) memoContent.style.display = 'none';
  if (errorContent) errorContent.style.display = 'none';
  if (statusMessage) statusMessage.style.display = 'none';
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
        decryptLoadingIndicator.style.display = 'block';
      }
      try {
        const requestBody = {};
        const response = await fetch('/api/read-memo?id=' + memoId, {
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
          const decryptedMessage = await decryptMessage(result.encryptedMessage, password);
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
          document.getElementById('memoContent').style.display = 'block';
          document.getElementById('passwordForm').style.display = 'none';
          const memoStatus = document.getElementById('memoStatus');
          const deletionSpinner = document.getElementById('deletionSpinner');
          if (memoStatus) {
            memoStatus.textContent = t('msg.memoDecrypted');
          }
          if (deletionSpinner) {
            deletionSpinner.style.display = 'block';
          }
          document.getElementById('password').value = '';
          if (errorContent) errorContent.style.display = 'none';
          if (statusMessage) statusMessage.style.display = 'none';
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
              deletionSpinner.style.display = 'none';
            }
          } else if (deleteResponse && deleteResponse.ok) {
            const memoStatus = document.getElementById('memoStatus');
            const deletionSpinner = document.getElementById('deletionSpinner');
            if (memoStatus) {
              memoStatus.textContent = t('msg.memoDeleted');
            }
            if (deletionSpinner) {
              deletionSpinner.style.display = 'none';
            }
          } else {
            showMessage(t('msg.deletionError'), 'warning');
            const deletionSpinner = document.getElementById('deletionSpinner');
            if (deletionSpinner) {
              deletionSpinner.style.display = 'none';
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
          decryptLoadingIndicator.style.display = 'none';
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
        toggleBtn.style.backgroundColor = '#007bff';
      } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = t('btn.show');
        toggleBtn.style.backgroundColor = '#007bff';
      }
    });
  }
});

function showError(message) {
  document.getElementById('errorMessage').textContent = message;
  document.getElementById('errorContent').style.display = 'block';
  document.getElementById('passwordForm').style.display = 'none';
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
