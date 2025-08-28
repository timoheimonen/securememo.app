// URL-based localization utility for securememo.app
// Supports privacy-first localization using only URL paths
// Default locale: /en, no cookies or browser storage used

import { TRANSLATIONS } from './translations.js';

const SUPPORTED_LOCALES = ['ar', 'bn', 'cs', 'da', 'de', 'el', 'en', 'es', 'fi', 'fr', 'hi', 'hu', 'id', 'it', 'ja', 'ko', 'nl', 'no', 'pl', 'ptBR', 'ptPT', 'ru', 'ro', 'sv', 'tl', 'th', 'tr', 'uk', 'vi', 'zh'];
const DEFAULT_LOCALE = 'en';



/**
 * Extract locale from URL pathname
 * @param {string} pathname - URL pathname (e.g., '/en/about.html')
 * @returns {object} - { locale: string, pathWithoutLocale: string, needsRedirect?: boolean }
 */
export function extractLocaleFromPath(pathname) {
  // Remove leading slash and split path
  const segments = pathname.replace(/^\/+/, '').split('/');
  
  // Check if first segment is a supported locale
  if (segments.length > 0 && SUPPORTED_LOCALES.includes(segments[0])) {
    const locale = segments[0];
    const remainingSegments = segments.slice(1);
    
    // Check for nested locale patterns and strip ALL leading locale segments
    let cleanSegments = remainingSegments;
    let hasNestedLocales = false;
    
    // Strip all consecutive locale segments from the beginning
    while (cleanSegments.length > 0 && SUPPORTED_LOCALES.includes(cleanSegments[0])) {
      cleanSegments = cleanSegments.slice(1);
      hasNestedLocales = true;
    }
    
    // If we found nested locales, return the clean path for redirect
    if (hasNestedLocales) {
      const cleanPath = cleanSegments.length > 0 ? '/' + cleanSegments.join('/') : '/';
      return { 
        locale: DEFAULT_LOCALE, 
        pathWithoutLocale: cleanPath,
        needsRedirect: true 
      };
    }
    
    const pathWithoutLocale = remainingSegments.length > 0 ? '/' + remainingSegments.join('/') : '/';
    
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
 * Normalize locale from Accept-Language format to our supported locale codes
 * @param {string} locale - Locale from Accept-Language (e.g., 'pt-BR', 'en-US', 'zh-CN')
 * @returns {string|null} - Normalized locale code or null if not supported
 */
function normalizeLocale(locale) {
  const lowerLocale = locale.toLowerCase();
  
  // Handle exact matches first (for our compound codes like ptBR, ptPT)
  const exactMatch = SUPPORTED_LOCALES.find(supported => 
    supported.toLowerCase() === lowerLocale.replace('-', '')
  );
  if (exactMatch) {
    return exactMatch;
  }
  
  // Handle regional variants
  const [lang, region] = lowerLocale.split('-');
  
  // Portuguese regional mapping
  if (lang === 'pt') {
    if (region === 'br') return 'ptBR';
    if (region === 'pt') return 'ptPT';
    // Default Portuguese to Brazil (more common)
    return 'ptBR';
  }
  
  // Chinese regional mapping
  if (lang === 'zh') {
    // Map all Chinese variants (zh-CN, zh-TW, zh-HK, zh-SG, etc.) to 'zh'
    // since we only support one Chinese translation (simplified Chinese)
    return 'zh';
  }
  
  // For other languages, check if base language is supported
  if (SUPPORTED_LOCALES.includes(lang)) {
    return lang;
  }
  
  return null;
}

/**
 * Extract locale from request headers or query parameters for API calls
 * @param {Request} request - The request object
 * @returns {string} - Locale code
 */
export function extractLocaleFromRequest(request) {
  try {
    // First try to get locale from query parameter
    const url = new URL(request.url);
    const queryLocale = url.searchParams.get('locale');
    if (queryLocale) {
      const normalized = normalizeLocale(queryLocale);
      if (normalized) return normalized;
    }
    
    // Try to get locale from Accept-Language header
    const acceptLanguage = request.headers.get('Accept-Language');
    if (acceptLanguage) {
      // Parse Accept-Language header (e.g., "en-US,en;q=0.9,pt-BR;q=0.8")
      const locales = acceptLanguage
        .split(',')
        .map(lang => {
          const [locale, q] = lang.trim().split(';q=');
          const quality = q ? parseFloat(q) : 1.0;
          return { locale: locale.trim(), quality };
        })
        .sort((a, b) => b.quality - a.quality); // Sort by quality descending
      
      // Find the first supported locale
      for (const { locale } of locales) {
        const normalized = normalizeLocale(locale);
        if (normalized) {
          return normalized;
        }
      }
    }
    
    // Try to get locale from custom X-Locale header
    const customLocale = request.headers.get('X-Locale');
    if (customLocale) {
      const normalized = normalizeLocale(customLocale);
      if (normalized) return normalized;
    }
  } catch (error) {
    // If there's any error parsing, fall back to default
  }
  
  // Fallback to default locale
  return DEFAULT_LOCALE;
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
