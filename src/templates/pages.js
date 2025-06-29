export async function getIndexHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>securememo.app - Encrypted Memos</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/" class="nav-link active">Home</a></li>
                <li><a href="/about.html" class="nav-link">About</a></li>
                <li><a href="/create-memo.html" class="nav-link">Create Secure Memo</a></li>
            </ul>
        </div>
    </nav>

    <main class="main-content">
        <div class="hero-section">
            <h1>securememo.app</h1>
            <p>Create encrypted memos that self-destruct after being read or expired. Your secrets stay safe.</p>
            <div class="cta-buttons">
                <a href="/create-memo.html" class="btn btn-primary">Create Secure Memo</a>
                <a href="/about.html" class="btn btn-secondary">Learn More</a>
            </div>
        </div>

        <div class="features-section">
            <h2>How It Works</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <h3>🔐 Encrypt</h3>
                    <p>Your message is encrypted in your browser before being sent to our servers</p>
                </div>
                <div class="feature-card">
                    <h3>🔗 Share</h3>
                    <p>Get a secure URL with the encryption password in the hashtag</p>
                </div>
                <div class="feature-card">
                    <h3>💥 Self-Destruct</h3>
                    <p>Once read or expired, the memo is permanently deleted from our database</p>
                </div>
            </div>
        </div>

        <div class="security-section">
            <h2>Security Features</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <h3>🔒 Client-Side Encryption</h3>
                    <p>Your message is encrypted in your browser using AES-256 before transmission</p>
                </div>
                <div class="feature-card">
                    <h3>🗑️ Auto-Delete</h3>
                    <p>Memos are automatically deleted after being read or expired</p>
                </div>
                <div class="feature-card">
                    <h3>🌐 No Password Storage</h3>
                    <p>Encryption passwords are never stored on our servers</p>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a></p>
    </footer>

    <script>
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
    </script>
</body>
</html>`;
}

export async function getAboutHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>About - securememo.app</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/" class="nav-link">Home</a></li>
                <li><a href="/about.html" class="nav-link active">About</a></li>
                <li><a href="/create-memo.html" class="nav-link">Create Secure Memo</a></li>
            </ul>
        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>About securememo.app</h1>
            <p>securememo.app is a privacy-focused application that allows you to create encrypted messages that self-destruct after being read or expired. Built with security and privacy as the top priorities.</p>
            
            <div class="tech-stack">
                <h2>Technology Stack</h2>
                <ul>
                    <li><strong>Cloudflare Workers:</strong> Serverless compute platform for global performance</li>
                    <li><strong>D1 Database:</strong> SQLite-powered database for secure storage</li>
                    <li><strong>Web Crypto API:</strong> Client-side AES-256 encryption</li>
                    <li><strong>HTML/CSS/JavaScript:</strong> Modern, responsive web interface</li>
                    <li><strong>Source code available on GitHub:</strong> <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code on GitHub</a></li>
                </ul>
            </div>

            <div class="features-detail">
                <h2>Security Features</h2>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>🔐 Client-Side Encryption</h3>
                        <p>All encryption happens in your browser using the Web Crypto API. Your message is encrypted with AES-256 before being sent to our servers.</p>
                    </div>
                    <div class="feature-item">
                        <h3>🔑 Password in URL Hash</h3>
                        <p>The encryption password is included in the URL hashtag, which is never sent to our servers. Only you and the recipient have access to it.</p>
                    </div>
                    <div class="feature-item">
                        <h3>💥 Self-Destructing Messages</h3>
                        <p>Once a memo is read or expired, it's immediately and permanently deleted from our database. No traces remain.</p>
                    </div>
                    <div class="feature-item">
                        <h3>🌐 No Password Storage</h3>
                        <p>We never store encryption passwords on our servers. They exist only in the URL and your browser's memory.</p>
                    </div>
                    <div class="feature-item">
                        <h3>⚡ Global Performance</h3>
                        <p>Built on Cloudflare's global network for lightning-fast access from anywhere in the world.</p>
                    </div>
                    <div class="feature-item">
                        <h3>🔒 Privacy First</h3>
                        <p>No user accounts required. No tracking. No analytics. Your privacy is our priority.</p>
                    </div>
                </div>
            </div>

            <div class="usage-section">
                <h2>How to Use</h2>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>1. Create a Memo</h3>
                        <p>Go to "Create Secure Memo" and type your message. Choose an expiry time (8h, 24h, 48h, or delete on read with 30-day maximum). The system will generate a random encryption password.</p>
                    </div>
                    <div class="feature-item">
                        <h3>2. Share the Link</h3>
                        <p>Copy the generated URL and share it with your recipient. The password is included in the hashtag.</p>
                    </div>
                    <div class="feature-item">
                        <h3>3. Self-Destruct</h3>
                        <p>When the recipient opens the link and enters the password, the memo will be decrypted and then permanently deleted if read, or deleted automatically if expired. Expired memos are automatically cleaned up every 8 hours.</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a></p>
    </footer>

    <script>
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
    </script>
</body>
</html>`;
}

export async function getCreateMemoHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Create Secure Memo - securememo.app</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/" class="nav-link">Home</a></li>
                <li><a href="/about.html" class="nav-link">About</a></li>
                <li><a href="/create-memo.html" class="nav-link active">Create Secure Memo</a></li>
            </ul>
        </div>
    </nav>

    <main class="main-content">
        <div class="memo-container">
            <div class="memo-card">
                <h1>Create Secure Memo</h1>
                <p class="memo-description">Your message will be encrypted in your browser and self-destruct after being read or expired.</p>
                
                <form id="memoForm" class="memo-form">
                    <div class="form-group">
                        <label for="message">Your Message</label>
                        <textarea id="message" name="message" required 
                                  placeholder="Type your secret message here..." 
                                  rows="8" maxlength="10000"></textarea>
                        <small class="form-help">Maximum 10,000 characters</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="expiryHours">Expiry Time (Optional)</label>
                        <select id="expiryHours" name="expiryHours">
                            <option value="0">Delete on read (max 30 days)</option>
                            <option value="8">8 hours</option>
                            <option value="24">24 hours</option>
                            <option value="48">48 hours</option>
                        </select>
                        <small class="form-help">Delete on read: Memo will be deleted when read OR after 30 days, whichever comes first</small>
                    </div>
                    
                    <div class="form-group">
                        <div class="cf-turnstile" data-sitekey="{{TURNSTILE_SITE_KEY}}"></div>
                        <small class="form-help">Please complete the security challenge to create your memo</small>
                    </div>
                    
                    <button type="submit" class="btn btn-primary">Create Secure Memo</button>
                </form>
                
                <div id="result" class="result-section" style="display: none;">
                    <h3>✅ Memo Created Successfully!</h3>
                    <div class="memo-url-section">
                        <label for="memoUrl">Share this URL with your recipient:</label>
                        <div class="url-copy-container">
                            <input type="text" id="memoUrl" readonly onclick="this.select(); document.execCommand('copy'); showMessage('URL copied to clipboard!', 'success');">
                            <button type="button" id="copyUrl" class="btn btn-primary">Copy</button>
                        </div>
                    </div>
                    <div class="memo-warning">
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>The memo will be deleted after being read or when the expiry time is reached</li>
                            <li>The encryption password is included in the URL hashtag</li>
                            <li>Share only the URL - the recipient doesn't need a separate password</li>
                            <li>This page will be cleared when you navigate away</li>
                        </ul>
                    </div>
                </div>
                
                <div id="message" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a></p>
    </footer>

    <script>
        // Turnstile site key - this will be replaced by the server
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

        // Initialize Turnstile widget
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

        // Initialize when DOM is ready
        function initializePage() {
            highlightCurrentPage();
            initTurnstile();
        }

        // Wait for both DOM and Turnstile script to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializePage);
        } else {
            initializePage();
        }

        // Generate a random password
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

        // Encrypt message using Web Crypto API
        async function encryptMessage(message, password) {
            const encoder = new TextEncoder();
            const data = encoder.encode(message);
            
            // Generate a random salt
            const salt = crypto.getRandomValues(new Uint8Array(16));
            
            // Derive key from password
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
            
            // Encrypt the data
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
            
            // Check if Turnstile is completed
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
                
                // Send to API (Pages will proxy to Workers)
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
                    // Generate URL with password in hashtag
                    const memoUrl = window.location.origin + '/read-memo.html?id=' + result.memoId + '#' + password;
                    
                    // Show result
                    document.getElementById('memoUrl').value = memoUrl;
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

        function showMessage(message, type) {
            const messageDiv = document.getElementById('message');
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = message;
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    </script>
</body>
</html>`;
}

export async function getReadMemoHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Read Secure Memo - securememo.app</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/" class="nav-link">Home</a></li>
                <li><a href="/about.html" class="nav-link">About</a></li>
                <li><a href="/create-memo.html" class="nav-link">Create Secure Memo</a></li>
            </ul>
        </div>
    </nav>

    <main class="main-content">
        <div class="memo-container">
            <div class="memo-card">
                <h1>Read Secure Memo</h1>
                <p class="memo-description">Enter the password to decrypt and read the memo. It will be deleted after being read or expired.</p>
                
                <div id="passwordForm" class="memo-form">
                    <form id="decryptForm">
                        <div class="form-group">
                            <label for="password">Encryption Password</label>
                            <input type="text" id="password" name="password" required 
                                   placeholder="Enter the encryption password from the URL hashtag">
                            <small class="form-help">The password is in the URL hashtag (after the # symbol)</small>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">Decrypt Memo</button>
                    </form>
                </div>
                
                <div id="memoContent" class="memo-content" style="display: none;">
                    <h3>📝 Your Secure Memo</h3>
                    <div class="memo-message">
                        <p id="decryptedMessage"></p>
                    </div>
                    <div class="memo-info">
                        <p><strong>Status:</strong> <span id="memoStatus">Memo has been read and deleted</span></p>
                    </div>
                    <div class="memo-actions">
                        <a href="/create-memo.html" class="btn btn-primary">Create New Memo</a>
                        <a href="/" class="btn btn-secondary">Go Home</a>
                    </div>
                </div>
                
                <div id="errorContent" class="error-content" style="display: none;">
                    <h3>❌ Error</h3>
                    <p id="errorMessage"></p>
                    <div class="memo-actions">
                        <a href="/create-memo.html" class="btn btn-primary">Create New Memo</a>
                        <a href="/" class="btn btn-secondary">Go Home</a>
                    </div>
                </div>
                
                <div id="message" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a></p>
    </footer>

    <script>
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

        // Get memo ID from URL
        function getMemoId() {
            const urlParams = new URLSearchParams(window.location.search);
            return urlParams.get('id');
        }

        // Get password from URL hashtag
        function getPasswordFromHash() {
            return window.location.hash.substring(1);
        }

        // Decrypt message using Web Crypto API
        async function decryptMessage(encryptedData, password) {
            try {
                const encoder = new TextEncoder();
                
                // Decode the encrypted data
                const encryptedBytes = new Uint8Array(
                    atob(encryptedData).split('').map(char => char.charCodeAt(0))
                );
                
                // Extract salt (first 16 bytes), IV (next 12 bytes), and encrypted data
                const salt = encryptedBytes.slice(0, 16);
                const iv = encryptedBytes.slice(16, 28);
                const encrypted = encryptedBytes.slice(28);
                
                // Derive key from password
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
                
                // Decrypt the data
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
            const passwordFromHash = getPasswordFromHash();
            if (passwordFromHash) {
                document.getElementById('password').value = passwordFromHash;
            }
            
            // Add form submission event listener after DOM is loaded
            const passwordForm = document.getElementById('decryptForm');
            if (passwordForm) {
                passwordForm.addEventListener('submit', async (e) => {
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
                    
                    try {
                        // Fetch the encrypted memo
                        const response = await fetch('/api/read-memo?id=' + memoId, {
                            method: 'GET',
                            headers: {
                                'Content-Type': 'application/json'
                            }
                        });
                        
                        const result = await response.json();
                        
                        if (response.ok) {
                            // Decrypt the message
                            const decryptedMessage = await decryptMessage(result.encryptedMessage, password);
                            
                            // Display the message
                            document.getElementById('decryptedMessage').textContent = decryptedMessage;
                            document.getElementById('memoContent').style.display = 'block';
                            document.getElementById('passwordForm').style.display = 'none';
                            
                            // Clear the password field
                            document.getElementById('password').value = '';
                            
                            // The memo is automatically deleted by the server after reading
                        } else {
                            if (result.error === 'Memo not found') {
                                showError('This memo has already been read and deleted, or it has expired.');
                            } else if (result.error === 'Memo expired') {
                                showError('This memo has expired and has been deleted.');
                            } else {
                                showError(result.error || 'Failed to read memo');
                            }
                        }
                    } catch (error) {
                        if (error.message.includes('Failed to decrypt')) {
                            showError('Invalid password. Please check the password from the URL hashtag.');
                        } else {
                            showError('An error occurred while reading the memo');
                        }
                        console.error('Error:', error);
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
            const messageDiv = document.getElementById('message');
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = message;
            messageDiv.style.display = 'block';
            
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }

        highlightCurrentPage();
    </script>
</body>
</html>`;
}

export async function getToSHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Terms of Service - securememo.app</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/" class="nav-link">Home</a></li>
                <li><a href="/about.html" class="nav-link">About</a></li>
                <li><a href="/create-memo.html" class="nav-link">Create Secure Memo</a></li>
            </ul>
        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>Terms of Service</h1>
            <p><strong>Last updated:</strong> 27.6.2025</p>
            
            <div class="tech-stack">
                <h2>1. Service Description</h2>
                <p>securememo.app is a secure messaging service that allows users to create encrypted memos that self-destruct after being read or expired. The service uses client-side encryption to ensure that memo content is never accessible to our servers.</p>
            </div>

            <div class="features-detail">
                <h2>2. Acceptable Use</h2>
                <p>You agree to use this service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                <ul>
                    <li>Use the service to transmit illegal, harmful, threatening, abusive, or defamatory content</li>
                    <li>Attempt to bypass security measures or CAPTCHA protection</li>
                    <li>Use automated tools or scripts to create memos</li>
                    <li>Share memos containing malware, phishing links, or other harmful content</li>
                    <li>Use the service for spam or mass unsolicited messaging</li>
                    <li>Attempt to reverse engineer or compromise the service</li>
                </ul>
            </div>

            <div class="usage-section">
                <h2>3. Privacy & Data Handling</h2>
                <ul>
                    <li><strong>No Content Access:</strong> We cannot access, read, or recover your memo content. All encryption happens in your browser.</li>
                    <li><strong>No Personal Data:</strong> We do not collect personal information or require user accounts.</li>
                    <li><strong>Security Logging:</strong> We temporarily log IP addresses and security-related metadata strictly for abuse mitigation and to protect service integrity. These logs are never used for tracking or profiling.</li>
                    <li><strong>Automatic Deletion:</strong> Memos are automatically deleted after being read or when they expire.</li>
                    <li><strong>No Recovery:</strong> Once a memo is deleted, it cannot be recovered.</li>
                    <li><strong>GDPR Compliance:</strong> This service does not collect personal data as defined under the EU GDPR.</li>
                </ul>
            </div>

            <div class="features-detail">
                <h2>4. Service Limitations</h2>
                <ul>
                    <li><strong>Message Size:</strong> Maximum 10,000 characters per memo</li>
                    <li><strong>Expiry Times:</strong> 8 hours, 24 hours, 48 hours, or delete on read (max 30 days)</li>
                    <li><strong>Availability:</strong> Service provided "as is" without guarantees of availability</li>
                    <li><strong>No Delivery Guarantee:</strong> We cannot guarantee that memos will be delivered or read</li>
                </ul>
            </div>

            <div class="usage-section">
                <h2>5. Security & Disclaimers</h2>
                <ul>
                    <li><strong>User Responsibility:</strong> You are responsible for securely sharing memo URLs and protecting the passwords.</li>
                    <li><strong>No Warranty:</strong> The service is provided without warranties of any kind.</li>
                    <li><strong>Limitation of Liability:</strong> We are not liable for any damages arising from use of the service.</li>
                    <li><strong>Security Measures:</strong> While we implement security measures, no system is 100% secure.</li>
                </ul>
            </div>

            <div class="features-detail">
                <h2>6. Termination</h2>
                <p>We reserve the right to terminate or suspend access to the service for violations of these terms or for any other reason at our discretion.</p>
            </div>

            <div class="usage-section">
                <h2>7. Changes to Terms</h2>
                <p>We may update these terms at any time. Continued use of the service constitutes acceptance of updated terms.</p>
            </div>

            <div class="features-detail">
                <h2>8. Contact</h2>
                <p>For questions about these terms, please visit our <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">GitHub repository</a>.</p>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a></p>
    </footer>

    <script>
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
    </script>
</body>
</html>`;
} 