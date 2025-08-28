export function getStyles() {
  return `
/* Reset and base styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --shadow-xs: 0 1px 3px rgba(0, 0, 0, 0.12);
  --shadow-sm: 0 4px 14px rgba(0, 0, 0, 0.16);
  --shadow-md: 0 8px 30px rgba(0, 0, 0, 0.20);
  --shadow-lg: 0 16px 48px rgba(0, 0, 0, 0.24);
  --shadow-inset: inset 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Default wrapping behavior: avoid forcing mid-word breaks or hyphenation */
html, body, .nav-logo, .nav-link, .language-item, p, h1, h2, h3, .footer, .feature-card p, .feature-item, .memo-card, .url-copy-container input {
  overflow-wrap: normal;
  word-break: normal;
  hyphens: none;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  line-height: 1.6;
  color: #333;
  background: linear-gradient(135deg, #82baffdf 0%, #3ba8fbdd 100%);
  min-height: 100vh;
  padding-top: 70px; /* Account for fixed navbar height */
}

/* Navigation */
.navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-md);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1002;
  transform: translateY(0);
  transition: transform 0.3s ease-in-out;
}

.navbar.hidden {
  transform: translateY(-100%);
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 15px;
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
  gap: 25px;
}

/* Ensure nav menu is visible on desktop */
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

/* Tighter spacing for medium screens */
@media (min-width: 769px) and (max-width: 1200px) {
  .nav-menu {
    gap: 20px;
  }
  
  .nav-link {
    padding: 8px 10px;
    font-size: 0.9rem;
  }
  
  .language-links {
    gap: 3px;
  }
  
  .language-links .nav-link {
    padding: 6px 6px;
    font-size: 0.8rem;
  }
}

.nav-link {
  color: #333;
  text-decoration: none;
  font-weight: 500;
  transition: color 0.3s ease;
  padding: 8px 12px;
  border-radius: 8px;
  white-space: normal;
  font-size: 0.95rem;
}

.nav-link:hover {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
}

.nav-link.active {
  color: #667eea;
  background: rgba(102, 126, 234, 0.1);
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

/* Language Dropdown Styles */
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
  border-radius: 8px;
  transition: all 0.3s ease;
  color: #333;
  text-decoration: none;
  white-space: normal;
}

.language-toggle:hover,
.language-toggle:focus,
.language-toggle.active {
  color: #667eea;
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
  background: white;
  border: 1px solid #e1e5e9;
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  min-width: 200px;
  z-index: 1000;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-10px);
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
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
  color: #333;
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f0f0f0;
}

.language-item:last-child {
  border-bottom: none;
}

.language-item:hover {
  background: rgba(102, 126, 234, 0.1);
  color: #667eea;
}

.language-item.active {
  background: #667eea;
  color: white;
  font-weight: 600;
}

.language-item.active:hover {
  background: #5a6fd8;
}

/* Flag emoji styles for cross-platform compatibility */
.flag-emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Android Emoji", "EmojiSymbols", "EmojiOne Mozilla", "Twemoji Mozilla", "Segoe UI", sans-serif;
  font-variant-emoji: emoji;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
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
  opacity: 0;
  animation: fadeInTitle 0.5s ease-out forwards;
}

.hero-section p {
  font-size: 1.2rem;
  margin-bottom: 40px;
  opacity: 0;
  animation: fadeInDescription 0.8s ease-out 0.5s forwards;
}

/* Animation keyframes */
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
    opacity: 0.9;
    transform: translateY(0);
  }
}

/* Word-by-word animation for description */
.hero-section p {
  overflow: hidden;
}

.hero-section p span {
  display: inline-block;
  opacity: 0;
  transform: translateY(20px);
  animation: fadeInWord 0.3s ease-out forwards;
}

/* Generate word animations with staggered delays */
.hero-section p span:nth-child(1) { animation-delay: 0.5s; }
.hero-section p span:nth-child(2) { animation-delay: 0.6s; }
.hero-section p span:nth-child(3) { animation-delay: 0.7s; }
.hero-section p span:nth-child(4) { animation-delay: 0.8s; }
.hero-section p span:nth-child(5) { animation-delay: 0.9s; }
.hero-section p span:nth-child(6) { animation-delay: 1.0s; }
.hero-section p span:nth-child(7) { animation-delay: 1.1s; }
.hero-section p span:nth-child(8) { animation-delay: 1.2s; }
.hero-section p span:nth-child(9) { animation-delay: 1.3s; }
.hero-section p span:nth-child(10) { animation-delay: 1.4s; }
.hero-section p span:nth-child(11) { animation-delay: 1.5s; }
.hero-section p span:nth-child(12) { animation-delay: 1.6s; }
.hero-section p span:nth-child(13) { animation-delay: 1.7s; }
.hero-section p span:nth-child(14) { animation-delay: 1.8s; }
.hero-section p span:nth-child(15) { animation-delay: 1.9s; }
.hero-section p span:nth-child(16) { animation-delay: 2.0s; }
.hero-section p span:nth-child(17) { animation-delay: 2.1s; }
.hero-section p span:nth-child(18) { animation-delay: 2.2s; }
.hero-section p span:nth-child(19) { animation-delay: 2.3s; }
.hero-section p span:nth-child(20) { animation-delay: 2.4s; }

@keyframes fadeInWord {
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
  box-shadow: var(--shadow-lg);
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
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(10px);
}

/* Legal pages (TOS / Privacy) */
.legal-section {
  background: rgba(255, 255, 255, 0.95);
  padding: 40px;
  border-radius: 15px;
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(10px);
}

.legal-section h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  color: #333;
  text-align: center;
}

.legal-meta {
  text-align: center;
  color: #666;
  margin-bottom: 30px;
  font-size: 1rem;
}

/* Improve in-page anchor navigation under fixed navbar */
.legal-section h2 {
  scroll-margin-top: 90px;
}

.legal-toc {
  margin-bottom: 40px;
  background: #f8f9fa;
  border-radius: 12px;
  border-left: 4px solid #667eea;
  padding: 24px;
  box-shadow: var(--shadow-sm);
}

.legal-toc h2 {
  font-size: 1.4rem;
  margin-bottom: 12px;
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
  padding-left: 34px;
  margin: 10px 0;
  color: #555;
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
  color: #333;
  text-decoration: none;
}

.legal-toc a:hover {
  text-decoration: underline;
  color: #667eea;
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

/* List styling for content areas */
.features-detail ul, .usage-section ul {
  list-style: none;
  padding: 0;
  margin: 0 0 20px 0;
}

.features-detail li, .usage-section li {
  padding: 8px 0;
  margin-bottom: 8px;
  line-height: 1.6;
  color: #666;
  position: relative;
  padding-left: 20px;
}

.features-detail li:before, .usage-section li:before {
  content: "•";
  color: #667eea;
  font-weight: bold;
  position: absolute;
  left: 0;
  top: 8px;
}

.features-detail li ul, .usage-section li ul {
  margin: 10px 0 0 0;
  padding-left: 20px;
}

.features-detail li li, .usage-section li li {
  padding-left: 15px;
  margin-bottom: 5px;
}

.features-detail li li:before, .usage-section li li:before {
  content: "◦";
  left: -15px;
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
  box-shadow: var(--shadow-sm);
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
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(10px);
  width: 100%;
  max-width: 900px;
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
  box-shadow: var(--shadow-sm);
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
  white-space: normal;
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
  box-shadow: var(--shadow-sm);
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
  box-shadow: var(--shadow-xs);
}

.memo-message p {
  white-space: pre-wrap;
  line-height: 1.6;
  color: #333;
  overflow-wrap: break-word;
  word-break: break-word;
  hyphens: auto;
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
  box-shadow: var(--shadow-sm);
}

.error-content h3 {
  color: #dc3545;
  margin-bottom: 15px;
}

.error-content p {
  color: #721c24;
  margin-bottom: 20px;
}

/* Memo Messages */
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

/* Touch-friendly elements */
.btn, input[type="submit"], .nav-link {
  min-width: 44px;
  min-height: 44px;
  touch-action: manipulation;
}

input, textarea, select {
  touch-action: pan-y;
}



/* Responsive design */
@media (max-width: 480px) {
  .hero-section h1 {
    font-size: 2rem;
  }
  
  .btn {
    padding: 10px 20px;
    font-size: 0.9rem;
  }
  
  .form-group input {
    font-size: 1rem;
  }
  
  .nav-container {
  padding: 8px 10px;
  }
  
  .main-content {
  padding: 12px 10px;
  }
  
  .memo-card {
  padding: 12px;
  }
  
  .about-section {
  padding: 12px;
  }
  
  .feature-card {
  padding: 16px;
  }
}

/* Hamburger Menu Button */
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

/* Ensure hamburger is hidden on desktop */
@media (min-width: 769px) {
  .hamburger {
    display: none !important;
  }
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
  background: #333;
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

/* Navigation Overlay - Only visible on mobile */
.nav-overlay {
  display: none;
}

/* Make overlay visible only on mobile */
@media (max-width: 768px) {
  .nav-overlay {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
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
  /* Show hamburger menu on mobile */
  .hamburger {
    display: flex;
  }
  
  /* Hide regular navigation menu by default on mobile */
  .nav-menu {
    position: fixed;
    top: 0;
    right: -100%;
  width: 100%;
  max-width: 340px;
    /* Better iOS-compatible height calculation */
    /* Use window.innerHeight via CSS custom property fallback approach */
    height: 100vh; /* Base fallback */
    height: calc(var(--vh, 1vh) * 100); /* Dynamic height from JS */
    max-height: 100vh;
    max-height: calc(var(--vh, 1vh) * 100);
    /* Minimum height ensures content is always accessible */
  min-height: 420px; /* Reduced minimum to ensure it fits on small screens */
    background: rgba(255, 255, 255, 0.98);
    backdrop-filter: blur(20px);
    /* Use flexbox with proper scroll container setup */
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: stretch;
    /* Remove padding to fix scroll container */
    padding: 0;
    box-shadow: -5px 0 20px rgba(0, 0, 0, 0.1);
    transition: right 0.3s ease, opacity 0.3s ease, visibility 0.3s ease;
    z-index: 1001;
    /* Enhanced scrolling configuration for the menu content */
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch; /* Smooth momentum scrolling on iOS */
    overscroll-behavior: contain; /* Prevent background scroll chaining */
    overscroll-behavior-y: contain; /* Specific Y-axis control */
    touch-action: pan-y; /* Explicitly allow vertical panning */
    /* Force hardware acceleration for smoother scrolling */
    transform: translateZ(0);
    will-change: scroll-position;
    /* Improved scrollbar styling */
    scrollbar-width: thin;
    scrollbar-color: rgba(102, 126, 234, 0.3) transparent;
    /* Ensure proper scroll behavior */
    scroll-behavior: smooth;
    /* Better touch responsiveness */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }
  
  /* Create spacing using pseudo-elements */
  .nav-menu::before {
    content: '';
    flex: 0 0 70px; /* Top spacing for navbar height */
    min-height: 70px;
  }
  
  .nav-menu::after {
    content: '';
    flex: 0 0 20px; /* Bottom spacing */
    min-height: 20px;
  }
  
  /* Make the main nav items flexible but don't grow excessively */
  .nav-menu > li,
  .nav-menu > .language-links {
    flex: 0 0 auto; /* Don't grow/shrink, maintain natural size */
  }
  
  /* Webkit scrollbar styling for mobile menu */
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
  
  /* Additional mobile menu height constraints for small screens */
  @media (max-height: 600px) {
    .nav-menu::before {
      flex: 0 0 55px; /* Reduce top spacing on short screens */
      min-height: 55px;
    }
  }
  
  @media (max-height: 500px) {
    .nav-menu::before {
      flex: 0 0 45px; /* Even less spacing on very short screens */
      min-height: 45px;
    }
    
    .nav-link {
      padding: 12px 24px; /* Reduce nav link padding */
      font-size: 0.95rem; /* Slightly smaller font */
    }
    
    .language-links {
      margin-top: 12px; /* Reduce margin */
      padding-top: 12px;
    }
    
    .language-links .nav-link {
      padding: 8px 16px; /* Smaller language links */
      font-size: 0.85rem;
    }
  }
  
  /* iOS-specific fixes for address bar behavior */
  @supports (-webkit-touch-callout: none) {
    /* This targets iOS Safari specifically */
    .nav-menu {
      /* Ensure menu always has space for content even with address bar */
      min-height: 450px;
      /* Better handling of iOS viewport units */
      height: calc(var(--vh, 1vh) * 100);
      max-height: calc(var(--vh, 1vh) * 100);
    }
    
    /* Ensure language links are always visible on iOS */
    .language-links {
      /* Add extra bottom padding to ensure visibility */
      padding-bottom: 24px;
      margin-bottom: 16px;
    }
    
    /* More compact layout for iOS when needed */
    @media (max-height: 550px) {
      .nav-link {
        padding: 14px 24px; /* Slightly reduce padding */
        min-height: 50px; /* Reduce minimum height */
      }
      
      .language-links .nav-link {
        padding: 12px 16px;
        min-height: 44px;
      }
      
      .nav-menu::before {
        flex: 0 0 50px; /* Reduce top spacing for iOS */
        min-height: 50px;
      }
    }
  }
  
  /* Ensure menu items are always accessible even on landscape phones */
  @media (max-height: 400px) and (orientation: landscape) {
    .nav-menu::before {
      flex: 0 0 35px; /* Minimal top spacing */
      min-height: 35px;
    }
    
    .nav-menu::after {
      flex: 0 0 15px; /* Minimal bottom spacing */
      min-height: 15px;
    }
    
    .nav-link {
      padding: 10px 24px; /* Compact nav links */
      font-size: 0.9rem;
      min-height: 45px; /* Maintain touch target size */
    }
    
    .language-links {
      margin-top: 8px;
      padding-top: 8px;
    }
    
    .language-links .nav-link {
      padding: 6px 16px; /* Compact language links */
      font-size: 0.8rem;
      min-height: 40px; /* Maintain touch target size */
    }
  }
  
  /* Additional scroll optimization for very tall content */
  @media (max-height: 600px) {
    .nav-menu {
      /* Force scroll container to be more aggressive about scrolling */
      overflow-y: scroll !important;
      -webkit-overflow-scrolling: touch !important;
    }
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
    display: flex; /* Use flex for better alignment */
    align-items: center;
    width: 100%;
    padding: 20px 24px;
  white-space: normal;
    text-align: left;
    border-radius: 0;
    font-size: 1.1rem; /* Slightly larger font */
    font-weight: 500;
    color: #333;
    transition: all 0.3s ease;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  min-height: 50px; /* Ensure minimum height for touch targets */
    /* Improve touch responsiveness */
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    /* Ensure proper flex behavior for touch */
    flex-shrink: 0;
  }
  
  .nav-link:hover,
  .nav-link.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateX(10px);
  }
  
  .language-links {
    display: flex; /* Ensure it's a flex container */
    flex-direction: column;
    gap: 0;
    margin-top: 16px;
    padding: 16px 24px 16px 24px; /* Add bottom padding for better spacing */
    border-top: 2px solid rgba(0, 0, 0, 0.1);
    flex: 0 0 auto; /* Don't grow/shrink */
  }
  
  /* Keep language links on mobile, but convert dropdown to list on mobile */
  .language-dropdown {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 16px;
    padding: 16px 24px 16px 24px;
    border-top: 2px solid rgba(0, 0, 0, 0.1);
    flex: 0 0 auto;
  }
  
  .language-toggle {
    display: none; /* Hide dropdown toggle on mobile */
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
    gap: 4px !important;
  }
  
  .language-item {
    padding: 16px 16px;
    margin: 4px 0;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    text-align: center;
    justify-content: center;
    border-bottom: none !important;
    background: rgba(102, 126, 234, 0.05);
    min-height: 50px;
    flex-shrink: 0;
    touch-action: manipulation;
    display: flex;
    align-items: center;
  }
  
  .language-item:hover,
  .language-item.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateX(0) scale(1.05);
  }
  
  .language-links .nav-link {
    padding: 16px 16px; /* Increase padding for better touch targets */
    margin: 4px 0; /* Increase margin for better spacing */
    border-radius: 6px;
    font-size: 1rem; /* Increase font size */
    font-weight: 500;
    text-align: center;
    justify-content: center; /* Center content in flex container */
    border-bottom: none;
    background: rgba(102, 126, 234, 0.05);
    min-height: 50px; /* Ensure good touch target size */
    /* Ensure flex behavior for language links */
    flex-shrink: 0;
    touch-action: manipulation;
  }
  
  .language-links .nav-link:hover,
  .language-links .nav-link.active {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    transform: translateX(0) scale(1.05);
  }
  
  .language-separator {
    display: none;
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
  .password-copy-container,
  .password-input-container {
    flex-direction: column;
  }

  .memo-actions {
    flex-direction: column;
  }
}

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

/* Removed unused forms/profile/danger zone styles */

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
.url-copy-container,
.password-input-container {
  display: flex;
  gap: 10px;
  align-items: center;
}

.url-copy-container input,
.password-input-container input {
  flex: 1;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  background: #f8f9fa;
  cursor: text;
  box-shadow: var(--shadow-inset);
}

.url-copy-container input:focus,
.password-input-container input:focus {
  outline: none;
  border-color: #667eea;
  background: white;
}

.url-copy-container .btn,
.password-input-container .btn {
  white-space: nowrap;
  min-width: 80px;
  transition: all 0.3s ease;
}

.url-copy-container .btn:hover,
.password-input-container .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Loading Spinner */
.loading-spinner {
  display: none;
  text-align: center;
  margin-top: 20px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid #e1e5e9;
  box-shadow: var(--shadow-xs);
}

.loading-spinner p {
  margin-top: 10px;
  color: #666;
  font-size: 0.9rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #667eea;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Disabled button state for better UX */
.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
  opacity: 0.7;
}
  `;
} 