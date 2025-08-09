// Client-side localization utility for securememo.app
// Privacy-first approach: uses only URL-based locale detection
// No cookies, localStorage, or browser storage used

import { TRANSLATIONS } from './translations.js';

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'hi', 'zh'];
const DEFAULT_LOCALE = 'en';

/**
 * Get current locale from URL
 * @returns {string} Current locale code
 */
export function getCurrentLocale() {
  const pathname = window.location.pathname;
  const segments = pathname.replace(/^\/+/, '').split('/');
  
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0])) {
    return segments[0];
  }
  
  return DEFAULT_LOCALE;
}

/**
 * Get translation for a key
 * @param {string} key - Translation key (e.g., 'nav.home')
 * @param {string} locale - Locale code (optional, uses current locale if not provided)
 * @returns {string} Translated text or key if translation not found
 */
export function t(key, locale = null) {
  const currentLocale = locale || getCurrentLocale();
  
  if (TRANSLATIONS[currentLocale] && TRANSLATIONS[currentLocale][key]) {
    return TRANSLATIONS[currentLocale][key];
  }
  
  // Fallback to default locale
  if (currentLocale !== DEFAULT_LOCALE && TRANSLATIONS[DEFAULT_LOCALE] && TRANSLATIONS[DEFAULT_LOCALE][key]) {
    return TRANSLATIONS[DEFAULT_LOCALE][key];
  }
  
  // Return key if no translation found
  return key;
}

/**
 * Build localized URL for navigation
 * @param {string} path - Path without locale (e.g., '/about.html')
 * @param {string} locale - Locale code (optional, uses current locale if not provided)
 * @returns {string} Localized URL
 */
export function localizeUrl(path, locale = null) {
  const currentLocale = locale || getCurrentLocale();
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  
  // Handle root path
  if (normalizedPath === '/') {
    return `/${currentLocale}`;
  }
  
  return `/${currentLocale}${normalizedPath}`;
}

/**
 * Update navigation links to be locale-aware
 */
export function updateNavigationLinks() {
  const navLinks = document.querySelectorAll('.nav-link[href]');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // Skip external links and already localized links
    if (href.startsWith('http') || href.startsWith(`/${getCurrentLocale()}`)) {
      return;
    }
    
    // Update href to include current locale
    const localizedHref = localizeUrl(href);
    link.setAttribute('href', localizedHref);
  });
}

/**
 * Update logo link to be locale-aware
 */
export function updateLogoLink() {
  const logoLink = document.querySelector('.nav-logo');
  if (logoLink) {
    logoLink.setAttribute('href', localizeUrl('/'));
  }
}

/**
 * Update all internal links to be locale-aware
 */
export function updateInternalLinks() {
  const links = document.querySelectorAll('a[href^="/"]');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    
    // Skip already localized links and special paths
    if (href.startsWith(`/${getCurrentLocale()}`) || 
        href.startsWith('/api/') || 
        href.startsWith('/js/') || 
        href.startsWith('/styles.css') || 
        href.startsWith('/sitemap.xml')) {
      return;
    }
    
    // Update href to include current locale
    const localizedHref = localizeUrl(href);
    link.setAttribute('href', localizedHref);
  });
}

/**
 * Initialize client-side localization
 * This should be called when the page loads
 */
export function initLocalization() {
  // Update navigation links
  updateNavigationLinks();
  updateLogoLink();
  updateInternalLinks();
  
  // Set document language attribute
  document.documentElement.setAttribute('lang', getCurrentLocale());
}

/**
 * Get supported locales
 * @returns {Array<string>} Array of supported locale codes
 */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Check if locale is supported
 * @param {string} locale - Locale code to check
 * @returns {boolean} True if supported
 */
export function isLocaleSupported(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

/**
 * Get the client localization code as a string for serving as a JS file
 * @returns {string} JavaScript code for client-side localization
 */
export function getClientLocalizationJS() {
  // Use the same TRANSLATIONS object but format as string for serving
  const translationsString = JSON.stringify(TRANSLATIONS, null, 2);
  
  return `// Client-side localization utility for securememo.app
// Privacy-first approach: uses only URL-based locale detection
// No cookies, localStorage, or browser storage used

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'hi', 'zh'];
const DEFAULT_LOCALE = 'en';

// Translation strings for different locales
// English, Spanish, French, German, Hindi, and Chinese support
const TRANSLATIONS = ${translationsString};

/**
 * Get current locale from URL
 * @returns {string} Current locale code
 */
export function getCurrentLocale() {
  const pathname = window.location.pathname;
  const segments = pathname.replace(/^\/+/, '').split('/');
  
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0])) {
    return segments[0];
  }
  
  return DEFAULT_LOCALE;
}

/**
 * Get translation for a key
 * @param {string} key - Translation key (e.g., 'nav.home')
 * @param {string} locale - Locale code (optional, uses current locale if not provided)
 * @returns {string} Translated text or key if translation not found
 */
export function t(key, locale = null) {
  const currentLocale = locale || getCurrentLocale();
  
  if (TRANSLATIONS[currentLocale] && TRANSLATIONS[currentLocale][key]) {
    return TRANSLATIONS[currentLocale][key];
  }
  
  // Fallback to default locale
  if (currentLocale !== DEFAULT_LOCALE && TRANSLATIONS[DEFAULT_LOCALE] && TRANSLATIONS[DEFAULT_LOCALE][key]) {
    return TRANSLATIONS[DEFAULT_LOCALE][key];
  }
  
  // Return key if no translation found
  return key;
}

/**
 * Build localized URL for navigation
 * @param {string} path - Path without locale (e.g., '/about.html')
 * @param {string} locale - Locale code (optional, uses current locale if not provided)
 * @returns {string} Localized URL
 */
export function localizeUrl(path, locale = null) {
  const currentLocale = locale || getCurrentLocale();
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  
  // Handle root path
  if (normalizedPath === '/') {
    return \`/\${currentLocale}\`;
  }
  
  return \`/\${currentLocale}\${normalizedPath}\`;
}

/**
 * Update navigation links to be locale-aware
 */
export function updateNavigationLinks() {
  const navLinks = document.querySelectorAll('.nav-link[href]');
  
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    
    // Skip external links and already localized links
    if (href.startsWith('http') || href.startsWith(\`/\${getCurrentLocale()}\`)) {
      return;
    }
    
    // Update href to include current locale
    const localizedHref = localizeUrl(href);
    link.setAttribute('href', localizedHref);
  });
}

/**
 * Update logo link to be locale-aware
 */
export function updateLogoLink() {
  const logoLink = document.querySelector('.nav-logo');
  if (logoLink) {
    logoLink.setAttribute('href', localizeUrl('/'));
  }
}

/**
 * Update all internal links to be locale-aware
 */
export function updateInternalLinks() {
  const links = document.querySelectorAll('a[href^="/"]');
  
  links.forEach(link => {
    const href = link.getAttribute('href');
    
    // Skip already localized links and special paths
    if (href.startsWith(\`/\${getCurrentLocale()}\`) || 
        href.startsWith('/api/') || 
        href.startsWith('/js/') || 
        href.startsWith('/styles.css') || 
        href.startsWith('/sitemap.xml')) {
      return;
    }
    
    // Update href to include current locale
    const localizedHref = localizeUrl(href);
    link.setAttribute('href', localizedHref);
  });
}

/**
 * Initialize client-side localization
 * This should be called when the page loads
 */
export function initLocalization() {
  // Update navigation links
  updateNavigationLinks();
  updateLogoLink();
  updateInternalLinks();
  
  // Set document language attribute
  document.documentElement.setAttribute('lang', getCurrentLocale());
}

/**
 * Get supported locales
 * @returns {Array<string>} Array of supported locale codes
 */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Check if locale is supported
 * @param {string} locale - Locale code to check
 * @returns {boolean} True if supported
 */
export function isLocaleSupported(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}`;
}
