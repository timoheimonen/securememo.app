// Client-side JS templates for memo operations

export function getCreateMemoJS() {
    return `
// Turnstile site key - injected by server
const TURNSTILE_SITE_KEY = '{{TURNSTILE_SITE_KEY}}';
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

// Dynamic Turnstile rendering on-demand
function renderTurnstileIfNeeded(callback) {
    if (typeof turnstile === 'undefined') {
        // Script may still be loading; poll briefly
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

// Get Turnstile response safely
function getTurnstileResponse() {
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

// Reset Turnstile safely
function resetTurnstile() {
    if (typeof turnstile !== 'undefined' && turnstile.reset) {
        turnstile.reset();
    }
}

// Init page state
function initializePage() {
    highlightCurrentPage();
    
    // Hide result section by default
    const resultSection = document.getElementById('result');
    if (resultSection) {
        resultSection.style.display = 'none';
    }
    
    // Show form by default
    const memoForm = document.getElementById('memoForm');
    if (memoForm) {
        memoForm.style.display = 'block';
    }
}

// Wait for DOM + Turnstile script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}

// Generate random 32-char password using rejection sampling to avoid modulo bias
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

// Hash function for deletion token
async function hashDeletionToken(token) {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray));
}

// Security configuration - easily updatable for future-proofing
const SECURITY_CONFIG = {
    // PBKDF2 iterations - // Current iterations to use. Remember update also in ReadMemoJS!
    PBKDF2_ITERATIONS: 3500000,
    
    // Salt length in bytes (16 bytes = 128 bits)
    SALT_LENGTH: 16,
    
    // IV length for AES-GCM (12 bytes = 96 bits)
    IV_LENGTH: 12,
    
    // Key length for AES-256-GCM
    KEY_LENGTH: 256
};



// AES-256-GCM encryption with PBKDF2 key derivation
async function encryptMessage(payload, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload)); // Change to encode JSON
    
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.SALT_LENGTH));
    
    // Derive key from password using PBKDF2
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
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
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(SECURITY_CONFIG.IV_LENGTH));
    
    // Encrypt data
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
    );
    
    // Combine salt + iv + encrypted data
    const result = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encrypted), salt.length + iv.length);
    
    return btoa(String.fromCharCode(...result));
}

// Handle form submission
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
    
    // Check if we're already in success state (result section is visible)
    const resultSection = document.getElementById('result');
    if (resultSection && resultSection.style.display === 'block') {
        // Already successfully created a memo, ignore this submission
        return;
    }
    
    const message = document.getElementById('message').value.trim();
    const expiryHours = parseInt(document.getElementById('expiryHours').value);
    
    if (!message) {
        showMessage('{{MISSING_MESSAGE_ERROR}}', 'error');
        return;
    }
    
    if (message.length > 10000) {
        showMessage('{{MESSAGE_TOO_LONG_ERROR}}', 'error');
        return;
    }
    
    // Ensure Turnstile solved before proceeding
    let turnstileResponse = getTurnstileResponse();
    if (!turnstileResponse) {
        // Show overlay and render
        const submitButton = document.getElementById('submitButton');
        if (submitButton) submitButton.disabled = true;
        showTurnstileOverlay((err) => {
            if (err) {
                showMessage('{{MISSING_SECURITY_CHALLENGE_ERROR}}', 'error');
                const submitButton2 = document.getElementById('submitButton');
                if (submitButton2) submitButton2.disabled = false;
                pendingSubmitEvent = null;
                return;
            }
            // After solved re-trigger submit programmatically
            turnstileResponse = getTurnstileResponse();
            if (!turnstileResponse) {
                showMessage('{{MISSING_SECURITY_CHALLENGE_ERROR}}', 'error');
                const submitButton3 = document.getElementById('submitButton');
                if (submitButton3) submitButton3.disabled = false;
                pendingSubmitEvent = null;
                return;
            }
            document.getElementById('memoForm').dispatchEvent(new Event('submit'));
        });
        return;
    }
    
    // Show loading indicator and disable button immediately
    const submitButton = document.getElementById('submitButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    submitButton.disabled = true;
    submitButton.textContent = '{{BTN_CREATING}}';
    loadingIndicator.style.display = 'block';
    
    try {
        // Generate password and deletion token
        const password = generatePassword();
        const deletionToken = generatePassword(); // Reuse function for 32-char token
        
        // Create payload with message and deletion token
        const payload = { message: message, deletionToken: deletionToken };
        const encryptedMessage = await encryptMessage(payload, password);
        const tokenHash = await hashDeletionToken(deletionToken);
        
        // Send to API
        const requestBody = {
            encryptedMessage,
            expiryHours,
            cfTurnstileResponse: turnstileResponse,
            deletionTokenHash: tokenHash  // New
        };
        
        const response = await fetch('/api/create-memo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        // Handle rate limit early to avoid JSON parse of CF HTML body
        if (response.status === 429) {
            showMessage('{{RATE_LIMITED_ERROR}}', 'error');
            return;
        }
        const result = await response.json();
        
        if (response.ok) {
            // Generate locale-aware URL without password  
            const currentLocale = window.location.pathname.split('/')[1] || 'en';
            const memoUrl = window.location.origin + '/' + currentLocale + '/read-memo.html?id=' + result.memoId;
            
            // Show result
            document.getElementById('memoUrl').value = memoUrl;
            document.getElementById('memoPassword').value = password;
            document.getElementById('result').style.display = 'block';
            document.getElementById('memoForm').style.display = 'none';
            
            // Clear form
            document.getElementById('message').value = '';
            
            // Reset Turnstile only on success
            resetTurnstile();
        } else {
            // Handle rate limiting specifically
            if (response.status === 429) {
                showMessage('{{RATE_LIMITED_ERROR}}', 'error');
            } else {
                showMessage(result.error || '{{CREATE_MEMO_FAILED_ERROR}}', 'error');
            }
            // Don't reset Turnstile on error to avoid refreshing the widget
        }
    } catch (error) {
        showMessage('{{CREATE_MEMO_ERROR}}', 'error');
        // Don't reset Turnstile on error to avoid refreshing the widget
    } finally {
        // Always hide loading indicator and re-enable button in finally block
        submitButton.disabled = false;
        submitButton.textContent = '{{BTN_CREATE}}';
        loadingIndicator.style.display = 'none';
    }
});

// Copy URL to clipboard using modern Clipboard API
document.getElementById('copyUrl').addEventListener('click', async () => {
    const urlInput = document.getElementById('memoUrl');
    const url = urlInput.value;
    
    try {
        // Use modern Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(url);
            showMessage('{{URL_COPIED_MESSAGE}}', 'success');
            
            // Visual feedback - briefly change button text
            const copyBtn = document.getElementById('copyUrl');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '{{BTN_COPIED}}';
            copyBtn.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '';
            }, 2000);
        } else {
            // Fallback for older browsers or non-secure contexts
            urlInput.select();
            urlInput.setSelectionRange(0, 99999); // For mobile devices
            document.execCommand('copy');
            showMessage('{{URL_COPIED_MESSAGE}}', 'success');
        }
    } catch (err) {
        // Final fallback - show the URL and ask user to copy manually
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        showMessage('{{COPY_MANUAL_MESSAGE}}', 'warning');
    }
});

// Toggle password visibility
document.getElementById('togglePassword').addEventListener('click', () => {
    const passwordInput = document.getElementById('memoPassword');
    const toggleBtn = document.getElementById('togglePassword');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = '{{BTN_HIDE}}';
        toggleBtn.style.backgroundColor = '#007bff';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = '{{BTN_SHOW}}';
        toggleBtn.style.backgroundColor = '#007bff';
    }
});

// Copy password to clipboard using modern Clipboard API
document.getElementById('copyPassword').addEventListener('click', async () => {
    const passwordInput = document.getElementById('memoPassword');
    const password = passwordInput.value;
    
    try {
        // Use modern Clipboard API if available
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(password);
            showMessage('{{PASSWORD_COPIED_MESSAGE}}', 'success');
            
            // Visual feedback - briefly change button text
            const copyBtn = document.getElementById('copyPassword');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '{{BTN_COPIED}}';
            copyBtn.style.backgroundColor = '#28a745';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.backgroundColor = '';
            }, 2000);
        } else {
            // Fallback for older browsers or non-secure contexts
            passwordInput.select();
            passwordInput.setSelectionRange(0, 99999); // For mobile devices
            document.execCommand('copy');
            showMessage('{{PASSWORD_COPIED_MESSAGE}}', 'success');
        }
    } catch (err) {
        // Final fallback - show the password and ask user to copy manually
        passwordInput.select();
        passwordInput.setSelectionRange(0, 99999);
        showMessage('{{COPY_MANUAL_MESSAGE}}', 'warning');
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
`;
}

export function getReadMemoJS() {
    return `
// Turnstile site key - injected by server
const TURNSTILE_SITE_KEY = '{{TURNSTILE_SITE_KEY}}';
let turnstileRendered = false;
let turnstileWidgetId = null; // Added to prevent implicit global usage

// Error messages - injected by server
const ERROR_MESSAGES = {
    MISSING_MEMO_ID: '{{MISSING_MEMO_ID_ERROR}}',
    MISSING_PASSWORD: '{{MISSING_PASSWORD_ERROR}}',
    INVALID_MEMO_URL: '{{INVALID_MEMO_URL_ERROR}}',
    MISSING_SECURITY_CHALLENGE: '{{MISSING_SECURITY_CHALLENGE_ERROR}}',
    MEMO_ALREADY_READ_DELETED: '{{MEMO_ALREADY_READ_DELETED_ERROR}}',
    MEMO_EXPIRED_DELETED: '{{MEMO_EXPIRED_DELETED_ERROR}}',
    INVALID_PASSWORD_CHECK: '{{INVALID_PASSWORD_CHECK_ERROR}}',
    READ_MEMO_ERROR: '{{READ_MEMO_ERROR}}',
    DECRYPTION_ERROR: '{{DECRYPTION_ERROR}}'
};

// Security configuration constants
const NEW_PBKDF2_ITERATIONS = 3500000;  // Current iterations to use, remember update also in CreateMemoJS!
const OLD_PBKDF2_ITERATIONS = 2200000;   // Fallback for existing memos

// Security configuration - easily updatable for future-proofing, even currently it exeeds OWASP 2025 recommendations with 1.2M iterations.
const SECURITY_CONFIG = {
    // Use new iterations by default for future-proofing, but fallback handled below
    PBKDF2_ITERATIONS: NEW_PBKDF2_ITERATIONS,
    
    // Salt length in bytes (16 bytes = 128 bits)
    SALT_LENGTH: 16,
    
    // IV length for AES-GCM (12 bytes = 96 bits)
    IV_LENGTH: 12,
    
    // Key length for AES-256-GCM
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

// Dynamic Turnstile rendering on-demand
function renderTurnstileIfNeeded(callback) {
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

// Get Turnstile response safely
function getTurnstileResponse() {
    if (typeof turnstile !== 'undefined' && turnstile.getResponse && turnstileWidgetId !== null) {
        try {
            return turnstile.getResponse(turnstileWidgetId);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Reset Turnstile safely
function resetTurnstile() {
    if (typeof turnstile !== 'undefined' && turnstile.reset) {
        turnstile.reset();
    }
}



// Extract memo ID from URL params
function getMemoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}



// AES-256-GCM decryption with PBKDF2 key derivation and iteration fallback
async function decryptMessage(encryptedData, password) {
    try {
        const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
        
        // Extract salt (first 16 bytes) and IV (next 12 bytes)
        const salt = encryptedBytes.slice(0, SECURITY_CONFIG.SALT_LENGTH);
        const iv = encryptedBytes.slice(SECURITY_CONFIG.SALT_LENGTH, SECURITY_CONFIG.SALT_LENGTH + SECURITY_CONFIG.IV_LENGTH);
        const encrypted = encryptedBytes.slice(SECURITY_CONFIG.SALT_LENGTH + SECURITY_CONFIG.IV_LENGTH);
        
        // Define iteration attempts: try new first, then old if fails
        const attempts = [
            { iterations: NEW_PBKDF2_ITERATIONS },
            { iterations: OLD_PBKDF2_ITERATIONS }
        ];
        
        for (const attempt of attempts) {
            try {
                const encoder = new TextEncoder();
                
                // Derive key from password using PBKDF2 with current attempt's iterations
                const keyMaterial = await crypto.subtle.importKey(
                    'raw',
                    encoder.encode(password),
                    'PBKDF2',
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
                
                // Attempt decryption
                const decrypted = await crypto.subtle.decrypt(
                    { name: 'AES-GCM', iv: iv },
                    key,
                    encrypted
                );
                
                // If successful, return the decrypted data
                return new TextDecoder().decode(decrypted);
            } catch (innerError) {
                // If not the last attempt, continue to next (fallback)
                if (attempt !== attempts[attempts.length - 1]) {
                    continue;
                }
                // On final failure, rethrow
                throw innerError;
            }
        }
    } catch (error) {
        throw new Error(ERROR_MESSAGES.DECRYPTION_ERROR);
    }
}

// Init page state
function initializePage() {
    highlightCurrentPage();
    
    // Init page sections
    const passwordForm = document.getElementById('passwordForm');
    const memoContent = document.getElementById('memoContent');
    const errorContent = document.getElementById('errorContent');
    const statusMessage = document.getElementById('statusMessage');
    
    // Set initial state
    if (passwordForm) passwordForm.style.display = 'block';
    if (memoContent) memoContent.style.display = 'none';
    if (errorContent) errorContent.style.display = 'none';
    if (statusMessage) statusMessage.style.display = 'none';
}

// Auto-fill password from URL hashtag if available
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
    
    // Check if memo ID is present in URL
    if (!memoId) {
        showError(ERROR_MESSAGES.MISSING_MEMO_ID);
        return;
    }
    
    // Add form submission event listener after DOM is loaded
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
            
            // Ensure Turnstile solved before proceeding
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
            
            // Show loading spinner and disable button immediately
            const decryptButton = document.getElementById('decryptButton');
            const decryptLoadingIndicator = document.getElementById('decryptLoadingIndicator');
            if (decryptButton) {
                decryptButton.disabled = true;
                decryptButton.textContent = '{{BTN_DECRYPTING}}';
            }
            if (decryptLoadingIndicator) {
                decryptLoadingIndicator.style.display = 'block';
            }
            
            try {
                // Send request with Turnstile token
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
                    showError('{{RATE_LIMITED_ERROR}}');
                    return;
                }
                const result = await response.json();
                
                if (response.ok) {
                    // Decrypt message
                    const decryptedMessage = await decryptMessage(result.encryptedMessage, password);
                    
                    // Parse decrypted payload
                    let decryptedPayload;
                    try {
                        decryptedPayload = JSON.parse(decryptedMessage);
                        if (typeof decryptedPayload.message !== 'string' || (result.requiresDeletionToken && !decryptedPayload.deletionToken)) {
                            throw new Error();
                        }
                    } catch {
                        // Old memo: Treat as plain message
                        decryptedPayload = { message: decryptedMessage };
                    }
                    
                    // Display message
                    document.getElementById('decryptedMessage').textContent = decryptedPayload.message;
                    document.getElementById('memoContent').style.display = 'block';
                    document.getElementById('passwordForm').style.display = 'none';
                    
                    // Update status and show deletion spinner
                    const memoStatus = document.getElementById('memoStatus');
                    const deletionSpinner = document.getElementById('deletionSpinner');
                    if (memoStatus) {
                        memoStatus.textContent = '{{MEMO_DECRYPTED_MESSAGE}}';
                    }
                    if (deletionSpinner) {
                        deletionSpinner.style.display = 'block';
                    }
                    
                    // Clear password field
                    document.getElementById('password').value = '';
                    
                    // Hide error messages
                    if (errorContent) errorContent.style.display = 'none';
                    if (statusMessage) statusMessage.style.display = 'none';
                    
                    // Handle deletion confirmation with deletion token
                    const deleteBody = {};
                    if (!decryptedPayload.deletionToken) {
                        throw new Error('Missing deletion token in payload');
                    }
                    deleteBody.deletionToken = decryptedPayload.deletionToken;
                    deleteBody.memoId = memoId;

                    // Send deletion request with client-side retry (max 3 attempts, 3s delay)
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

                            // Do not retry for these statuses
                            if (deleteResponse.ok || [429, 403, 404].includes(deleteResponse.status)) {
                                break;
                            }
                        } catch (e) {
                            // Network error, proceed to retry
                        }
                        if (attempt < maxAttempts) {
                            await new Promise(res => setTimeout(res, delayMs));
                        }
                    }

                    if (deleteResponse && deleteResponse.status === 429) {
                        showMessage('{{RATE_LIMITED_ERROR}}', 'error');
                        const deletionSpinner = document.getElementById('deletionSpinner');
                        if (deletionSpinner) {
                            deletionSpinner.style.display = 'none';
                        }
                    } else if (deleteResponse && deleteResponse.ok) {
                        const memoStatus = document.getElementById('memoStatus');
                        const deletionSpinner = document.getElementById('deletionSpinner');
                        if (memoStatus) {
                            memoStatus.textContent = '{{MEMO_DELETED_MESSAGE}}';
                        }
                        if (deletionSpinner) {
                            deletionSpinner.style.display = 'none';
                        }
                    } else {
                        showMessage('{{DELETION_ERROR_MESSAGE}}', 'warning');
                        const deletionSpinner = document.getElementById('deletionSpinner');
                        if (deletionSpinner) {
                            deletionSpinner.style.display = 'none';
                        }
                    }
                } else {
                    // Handle rate limiting specifically  
                    if (response.status === 429) {
                        showError('{{RATE_LIMITED_ERROR}}');
                    } else if (result.error === 'Memo not found') {
                        showError(ERROR_MESSAGES.MEMO_ALREADY_READ_DELETED);
                    } else if (result.error === 'Memo expired') {
                        showError(ERROR_MESSAGES.MEMO_EXPIRED_DELETED);
                    } else {
                        showError(result.error || ERROR_MESSAGES.READ_MEMO_ERROR);
                    }
                    // Don't reset Turnstile on error to avoid refreshing the widget
                }
            } catch (error) {
                if (error.message.includes('Failed to decrypt')) {
                    showError(ERROR_MESSAGES.INVALID_PASSWORD_CHECK);
                } else {
                    showError(ERROR_MESSAGES.READ_MEMO_ERROR);
                }
                // Don't reset Turnstile on error to avoid refreshing the widget
            } finally {
                // Always hide loading indicator and re-enable button
                const decryptButton = document.getElementById('decryptButton');
                const decryptLoadingIndicator = document.getElementById('decryptLoadingIndicator');
                if (decryptButton) {
                    decryptButton.disabled = false;
                    decryptButton.textContent = '{{BTN_DECRYPT}}';
                }
                if (decryptLoadingIndicator) {
                    decryptLoadingIndicator.style.display = 'none';
                }
            }
        });
    }
    
    // Add toggle password functionality
    const toggleReadPasswordBtn = document.getElementById('toggleReadPassword');
    if (toggleReadPasswordBtn) {
        toggleReadPasswordBtn.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const toggleBtn = document.getElementById('toggleReadPassword');
            
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                toggleBtn.textContent = '{{BTN_HIDE}}';
                toggleBtn.style.backgroundColor = '#007bff';
            } else {
                passwordInput.type = 'password';
                toggleBtn.textContent = '{{BTN_SHOW}}';
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
`;
}

export function getCommonJS() {
    return `
// Initialize when DOM is ready (handles both cases)
async function initializeApp() {
    // Load localization lazily so nav always initializes even if it fails
    try {
        const localizationModule = await import('/js/clientLocalization.js');
        if (localizationModule && typeof localizationModule.initLocalization === 'function') {
            localizationModule.initLocalization();
        }
    } catch (e) {
        // Ignore localization errors to not block navigation setup
    }
    initMobileNav(); // Initialize mobile navigation
}

// Check if DOM is already loaded
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded, initialize immediately
    initializeApp();
}

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







function initMobileNav() {
    // Initialize modern mobile menu
    initMobileMenu();
    // Initialize language dropdown
    initLanguageDropdown();
}

// Initialize mobile hamburger menu
function initMobileMenu() {
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');
    const navOverlay = document.querySelector('.nav-overlay');
    
    // Check if elements exist
    if (!hamburger) {
        return;
    }
    if (!navMenu) {
        return;
    }
    
    // Set CSS custom property for viewport height (iOS Safari fix)
    function setViewportHeight() {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', vh + 'px');
    }
    
    // Set initial viewport height
    setViewportHeight();
    
    // Update on resize (handles iOS address bar changes)
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', () => {
        // Delay to ensure proper height calculation after orientation change
        setTimeout(setViewportHeight, 100);
    });
    
    // Function to check if menu content fits and ensure scrolling is available
    function ensureMenuScrollability() {
        if (!navMenu.classList.contains('active')) return;
        
        const menuHeight = navMenu.offsetHeight;
        const menuScrollHeight = navMenu.scrollHeight;
        
        // If content is taller than container, ensure scrolling works
        if (menuScrollHeight > menuHeight) {
            // Force scroll container behavior
            navMenu.style.overflowY = 'scroll';
            navMenu.style.webkitOverflowScrolling = 'touch';
            
            // Ensure the last item (Chinese language) is accessible
            const lastLanguageLink = navMenu.querySelector('.language-links .nav-link:last-child');
            if (lastLanguageLink) {
                // Add bottom margin to ensure it's accessible
                const languageLinks = navMenu.querySelector('.language-links');
                if (languageLinks) {
                    languageLinks.style.marginBottom = '40px';
                }
            }
        }
    }
    
    // Define menu functions first
    function closeMenu() {
        hamburger.classList.remove('active');
        navMenu.classList.remove('active');
        if (navOverlay) navOverlay.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        hamburger.setAttribute('aria-expanded', 'false');
    }
    
    function openMenu() {
        hamburger.classList.add('active');
        navMenu.classList.add('active');
        if (navOverlay) navOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        hamburger.setAttribute('aria-expanded', 'true');
        
        // Check and ensure menu scrollability after menu is shown
        setTimeout(() => {
            ensureMenuScrollability();
        }, 50);
        
        // Focus management for accessibility
        const firstNavLink = navMenu.querySelector('.nav-link');
        if (firstNavLink) {
            setTimeout(() => firstNavLink.focus(), 100);
        }
    }
    
    // Toggle menu function
    function toggleMenu() {
        const isOpen = hamburger.classList.contains('active');
        
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }
    
    // Force close menu on initialization to ensure clean state
    closeMenu();
    
    // Event listeners
    hamburger.addEventListener('click', toggleMenu);
    
    // Close menu when clicking on overlay
    if (navOverlay) {
        navOverlay.addEventListener('click', closeMenu);
    }
    
    // Close menu when clicking on navigation links
    const navLinks = navMenu.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });
    
    // Close menu on escape key and handle focus trapping
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && hamburger.classList.contains('active')) {
            closeMenu();
            hamburger.focus(); // Return focus to hamburger button
        }
        
        // Simple focus trap when menu is open
        if (hamburger.classList.contains('active') && e.key === 'Tab') {
            const focusableElements = navMenu.querySelectorAll('.nav-link');
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];
            
            if (e.shiftKey) {
                // Shift + Tab
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            } else {
                // Tab
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        }
    });
    
    // Close menu on window resize if it gets too wide
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && hamburger.classList.contains('active')) {
            closeMenu();
        }
    });
    
    // Add backup close functionality if menu gets stuck
    document.addEventListener('click', (e) => {
        if (hamburger.classList.contains('active') && 
            !navMenu.contains(e.target) && 
            !hamburger.contains(e.target)) {
            closeMenu();
        }
    });
}

// Initialize language dropdown for desktop
function initLanguageDropdown() {
    const languageDropdown = document.querySelector('.language-dropdown');
    const languageToggle = document.querySelector('.language-toggle');
    const languageMenu = document.querySelector('.language-menu');
    
    if (!languageDropdown || !languageToggle || !languageMenu) {
        return; // Elements not found, skip initialization
    }
    
    // Close dropdown function
    function closeDropdown() {
        languageDropdown.classList.remove('active');
        languageToggle.setAttribute('aria-expanded', 'false');
        languageToggle.classList.remove('active');
    }
    
    // Open dropdown function  
    function openDropdown() {
        languageDropdown.classList.add('active');
        languageToggle.setAttribute('aria-expanded', 'true');
        languageToggle.classList.add('active');
    }
    
    // Toggle dropdown function
    function toggleDropdown(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const isOpen = languageDropdown.classList.contains('active');
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    }
    
    // Add event listeners
    languageToggle.addEventListener('click', toggleDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!languageDropdown.contains(e.target)) {
            closeDropdown();
        }
    });
    
    // Close dropdown on escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && languageDropdown.classList.contains('active')) {
            closeDropdown();
            languageToggle.focus();
        }
    });
    
    // Handle keyboard navigation within dropdown
    languageMenu.addEventListener('keydown', (e) => {
        const languageItems = languageMenu.querySelectorAll('.language-item');
        const currentIndex = Array.from(languageItems).indexOf(document.activeElement);
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                const nextIndex = currentIndex < languageItems.length - 1 ? currentIndex + 1 : 0;
                languageItems[nextIndex].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : languageItems.length - 1;
                languageItems[prevIndex].focus();
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (document.activeElement.classList.contains('language-item')) {
                    document.activeElement.click();
                }
                break;
        }
    });
    
    // Close dropdown when selecting a language
    const languageItems = languageMenu.querySelectorAll('.language-item');
    languageItems.forEach(item => {
        item.addEventListener('click', () => {
            closeDropdown();
        });
    });
}

highlightCurrentPage();
`;
}
