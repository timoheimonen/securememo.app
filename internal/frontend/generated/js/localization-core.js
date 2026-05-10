const SUPPORTED_LOCALES = ["ar","bn","cs","da","de","el","en","es","fi","fr","hi","hu","id","it","ja","ko","nl","no","pl","ptBR","ptPT","ru","ro","sv","tl","th","tr","uk","vi","zh"];
const DEFAULT_LOCALE = 'en';

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

export function createLocalization(locale, translations) {
  function t(key, localeOverride = null) {
    if (!isValidTranslationKey(key)) {
      return key;
    }
    const currentLocale = localeOverride || locale;
    const localeTable = safeGetProperty(translations, currentLocale);
    const translation = safeGetProperty(localeTable, key);
    if (translation !== undefined) {
      return translation;
    }
    if (currentLocale !== DEFAULT_LOCALE) {
      const fallbackTable = safeGetProperty(translations, DEFAULT_LOCALE);
      const fallbackTranslation = safeGetProperty(fallbackTable, key);
      if (fallbackTranslation !== undefined) {
        return fallbackTranslation;
      }
    }
    return key;
  }

  function localizeUrl(path, locOverride = null) {
    const loc = locOverride || locale;
    const normalizedPath = path.startsWith('/') ? path : '/' + path;
    if (normalizedPath === '/') {
      return `/${loc}`;
    }
    return `/${loc}${normalizedPath}`;
  }

  function updateNavigationLinks() {
    const navLinks = document.querySelectorAll('.nav-link[href]');
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith('http') || href.startsWith(`/${locale}`)) {
        return;
      }
      const localizedHref = localizeUrl(href);
      link.setAttribute('href', localizedHref);
    });
  }

  function updateLogoLink() {
    const logoLink = document.querySelector('.nav-logo');
    if (logoLink) {
      logoLink.setAttribute('href', localizeUrl('/'));
    }
  }

  function updateInternalLinks() {
    const links = document.querySelectorAll('a[href^="/"]');
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href.startsWith(`/${locale}`) ||
          href.startsWith('/api/') ||
          href.startsWith('/js/') ||
          href.startsWith('/styles.css') ||
          href.startsWith('/sitemap.xml')) {
        return;
      }
      const localizedHref = localizeUrl(href);
      link.setAttribute('href', localizedHref);
    });
  }

  function initLocalization() {
    updateNavigationLinks();
    updateLogoLink();
    updateInternalLinks();
    document.documentElement.setAttribute('lang', locale);
  }

  return { t, localizeUrl, initLocalization };
}
