// URL-based localization utility for securememo.app
// Supports privacy-first localization using only URL paths
// Default locale: /en, no cookies or browser storage used

import { TRANSLATIONS } from './translations.js';

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'hi', 'zh', 'ptPT', 'ptBR', 'ja'];
const DEFAULT_LOCALE = 'en';



/**
 * Extract locale from URL pathname
 * @param {string} pathname - URL pathname (e.g., '/en/about.html')
 * @returns {object} - { locale: string, pathWithoutLocale: string }
 */
export function extractLocaleFromPath(pathname) {
  // Remove leading slash and split path
  const segments = pathname.replace(/^\/+/, '').split('/');
  
  // Check if first segment is a supported locale
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0])) {
    const locale = segments[0];
    const pathWithoutLocale = '/' + segments.slice(1).join('/');
    
    // Handle root path case
    if (pathWithoutLocale === '/') {
      return { locale, pathWithoutLocale: '/' };
    }
    
    return { locale, pathWithoutLocale };
  }
  
  // No locale found, return default
  return { 
    locale: DEFAULT_LOCALE, 
    pathWithoutLocale: pathname 
  };
}

/**
 * Build localized URL path
 * @param {string} locale - Locale code (e.g., 'en')
 * @param {string} path - Path without locale (e.g., '/about.html')
 * @returns {string} - Localized path (e.g., '/en/about.html')
 */
export function buildLocalizedPath(locale, path) {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : '/' + path;
  
  // Handle root path
  if (normalizedPath === '/') {
    return `/${locale}`;
  }
  
  return `/${locale}${normalizedPath}`;
}

/**
 * Check if a redirect to localized path is needed
 * @param {string} pathname - Current pathname
 * @returns {string|null} - Redirect path if needed, null otherwise
 */
export function getLocaleRedirectPath(pathname) {
  const { locale, pathWithoutLocale } = extractLocaleFromPath(pathname);
  
  // If no locale detected in URL, redirect to default locale
  if (pathname === pathWithoutLocale) {
    return buildLocalizedPath(DEFAULT_LOCALE, pathname);
  }
  
  return null;
}

/**
 * Get locale-aware canonical URL
 * @param {string} baseUrl - Base URL (e.g., 'https://securememo.app')
 * @param {string} locale - Locale code
 * @param {string} path - Path without locale
 * @returns {string} - Full canonical URL
 */
export function getCanonicalUrl(baseUrl, locale, path) {
  const localizedPath = buildLocalizedPath(locale, path);
  return baseUrl + localizedPath;
}

/**
 * Get supported locales list
 * @returns {Array<string>} - Array of supported locale codes
 */
export function getSupportedLocales() {
  return [...SUPPORTED_LOCALES];
}

/**
 * Get default locale
 * @returns {string} - Default locale code
 */
export function getDefaultLocale() {
  return DEFAULT_LOCALE;
}

/**
 * Check if locale is supported
 * @param {string} locale - Locale code to check
 * @returns {boolean} - True if supported
 */
export function isLocaleSupported(locale) {
  return SUPPORTED_LOCALES.includes(locale);
}

/**
 * Server-side translation function
 * @param {string} key - Translation key (e.g., 'nav.home')
 * @param {string} locale - Locale code 
 * @returns {string} Translated text or key if translation not found
 */
export function t(key, locale = DEFAULT_LOCALE) {
  if (TRANSLATIONS[locale] && TRANSLATIONS[locale][key]) {
    return TRANSLATIONS[locale][key];
  }
  
  // Fallback to default locale
  if (locale !== DEFAULT_LOCALE && TRANSLATIONS[DEFAULT_LOCALE] && TRANSLATIONS[DEFAULT_LOCALE][key]) {
    return TRANSLATIONS[DEFAULT_LOCALE][key];
  }
  
  // Return key if no translation found
  return key;
}
