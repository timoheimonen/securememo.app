export function getStyles() {
  return `
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  /* Dark theme color palette */
  --primary-dark: #0f0f23;
  --secondary-dark: #1a1a2e;
  --accent-dark: #16213e;
  --surface-dark: #0f3460;
  --surface-light: #1a1a2e;
  --text-primary: #ffffff;
  --text-secondary: #b0b0b0;
  --text-muted: #808080;
  --border-color: #2a2a4e;
  --border-light: #3a3a5e;
  --success: #00d4aa;
  --warning: #ffb347;
  --error: #ff6b6b;
  --info: #4ecdc4;

  /* Shadows for dark theme */
  --shadow-xs: 0 1px 3px rgba(0, 0, 0, 0.3);
  --shadow-sm: 0 4px 14px rgba(0, 0, 0, 0.4);
  --shadow-md: 0 8px 30px rgba(0, 0, 0, 0.5);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.6);
  --shadow-inset: inset 0 1px 3px rgba(255, 255, 255, 0.05);

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  --gradient-secondary: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  --gradient-accent: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  --gradient-background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%);
}

/* Default wrapping behavior */
html, body, .nav-logo, .nav-link, .language-item, p, h1, h2, h3, .footer, .feature-card p, .feature-item, .memo-card, .url-copy-container input {
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: var(--text-primary);
  background: var(--gradient-background);
  min-height: 100vh;
  padding-top: 70px;
  background-attachment: fixed;
}

/* Navigation */
.navbar {
  background: rgba(15, 15, 35, 0.95);
  backdrop-filter: blur(20px);
  box-shadow: var(--shadow-lg);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1002;
  transform: translateY(0);
  transition: transform 0.3s ease-in-out;
  border-bottom: 1px solid var(--border-color);
}

.navbar.hidden {
  transform: translateY(-100%);
}

.nav-container {
  max-width: 1400px;
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
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-logo:hover {
  background: linear-gradient(45deg, #764ba2, #667eea);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-menu {
  display: flex;
  list-style: none;
  align-items: center;
  gap: 25px;
}

/* Desktop navigation */
@media (min-width: 769px) {
  .nav-menu {
    position: static !important;
    opacity: 1 !important;
    visibility: visible !important;
    pointer-events: auto !important;
    transform: none !important;
    right: auto !important;
    width: auto !important;
    height: auto !important;
    background: transparent !important;
    box-shadow: none !important;
    flex-direction: row !important;
    padding: 0 !important;
  }
}

.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  padding: 8px 12px;
  border-radius: 12px;
  white-space: normal;
  font-size: 0.95rem;
  position: relative;
}

.nav-link:hover {
  color: var(--text-primary);
  background: rgba(102, 126, 234, 0.1);
  transform: translateY(-1px);
}

.nav-link.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.15);
  font-weight: 600;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 50%;
  transform: translateX(-50%);
  width: 20px;
  height: 2px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  border-radius: 1px;
}

.language-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.language-links .nav-link {
  padding: 6px 8px;
  font-size: 0.85rem;
  min-width: auto;
}

/* Language Dropdown */
.language-dropdown {
  position: relative;
  display: inline-block;
}

.language-toggle {
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: inherit;
  font-size: 0.95rem;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 12px;
  transition: all 0.3s ease;
  color: var(--text-secondary);
  text-decoration: none;
  white-space: normal;
}

.language-toggle:hover,
.language-toggle:focus,
.language-toggle.active {
  color: var(--text-primary);
  background: rgba(102, 126, 234, 0.1);
  outline: none;
}

.language-toggle::after {
  content: '▼';
  font-size: 0.7rem;
  margin-left: 4px;
  transition: transform 0.3s ease;
}

.language-toggle[aria-expanded="true"]::after {
  transform: rotate(180deg);
}

.language-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--surface-dark);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  min-width: 200px;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  backdrop-filter: blur(20px);
  max-height: 300px;
  overflow-y: auto;
}

.language-dropdown.active .language-menu {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.language-item {
  display: block;
  padding: 12px 16px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--border-color);
}

.language-item:last-child {
  border-bottom: none;
}

.language-item:hover {
  background: rgba(102, 126, 234, 0.1);
  color: var(--text-primary);
}

.language-item.active {
  background: var(--gradient-primary);
  color: white;
  font-weight: 600;
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
  color: var(--text-primary);
  position: relative;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: -20px;
  left: -20px;
  right: -20px;
  bottom: -20px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.1) 0%, transparent 70%);
  border-radius: 20px;
  z-index: -1;
}

.hero-section h1 {
  font-size: 3.5rem;
  margin-bottom: 20px;
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  opacity: 0;
  animation: fadeInTitle 0.5s ease-out forwards;
}

.hero-section p {
  font-size: 1.2rem;
  margin-bottom: 40px;
  color: var(--text-secondary);
  opacity: 0;
  animation: fadeInDescription 0.8s ease-out 0.5s forwards;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

/* Animations */
@keyframes fadeInTitle {
  0% {
    opacity: 0;
    transform: translateY(30px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInDescription {
  0% {
    opacity: 0;
    transform: translateY(20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
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
  padding: 14px 28px;
  border: none;
  border-radius: 12px;
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 1rem;
  position: relative;
  overflow: hidden;
}

.btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.btn:hover::before {
  left: 100%;
}

.btn-primary {
  background: var(--gradient-primary);
  color: white;
  box-shadow: var(--shadow-md);
}

.btn-primary:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  backdrop-filter: blur(10px);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-3px);
  border-color: rgba(102, 126, 234, 0.3);
}

/* Features section */
.features-section, .security-section {
  margin-bottom: 80px;
}

.features-section h2, .security-section h2 {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 40px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
}

.features-section h2::after, .security-section h2::after {
  content: '';
  position: absolute;
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  width: 60px;
  height: 3px;
  background: var(--gradient-primary);
  border-radius: 2px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 30px;
}

.feature-card {
  background: var(--surface-dark);
  padding: 30px;
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(20px);
  transition: all 0.3s ease;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-primary);
}

.feature-card:hover {
  transform: translateY(-8px);
  box-shadow: var(--shadow-lg);
  border-color: rgba(102, 126, 234, 0.3);
}

.feature-card h3 {
  font-size: 1.4rem;
  margin-bottom: 15px;
  color: #667eea;
  font-weight: 600;
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.7;
}

/* About page */
.about-section {
  background: var(--surface-dark);
  padding: 50px;
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
}

.about-section h1 {
  font-size: 2.5rem;
  margin-bottom: 20px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
}

.about-section p {
  font-size: 1.1rem;
  margin-bottom: 30px;
  color: var(--text-secondary);
  text-align: center;
}

/* Legal pages */
.legal-section {
  background: var(--surface-dark);
  padding: 50px;
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border-color);
}

.legal-section h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
}

.legal-meta {
  text-align: center;
  color: var(--text-muted);
  margin-bottom: 30px;
  font-size: 1rem;
}

.legal-section h2 {
  scroll-margin-top: 90px;
  color: #667eea;
  margin-top: 40px;
  margin-bottom: 20px;
  font-size: 1.8rem;
}

.legal-toc {
  margin-bottom: 40px;
  background: var(--surface-light);
  border-radius: 15px;
  border-left: 4px solid #667eea;
  padding: 30px;
  box-shadow: var(--shadow-md);
}

.legal-toc h2 {
  font-size: 1.5rem;
  margin-bottom: 20px;
  color: #667eea;
}

.legal-toc ol {
  counter-reset: section;
  list-style: none;
  padding: 0;
  margin: 0;
}

.legal-toc ol li {
  position: relative;
  padding-left: 40px;
  margin: 12px 0;
  color: var(--text-secondary);
}

.legal-toc ol li::before {
  counter-increment: section;
  content: counters(section, '.') '. ';
  position: absolute;
  left: 0;
  top: 0;
  color: #667eea;
  font-weight: 700;
}

.legal-toc a {
  color: var(--text-primary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.legal-toc a:hover {
  color: #667eea;
  text-decoration: underline;
}

/* List styling */
.features-detail ul, .usage-section ul {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
}

.features-detail li, .usage-section li {
  padding: 12px 0;
  margin-bottom: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
  position: relative;
  padding-left: 25px;
}

.features-detail li:before, .usage-section li:before {
  content: "▸";
  color: #667eea;
  font-weight: bold;
  position: absolute;
  left: 0;
  top: 12px;
  font-size: 1.2rem;
}

.features-detail li ul, .usage-section li ul {
  margin: 15px 0 0 0;
  padding-left: 25px;
}

.features-detail li li, .usage-section li li {
  padding-left: 20px;
  margin-bottom: 8px;
}

.features-detail li li:before, .usage-section li li:before {
  content: "◦";
  left: -5px;
  color: var(--info);
}

.tech-stack ul {
  list-style: none;
  padding: 0;
}

.tech-stack li {
  padding: 15px 0;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.tech-stack li:last-child {
  border-bottom: none;
}

.feature-list {
  display: grid;
  gap: 25px;
}

.feature-item {
  padding: 25px;
  background: var(--surface-light);
  border-radius: 15px;
  border-left: 4px solid #667eea;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.feature-item:hover {
  transform: translateX(5px);
  box-shadow: var(--shadow-md);
  background: var(--surface-dark);
}

.feature-item h3 {
  color: #667eea;
  margin-bottom: 15px;
  font-size: 1.2rem;
}

/* Memo pages */
.memo-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 70vh;
}

.memo-card {
  background: var(--surface-dark);
  padding: 50px;
  border-radius: 20px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(20px);
  width: 100%;
  max-width: 900px;
  border: 1px solid var(--border-color);
  position: relative;
  overflow: hidden;
}

.memo-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: var(--gradient-primary);
}

.memo-card h1 {
  font-size: 2.5rem;
  margin-bottom: 15px;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
}

.memo-description {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 40px;
  font-size: 1.1rem;
}

/* Form styles */
.memo-form {
  margin-bottom: 40px;
}

.form-group {
  margin-bottom: 25px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 16px;
  border: 2px solid var(--border-color);
  border-radius: 12px;
  font-size: 1rem;
  transition: all 0.3s ease;
  background: var(--surface-light);
  color: var(--text-primary);
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #667eea;
  background: var(--surface-dark);
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 140px;
  font-family: inherit;
}

.form-help {
  display: block;
  margin-top: 8px;
  font-size: 0.9rem;
  color: var(--text-muted);
}

/* Result section */
.result-section {
  background: var(--success);
  padding: 30px;
  border-radius: 15px;
  border-left: 4px solid var(--success);
  box-shadow: var(--shadow-md);
  margin-bottom: 30px;
}

.result-section h3 {
  color: var(--primary-dark);
  margin-bottom: 25px;
  font-size: 1.3rem;
}

.url-copy-container,
.password-copy-container {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 20px;
}

.url-copy-container input,
.password-copy-container input {
  flex: 1;
  padding: 14px;
  border: 2px solid rgba(0, 212, 170, 0.3);
  border-radius: 10px;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  font-size: 0.9rem;
  background: rgba(0, 212, 170, 0.1);
  color: var(--text-primary);
  cursor: text;
}

.url-copy-container .btn,
.password-copy-container .btn {
  padding: 14px 20px;
  white-space: normal;
  background: var(--primary-dark);
  color: var(--success);
  border: 1px solid var(--success);
}

.url-copy-container .btn:hover,
.password-copy-container .btn:hover {
  background: var(--success);
  color: var(--primary-dark);
}

.memo-warning {
  background: rgba(255, 179, 71, 0.1);
  border: 1px solid var(--warning);
  border-radius: 12px;
  padding: 20px;
  margin-top: 25px;
}

.memo-warning p {
  margin-bottom: 15px;
  font-weight: 600;
  color: var(--warning);
}

.memo-warning ul {
  margin-left: 20px;
  color: var(--text-secondary);
}

.memo-warning li {
  margin-bottom: 8px;
}

/* Memo content */
.memo-content {
  background: var(--surface-light);
  padding: 30px;
  border-radius: 15px;
  border-left: 4px solid #667eea;
  box-shadow: var(--shadow-sm);
}

.memo-content h3 {
  color: #667eea;
  margin-bottom: 25px;
  font-size: 1.3rem;
}

.memo-message {
  background: var(--surface-dark);
  padding: 25px;
  border-radius: 12px;
  border: 1px solid var(--border-color);
  margin-bottom: 25px;
  box-shadow: var(--shadow-xs);
}

.memo-message p {
  white-space: pre-wrap;
  line-height: 1.7;
  color: var(--text-primary);
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
}

.memo-info {
  margin-bottom: 25px;
}

.memo-info p {
  color: var(--text-secondary);
}

.memo-actions {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  justify-content: center;
}

/* Error content */
.error-content {
  background: rgba(255, 107, 107, 0.1);
  padding: 30px;
  border-radius: 15px;
  border-left: 4px solid var(--error);
  box-shadow: var(--shadow-sm);
}

.error-content h3 {
  color: var(--error);
  margin-bottom: 20px;
  font-size: 1.3rem;
}

.error-content p {
  color: var(--text-secondary);
  margin-bottom: 25px;
}

/* Messages */
.message {
  padding: 16px 20px;
  border-radius: 12px;
  margin-bottom: 25px;
  display: none;
  font-weight: 500;
}

.message.success {
  background: rgba(0, 212, 170, 0.1);
  color: var(--success);
  border: 1px solid var(--success);
}

.message.error {
  background: rgba(255, 107, 107, 0.1);
  color: var(--error);
  border: 1px solid var(--error);
}

.message.warning {
  background: rgba(255, 179, 71, 0.1);
  color: var(--warning);
  border: 1px solid var(--warning);
}

/* Footer */
.footer {
  text-align: center;
  padding: 50px 20px;
  color: var(--text-muted);
  margin-top: 80px;
  border-top: 1px solid var(--border-color);
}

.footer a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.3s ease;
}

.footer a:hover {
  color: #667eea;
}

/* Touch-friendly elements */
.btn, input[type="submit"], .nav-link {
  min-width: 44px;
  min-height: 44px;
  touch-action: manipulation;
}

input, textarea, select {
  touch-action: pan-y;
}

/* Hamburger Menu */
.hamburger {
  display: none;
  flex-direction: column;
  justify-content: space-around;
  width: 30px;
  height: 30px;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1003;
  transition: transform 0.3s ease;
}

.hamburger:hover,
.hamburger:focus {
  transform: scale(1.1);
  outline: 2px solid #667eea;
  outline-offset: 4px;
}

.hamburger-line {
  width: 100%;
  height: 3px;
  background: var(--text-primary);
  border-radius: 2px;
  transition: all 0.3s ease;
  transform-origin: center;
}

/* Hamburger Animation */
.hamburger.active .hamburger-line:nth-child(1) {
  transform: rotate(45deg) translate(7px, 7px);
}

.hamburger.active .hamburger-line:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}

.hamburger.active .hamburger-line:nth-child(3) {
  transform: rotate(-45deg) translate(7px, -7px);
}

/* Navigation Overlay */
.nav-overlay {
  display: none;
}

@media (max-width: 768px) {
  .nav-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(10px);
    opacity: 0;
    visibility: hidden;
    transition: opacity 0.3s ease, visibility 0.3s ease;
    z-index: 999;
    pointer-events: none;
  }

  .nav-overlay.active {
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }
}

@media (max-width: 768px) {
  .hamburger {
    display: flex;
  }

  .nav-menu {
    position: fixed;
    top: 0;
    right: -100%;
    width: 100%;
    max-width: 350px;
    height: 100vh;
    background: var(--surface-dark);
    backdrop-filter: blur(20px);
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    padding: 0;
    box-shadow: -10px 0 30px rgba(0, 0, 0, 0.5);
    transition: right 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
    z-index: 1001;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    touch-action: pan-y;
    transform: translateZ(0);
    will-change: scroll-position;
    scrollbar-width: thin;
    scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
    border-left: 1px solid var(--border-color);
  }

  .nav-menu::before {
    content: '';
    flex: 0 0 70px;
    min-height: 70px;
  }

  .nav-menu::after {
    content: '';
    flex: 0 0 20px;
    min-height: 20px;
  }

  .nav-menu > li,
  .nav-menu > .language-links {
    flex: 0 0 auto;
  }

  .nav-menu::-webkit-scrollbar {
    width: 6px;
  }

  .nav-menu::-webkit-scrollbar-track {
    background: transparent;
  }

  .nav-menu::-webkit-scrollbar-thumb {
    background: rgba(102, 126, 234, 0.3);
    border-radius: 3px;
  }

  .nav-menu::-webkit-scrollbar-thumb:hover {
    background: rgba(102, 126, 234, 0.5);
  }

  .nav-menu.active {
    right: 0;
    opacity: 1;
    visibility: visible;
    pointer-events: auto;
  }

  .nav-menu li {
    width: 100%;
    margin: 0;
  }

  .nav-link {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 20px 24px;
    white-space: normal;
    text-align: left;
    border-radius: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: var(--text-secondary);
    transition: all 0.3s ease;
    border-bottom: 1px solid var(--border-color);
    min-height: 60px;
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    flex-shrink: 0;
  }

  .nav-link:hover,
  .nav-link.active {
    background: var(--gradient-primary);
    color: white;
    transform: translateX(10px);
    border-bottom-color: rgba(102, 126, 234, 0.3);
  }

  .language-links {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 20px;
    padding: 20px 24px 20px 24px;
    border-top: 2px solid var(--border-color);
    flex: 0 0 auto;
  }

  .language-dropdown {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 20px;
    padding: 20px 24px 20px 24px;
    border-top: 2px solid var(--border-color);
    flex: 0 0 auto;
  }

  .language-toggle {
    display: none;
    white-space: normal;
  }

  .language-menu {
    position: static !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    max-height: none !important;
    overflow-y: visible !important;
    min-width: auto !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 8px !important;
  }

  .language-item {
    padding: 18px 20px;
    margin: 4px 0;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 500;
    text-align: center;
    justify-content: center;
    border-bottom: none !important;
    background: rgba(102, 126, 234, 0.05);
    min-height: 55px;
    flex-shrink: 0;
    touch-action: manipulation;
    display: flex;
    align-items: center;
    color: var(--text-secondary);
    transition: all 0.3s ease;
  }

  .language-item:hover,
  .language-item.active {
    background: var(--gradient-primary);
    color: white;
    transform: translateX(0) scale(1.02);
  }

  .language-links .nav-link {
    padding: 18px 20px;
    margin: 4px 0;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 500;
    text-align: center;
    justify-content: center;
    border-bottom: none;
    background: rgba(102, 126, 234, 0.05);
    min-height: 55px;
    flex-shrink: 0;
    touch-action: manipulation;
    color: var(--text-secondary);
    transition: all 0.3s ease;
  }

  .language-links .nav-link:hover,
  .language-links .nav-link.active {
    background: var(--gradient-primary);
    color: white;
    transform: translateX(0) scale(1.02);
  }

  .language-separator {
    display: none;
  }

  .hero-section h1 {
    font-size: 2.8rem;
  }

  .hero-section p {
    font-size: 1.1rem;
  }

  .cta-buttons {
    flex-direction: column;
    align-items: center;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }

  .about-section {
    padding: 30px;
  }

  .legal-section {
    padding: 30px;
  }

  .memo-card {
    padding: 30px;
  }

  .url-copy-container,
  .password-copy-container,
  .password-input-container {
    flex-direction: column;
  }

  .memo-actions {
    flex-direction: column;
  }
}

/* Medium screens */
@media (min-width: 769px) and (max-width: 1024px) {
  .features-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .hero-section h1 {
    font-size: 3rem;
  }

  .main-content {
    padding: 30px 20px;
  }
}

/* Small screens */
@media (max-width: 480px) {
  .hero-section h1 {
    font-size: 2.2rem;
  }

  .btn {
    padding: 12px 24px;
    font-size: 0.95rem;
  }

  .form-group input {
    font-size: 1rem;
  }

  .nav-container {
    padding: 8px 15px;
  }

  .main-content {
    padding: 20px 15px;
  }

  .memo-card {
    padding: 25px;
  }

  .about-section {
    padding: 25px;
  }

  .legal-section {
    padding: 25px;
  }

  .feature-card {
    padding: 20px;
  }
}

/* Turnstile widget styling */
.cf-turnstile {
  display: flex;
  justify-content: center;
  margin: 1rem 0;
}

.cf-turnstile iframe {
  border-radius: 12px;
  border: 2px solid var(--border-color);
}

/* Copy button improvements */
.url-copy-container,
.password-input-container {
  display: flex;
  gap: 15px;
  align-items: center;
}

.url-copy-container input,
.password-input-container input {
  flex: 1;
  padding: 14px;
  border: 2px solid var(--border-color);
  border-radius: 10px;
  font-size: 14px;
  background: var(--surface-light);
  cursor: text;
  box-shadow: var(--shadow-inset);
  color: var(--text-primary);
  transition: all 0.3s ease;
}

.url-copy-container input:focus,
.password-input-container input:focus {
  outline: none;
  border-color: #667eea;
  background: var(--surface-dark);
}

.url-copy-container .btn,
.password-input-container .btn {
  white-space: nowrap;
  min-width: 90px;
  transition: all 0.3s ease;
}

.url_copy-container .btn:hover,
.password-input-container .btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

/* Loading Spinner */
.loading-spinner {
  display: none;
  text-align: center;
  margin-top: 25px;
  padding: 20px;
  background: var(--surface-light);
  border-radius: 12px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-xs);
}

.loading-spinner p {
  margin-top: 15px;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.spinner {
  width: 45px;
  height: 45px;
  border: 4px solid var(--surface-dark);
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Disabled button state */
.btn:disabled {
  background: var(--surface-light);
  cursor: not-allowed;
  opacity: 0.6;
  transform: none !important;
  box-shadow: none !important;
}

/* Video embed styling */
.video-embed {
  max-width: 900px;
  margin: 2rem auto;
}

.video-embed iframe {
  width: 100%;
  height: auto;
  border-radius: 12px;
  border: 2px solid var(--border-color);
}

/* Enhanced focus states for accessibility */
.btn:focus,
.nav-link:focus,
.language-item:focus,
.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: 2px solid #667eea;
  outline-offset: 2px;
}

/* Print styles */
@media print {
  body {
    background: white;
    color: black;
  }

  .navbar,
  .footer,
  .btn,
  .nav-overlay,
  .hamburger {
    display: none !important;
  }

  .main-content {
    padding: 0;
  }

  .memo-card,
  .about-section,
  .legal-section {
    box-shadow: none;
    border: 1px solid #ccc;
    background: white;
  }
}
  `;
}