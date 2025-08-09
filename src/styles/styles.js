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
  padding-top: 70px; /* Account for fixed navbar height */
}

/* Navigation */
.navbar {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
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

.language-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.language-separator {
  color: #999;
  font-weight: 300;
  user-select: none;
}

.language-links .nav-link {
  padding: 6px 12px;
  font-size: 0.9rem;
  min-width: auto;
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
    padding: 15px;
  }
  
  .main-content {
    padding: 20px 15px;
  }
  
  .memo-card {
    padding: 15px;
  }
  
  .about-section {
    padding: 15px;
  }
  
  .feature-card {
    padding: 20px;
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
    width: 300px;
    /* Better iOS-compatible height calculation */
    /* Use window.innerHeight via CSS custom property fallback approach */
    height: 100vh; /* Base fallback */
    height: calc(var(--vh, 1vh) * 100); /* Dynamic height from JS */
    max-height: 100vh;
    max-height: calc(var(--vh, 1vh) * 100);
    /* Minimum height ensures content is always accessible */
    min-height: 500px; /* Reduced minimum to ensure it fits on small screens */
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
    padding: 20px 24px; /* Increase padding to make menu items larger */
    text-align: left;
    border-radius: 0;
    font-size: 1.1rem; /* Slightly larger font */
    font-weight: 500;
    color: #333;
    transition: all 0.3s ease;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
    min-height: 60px; /* Ensure minimum height for touch targets */
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