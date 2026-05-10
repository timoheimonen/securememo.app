import { createLocalization } from '/js/localization-core.js';

async function initializeApp() {
  try {
    const clientModule = await import('/js/clientLocalization.js');
    if (clientModule && clientModule.translations && clientModule.locale) {
      const loc = createLocalization(clientModule.locale, clientModule.translations);
      window.t = loc.t;
      if (typeof loc.initLocalization === 'function') {
        loc.initLocalization();
      }
    }
  } catch (e) {
    // localization not available, page scripts will fall back to key strings
  }
  initMobileNav();
  highlightCurrentPage();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

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

function initMobileNav() {
  initMobileMenu();
  initLanguageDropdown();
}

function initMobileMenu() {
  const hamburger = document.querySelector('.hamburger');
  const navMenu = document.querySelector('.nav-menu');
  const navOverlay = document.querySelector('.nav-overlay');
  if (!hamburger || !navMenu) {
    return;
  }

  function setViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', vh + 'px');
  }
  setViewportHeight();
  window.addEventListener('resize', setViewportHeight);
  window.addEventListener('orientationchange', () => {
    setTimeout(setViewportHeight, 100);
  });

  function ensureMenuScrollability() {
    if (!navMenu.classList.contains('active')) return;
    const menuHeight = navMenu.offsetHeight;
    const menuScrollHeight = navMenu.scrollHeight;
    if (menuScrollHeight > menuHeight) {
      navMenu.style.overflowY = 'scroll';
      navMenu.style.webkitOverflowScrolling = 'touch';
      const languageLinks = navMenu.querySelector('.language-links');
      if (languageLinks) {
        languageLinks.style.marginBottom = '40px';
      }
    }
  }

  function closeMenu() {
    hamburger.classList.remove('active');
    navMenu.classList.remove('active');
    if (navOverlay) navOverlay.classList.remove('active');
    document.body.style.overflow = '';
    hamburger.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    hamburger.classList.add('active');
    navMenu.classList.add('active');
    if (navOverlay) navOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    hamburger.setAttribute('aria-expanded', 'true');
    setTimeout(() => {
      ensureMenuScrollability();
    }, 50);
    const firstNavLink = navMenu.querySelector('.nav-link');
    if (firstNavLink) {
      setTimeout(() => firstNavLink.focus(), 100);
    }
  }

  function toggleMenu() {
    const isOpen = hamburger.classList.contains('active');
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  closeMenu();
  hamburger.addEventListener('click', toggleMenu);
  if (navOverlay) {
    navOverlay.addEventListener('click', closeMenu);
  }
  const navLinks = navMenu.querySelectorAll('.nav-link[href]');
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && hamburger.classList.contains('active')) {
      closeMenu();
      hamburger.focus();
    }
    if (hamburger.classList.contains('active') && e.key === 'Tab') {
      const focusableElements = navMenu.querySelectorAll('.nav-link');
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && hamburger.classList.contains('active')) {
      closeMenu();
    }
  });
  document.addEventListener('click', (e) => {
    if (hamburger.classList.contains('active') &&
        !navMenu.contains(e.target) &&
        !hamburger.contains(e.target)) {
      closeMenu();
    }
  });
}

function initLanguageDropdown() {
  const languageDropdown = document.querySelector('.language-dropdown');
  const languageToggle = document.querySelector('.language-toggle');
  const languageMenu = document.querySelector('.language-menu');
  if (!languageDropdown || !languageToggle || !languageMenu) {
    return;
  }

  function closeDropdown() {
    languageDropdown.classList.remove('active');
    languageToggle.setAttribute('aria-expanded', 'false');
    languageToggle.classList.remove('active');
  }

  function openDropdown() {
    languageDropdown.classList.add('active');
    languageToggle.setAttribute('aria-expanded', 'true');
    languageToggle.classList.add('active');
  }

  function toggleDropdown(e) {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = languageDropdown.classList.contains('active');
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  languageToggle.addEventListener('click', toggleDropdown);
  document.addEventListener('click', (e) => {
    if (!languageDropdown.contains(e.target)) {
      closeDropdown();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && languageDropdown.classList.contains('active')) {
      closeDropdown();
      languageToggle.focus();
    }
  });
  languageMenu.addEventListener('keydown', (e) => {
    const languageItems = languageMenu.querySelectorAll('.language-item');
    const currentIndex = Array.from(languageItems).indexOf(document.activeElement);
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        const nextIndex = currentIndex < languageItems.length - 1 ? currentIndex + 1 : 0;
        languageItems[nextIndex].focus();
        break;
      case 'ArrowUp':
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : languageItems.length - 1;
        languageItems[prevIndex].focus();
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (document.activeElement.classList.contains('language-item')) {
          document.activeElement.click();
        }
        break;
    }
  });
  const languageItems = languageMenu.querySelectorAll('.language-item');
  languageItems.forEach(item => {
    item.addEventListener('click', () => {
      closeDropdown();
    });
  });
}
