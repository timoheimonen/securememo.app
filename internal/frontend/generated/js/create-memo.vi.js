const TURNSTILE_SITE_KEY = '{{TURNSTILE_SITE_KEY}}';
const TURNSTILE_ENABLED = '{{TURNSTILE_ENABLED}}' !== 'false';
let turnstileRendered = false;
let turnstileWidgetId = null;
let pendingSubmitEvent = null;
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
if (turnstileRendered) {
callback();
return;
}
const container = document.getElementById('dynamicTurnstileContainer');
if (!container) {
callback(new Error('container_missing'));
return;
}
try {
turnstileWidgetId = turnstile.render(container, {
sitekey: TURNSTILE_SITE_KEY,
callback: function() {
turnstileRendered = true;
hideTurnstileOverlay();
callback();
}
});
} catch (e) {
callback(e);
}
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
const response = turnstile.getResponse(turnstileWidgetId);
return response;
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
function initializePage() {
highlightCurrentPage();
const resultSection = document.getElementById('result');
if (resultSection) {
resultSection.style.display = 'none';
}
const memoForm = document.getElementById('memoForm');
if (memoForm) {
memoForm.style.display = 'block';
}
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
const SECURITY_CONFIG = {
PBKDF2_ITERATIONS: 3500000,
SALT_LENGTH: 16,
IV_LENGTH: 12,
KEY_LENGTH: 256
};
async function encryptMessage(payload, password) {
const encoder = new TextEncoder();
const data = encoder.encode(JSON.stringify(payload)); // Change to encode JSON
const salt = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.SALT_LENGTH));
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
iterations: SECURITY_CONFIG.PBKDF2_ITERATIONS,
hash: 'SHA-256'
},
keyMaterial,
{ name: 'AES-GCM', length: SECURITY_CONFIG.KEY_LENGTH },
false,
['encrypt']
);
const iv = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.IV_LENGTH));
const encrypted = await crypto.subtle.encrypt(
{ name: 'AES-GCM', iv: iv },
key,
data
);
const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
result.set(salt, 0);
result.set(iv, salt.length);
result.set(new Uint8Array(encrypted), salt.length + iv.length);
return btoa(String.fromCharCode(...result));
}
document.getElementById('closeTurnstileOverlay')?.addEventListener('click', () => {
hideTurnstileOverlay();
if (pendingSubmitEvent) {
const submitButton = document.getElementById('submitButton');
if (submitButton) submitButton.disabled = false;
pendingSubmitEvent = null;
}
});
document.getElementById('memoForm').addEventListener('submit', async (e) => {
e.preventDefault();
pendingSubmitEvent = e;
const resultSection = document.getElementById('result');
if (resultSection && resultSection.style.display === 'block') {
return;
}
const message = document.getElementById('message').value.trim();
const expiryHours = parseInt(document.getElementById('expiryHours').value);
if (!message) {
showMessage('Vui lòng nhập ghi chú', 'error');
return;
}
if (message.length > 10000) {
showMessage('Ghi chú quá dài (tối đa 10.000 ký tự)', 'error');
return;
}
let turnstileResponse = getTurnstileResponse();
if (!turnstileResponse) {
const submitButton = document.getElementById('submitButton');
if (submitButton) submitButton.disabled = true;
showTurnstileOverlay((err) => {
if (err) {
showMessage('Vui lòng hoàn thành thử thách bảo mật', 'error');
const submitButton2 = document.getElementById('submitButton');
if (submitButton2) submitButton2.disabled = false;
pendingSubmitEvent = null;
return;
}
turnstileResponse = getTurnstileResponse();
if (!turnstileResponse) {
showMessage('Vui lòng hoàn thành thử thách bảo mật', 'error');
const submitButton3 = document.getElementById('submitButton');
if (submitButton3) submitButton3.disabled = false;
pendingSubmitEvent = null;
return;
}
document.getElementById('memoForm').dispatchEvent(new Event('submit'));
});
return;
}
const submitButton = document.getElementById('submitButton');
const loadingIndicator = document.getElementById('loadingIndicator');
submitButton.disabled = true;
submitButton.textContent = 'Đang mã hóa...';
loadingIndicator.style.display = 'block';
try {
const password = generatePassword();
const deletionToken = generatePassword(); // Reuse function for 32-char token
const payload = { message: message, deletionToken: deletionToken };
const encryptedMessage = await encryptMessage(payload, password);
const tokenHash = await hashDeletionToken(deletionToken);
const requestBody = {
encryptedMessage,
expiryHours,
cfTurnstileResponse: turnstileResponse,
deletionTokenHash: tokenHash // New
};
const response = await fetch('/api/create-memo', {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify(requestBody)
});
if (response.status === 429) {
showMessage('Quá nhiều yêu cầu. Vui lòng chờ một chút và thử lại.', 'error');
return;
}
const result = await response.json();
if (response.ok) {
const currentLocale = window.location.pathname.split('/')[1] || 'en';
const memoUrl = window.location.origin + '/' + currentLocale + '/read-memo.html?id=' + result.memoId;
document.getElementById('memoUrl').value = memoUrl;
document.getElementById('memoPassword').value = password;
document.getElementById('result').style.display = 'block';
document.getElementById('memoForm').style.display = 'none';
document.getElementById('message').value = '';
resetTurnstile();
} else {
if (response.status === 429) {
showMessage('Quá nhiều yêu cầu. Vui lòng chờ một chút và thử lại.', 'error');
} else {
showMessage(result.error || 'Tạo ghi chú thất bại', 'error');
}
}
} catch (error) {
showMessage('Đã xảy ra lỗi khi tạo ghi chú', 'error');
} finally {
submitButton.disabled = false;
submitButton.textContent = 'Tạo ghi chú bảo mật';
loadingIndicator.style.display = 'none';
}
});
document.getElementById('copyUrl').addEventListener('click', async () => {
const urlInput = document.getElementById('memoUrl');
const url = urlInput.value;
try {
if (navigator.clipboard && window.isSecureContext) {
await navigator.clipboard.writeText(url);
showMessage('✅ URL đã được sao chép vào clipboard!', 'success');
const copyBtn = document.getElementById('copyUrl');
const originalText = copyBtn.textContent;
copyBtn.textContent = 'Đã sao chép!';
copyBtn.style.backgroundColor = '#28a745';
setTimeout(() => {
copyBtn.textContent = originalText;
copyBtn.style.backgroundColor = '';
}, 2000);
} else {
urlInput.select();
urlInput.setSelectionRange(0, 99999); // For mobile devices
document.execCommand('copy');
showMessage('✅ URL đã được sao chép vào clipboard!', 'success');
}
} catch (err) {
urlInput.select();
urlInput.setSelectionRange(0, 99999);
showMessage('⚠️ Vui lòng sao chép thủ công (Ctrl+C / Cmd+C)', 'warning');
}
});
document.getElementById('togglePassword').addEventListener('click', () => {
const passwordInput = document.getElementById('memoPassword');
const toggleBtn = document.getElementById('togglePassword');
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
document.getElementById('copyPassword').addEventListener('click', async () => {
const passwordInput = document.getElementById('memoPassword');
const password = passwordInput.value;
try {
if (navigator.clipboard && window.isSecureContext) {
await navigator.clipboard.writeText(password);
showMessage('✅ Mật khẩu đã được sao chép vào clipboard!', 'success');
const copyBtn = document.getElementById('copyPassword');
const originalText = copyBtn.textContent;
copyBtn.textContent = 'Đã sao chép!';
copyBtn.style.backgroundColor = '#28a745';
setTimeout(() => {
copyBtn.textContent = originalText;
copyBtn.style.backgroundColor = '';
}, 2000);
} else {
passwordInput.select();
passwordInput.setSelectionRange(0, 99999); // For mobile devices
document.execCommand('copy');
showMessage('✅ Mật khẩu đã được sao chép vào clipboard!', 'success');
}
} catch (err) {
passwordInput.select();
passwordInput.setSelectionRange(0, 99999);
showMessage('⚠️ Vui lòng sao chép thủ công (Ctrl+C / Cmd+C)', 'warning');
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