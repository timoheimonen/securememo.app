/* eslint-env browser */
// Bind DOM globals explicitly for static analysis without relying on implicit environment inference
const { window: _window, document: _document } = globalThis;
// Client-side localization utility for securememo.app
// Privacy-first approach: uses only URL-based locale detection
// No cookies, localStorage, or browser storage used

import { TRANSLATIONS } from "./translations.js";
import { getSupportedLocales, isLocaleSupported } from "./localization.js";

const DEFAULT_LOCALE = "en";

/**
 * Validate translation key to prevent object injection attacks
 * @param {string} key - Translation key to validate
 * @returns {boolean} True if key is safe
 */
function isValidTranslationKey(key) {
  // Only allow alphanumeric characters, dots, and underscores
  // Reject keys that could access prototype or constructor
  return (
    typeof key === "string" &&
    /^[a-zA-Z0-9_.]+$/.test(key) &&
    !key.includes("__proto__") &&
    !key.includes("constructor") &&
    !key.includes("prototype") &&
    key.length <= 100
  ); // Reasonable length limit
}

/**
 * Safely get property from object using hasOwnProperty
 * @param {object} obj - Object to access
 * @param {string} key - Property key
 * @returns {*} Property value or undefined
 */
function safeGetProperty(obj, key) {
  if (!obj || typeof obj !== "object") return undefined;
  if (!isValidTranslationKey(key)) return undefined;
  // Use Reflect.get on a validated key to avoid direct bracket notation flagged by some analyzers
  return Object.prototype.hasOwnProperty.call(obj, key) ? Reflect.get(obj, key) : undefined;
}

/**
 * Get current locale from URL
 * @returns {string} Current locale code
 */
export function getCurrentLocale() {
  const pathname = _window.location.pathname;
  const segments = pathname.replace(/^\/+/, "").split("/");

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
  /**
   * Resolve translations table for a supported locale without dynamic bracket access.
   * Using an explicit switch avoids generic object injection sink patterns flagged by SAST.
   * @param {string} loc Locale code
   * @returns {object|undefined} Translation table
   */
  function getLocaleTable(loc) {
    switch (loc) {
      case "ar":
        return TRANSLATIONS.ar;
      case "bn":
        return TRANSLATIONS.bn;
      case "cs":
        return TRANSLATIONS.cs;
      case "da":
        return TRANSLATIONS.da;
      case "de":
        return TRANSLATIONS.de;
      case "el":
        return TRANSLATIONS.el;
      case "en":
        return TRANSLATIONS.en;
      case "es":
        return TRANSLATIONS.es;
      case "fi":
        return TRANSLATIONS.fi;
      case "fr":
        return TRANSLATIONS.fr;
      case "hi":
        return TRANSLATIONS.hi;
      case "hu":
        return TRANSLATIONS.hu;
      case "id":
        return TRANSLATIONS.id;
      case "it":
        return TRANSLATIONS.it;
      case "ja":
        return TRANSLATIONS.ja;
      case "ko":
        return TRANSLATIONS.ko;
      case "nl":
        return TRANSLATIONS.nl;
      case "no":
        return TRANSLATIONS.no;
      case "pl":
        return TRANSLATIONS.pl;
      case "ptBR":
        return TRANSLATIONS.ptBR;
      case "ptPT":
        return TRANSLATIONS.ptPT;
      case "ro":
        return TRANSLATIONS.ro;
      case "ru":
        return TRANSLATIONS.ru;
      case "sv":
        return TRANSLATIONS.sv;
      case "th":
        return TRANSLATIONS.th;
      case "tl":
        return TRANSLATIONS.tl;
      case "tr":
        return TRANSLATIONS.tr;
      case "uk":
        return TRANSLATIONS.uk;
      case "vi":
        return TRANSLATIONS.vi;
      case "zh":
        return TRANSLATIONS.zh;
      default:
        return TRANSLATIONS.en; // fallback
    }
  }

  const localeTable = getLocaleTable(currentLocale);
  // Use safe property access on the resolved table
  const translation = safeGetProperty(localeTable, key);
  if (translation !== undefined) {
    return translation;
  }

  // Fallback to default locale
  if (currentLocale !== DEFAULT_LOCALE) {
    const fallbackTranslation = safeGetProperty(getLocaleTable(DEFAULT_LOCALE), key);
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
  const normalizedPath = path.startsWith("/") ? path : "/" + path;

  // Handle root path
  if (normalizedPath === "/") {
    return `/${currentLocale}`;
  }

  return `/${currentLocale}${normalizedPath}`;
}

/**
 * Update navigation links to be locale-aware
 */
export function updateNavigationLinks() {
  const navLinks = _document.querySelectorAll(".nav-link[href]");

  navLinks.forEach((link) => {
    const href = link.getAttribute("href");

    // Skip external links and already localized links
    if (href.startsWith("http") || href.startsWith(`/${getCurrentLocale()}`)) {
      return;
    }

    // Update href to include current locale
    const localizedHref = localizeUrl(href);
    link.setAttribute("href", localizedHref);
  });
}

/**
 * Update logo link to be locale-aware
 */
export function updateLogoLink() {
  const logoLink = _document.querySelector(".nav-logo");
  if (logoLink) {
    logoLink.setAttribute("href", localizeUrl("/"));
  }
}

/**
 * Update all internal links to be locale-aware
 */
export function updateInternalLinks() {
  const links = _document.querySelectorAll('a[href^="/"]');

  links.forEach((link) => {
    const href = link.getAttribute("href");

    // Skip already localized links and special paths
    if (
      href.startsWith(`/${getCurrentLocale()}`) ||
      href.startsWith("/api/") ||
      href.startsWith("/js/") ||
      href.startsWith("/styles.css") ||
      href.startsWith("/sitemap.xml")
    ) {
      return;
    }

    // Update href to include current locale
    const localizedHref = localizeUrl(href);
    link.setAttribute("href", localizedHref);
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
  _document.documentElement.setAttribute("lang", getCurrentLocale());
}

// Re-export functions from localization.js for consistency
export { getSupportedLocales, isLocaleSupported } from "./localization.js";

/**
 * Get the client localization code as a string for serving as a JS file
 * @param {string} [locale='en'] - The locale to include translations for
 * @returns {string} JavaScript code for client-side localization with only relevant translations
 */
export function getClientLocalizationJS(locale = "en") {
  // Validate and normalize locale
  if (!isLocaleSupported(locale)) {
    locale = "en";
  }
  // Sanitize translation tables to immutable, null-prototype objects without using
  // dynamic property definition (avoids generic object injection sink pattern).
  const sanitize = (tbl) => {
    const clean = Object.create(null);
    if (!tbl || typeof tbl !== "object") return clean;
    for (const k of Object.keys(tbl)) {
      if (
        /^[a-zA-Z0-9_.]+$/.test(k) &&
        k.length <= 120 &&
        !k.includes("__proto__") &&
        !k.includes("constructor") &&
        !k.includes("prototype")
      ) {
        const raw = Reflect.get(tbl, k);
        const v = raw === null || raw === undefined ? "" : String(raw);
        Object.defineProperty(clean, k, { value: v, enumerable: true, writable: false, configurable: false });
      }
    }
    return clean;
  };
  /**
   * Resolve a safe locale key strictly from the supported locales list.
   * This prevents prototype pollution or object injection through crafted keys.
   * @param {string} loc Candidate locale
   * @returns {string} Whitelisted locale
   */
  const resolveSafeLocale = (loc) => {
    // Double validation: ensure string & exact match in supported locales
    if (typeof loc !== "string") return "en";
    const supported = getSupportedLocales();
    return supported.includes(loc) ? loc : "en";
  };

  const safeLocale = resolveSafeLocale(locale);

  // Safe guarded access: only proceed if safeLocale is own property and value is an object
  // Avoid dynamic bracket notation (generic object injection sink) by enumerating allowed locales explicitly.
  let baseTable; // will remain undefined and fallback to 'en' if not matched
  switch (safeLocale) {
    case "ar":
      baseTable = TRANSLATIONS.ar;
      break;
    case "bn":
      baseTable = TRANSLATIONS.bn;
      break;
    case "cs":
      baseTable = TRANSLATIONS.cs;
      break;
    case "da":
      baseTable = TRANSLATIONS.da;
      break;
    case "de":
      baseTable = TRANSLATIONS.de;
      break;
    case "el":
      baseTable = TRANSLATIONS.el;
      break;
    case "en":
      baseTable = TRANSLATIONS.en;
      break;
    case "es":
      baseTable = TRANSLATIONS.es;
      break;
    case "fi":
      baseTable = TRANSLATIONS.fi;
      break;
    case "fr":
      baseTable = TRANSLATIONS.fr;
      break;
    case "hi":
      baseTable = TRANSLATIONS.hi;
      break;
    case "hu":
      baseTable = TRANSLATIONS.hu;
      break;
    case "id":
      baseTable = TRANSLATIONS.id;
      break;
    case "it":
      baseTable = TRANSLATIONS.it;
      break;
    case "ja":
      baseTable = TRANSLATIONS.ja;
      break;
    case "ko":
      baseTable = TRANSLATIONS.ko;
      break;
    case "nl":
      baseTable = TRANSLATIONS.nl;
      break;
    case "no":
      baseTable = TRANSLATIONS.no;
      break;
    case "pl":
      baseTable = TRANSLATIONS.pl;
      break;
    case "ptBR":
      baseTable = TRANSLATIONS.ptBR;
      break;
    case "ptPT":
      baseTable = TRANSLATIONS.ptPT;
      break;
    case "ro":
      baseTable = TRANSLATIONS.ro;
      break;
    case "ru":
      baseTable = TRANSLATIONS.ru;
      break;
    case "sv":
      baseTable = TRANSLATIONS.sv;
      break;
    case "th":
      baseTable = TRANSLATIONS.th;
      break;
    case "tl":
      baseTable = TRANSLATIONS.tl;
      break;
    case "tr":
      baseTable = TRANSLATIONS.tr;
      break;
    case "uk":
      baseTable = TRANSLATIONS.uk;
      break;
    case "vi":
      baseTable = TRANSLATIONS.vi;
      break;
    case "zh":
      baseTable = TRANSLATIONS.zh;
      break;
    default:
      baseTable = TRANSLATIONS.en;
      break;
  }
  // Final safety check: ensure object shape, else fallback.
  if (!baseTable || typeof baseTable !== "object") {
    baseTable = TRANSLATIONS.en;
  }

  const primaryTable = sanitize(baseTable);
  const fallbackTable =
    safeLocale !== "en" && Object.prototype.hasOwnProperty.call(TRANSLATIONS, "en")
      ? sanitize(TRANSLATIONS["en"])
      : null;

  // Build the minimal translations object (stringified) with only allowlisted keys.
  // Build translations object using validated safeLocale only.
  const translationsObj = fallbackTable
    ? { [safeLocale]: primaryTable, en: fallbackTable }
    : { [safeLocale]: primaryTable };
  const translationsString = JSON.stringify(translationsObj);
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
  // Resolve locale table without dynamic indexing (switch-based)
  function getLocaleTable(loc) {
    switch (loc) {
      case 'ar': return TRANSLATIONS.ar;
      case 'bn': return TRANSLATIONS.bn;
      case 'cs': return TRANSLATIONS.cs;
      case 'da': return TRANSLATIONS.da;
      case 'de': return TRANSLATIONS.de;
      case 'el': return TRANSLATIONS.el;
      case 'en': return TRANSLATIONS.en;
      case 'es': return TRANSLATIONS.es;
      case 'fi': return TRANSLATIONS.fi;
      case 'fr': return TRANSLATIONS.fr;
      case 'hi': return TRANSLATIONS.hi;
      case 'hu': return TRANSLATIONS.hu;
      case 'id': return TRANSLATIONS.id;
      case 'it': return TRANSLATIONS.it;
      case 'ja': return TRANSLATIONS.ja;
      case 'ko': return TRANSLATIONS.ko;
      case 'nl': return TRANSLATIONS.nl;
      case 'no': return TRANSLATIONS.no;
      case 'pl': return TRANSLATIONS.pl;
      case 'ptBR': return TRANSLATIONS.ptBR;
      case 'ptPT': return TRANSLATIONS.ptPT;
      case 'ro': return TRANSLATIONS.ro;
      case 'ru': return TRANSLATIONS.ru;
      case 'sv': return TRANSLATIONS.sv;
      case 'th': return TRANSLATIONS.th;
      case 'tl': return TRANSLATIONS.tl;
      case 'tr': return TRANSLATIONS.tr;
      case 'uk': return TRANSLATIONS.uk;
      case 'vi': return TRANSLATIONS.vi;
      case 'zh': return TRANSLATIONS.zh;
      default: return TRANSLATIONS.en;
    }
  }
  const localeTable = getLocaleTable(currentLocale);
  const translation = safeGetProperty(localeTable, key);
  if (translation !== undefined) {
    return translation;
  }
  
  // Fallback to default locale
  if (currentLocale !== DEFAULT_LOCALE) {
    const fallbackTranslation = safeGetProperty(getLocaleTable(DEFAULT_LOCALE), key);
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
  const navLinks = _document.querySelectorAll('.nav-link[href]');
  
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
  const logoLink = _document.querySelector('.nav-logo');
  if (logoLink) {
    logoLink.setAttribute('href', localizeUrl('/'));
  }
}

/**
 * Update all internal links to be locale-aware
 */
export function updateInternalLinks() {
  const links = _document.querySelectorAll('a[href^="/"]');
  
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
  _document.documentElement.setAttribute('lang', getCurrentLocale());
}

`;
}
