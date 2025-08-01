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

// Security configuration - easily updatable for future-proofing
const SECURITY_CONFIG = {
    // PBKDF2 iterations - OWASP 2025 recommendation: 600,000+ for SHA-256
    // Current: 600,000 (meets 2025 recommendations)
    PBKDF2_ITERATIONS: 600000,
    
    // Salt length in bytes (16 bytes = 128 bits)
    SALT_LENGTH: 16,
    
    // IV length for AES-GCM (12 bytes = 96 bits)
    IV_LENGTH: 12,
    
    // Key length for AES-256-GCM
    KEY_LENGTH: 256
};



// AES-256-GCM encryption with PBKDF2 key derivation
async function encryptMessage(message, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
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
        showMessage('Please enter a message', 'error');
        return;
    }
    
    if (message.length > 10000) {
        showMessage('Message is too long (max 10,000 characters)', 'error');
        return;
    }
    
    // Validate Turnstile completion
    const turnstileResponse = getTurnstileResponse();
    
    if (!turnstileResponse) {
        showMessage('Please complete the security challenge', 'error');
        return;
    }
    
    try {
        // Generate password
        const password = generatePassword();
        
        // Encrypt message
        const encryptedMessage = await encryptMessage(message, password);
        
        // Send to API
        const requestBody = {
            encryptedMessage,
            expiryHours,
            cfTurnstileResponse: turnstileResponse
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
            // Generate URL without password
            const memoUrl = window.location.origin + '/read-memo.html?id=' + result.memoId;
            
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
            showMessage(result.error || 'Failed to create memo', 'error');
            // Don't reset Turnstile on error to avoid refreshing the widget
        }
    } catch (error) {
        showMessage('An error occurred while creating the memo', 'error');
        // Don't reset Turnstile on error to avoid refreshing the widget
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
    MISSING_MEMO_ID: '{{MISSING_MEMO_ID_ERROR}}'
};

// Security configuration - easily updatable for future-proofing
const SECURITY_CONFIG = {
    // PBKDF2 iterations - OWASP 2025 recommendation: 600,000+ for SHA-256
    // Current: 600,000 (meets 2025 recommendations)
    PBKDF2_ITERATIONS: 600000,
    
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

// Extract memo ID from URL params
function getMemoId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Extract password from URL hashtag
function getPasswordFromHash() {
    return window.location.hash.substring(1);
}

// AES-256-GCM decryption with PBKDF2 key derivation
async function decryptMessage(encryptedData, password) {
    const encoder = new TextEncoder();
    
    // Decode base64 encrypted data
    const encryptedBytes = new Uint8Array(
        atob(encryptedData).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract salt (16 bytes), IV (12 bytes), and encrypted data
    const salt = encryptedBytes.slice(0, SECURITY_CONFIG.SALT_LENGTH);
    const iv = encryptedBytes.slice(SECURITY_CONFIG.SALT_LENGTH, SECURITY_CONFIG.SALT_LENGTH + SECURITY_CONFIG.IV_LENGTH);
    const encrypted = encryptedBytes.slice(SECURITY_CONFIG.SALT_LENGTH + SECURITY_CONFIG.IV_LENGTH);
    
    try {
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
            ['decrypt']
        );
        
        // Decrypt data
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: iv },
            key,
            encrypted
        );
        
        return new TextDecoder().decode(decrypted);
    } catch (error) {
        throw new Error('Failed to decrypt message. Invalid password or corrupted data.');
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
                showError('Please enter the encryption password');
                return;
            }
            
            if (!memoId) {
                showError('Invalid memo URL');
                return;
            }
            
            // Validate Turnstile completion
            const turnstileResponse = getTurnstileResponse();
            
            if (!turnstileResponse) {
                showError('Please complete the security challenge');
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
                    
                    // Display message
                    document.getElementById('decryptedMessage').textContent = decryptedMessage;
                    document.getElementById('memoContent').style.display = 'block';
                    document.getElementById('passwordForm').style.display = 'none';
                    
                    // Clear password field
                    document.getElementById('password').value = '';
                    
                    // Hide error messages
                    if (errorContent) errorContent.style.display = 'none';
                    if (statusMessage) statusMessage.style.display = 'none';
                    
                    // Reset Turnstile only on success
                    resetTurnstile();
                    
                    // Memo is automatically deleted by server after reading
                } else {
                    if (result.error === 'Memo not found') {
                        showError('This memo has already been read and deleted, or it has expired.');
                    } else if (result.error === 'Memo expired') {
                        showError('This memo has expired and has been deleted.');
                    } else {
                        showError(result.error || 'Failed to read memo');
                    }
                    // Don't reset Turnstile on error to avoid refreshing the widget
                }
            } catch (error) {
                if (error.message.includes('Failed to decrypt')) {
                    showError('Invalid password. Please check the password you received separately.');
                } else {
                    showError('An error occurred while reading the memo');
                }
                // Don't reset Turnstile on error to avoid refreshing the widget
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

highlightCurrentPage();
`;
} 