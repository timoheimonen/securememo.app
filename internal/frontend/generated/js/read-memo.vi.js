const TURNSTILE_SITE_KEY = '{{TURNSTILE_SITE_KEY}}';
const TURNSTILE_ENABLED = '{{TURNSTILE_ENABLED}}' !== 'false';
let turnstileRendered = false;
let turnstileWidgetId = null; // Added to prevent implicit global usage
const ERROR_MESSAGES = {
MISSING_MEMO_ID: 'Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin và thử lại.',
MISSING_PASSWORD: 'Vui lòng nhập mật khẩu mã hóa',
INVALID_MEMO_URL: 'URL ghi chú không hợp lệ',
MISSING_SECURITY_CHALLENGE: 'Vui lòng hoàn thành thử thách bảo mật',
MEMO_ALREADY_READ_DELETED: 'Ghi chú này đã được đọc và xóa, hoặc đã hết hạn.',
MEMO_EXPIRED_DELETED: 'Ghi chú này đã hết hạn và đã bị xóa.',
INVALID_PASSWORD_CHECK: 'Mật khẩu không hợp lệ. Vui lòng kiểm tra mật khẩu bạn nhận được riêng.',
READ_MEMO_ERROR: 'Đã xảy ra lỗi khi đọc ghi chú',
DECRYPTION_ERROR: 'Giải mã ghi chú thất bại. Mật khẩu không hợp lệ hoặc dữ liệu bị lỗi.'
};
const NEW_PBKDF2_ITERATIONS = 3500000; // Current iterations to use, remember update also in CreateMemoJS!
const OLD_PBKDF2_ITERATIONS = 2200000; // Fallback for existing memos
const SECURITY_CONFIG = {
PBKDF2_ITERATIONS: NEW_PBKDF2_ITERATIONS,
SALT_LENGTH: 16,
IV_LENGTH: 12,
KEY_LENGTH: 256
};
function highlightCurrentPage() {
const currentPath = window.location.pathname;
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
link.classList.remove('active');
if (link.getAttribute('href') === currentPath) {
link.classList.add('active');
}
});
}
function renderTurnstileIfNeeded(callback) {
if (!TURNSTILE_ENABLED) {
callback();
return;
}
if (typeof turnstile === 'undefined') {
let attempts = 0;
const iv = setInterval(() => {
attempts++;
if (typeof turnstile !== 'undefined') {
clearInterval(iv);
renderTurnstileIfNeeded(callback);
} else if (attempts > 40) { // ~4s
clearInterval(iv);
callback(new Error('turnstile_unavailable'));
}
}, 100);
return;
}
if (turnstileRendered) { callback(); return; }
const container = document.getElementById('dynamicTurnstileContainer');
if (!container) { callback(new Error('container_missing')); return; }
try {
turnstileWidgetId = turnstile.render(container, {
sitekey: TURNSTILE_SITE_KEY,
callback: function() {
turnstileRendered = true;
hideTurnstileOverlay();
callback();
}
});
} catch (e) { callback(e); }
}
function showTurnstileOverlay(onReady) {
const overlay = document.getElementById('turnstileOverlay');
if (!overlay) { onReady(new Error('overlay_missing')); return; }
overlay.style.display = 'flex';
document.body.style.overflow = 'hidden';
renderTurnstileIfNeeded(onReady);
}
function hideTurnstileOverlay() {
const overlay = document.getElementById('turnstileOverlay');
if (overlay) overlay.style.display = 'none';
document.body.style.overflow = '';
}
function getTurnstileResponse() {
if (!TURNSTILE_ENABLED) {
return 'turnstile-disabled';
}
if (typeof turnstile !== 'undefined' && turnstile.getResponse && turnstileWidgetId !== null) {
try {
return turnstile.getResponse(turnstileWidgetId);
} catch (e) {
return null;
}
}
return null;
}
function resetTurnstile() {
if (!TURNSTILE_ENABLED) {
return;
}
if (typeof turnstile !== 'undefined' && turnstile.reset) {
turnstile.reset();
}
}
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
throw new Error(ERROR_MESSAGES.DECRYPTION_ERROR);
}
}
function initializePage() {
highlightCurrentPage();
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
const closeBtn = document.getElementById('closeTurnstileOverlay');
if (closeBtn) {
closeBtn.addEventListener('click', () => {
hideTurnstileOverlay();
const decryptButton = document.getElementById('decryptButton');
if (decryptButton) decryptButton.disabled = false;
});
}
const overlay = document.getElementById('turnstileOverlay');
if (overlay) {
overlay.addEventListener('click', (e) => {
if (e.target.classList.contains('turnstile-overlay-backdrop')) {
hideTurnstileOverlay();
const decryptButton = document.getElementById('decryptButton');
if (decryptButton) decryptButton.disabled = false;
}
});
}
document.addEventListener('keydown', (e) => {
if (e.key === 'Escape') {
hideTurnstileOverlay();
const decryptButton = document.getElementById('decryptButton');
if (decryptButton) decryptButton.disabled = false;
}
});
const memoId = getMemoId();
if (!memoId) {
showError(ERROR_MESSAGES.MISSING_MEMO_ID);
return;
}
const decryptForm = document.getElementById('decryptForm');
if (decryptForm) {
decryptForm.addEventListener('submit', async (e) => {
e.preventDefault();
const password = document.getElementById('password').value.trim();
const memoId = getMemoId();
if (!password) {
showError(ERROR_MESSAGES.MISSING_PASSWORD);
return;
}
if (!memoId) {
showError(ERROR_MESSAGES.INVALID_MEMO_URL);
return;
}
let turnstileResponse = getTurnstileResponse();
if (!turnstileResponse) {
const decryptButton = document.getElementById('decryptButton');
if (decryptButton) decryptButton.disabled = true;
showTurnstileOverlay((err) => {
if (err) {
showError(ERROR_MESSAGES.MISSING_SECURITY_CHALLENGE);
const decryptButton2 = document.getElementById('decryptButton');
if (decryptButton2) decryptButton2.disabled = false;
return;
}
turnstileResponse = getTurnstileResponse();
if (!turnstileResponse) {
showError(ERROR_MESSAGES.MISSING_SECURITY_CHALLENGE);
const decryptButton3 = document.getElementById('decryptButton');
if (decryptButton3) decryptButton3.disabled = false;
return;
}
document.getElementById('decryptForm').dispatchEvent(new Event('submit'));
});
return;
}
const decryptButton = document.getElementById('decryptButton');
const decryptLoadingIndicator = document.getElementById('decryptLoadingIndicator');
if (decryptButton) {
decryptButton.disabled = true;
decryptButton.textContent = 'Đang giải mã...';
}
if (decryptLoadingIndicator) {
decryptLoadingIndicator.style.display = 'block';
}
try {
const requestBody = {
cfTurnstileResponse: turnstileResponse
};
const response = await fetch('/api/read-memo?id=' + memoId, {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify(requestBody)
});
if (response.status === 429) {
showError('Quá nhiều yêu cầu. Vui lòng chờ một chút và thử lại.');
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
memoStatus.textContent = 'Ghi chú đã được giải mã. Đang xóa... Vui lòng chờ.';
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
showMessage('Quá nhiều yêu cầu. Vui lòng chờ một chút và thử lại.', 'error');
const deletionSpinner = document.getElementById('deletionSpinner');
if (deletionSpinner) {
deletionSpinner.style.display = 'none';
}
} else if (deleteResponse && deleteResponse.ok) {
const memoStatus = document.getElementById('memoStatus');
const deletionSpinner = document.getElementById('deletionSpinner');
if (memoStatus) {
memoStatus.textContent = 'Ghi chú đã được xác nhận là đã đọc và xóa vĩnh viễn.';
}
if (deletionSpinner) {
deletionSpinner.style.display = 'none';
}
} else {
showMessage('Lỗi xác nhận xóa. Ghi chú sẽ được dọn dẹp tự động.', 'warning');
const deletionSpinner = document.getElementById('deletionSpinner');
if (deletionSpinner) {
deletionSpinner.style.display = 'none';
}
}
} else {
if (response.status === 429) {
showError('Quá nhiều yêu cầu. Vui lòng chờ một chút và thử lại.');
} else if (result.error === 'Memo not found') {
showError(ERROR_MESSAGES.MEMO_ALREADY_READ_DELETED);
} else if (result.error === 'Memo expired') {
showError(ERROR_MESSAGES.MEMO_EXPIRED_DELETED);
} else {
showError(result.error || ERROR_MESSAGES.READ_MEMO_ERROR);
}
}
} catch (error) {
if (error.message.includes('Failed to decrypt')) {
showError(ERROR_MESSAGES.INVALID_PASSWORD_CHECK);
} else {
showError(ERROR_MESSAGES.READ_MEMO_ERROR);
}
} finally {
const decryptButton = document.getElementById('decryptButton');
const decryptLoadingIndicator = document.getElementById('decryptLoadingIndicator');
if (decryptButton) {
decryptButton.disabled = false;
decryptButton.textContent = 'Giải mã ghi chú';
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
toggleBtn.textContent = 'Ẩn';
toggleBtn.style.backgroundColor = '#007bff';
} else {
passwordInput.type = 'password';
toggleBtn.textContent = 'Hiện';
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
highlightCurrentPage();