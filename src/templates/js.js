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
    console.log('Turnstile widget auto-initialized with data-sitekey attribute');
}

// Get Turnstile response safely
function getTurnstileResponse() {
    console.log('Getting Turnstile response...');
    if (typeof turnstile !== 'undefined' && turnstile.getResponse) {
        const response = turnstile.getResponse();
        console.log('Turnstile response:', response);
        return response;
    }
    console.log('Turnstile not available or no response');
    return null;
}

// Reset Turnstile safely
function resetTurnstile() {
    console.log('Resetting Turnstile...');
    if (typeof turnstile !== 'undefined' && turnstile.reset) {
        turnstile.reset();
        console.log('Turnstile reset successful');
    } else {
        console.log('Turnstile reset failed - not available');
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

// AES-256-GCM encryption with PBKDF2 key derivation
async function encryptMessage(message, password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    
    // Generate random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
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
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
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
    console.log('Form submission started...');
    
    const message = document.getElementById('message').value.trim();
    const expiryHours = parseInt(document.getElementById('expiryHours').value);
    
    console.log('Message length:', message.length);
    console.log('Expiry hours:', expiryHours);
    
    if (!message) {
        console.log('No message provided');
        showMessage('Please enter a message', 'error');
        return;
    }
    
    if (message.length > 10000) {
        console.log('Message too long');
        showMessage('Message is too long (max 10,000 characters)', 'error');
        return;
    }
    
    // Validate Turnstile completion
    console.log('Checking Turnstile response...');
    const turnstileResponse = getTurnstileResponse();
    console.log('Turnstile response:', turnstileResponse);
    console.log('Turnstile response type:', typeof turnstileResponse);
    console.log('Turnstile response length:', turnstileResponse ? turnstileResponse.length : 0);
    
    if (!turnstileResponse) {
        console.log('No Turnstile response - showing error');
        showMessage('Please complete the security challenge', 'error');
        return;
    }
    
    console.log('Turnstile validation passed, proceeding with memo creation...');
    
    try {
        // Generate password
        const password = generatePassword();
        
        // Encrypt message
        const encryptedMessage = await encryptMessage(message, password);
        
        // Calculate expiry time
        let expiryTime;
        if (expiryHours > 0) {
            // Set specific expiry time
            expiryTime = new Date(Date.now() + expiryHours * 60 * 60 * 1000).toISOString();
        } else {
            // Delete on read: set 30-day maximum
            expiryTime = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        }
        
        // Send to API
        console.log('Sending API request to /api/create-memo...');
        const requestBody = {
            encryptedMessage,
            expiryTime,
            cfTurnstileResponse: turnstileResponse
        };
        console.log('Request body keys:', Object.keys(requestBody));
        console.log('Turnstile response in request:', requestBody.cfTurnstileResponse ? 'Present' : 'Missing');
        
        const response = await fetch('/api/create-memo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('API response status:', response.status);
        console.log('API response headers:', Object.fromEntries(response.headers.entries()));
        
        const result = await response.json();
        console.log('API response body:', result);
        
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
            console.log('API error - keeping Turnstile widget as is');
        }
    } catch (error) {
        showMessage('An error occurred while creating the memo', 'error');
        console.error('Error:', error);
        // Don't reset Turnstile on error to avoid refreshing the widget
        console.log('Network error - keeping Turnstile widget as is');
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
    try {
        const encoder = new TextEncoder();
        
        // Decode base64 encrypted data
        const encryptedBytes = new Uint8Array(
            atob(encryptedData).split('').map(char => char.charCodeAt(0))
        );
        
        // Extract salt (16 bytes), IV (12 bytes), and encrypted data
        const salt = encryptedBytes.slice(0, 16);
        const iv = encryptedBytes.slice(16, 28);
        const encrypted = encryptedBytes.slice(28);
        
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
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
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

// Auto-fill password from URL hashtag if available
window.addEventListener('load', () => {
    console.log('Read memo page loaded');
    
    // Init page sections
    const passwordForm = document.getElementById('passwordForm');
    const memoContent = document.getElementById('memoContent');
    const errorContent = document.getElementById('errorContent');
    const statusMessage = document.getElementById('statusMessage');
    
    console.log('Page elements found:', {
        passwordForm: !!passwordForm,
        memoContent: !!memoContent,
        errorContent: !!errorContent,
        statusMessage: !!statusMessage
    });
    
    // Set initial state
    if (passwordForm) passwordForm.style.display = 'block';
    if (memoContent) memoContent.style.display = 'none';
    if (errorContent) errorContent.style.display = 'none';
    if (statusMessage) statusMessage.style.display = 'none';
    
    const memoId = getMemoId();
    
    console.log('URL parameters:', {
        memoId: memoId
    });
    
    // Add form submission event listener after DOM is loaded
    const decryptForm = document.getElementById('decryptForm');
    if (decryptForm) {
        console.log('Decrypt form found, adding event listener');
        decryptForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('Form submission started');
            
            const password = document.getElementById('password').value.trim();
            const memoId = getMemoId();
            
            console.log('Form data:', {
                password: password ? 'present' : 'missing',
                memoId: memoId
            });
            
            if (!password) {
                showError('Please enter the encryption password');
                return;
            }
            
            if (!memoId) {
                showError('Invalid memo URL');
                return;
            }
            
            try {
                console.log('Fetching memo from API...');
                // Fetch encrypted memo
                const response = await fetch('/api/read-memo?id=' + memoId, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                console.log('API response status:', response.status);
                const result = await response.json();
                console.log('API response:', result);
                
                if (response.ok) {
                    console.log('Memo fetched successfully, decrypting...');
                    // Decrypt message
                    const decryptedMessage = await decryptMessage(result.encryptedMessage, password);
                    console.log('Message decrypted successfully');
                    
                    // Display message
                    document.getElementById('decryptedMessage').textContent = decryptedMessage;
                    document.getElementById('memoContent').style.display = 'block';
                    document.getElementById('passwordForm').style.display = 'none';
                    
                    // Clear password field
                    document.getElementById('password').value = '';
                    
                    // Hide error messages
                    if (errorContent) errorContent.style.display = 'none';
                    if (statusMessage) statusMessage.style.display = 'none';
                    
                    console.log('Memo displayed successfully');
                    // Memo is automatically deleted by server after reading
                } else {
                    console.log('API error:', result.error);
                    if (result.error === 'Memo not found') {
                        showError('This memo has already been read and deleted, or it has expired.');
                    } else if (result.error === 'Memo expired') {
                        showError('This memo has expired and has been deleted.');
                    } else {
                        showError(result.error || 'Failed to read memo');
                    }
                }
            } catch (error) {
                console.error('Error during memo reading:', error);
                if (error.message.includes('Failed to decrypt')) {
                    showError('Invalid password. Please check the password you received separately.');
                } else {
                    showError('An error occurred while reading the memo');
                }
            }
        });
    } else {
        console.error('Decrypt form not found!');
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