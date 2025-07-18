export function getStyles() {
  return `
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

/* Navigation */
.navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 1000;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 70px;
}

.nav-logo {
  font-size: 1.5rem;
  font-weight: bold;
  color: #667eea;
  text-decoration: none;
  transition: color 0.3s ease;
}

.nav-logo:hover {
  color: #764ba2;
}

.nav-menu {
  display: flex;
  list-style: none;
  align-items: center;
  gap: 30px;
}

.nav-link {
  color: #333;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  padding: 8px 16px;
  border-radius: 8px;
}

.nav-link:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.nav-link.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.auth-links, .user-links {
  display: flex;
  gap: 15px;
}

/* Main content */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

/* Hero section */
.hero-section {
  text-align: center;
  margin-bottom: 60px;
  color: white;
}

.hero-section h1 {
  font-size: 3.5rem;
  margin-bottom: 20px;
  font-weight: 700;
}

.hero-section p {
  font-size: 1.2rem;
  margin-bottom: 40px;
  opacity: 0.9;
}

.cta-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
  flex-wrap: wrap;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:hover {
  background: #5a6fd8;
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-2px);
}

/* Features section */
.features-section, .security-section {
  margin-bottom: 60px;
}

.features-section h2, .security-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 40px;
  color: white;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
}

.feature-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 30px;
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-card h3 {
  font-size: 1.3rem;
  margin-bottom: 15px;
  color: #667eea;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

/* About page */
.about-section {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.about-section h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  color: #333;
  text-align: center;
}

.about-section p {
  font-size: 1.1rem;
  margin-bottom: 30px;
  color: #666;
  text-align: center;
}

.tech-stack, .features-detail, .usage-section {
  margin-bottom: 40px;
}

.tech-stack h2, .features-detail h2, .usage-section h2 {
  font-size: 1.8rem;
  margin-bottom: 20px;
  color: #667eea;
}

.tech-stack ul {
  list-style: none;
  padding: 0;
}

.tech-stack li {
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.tech-stack li:last-child {
  border-bottom: none;
}

.feature-list {
  display: grid;
  gap: 20px;
}

.feature-item {
  padding: 20px;
  background: #f8f9fa;
  border-radius: 10px;
  border-left: 4px solid #667eea;
}

.feature-item h3 {
  color: #667eea;
  margin-bottom: 10px;
}

/* Memo pages */
.memo-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 60vh;
}

.memo-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 15px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 600px;
}

.memo-card h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #333;
  text-align: center;
}

.memo-description {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 1.1rem;
}

.memo-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
}

.form-group textarea {
  resize: vertical;
  min-height: 120px;
}

.form-help {
  display: block;
  margin-top: 5px;
  font-size: 0.9rem;
  color: #666;
}

/* Result section */
.result-section {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 10px;
  border-left: 4px solid #28a745;
}

.result-section h3 {
  color: #28a745;
  margin-bottom: 20px;
}

.memo-url-section,
.memo-password-section {
  margin-bottom: 20px;
}

.memo-url-section label,
.memo-password-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.url-copy-container,
.password-copy-container {
  display: flex;
  gap: 10px;
}

.url-copy-container input,
.password-copy-container input {
  flex: 1;
  padding: 10px;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-family: monospace;
  font-size: 0.9rem;
  background: #fff;
}

.url-copy-container .btn,
.password-copy-container .btn {
  padding: 10px 16px;
  white-space: nowrap;
}

.memo-warning {
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
}

.memo-warning p {
  margin-bottom: 10px;
  font-weight: 600;
  color: #856404;
}

.memo-warning ul {
  margin-left: 20px;
  color: #856404;
}

.memo-warning li {
  margin-bottom: 5px;
}

/* Memo content */
.memo-content {
  background: #f8f9fa;
  padding: 25px;
  border-radius: 10px;
  border-left: 4px solid #667eea;
}

.memo-content h3 {
  color: #667eea;
  margin-bottom: 20px;
}

.memo-message {
  background: white;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  margin-bottom: 20px;
}

.memo-message p {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #333;
}

.memo-info {
  margin-bottom: 20px;
}

.memo-info p {
  color: #666;
}

.memo-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

/* Error content */
.error-content {
  background: #f8d7da;
  padding: 25px;
  border-radius: 10px;
  border-left: 4px solid #dc3545;
}

.error-content h3 {
  color: #dc3545;
  margin-bottom: 15px;
}

.error-content p {
  color: #721c24;
  margin-bottom: 20px;
}

/* Messages */
.message {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: none;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.message.warning {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

/* Footer */
.footer {
  text-align: center;
  padding: 40px 20px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 60px;
}

/* Responsive design */
@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    height: auto;
    padding: 20px;
  }

  .nav-menu {
    flex-direction: column;
    gap: 15px;
    margin-top: 20px;
  }

  .auth-links, .user-links {
    flex-direction: column;
    gap: 10px;
  }

  .hero-section h1 {
    font-size: 2.5rem;
  }

  .hero-section p {
    font-size: 1rem;
  }

  .cta-buttons {
    flex-direction: column;
    align-items: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .about-section {
    padding: 20px;
  }

  .memo-card {
    padding: 20px;
  }

  .url-copy-container,
  .password-copy-container {
    flex-direction: column;
  }

  .memo-actions {
    flex-direction: column;
  }
}

/* Form styles for login/register/profile */
.form-container {
  max-width: 400px;
  margin: 0 auto;
  background: rgba(255, 255, 255, 0.95);
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.form-container h1 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e5e9;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.form-group .form-help {
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.25rem;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 1.5rem;
}

.form-actions .btn {
  flex: 1;
}

.profile-info {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
}

.profile-info p {
  margin-bottom: 0.5rem;
}

.profile-info strong {
  color: #667eea;
}

.danger-zone {
  border: 2px solid #dc3545;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 2rem;
}

.danger-zone h3 {
  color: #dc3545;
  margin-bottom: 1rem;
}

.danger-zone .btn {
  background: #dc3545;
  color: white;
}

.danger-zone .btn:hover {
  background: #c82333;
}

/* Turnstile widget styling */
.cf-turnstile {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.cf-turnstile iframe {
  border-radius: 8px;
  border: 2px solid #e1e5e9;
}

/* Copy button improvements */
.url-copy-container {
  display: flex;
  gap: 10px;
  align-items: center;
}

.url-copy-container input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  background: #f8f9fa;
  cursor: text;
}

.url-copy-container input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.url-copy-container .btn {
  white-space: nowrap;
  min-width: 80px;
  transition: all 0.3s ease;
}

.url-copy-container .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}
  `;
} 