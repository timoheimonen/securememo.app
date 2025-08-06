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
            <button class="hamburger" id="hamburger" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
        </div>
    </nav>

    <main class="main-content">
        <div class="hero-section">
            <h1>securememo.app</h1>
            <p><span>Create</span> <span>encrypted</span> <span>memos</span> <span>that</span> <span>self-destruct</span> <span>after</span> <span>being</span> <span>read</span> <span>or</span> <span>expired.</span> <span>Your</span> <span>secrets</span> <span>stay</span> <span>safe.</span></p>
            <div class="cta-buttons">
                <a href="/create-memo.html" class="btn btn-primary">Create Secure Memo</a>
                <a href="/about.html" class="btn btn-secondary">Learn More</a>
            </div>
        </div>

        <div class="features-section">
            <h2>How It Works</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <h3>🔐 Encrypt in Browser</h3>
                    <p>Type your message. It gets encrypted right in your browser using strong AES-256 encryption before ever touching our servers.</p>
                </div>
                <div class="feature-card">
                    <h3>🔗 Share Securely</h3>
                    <p>Get a unique URL and a separate random password, and share them through different channels for extra security.</p>
                </div>
                <div class="feature-card">
                    <h3>💥 Auto-Destruct</h3>
                    <p>The memo deletes itself permanently after it's read or the time limit expires (from 8 hours to 30 days).</p>
                </div>
            </div>
        </div>

        <div class="security-section">
            <h2>Security Features</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <h3>🔒 True Client-Side Encryption</h3>
                    <p>Your message is encrypted in-browser with AES-256-GCM and a strong key derivation (600,000+ iterations). We never see the plaintext.</p>
                </div>
                <div class="feature-card">
                    <h3>🗑️ Reliable Auto-Delete</h3>
                    <p>Memos vanish forever after reading or expiration, with automatic cleanup every hour. No backups or recovery possible.</p>
                </div>
                <div class="feature-card">
                    <h3>🌐 Zero Password Knowledge</h3>
                    <p>We generate and handle passwords entirely in your browser. They're never sent to or stored on our servers.</p>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a> | <a href="/privacy.html">Privacy Notice</a></p>
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
            <button class="hamburger" id="hamburger" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>About securememo.app</h1>
            <p>securememo.app is a privacy-focused application that allows you to create encrypted memos that self-destruct after being read or expired. Built with security and privacy as the top priorities. Source code available on GitHub.</p>
            
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
                        <h3>💥 Self-Destructing Memos</h3>
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
                        <p>Go to "Create Secure Memo” and type your message. Choose an expiry time (8h, 1d, 2d, 1 week or a maximum of 30 days). Memos are deleted when read or expired. The system will generate a random encryption password.</p>
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

            <div class="cta-section">
                <h2>Ready to Get Started?</h2>
                <p>Create your first secure memo now and experience true end-to-end encryption.</p>
                <div class="cta-buttons">
                    <a href="/create-memo.html" class="btn btn-primary">Create Secure Memo</a>
                    <a href="/" class="btn btn-secondary">Back to Home</a>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a> | <a href="/privacy.html">Privacy Notice</a></p>
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
            <button class="hamburger" id="hamburger" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
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
                        <label for="expiryHours">Expiry Time</label>
                        <select id="expiryHours" name="expiryHours">
                            <option value="8">Delete on read or 8 hours</option>
                            <option value="24">Delete on read or 1 day</option>
                            <option value="48">Delete on read or 2 days</option>
                            <option value="168">Delete on read or 1 week</option>
                            <option value="720">Delete on read or 30 days</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <div class="cf-turnstile" data-sitekey="{{TURNSTILE_SITE_KEY}}"></div>
                        <small class="form-help">Please complete the security challenge to create your memo</small>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" id="submitButton">Create Secure Memo</button>
                    
                    <!-- Loading indicator (hidden by default) -->
                    <div id="loadingIndicator" class="loading-spinner" style="display: none;">
                        <div class="spinner"></div>
                        <p>Encrypting your message securely... This may take a moment on older devices.</p>
                    </div>
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
                            <input type="password" id="memoPassword" readonly onclick="this.select(); document.execCommand('copy'); showMessage('Password copied to clipboard!', 'success');">
                            <button type="button" id="togglePassword" class="btn btn-primary" style="margin-right: 8px;">Show</button>
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
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a> | <a href="/privacy.html">Privacy Notice</a></p>
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
                            <div class="password-input-container">
                                <input type="password" id="password" name="password" required 
                                       placeholder="Enter the encryption password shared with you separately">
                                <button type="button" id="toggleReadPassword" class="btn btn-primary">Show</button>
                            </div>
                            <small class="form-help">The password should have been shared with you separately from the memo URL</small>
                        </div>
                        <div class="form-group">
                            <div class="cf-turnstile"></div>
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
                        <p><strong>Status:</strong> <span id="memoStatus">Memo decrypted. Deleting in progress... Please wait.</span></p>
                        <div id="deletionSpinner" class="loading-spinner" style="display: none;">
                            <div class="spinner"></div>
                            <p>Deleting memo securely...</p>
                        </div>
                    </div>
                    <div class="form-group" style="margin-top: 1rem;">
                        <div class="cf-turnstile-confirmation"></div>
                        <small class="form-help">Please complete the security challenge to confirm memo deletion</small>
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
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a> | <a href="/privacy.html">Privacy Notice</a></p>
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
            <button class="hamburger" id="hamburger" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>Terms of Service</h1>
            <p><strong>Last updated:</strong> August 05, 2025</p>
            
            <div class="tech-stack">
                <h2>Table of Contents</h2>
                <ol>
                    <li><a href="#service-description">Service Description</a></li>
                    <li><a href="#acceptable-use">Acceptable Use</a></li>
                    <li><a href="#privacy-data">Privacy & Data Handling</a></li>
                    <li><a href="#service-limitations">Service Limitations</a></li>
                    <li><a href="#security-disclaimers">Security & Disclaimers</a></li>
                    <li><a href="#intellectual-property">Intellectual Property</a></li>
                    <li><a href="#indemnification">Indemnification</a></li>
                    <li><a href="#termination">Termination</a></li>
                    <li><a href="#changes-terms">Changes to Terms</a></li>
                    <li><a href="#governing-law">Governing Law & Jurisdiction</a></li>
                    <li><a href="#miscellaneous">Miscellaneous</a></li>
                    <li><a href="#contact">Contact</a></li>
                </ol>
            </div>

            <div class="features-detail" id="service-description">
                <h2>1. Service Description</h2>
                <p>securememo.app is a secure messaging service that allows users to create encrypted memos that self-destruct after being read or expired. The service uses client-side encryption to ensure that memo content is never accessible to our servers.</p>
            </div>

            <div class="usage-section" id="acceptable-use">
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

            <div class="features-detail" id="privacy-data">
                <h2>3. Privacy & Data Handling</h2>
                <ul>
                    <li><strong>No Content Access:</strong> We cannot access, read, or recover your memo content. All encryption happens in your browser.</li>
                    <li><strong>No Personal Data:</strong> We do not collect personal information or require user accounts.</li>
                    <li><strong>Security Logging:</strong> We temporarily log IP addresses and security-related metadata strictly for abuse mitigation and to protect service integrity. These logs are never used for tracking or profiling.</li>
                    <li><strong>Automatic Deletion:</strong> Memos are automatically deleted after being read or when they expire.</li>
                    <li><strong>No Recovery:</strong> Once a memo is deleted, it cannot be recovered.</li>
                    <li><strong>GDPR Compliance:</strong> This service does not collect personal data as defined under the EU GDPR.</li>
                </ul>
                <p>For more details, please review our <a href="/privacy.html">Privacy Notice</a>.</p>
            </div>

            <div class="usage-section" id="service-limitations">
                <h2>4. Service Limitations</h2>
                <ul>
                    <li><strong>Message Size:</strong> Maximum 10,000 characters per memo</li>
                    <li><strong>Expiry Times:</strong> 8 hours, 24 hours, 48 hours, or delete on read (max 30 days)</li>
                    <li><strong>Availability:</strong> Service provided "as is" without guarantees of availability</li>
                    <li><strong>No Delivery Guarantee:</strong> We cannot guarantee that memos will be delivered or read</li>
                </ul>
            </div>

            <div class="features-detail" id="security-disclaimers">
                <h2>5. Security & Disclaimers</h2>
                <ul>
                    <li><strong>User Responsibility:</strong> You are responsible for securely sharing memo URLs and protecting the passwords. If passwords are lost, memos cannot be recovered.</li>
                    <li><strong>No Warranty:</strong> The service is provided without warranties of any kind. Our encryption services are provided on an "as-is" and "as-available" basis. We do not warrant that the encryption will be uninterrupted, error-free, or secure from all potential threats.</li>
                    <li><strong>Limitation of Liability:</strong> We are not liable for any damages arising from use of the service. You acknowledge that no method of electronic transmission or storage is 100% secure, and we are not responsible for any unauthorized access or interception of your memos. Use of our encryption services is at your own risk.</li>
                    <li><strong>Security Measures:</strong> While we implement security measures, no system is 100% secure.</li>
                    <li><strong>Export Controls:</strong> You agree not to use the service in violation of any export control laws, including those restricting use in sanctioned countries.</li>
                </ul>
            </div>

            <div class="usage-section" id="intellectual-property">
                <h2>6. Intellectual Property</h2>
                <p>The Service and all materials provided through it, including but not limited to text, graphics, logos, and software, are the property of securememo.app or its licensors and are protected by copyright, trademark, and other intellectual property laws. You agree not to modify, reproduce, distribute, or create derivative works based on our content without explicit permission, except for personal, non-commercial use within the Service.</p>
                <p><strong>Copyright & DMCA Policy:</strong> If you believe your copyright has been infringed, please contact us at timo.heimonen@gmail.com with the required information under the DMCA (e.g., identification of the work, your contact details, and a statement of good faith belief).</p>
            </div>

            <div class="features-detail" id="indemnification">
                <h2>7. Indemnification</h2>
                <p>You agree to defend, indemnify, and hold harmless securememo.app and its affiliates, officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your access to or use of our Services, including any violation of these Terms by you.</p>
            </div>

            <div class="usage-section" id="termination">
                <h2>8. Termination</h2>
                <p>We reserve the right to terminate or suspend access to the service for violations of these terms or for any other reason at our discretion.</p>
            </div>

            <div class="features-detail" id="changes-terms">
                <h2>9. Changes to Terms</h2>
                <p>We may update these terms at any time. Continued use of the service constitutes acceptance of updated terms.</p>
            </div>

            <div class="usage-section" id="governing-law">
                <h2>10. Governing Law & Jurisdiction</h2>
                <p>These Terms of Service and any separate agreements whereby we provide you Services shall be governed by and construed in accordance with the laws of Finland, without regard to its conflict of law principles. Any disputes shall be resolved in the courts of Helsinki, Finland.</p>
            </div>

            <div class="features-detail" id="miscellaneous">
                <h2>11. Miscellaneous</h2>
                <ul>
                    <li><strong>Severability:</strong> If any provision of these Terms is found to be invalid or unenforceable by a court of competent jurisdiction, such provision shall be severed from the Terms, and the remaining provisions will remain in full force and effect.</li>
                    <li><strong>Assignment:</strong> You may not assign or transfer these Terms, by operation of law or otherwise, without our prior written consent. We may assign these Terms at our sole discretion without notice to you.</li>
                    <li><strong>Waiver:</strong> No waiver of any term shall be deemed a further or continuing waiver unless in writing.</li>
                    <li><strong>Children's Privacy:</strong> Our service is not intended for children under 13 (or 16 in some jurisdictions). We do not knowingly collect data from children. If we become aware of such data, we will delete it immediately.</li>
                </ul>
            </div>

            <div class="usage-section" id="contact">
                <h2>12. Contact</h2>
                <p>For questions about these terms, please visit our <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">GitHub repository</a> or email timo.heimonen@gmail.com.</p>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a> | <a href="/privacy.html">Privacy Notice</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">No tracking, no ads, no nonsense.</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
}

export async function getPrivacyHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Notice - securememo.app</title>
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
            <button class="hamburger" id="hamburger" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>Privacy Notice for securememo.app</h1>
            <p><strong>Last updated:</strong> August 05, 2025</p>
            
            <div class="tech-stack">
                <h2>Table of Contents</h2>
                <ol>
                    <li><a href="#information-collected">Information We Collect</a></li>
                    <li><a href="#how-we-use">How We Use Information</a></li>
                    <li><a href="#data-sharing">Data Sharing and Disclosure</a></li>
                    <li><a href="#data-security">Data Security</a></li>
                    <li><a href="#data-retention">Data Retention</a></li>
                    <li><a href="#your-rights">Your Rights and Choices</a></li>
                    <li><a href="#children-privacy">Children's Privacy</a></li>
                    <li><a href="#international-transfers">International Data Transfers</a></li>
                    <li><a href="#changes-notice">Changes to This Privacy Notice</a></li>
                    <li><a href="#contact">Contact Us</a></li>
                </ol>
            </div>

            <div class="features-detail">
                <p>securememo.app ("we," "us," or "our") is committed to protecting your privacy. This Privacy Notice explains how we handle information in connection with our service, which allows users to create and share encrypted memos that self-destruct after being read or expired. Our service is designed with privacy at its core: all encryption occurs client-side in your browser, and we do not have access to your memo content.</p>
                <p>By using securememo.app, you agree to the practices described in this Privacy Notice. If you do not agree, please do not use our service.</p>
            </div>

            <div class="usage-section" id="information-collected">
                <h2>1. Information We Collect</h2>
                <p>We collect minimal information to operate the service securely and efficiently. Specifically:</p>
                <ul>
                    <li><strong>Memo Data:</strong> When you create a memo, we store only the encrypted version of your message on our servers (using Cloudflare Workers and D1 Database). The encryption key (password) is generated and handled entirely in your browser and is never sent to or stored by us. Memos are automatically deleted after being read or when they expire (options: 8 hours, 1 day, 2 days, 1 week, or 30 days).</li>
                    <li><strong>No Personal Information:</strong> We do not require user accounts, email addresses, names, or any other personal identifiers. We do not collect or store any data that could directly identify you.</li>
                    <li><strong>Security-Related Data:</strong> For abuse prevention and service integrity:
                        <ul>
                            <li>We temporarily log IP addresses and request metadata (e.g., timestamps) to detect and mitigate spam, bots, or malicious activity.</li>
                            <li>We use Cloudflare Turnstile CAPTCHA to prevent automated abuse. Turnstile is designed to protect privacy and does not track users across sites.</li>
                        </ul>
                    </li>
                </ul>
                <p><strong>No Analytics or Tracking:</strong> We do not use cookies, tracking pixels, third-party analytics, or advertising tools. There is no user profiling, behavioral tracking, or data collection for marketing purposes.</p>
                <p>We do not collect sensitive personal data, location information, or device identifiers beyond what is necessary for basic service operation.</p>
            </div>

            <div class="features-detail" id="how-we-use">
                <h2>2. How We Use Information</h2>
                <p>The limited information we collect is used solely to:</p>
                <ul>
                    <li><strong>Provide the core service:</strong> Store encrypted memos temporarily and facilitate their secure retrieval and deletion.</li>
                    <li><strong>Maintain security:</strong> Detect and prevent abuse, such as spam or denial-of-service attacks, using IP logs and CAPTCHA.</li>
                    <li><strong>Comply with legal obligations:</strong> In rare cases, we may use logs to respond to valid legal requests (e.g., subpoenas).</li>
                </ul>
                <p>We do not use any data for advertising, selling to third parties, or any purpose unrelated to operating securememo.app.</p>
            </div>

            <div class="usage-section" id="data-sharing">
                <h2>3. Data Sharing and Disclosure</h2>
                <p>We do not sell, rent, or share your data with third parties, except in the following limited circumstances:</p>
                <ul>
                    <li><strong>Service Providers:</strong> We use Cloudflare for hosting, database storage (D1), and CAPTCHA (Turnstile). These providers process data on our behalf under strict confidentiality and do not access memo content.</li>
                    <li><strong>Legal Requirements:</strong> We may disclose information if required by law, such as in response to a court order or government request.</li>
                    <li><strong>Business Transfers:</strong> If securememo.app is acquired or merged, data may be transferred as part of the transaction, but it would remain subject to this Privacy Notice.</li>
                </ul>
            </div>

            <div class="features-detail" id="data-security">
                <h2>4. Data Security</h2>
                <ul>
                    <li><strong>Encryption:</strong> All memos are encrypted client-side using AES-256 with PBKDF2 key derivation (600,000 iterations). We store only encrypted data and cannot decrypt it.</li>
                    <li><strong>Deletion:</strong> Memos are permanently deleted after reading or expiration via automated cron jobs.</li>
                    <li><strong>Security Measures:</strong> We implement strong security headers (e.g., CSP, HSTS), input sanitization, timing attack protections, and CAPTCHA to prevent abuse.</li>
                    <li><strong>No Recovery:</strong> Once deleted, memos cannot be recovered—even by us.</li>
                </ul>
                <p>While we take reasonable steps to secure our systems, no service is completely immune to risks. You are responsible for securely sharing URLs and passwords.</p>
            </div>

            <div class="usage-section" id="data-retention">
                <h2>5. Data Retention</h2>
                <ul>
                    <li>Encrypted memos are retained only until read or expired (up to 30 days maximum).</li>
                    <li>Security logs (e.g., IP addresses) are retained temporarily for abuse prevention and deleted automatically after a short period (typically within days).</li>
                    <li>We do not retain any data longer than necessary for the service's operation.</li>
                </ul>
            </div>

            <div class="features-detail" id="your-rights">
                <h2>6. Your Rights and Choices</h2>
                <p>Since we collect no personal data:</p>
                <ul>
                    <li>There are no user accounts to manage.</li>
                    <li>You cannot request data access, correction, or deletion beyond the automatic self-destruction of memos.</li>
                </ul>
                <p>If you believe we hold any information about you (e.g., from logs), contact us (see below) to inquire about your rights under applicable laws like GDPR or CCPA. We comply with data protection regulations and process requests where feasible.</p>
            </div>

            <div class="usage-section" id="children-privacy">
                <h2>7. Children's Privacy</h2>
                <p>Our service is not intended for children under 13 (or 16 in some jurisdictions). We do not knowingly collect data from children. If we become aware of such data, we will delete it.</p>
            </div>

            <div class="features-detail" id="international-transfers">
                <h2>8. International Data Transfers</h2>
                <p>securememo.app is hosted on Cloudflare's global network. Data may be processed in various countries, but we ensure equivalent privacy protections through our minimal collection practices.</p>
            </div>

            <div class="usage-section" id="changes-notice">
                <h2>9. Changes to This Privacy Notice</h2>
                <p>We may update this Notice periodically. Changes will be posted here with an updated "Last updated" date. Continued use of the service after changes constitutes acceptance.</p>
            </div>

            <div class="features-detail" id="contact">
                <h2>10. Contact Us</h2>
                <p>For questions about this Privacy Notice or our practices, please visit our <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">GitHub repository</a> or email timo.heimonen@gmail.com.</p>
                <p>This Privacy Notice applies only to securememo.app and not to any third-party sites linked from our service.</p>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">View source code at GitHub</a> | <a href="/tos.html">Terms of Service</a> | <a href="/privacy.html">Privacy Notice</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">No tracking, no ads, no nonsense.</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
} 