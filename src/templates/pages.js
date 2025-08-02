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
                    <p>Get a secure URL and separate encryption password to share with your recipient</p>
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
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">No tracking, no ads, no nonsense.</p>
    </footer>

    <script src="/js/common.js" defer></script>
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
            <p>securememo.app is a privacy-focused application that allows you to create encrypted messages that self-destruct after being read or expired. Built with security and privacy as the top priorities. Source code available on GitHub.</p>
            
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
                        <h3>🔑 Separate Password Sharing</h3>
                        <p>The encryption password is generated separately from the URL and should be shared through a different channel for enhanced security.</p>
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
                        <p>Go to "Create Secure Memo” and type your message. Choose an expiry time (8h, 1d, 2d, or a maximum of 30 days). Memos are deleted when read or expired. The system will generate a random encryption password.</p>
                    </div>
                    <div class="feature-item">
                        <h3>2. Share the Link and Password</h3>
                        <p>Copy the generated URL and password, then share them with your recipient through separate channels for enhanced security.</p>
                    </div>
                    <div class="feature-item">
                        <h3>3. Self-Destruct</h3>
                        <p>When the recipient opens the link and enters the password separately, the memo will be decrypted and then permanently deleted if read, or deleted automatically if expired. Expired memos are automatically cleaned up every 1 hours.</p>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">No tracking, no ads, no nonsense.</p>
    </footer>

    <script src="/js/common.js" defer></script>
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
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" integrity="sha384-8tTMUpBXDOsQTxlbB/LdlISG/7nPjF1RWr/rNDxPsh5quEpybtbFHO/flV79t6uO" crossorigin="anonymous" async defer></script>
    <script src="/js/create-memo.js" defer></script>
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
                            <option value="0">Delete on read or 30 days</option>
                            <option value="8">Delete on read or 8 hours</option>
                            <option value="24">Delete on read or 1 day</option>
                            <option value="48">Delete on read or 2 days</option>
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
                        <label for="memoUrl">Memo URL (share this with your recipient):</label>
                        <div class="url-copy-container">
                            <input type="text" id="memoUrl" readonly onclick="this.select(); document.execCommand('copy'); showMessage('Memo URL copied to clipboard!', 'success');">
                            <button type="button" id="copyUrl" class="btn btn-primary">Copy URL</button>
                        </div>
                        <small class="form-help">This is the secure link to your memo. Share this URL with your recipient.</small>
                    </div>
                    
                    <div class="memo-password-section">
                        <label for="memoPassword">Encryption Password (share this separately):</label>
                        <div class="url-copy-container">
                            <input type="text" id="memoPassword" readonly onclick="this.select(); document.execCommand('copy'); showMessage('Password copied to clipboard!', 'success');">
                            <button type="button" id="copyPassword" class="btn btn-primary">Copy Password</button>
                        </div>
                        <small class="form-help">This is the encryption password. Share this separately from the URL for enhanced security. This is not saved on our servers, recovery not possible after leaving this page.</small>
                    </div>
                    
                    <div class="memo-warning">
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>The memo will be deleted after being read or when the expiry time is reached</li>
                            <li>Share the URL and password separately for maximum security</li>
                            <li>The recipient needs both the URL and password to access the memo</li>
                            <li>This page will be cleared when you navigate away</li>
                        </ul>
                    </div>
                </div>
                
                <div id="statusMessage" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">No tracking, no ads, no nonsense.</p>
    </footer>

    <script src="/js/common.js" defer></script>
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
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" integrity="sha384-8tTMUpBXDOsQTxlbB/LdlISG/7nPjF1RWr/rNDxPsh5quEpybtbFHO/flV79t6uO" crossorigin="anonymous" async defer></script>
    <script src="/js/read-memo.js" defer></script>
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
                <p class="memo-description">Enter the password to decrypt and read the memo. The password should have been shared with you separately from the URL. The memo will be deleted after being read or expired.</p>
                
                <div id="passwordForm" class="memo-form">
                    <form id="decryptForm">
                        <div class="form-group">
                            <label for="password">Encryption Password</label>
                            <input type="text" id="password" name="password" required 
                                   placeholder="Enter the encryption password shared with you separately">
                            <small class="form-help">The password should have been shared with you separately from the memo URL</small>
                        </div>
                        <div class="form-group">
                            <div class="cf-turnstile" data-sitekey="{{TURNSTILE_SITE_KEY}}"></div>
                            <small class="form-help">Please complete the security challenge to decrypt your memo</small>
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
                
                <div id="statusMessage" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">No tracking, no ads, no nonsense.</p>
    </footer>

    <script src="/js/common.js" defer></script>
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
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">No tracking, no ads, no nonsense.</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
} 