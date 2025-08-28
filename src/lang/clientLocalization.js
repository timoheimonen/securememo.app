// Client-side localization utility for securememo.app
// Privacy-first approach: uses only URL-based locale detection
// No cookies, localStorage, or browser storage used

import { TRANSLATIONS } from './translations.js';
import { getSupportedLocales, isLocaleSupported } from './localization.js';

const DEFAULT_LOCALE = 'en';

/**
 * Validate translation key to prevent object injection attacks
 * @param {string} key - Translation key to validate
 * @returns {boolean} True if key is safe
 */
function isValidTranslationKey(key) {
  // Only allow alphanumeric characters, dots, and underscores
  // Reject keys that could access prototype or constructor
  return typeof key === 'string' &&
         /^[a-zA-Z0-9_.]+$/.test(key) &&
         !key.includes('__proto__') &&
         !key.includes('constructor') &&
         !key.includes('prototype') &&
         key.length <= 100; // Reasonable length limit
}

/**
 * Safely get property from object using hasOwnProperty
 * @param {object} obj - Object to access
 * @param {string} key - Property key
 * @returns {*} Property value or undefined
 */
function safeGetProperty(obj, key) {
  if (!obj || typeof obj !== 'object') return undefined;
  if (!isValidTranslationKey(key)) return undefined;
  // Use Reflect.get on a validated key to avoid direct bracket notation flagged by some analyzers
  return Object.prototype.hasOwnProperty.call(obj, key) ? Reflect.get(obj, key) : undefined;
}

/**
 * Get current locale from URL
 * @returns {string} Current locale code
 */
export function getCurrentLocale() {
  const pathname = window.location.pathname;
  const segments = pathname.replace(/^\/+/, '').split('/');
  
  if (segments.length > 0 && isLocaleSupported(segments[0])) {
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
  // Validate input to prevent object injection
  if (!isValidTranslationKey(key)) {
    return key;
  }

  const currentLocale = locale || getCurrentLocale();

  // Use safe property access
  const translation = safeGetProperty(TRANSLATIONS[currentLocale], key);
  if (translation !== undefined) {
    return translation;
  }

  // Fallback to default locale
  if (currentLocale !== DEFAULT_LOCALE) {
    const fallbackTranslation = safeGetProperty(TRANSLATIONS[DEFAULT_LOCALE], key);
    if (fallbackTranslation !== undefined) {
      return fallbackTranslation;
    }
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

// Re-export functions from localization.js for consistency
export { getSupportedLocales, isLocaleSupported } from './localization.js';

/**
 * Get the client localization code as a string for serving as a JS file
 * @param {string} [locale='en'] - The locale to include translations for
 * @returns {string} JavaScript code for client-side localization with only relevant translations
 */
export function getClientLocalizationJS(locale = 'en') {
  // Validate and normalize locale
  if (!isLocaleSupported(locale)) {
    locale = 'en';
  }

  // Include only the requested locale and 'en' fallback if needed
  const relevantTranslations = Object.create(null);
  if (Object.prototype.hasOwnProperty.call(TRANSLATIONS, locale) && typeof TRANSLATIONS[locale] === 'object') {
    Object.defineProperty(relevantTranslations, locale, { value: TRANSLATIONS[locale], enumerable: true, writable: false, configurable: false });
  } else if (Object.prototype.hasOwnProperty.call(TRANSLATIONS, 'en')) {
    Object.defineProperty(relevantTranslations, locale, { value: TRANSLATIONS['en'], enumerable: true, writable: false, configurable: false });
  }

  if (locale !== 'en' && Object.prototype.hasOwnProperty.call(TRANSLATIONS, 'en')) {
    Object.defineProperty(relevantTranslations, 'en', { value: TRANSLATIONS['en'], enumerable: true, writable: false, configurable: false });
  }

  // Compact JSON to minimize payload size
  const translationsString = JSON.stringify(relevantTranslations);
  const supportedLocalesString = JSON.stringify(getSupportedLocales());
  
  return `// Client-side localization utility for securememo.app
// Privacy-first approach: uses only URL-based locale detection
// No cookies, localStorage, or browser storage used

const SUPPORTED_LOCALES = ${supportedLocalesString};
const DEFAULT_LOCALE = 'en';

// Translation strings for the current locale (and fallback)
const TRANSLATIONS = ${translationsString};

function isLocaleSupported(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

function isValidTranslationKey(key) {
  return typeof key === 'string' &&
         /^[a-zA-Z0-9_.]+$/.test(key) &&
         !key.includes('__proto__') &&
         !key.includes('constructor') &&
         !key.includes('prototype') &&
         key.length <= 100;
}

function safeGetProperty(obj, key) {
  return obj && typeof obj === 'object' && Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined;
}

/**
 * Get translation for a key
 * @param {string} key - Translation key (e.g., 'nav.home')
 * @param {string} locale - Locale code (optional, uses current locale if not provided)
 * @returns {string} Translated text or key if translation not found
 */
export function t(key, locale = null) {
  // Validate input to prevent object injection
  if (!isValidTranslationKey(key)) {
    return key;
  }
  
  const currentLocale = locale || getCurrentLocale();
  
  // Use safe property access
  const translation = safeGetProperty(TRANSLATIONS[currentLocale], key);
  if (translation !== undefined) {
    return translation;
  }
  
  // Fallback to default locale
  if (currentLocale !== DEFAULT_LOCALE) {
    const fallbackTranslation = safeGetProperty(TRANSLATIONS[DEFAULT_LOCALE], key);
    if (fallbackTranslation !== undefined) {
      return fallbackTranslation;
    }
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

`;
}
