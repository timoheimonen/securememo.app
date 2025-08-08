// Client-side JS templates for memo operations

export function getCreateMemoJS() {
    return `
// Turnstile site key - injected by server
const TURNSTILE_SITE_KEY = '{{TURNSTILE_SITE_KEY}}';

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

// Init Turnstile widget
function initTurnstile() {
    // Turnstile widget auto-initialized with data-sitekey attribute
}

// Get Turnstile response safely
function getTurnstileResponse() {
    if (typeof turnstile !== 'undefined' && turnstile.getResponse) {
        const response = turnstile.getResponse();
        return response;
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
    initTurnstile();
    
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

// Generate random 32-char password
function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    let password = '';
    for (let i = 0; i < 32; i++) {
        password += chars[array[i] % chars.length];
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
    // PBKDF2 iterations - Increased to 1,200,000 for enhanced security
    PBKDF2_ITERATIONS: 1200000,
    
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
document.getElementById('memoForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
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
    
    // Validate Turnstile completion
    const turnstileResponse = getTurnstileResponse();
    
    if (!turnstileResponse) {
        showMessage('{{MISSING_SECURITY_CHALLENGE_ERROR}}', 'error');
        return;
    }
    
    // Show loading indicator and disable button immediately
    const submitButton = document.getElementById('submitButton');
    const loadingIndicator = document.getElementById('loadingIndicator');
    submitButton.disabled = true;
    submitButton.textContent = 'Encrypting...';
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
            showMessage(result.error || '{{CREATE_MEMO_FAILED_ERROR}}', 'error');
            // Don't reset Turnstile on error to avoid refreshing the widget
        }
    } catch (error) {
        showMessage('{{CREATE_MEMO_ERROR}}', 'error');
        // Don't reset Turnstile on error to avoid refreshing the widget
    } finally {
        // Always hide loading indicator and re-enable button in finally block
        submitButton.disabled = false;
        submitButton.textContent = 'Create Secure Memo';
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
            showMessage('✅ URL copied to clipboard!', 'success');
            
            // Visual feedback - briefly change button text
            const copyBtn = document.getElementById('copyUrl');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
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
            showMessage('✅ URL copied to clipboard!', 'success');
        }
    } catch (err) {
        // Final fallback - show the URL and ask user to copy manually
        urlInput.select();
        urlInput.setSelectionRange(0, 99999);
        showMessage('⚠️ Please copy the URL manually (Ctrl+C / Cmd+C)', 'warning');
    }
});

// Toggle password visibility
document.getElementById('togglePassword').addEventListener('click', () => {
    const passwordInput = document.getElementById('memoPassword');
    const toggleBtn = document.getElementById('togglePassword');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.textContent = 'Hide';
        toggleBtn.style.backgroundColor = '#007bff';
    } else {
        passwordInput.type = 'password';
        toggleBtn.textContent = 'Show';
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
            showMessage('✅ Password copied to clipboard!', 'success');
            
            // Visual feedback - briefly change button text
            const copyBtn = document.getElementById('copyPassword');
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
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
            showMessage('✅ Password copied to clipboard!', 'success');
        }
    } catch (err) {
        // Final fallback - show the password and ask user to copy manually
        passwordInput.select();
        passwordInput.setSelectionRange(0, 99999);
        showMessage('⚠️ Please copy the password manually (Ctrl+C / Cmd+C)', 'warning');
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
const NEW_PBKDF2_ITERATIONS = 1200000;  // Current iterations to use
const OLD_PBKDF2_ITERATIONS = 600000;   // Fallback for existing memos

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

// Init Turnstile widget
function initTurnstile() {
    // Explicitly render Turnstile widget for initial form
    if (typeof turnstile !== 'undefined') {
        turnstile.render('.cf-turnstile', {
            sitekey: TURNSTILE_SITE_KEY
        });
    }
}

// Get Turnstile response safely
function getTurnstileResponse() {
    if (typeof turnstile !== 'undefined' && turnstile.getResponse) {
        const response = turnstile.getResponse();
        return response;
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
    initTurnstile();
    
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
            
            // Validate Turnstile completion
            const turnstileResponse = getTurnstileResponse();
            
            if (!turnstileResponse) {
                showError(ERROR_MESSAGES.MISSING_SECURITY_CHALLENGE);
                return;
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
                        memoStatus.textContent = 'Memo decrypted. Deleting in progress... Please wait.';
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

                    // Send deletion request
                    const deleteResponse = await fetch('/api/confirm-delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(deleteBody)
                    });
                    
                    if (deleteResponse.ok) {
                        const memoStatus = document.getElementById('memoStatus');
                        const deletionSpinner = document.getElementById('deletionSpinner');
                        if (memoStatus) {
                            memoStatus.textContent = 'Memo confirmed as read and permanently deleted.';
                        }
                        if (deletionSpinner) {
                            deletionSpinner.style.display = 'none';
                        }
                    } else {
                        showMessage('Error confirming deletion. The memo will be cleaned up automatically.', 'warning');
                    }
                } else {
                    if (result.error === 'Memo not found') {
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
                toggleBtn.textContent = 'Hide';
                toggleBtn.style.backgroundColor = '#007bff';
            } else {
                passwordInput.type = 'password';
                toggleBtn.textContent = 'Show';
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
// Import client-side localization utility
import { initLocalization, getCurrentLocale, t, localizeUrl } from '/js/clientLocalization.js';

// Initialize localization when page loads
document.addEventListener('DOMContentLoaded', () => {
    initLocalization();
});
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
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburger && navMenu) {
        // Remove existing event listeners to prevent duplicates
        hamburger.removeEventListener('click', toggleMenu);
        document.removeEventListener('click', closeMenuOnOutsideClick);
        
        // Add event listeners
        hamburger.addEventListener('click', toggleMenu);
        
        // Close menu when clicking on a link
        const navLinks = navMenu.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.removeEventListener('click', closeMenuOnLinkClick);
            link.addEventListener('click', closeMenuOnLinkClick);
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', closeMenuOnOutsideClick);
    }
}

function toggleMenu() {
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.getElementById('hamburger');
    if (navMenu && hamburger) {
        const isExpanded = navMenu.classList.toggle('active');
        hamburger.setAttribute('aria-expanded', isExpanded);
    }
}

function closeMenuOnLinkClick() {
    const navMenu = document.getElementById('navMenu');
    const hamburger = document.getElementById('hamburger');
    if (navMenu && hamburger) {
        navMenu.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    }
}

function closeMenuOnOutsideClick(event) {
    const hamburger = document.getElementById('hamburger');
    const navMenu = document.getElementById('navMenu');
    
    if (hamburger && navMenu && !hamburger.contains(event.target) && !navMenu.contains(event.target)) {
        navMenu.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
    }
}

// Always initialize mobile navigation
initMobileNav();

// Re-initialize on window resize to handle dynamic content changes
window.addEventListener('resize', () => {
    initMobileNav();
});

highlightCurrentPage();
`;
} 