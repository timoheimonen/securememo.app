export async function getIndexHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>securememo.app - Encrypted Memos</title>
    <link rel="stylesheet" href="/styles.css">
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
            <p>Create encrypted memos that self-destruct after being read. Your secrets stay safe.</p>
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
                    <p>Once read, the memo is permanently deleted from our database</p>
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
                    <p>Memos are automatically deleted after being read once</p>
                </div>
                <div class="feature-card">
                    <h3>🌐 No Password Storage</h3>
                    <p>Encryption passwords are never stored on our servers</p>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a></p>
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
            <p>securememo.app is a privacy-focused application that allows you to create encrypted messages that self-destruct after being read. Built with security and privacy as the top priorities.</p>
            
            <div class="tech-stack">
                <h2>Technology Stack</h2>
                <ul>
                    <li><strong>Cloudflare Workers:</strong> Serverless compute platform for global performance</li>
                    <li><strong>D1 Database:</strong> SQLite-powered database for secure storage</li>
                    <li><strong>Web Crypto API:</strong> Client-side AES-256 encryption</li>
                    <li><strong>HTML/CSS/JavaScript:</strong> Modern, responsive web interface</li>
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
                        <p>Once a memo is read, it's immediately and permanently deleted from our database. No traces remain.</p>
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
                        <p>When the recipient opens the link and enters the password, the memo will be decrypted and then permanently deleted. Expired memos are automatically cleaned up every 8 hours.</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a></p>
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
                <p class="memo-description">Your message will be encrypted in your browser and self-destruct after being read.</p>
                
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
                            <button type="button" id="copyUrl" class="btn btn-secondary">Copy</button>
                        </div>
                    </div>
                    <div class="memo-password-section">
                        <label for="memoPassword">Encryption Password:</label>
                        <div class="password-copy-container">
                            <input type="text" id="memoPassword" readonly onclick="this.select(); document.execCommand('copy'); showMessage('Password copied to clipboard!', 'success');">
                            <button type="button" id="copyPassword" class="btn btn-secondary">Copy</button>
                        </div>
                        <small class="form-help">⚠️ Save this password! It's not stored on our servers and cannot be recovered.</small>
                    </div>
                    <div class="memo-warning">
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>The memo will be deleted after being read or when the expiry time is reached</li>
                            <li>Share both the URL and password with your recipient</li>
                            <li>This page will be cleared when you navigate away</li>
                        </ul>
                    </div>
                </div>
                
                <div id="message" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a></p>
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
            
            // Check if Turnstile is completed
            const turnstileResponse = turnstile.getResponse();
            if (!turnstileResponse) {
                showMessage('Please complete the security challenge', 'error');
                return;
            }
            
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
                
                // Send to server
                const response = await fetch('/api/create-memo', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        encryptedMessage,
                        expiryTime,
                        cfTurnstileResponse: turnstileResponse
                    })
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    // Generate URL with password in hashtag
                    const memoUrl = window.location.origin + '/read-memo.html?id=' + result.memoId + '#' + password;
                    
                    // Show result
                    document.getElementById('memoUrl').value = memoUrl;
                    document.getElementById('memoPassword').value = password;
                    document.getElementById('result').style.display = 'block';
                    document.getElementById('memoForm').style.display = 'none';
                    
                    // Clear form
                    document.getElementById('message').value = '';
                    
                    // Reset Turnstile
                    turnstile.reset();
                } else {
                    showMessage(result.error || 'Failed to create memo', 'error');
                    // Reset Turnstile on error
                    turnstile.reset();
                }
            } catch (error) {
                showMessage('An error occurred while creating the memo', 'error');
                console.error('Error:', error);
                // Reset Turnstile on error
                turnstile.reset();
            }
        });

        // Copy URL to clipboard
        document.getElementById('copyUrl').addEventListener('click', () => {
            const urlInput = document.getElementById('memoUrl');
            urlInput.select();
            document.execCommand('copy');
            showMessage('URL copied to clipboard!', 'success');
        });

        // Copy password to clipboard
        document.getElementById('copyPassword').addEventListener('click', () => {
            const passwordInput = document.getElementById('memoPassword');
            passwordInput.select();
            document.execCommand('copy');
            showMessage('Password copied to clipboard!', 'success');
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

        highlightCurrentPage();
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
                <p class="memo-description">Enter the password to decrypt and read the memo. It will be deleted after reading.</p>
                
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
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a></p>
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