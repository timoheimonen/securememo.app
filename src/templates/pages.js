import { t } from '../lang/localization.js';
import { sanitizeLocale } from '../utils/validation/index.js';

// Helper function to get native language name
function getLanguageDisplayName(locale) {
  const sanitizedLocale = sanitizeLocale(locale);

  const languageNames = new Map([
    ['ar', 'العربية'],
    ['bn', 'বাংলা'],
    ['cs', 'Čeština'],
    ['da', 'Dansk'],
    ['de', 'Deutsch'],
    ['el', 'Ελληνικά'],
    ['en', 'English'],
    ['es', 'Español'],
    ['fi', 'Suomi'],
    ['fr', 'Français'],
    ['hi', 'हिन्दी'],
    ['hu', 'Magyar'],
    ['id', 'Bahasa Indonesia'],
    ['it', 'Italiano'],
    ['ja', '日本語'],
    ['ko', '한국어'],
    ['nl', 'Nederlands'],
    ['no', 'Norsk'],
    ['pl', 'Polski'],
    ['ptBR', 'Português (BR)'],
    ['ptPT', 'Português'],
    ['ru', 'Русский'],
    ['ro', 'Română'],
    ['sv', 'Svenska'],
    ['tl', 'Tagalog'],
    ['th', 'ไทย'],
    ['tr', 'Türkçe'],
    ['uk', 'Українська'],
    ['vi', 'Tiếng Việt'],
    ['zh', '中文'],
  ]);

  return languageNames.get(sanitizedLocale) || sanitizedLocale.toUpperCase();
}

// function to get a flag emoji for the selected locale
function getFlagEmoji(locale) {
  const sanitizedLocale = sanitizeLocale(locale);

  const flags = new Map([
    ['ar', '🌐'],
    ['bn', '🇧🇩'],
    ['cs', '🇨🇿'],
    ['da', '🇩🇰'],
    ['de', '🇩🇪'],
    ['el', '🇬🇷'],
    ['en', '🇬🇧'],
    ['es', '🇪🇸'],
    ['fi', '🇫🇮'],
    ['fr', '🇫🇷'],
    ['hi', '🇮🇳'],
    ['hu', '🇭🇺'],
    ['id', '🇮🇩'],
    ['it', '🇮🇹'],
    ['ja', '🇯🇵'],
    ['ko', '🇰🇷'],
    ['nl', '🇳🇱'],
    ['no', '🇳🇴'],
    ['pl', '🇵🇱'],
    ['ptBR', '🇧🇷'],
    ['ptPT', '🇵🇹'],
    ['ro', '🇷🇴'],
    ['ru', '🇷🇺'],
    ['sv', '🇸🇪'],
    ['tl', '🇵🇭'],
    ['th', '🇹🇭'],
    ['tr', '🇹🇷'],
    ['uk', '🇺🇦'],
    ['vi', '🇻🇳'],
    ['zh', '🈶'],
  ]);

  return flags.get(sanitizedLocale) || '🌐';
}

export async function getIndexHTML(locale = 'en', origin = 'https://securememo.app') {
  const sanitizedLocale = sanitizeLocale(locale);
  const canonicalUrl = `${origin}/${sanitizedLocale}`;
  return `<!DOCTYPE html>
<html lang="${sanitizedLocale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.home.title', sanitizedLocale)} | securememo.app</title>
    <meta name="description" content="${t('page.home.description', sanitizedLocale)}">
    <meta name="keywords" content="${t('page.home.keywords', sanitizedLocale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.home.ogTitle', sanitizedLocale)}">
    <meta property="og:description" content="${t('page.home.ogDescription', sanitizedLocale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.home.ogTitle', sanitizedLocale)}">
    <meta name="twitter:description" content="${t('page.home.twitterDescription', sanitizedLocale)}">
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    <link rel="canonical" href="${canonicalUrl}">
    <!-- Structured Data -->
    <script type="application/ld+json" nonce="{{CSP_NONCE}}">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "securememo.app",
      "description": "${t('schema.app.description', sanitizedLocale)}",
      "url": "https://securememo.app/",
      "applicationCategory": "${t('schema.app.category', sanitizedLocale)}",
      "operatingSystem": "${t('schema.app.os', sanitizedLocale)}",
      "browserRequirements": "${t('schema.app.requirements', sanitizedLocale)}",
      "author": {
        "@type": "Person",
        "name": "${t('schema.app.author', sanitizedLocale)}",
        "url": "https://github.com/timoheimonen"
      },
      "creator": {
        "@type": "Person",
        "name": "${t('schema.app.author', sanitizedLocale)}",
        "url": "https://github.com/timoheimonen"
      },
      "offers": {
        "@type": "Offer",
        "price": "${t('schema.app.price', sanitizedLocale)}",
        "priceCurrency": "${t('schema.app.currency', sanitizedLocale)}"
      },
      "featureList": [
        "${t('schema.app.features.encryption', sanitizedLocale)}",
        "${t('schema.app.features.selfDestruct', sanitizedLocale)}",
        "${t('schema.app.features.zeroKnowledge', sanitizedLocale)}",
        "${t('schema.app.features.noAccounts', sanitizedLocale)}",
        "${t('schema.app.features.globalPerformance', sanitizedLocale)}",
        "${t('schema.app.features.privacyFirst', sanitizedLocale)}"
      ],
      "screenshot": "https://securememo.app/android-chrome-512x512.png",
      "softwareVersion": "1.0.3",
      "datePublished": "2025-07-01",
      "dateModified": "2025-08-17",
      "license": "${t('schema.app.license', sanitizedLocale)}",
      "codeRepository": "${t('schema.app.repository', sanitizedLocale)}"
    }
    </script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${sanitizedLocale}" class="nav-logo">securememo.app</a>
            
            <!-- Hamburger Menu Button -->
            <button class="hamburger" type="button" aria-label="${t(
              'nav.toggleMenu',
              sanitizedLocale
            )}" aria-expanded="false">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
            
            <!-- Navigation Menu -->
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${sanitizedLocale}" class="nav-link active">${t('nav.home', sanitizedLocale)}</a></li>
                <li><a href="/${sanitizedLocale}/about.html" class="nav-link">${t(
                  'nav.about',
                  sanitizedLocale
                )}</a></li>
                <li><a href="/${sanitizedLocale}/create-memo.html" class="nav-link">${t(
                  'nav.create',
                  sanitizedLocale
                )}</a></li>
                <li class="language-dropdown">
                    <button class="language-toggle nav-link" aria-expanded="false" aria-haspopup="true">
                        ${getFlagEmoji(sanitizedLocale)} ${getLanguageDisplayName(sanitizedLocale)}
                    </button>
                    <div class="language-menu">
                        <a href="/ar" class="language-item ${sanitizedLocale === 'ar' ? 'active' : ''}" title="${t(
                          'language.arabic',
                          sanitizedLocale
                        )}">🌐 العربية</a>
                        <a href="/bn" class="language-item ${sanitizedLocale === 'bn' ? 'active' : ''}" title="${t(
                          'language.bengali',
                          sanitizedLocale
                        )}">🇧🇩 বাংলা</a>
                        <a href="/cs" class="language-item ${sanitizedLocale === 'cs' ? 'active' : ''}" title="${t(
                          'language.czech',
                          sanitizedLocale
                        )}">🇨🇿 Čeština</a>
                        <a href="/da" class="language-item ${sanitizedLocale === 'da' ? 'active' : ''}" title="${t(
                          'language.danish',
                          sanitizedLocale
                        )}">🇩🇰 Dansk</a>
                        <a href="/de" class="language-item ${sanitizedLocale === 'de' ? 'active' : ''}" title="${t(
                          'language.german',
                          sanitizedLocale
                        )}">🇩🇪 Deutsch</a>
                        <a href="/el" class="language-item ${sanitizedLocale === 'el' ? 'active' : ''}" title="${t(
                          'language.greek',
                          sanitizedLocale
                        )}">🇬🇷 Ελληνικά</a>
                        <a href="/en" class="language-item ${sanitizedLocale === 'en' ? 'active' : ''}" title="${t(
                          'language.english',
                          sanitizedLocale
                        )}">🇬🇧 English</a>
                        <a href="/es" class="language-item ${sanitizedLocale === 'es' ? 'active' : ''}" title="${t(
                          'language.spanish',
                          sanitizedLocale
                        )}">🇪🇸 Español</a>
                        <a href="/fi" class="language-item ${sanitizedLocale === 'fi' ? 'active' : ''}" title="${t(
                          'language.finnish',
                          sanitizedLocale
                        )}">🇫🇮 Suomi</a>
                        <a href="/fr" class="language-item ${sanitizedLocale === 'fr' ? 'active' : ''}" title="${t(
                          'language.french',
                          sanitizedLocale
                        )}">🇫🇷 Français</a>
                        <a href="/hi" class="language-item ${sanitizedLocale === 'hi' ? 'active' : ''}" title="${t(
                          'language.hindi',
                          sanitizedLocale
                        )}">🇮🇳 हिन्दी</a>
                        <a href="/hu" class="language-item ${sanitizedLocale === 'hu' ? 'active' : ''}" title="${t(
                          'language.hungarian',
                          sanitizedLocale
                        )}">🇭🇺 Magyar</a>
                        <a href="/id" class="language-item ${sanitizedLocale === 'id' ? 'active' : ''}" title="${t(
                          'language.indonesian',
                          sanitizedLocale
                        )}">🇮🇩 Bahasa Indonesia</a>
                        <a href="/it" class="language-item ${sanitizedLocale === 'it' ? 'active' : ''}" title="${t(
                          'language.italian',
                          sanitizedLocale
                        )}">🇮🇹 Italiano</a>
                        <a href="/ja" class="language-item ${sanitizedLocale === 'ja' ? 'active' : ''}" title="${t(
                          'language.japanese',
                          sanitizedLocale
                        )}">🇯🇵 日本語</a>
                        <a href="/ko" class="language-item ${sanitizedLocale === 'ko' ? 'active' : ''}" title="${t(
                          'language.korean',
                          sanitizedLocale
                        )}">🇰🇷 한국어</a>
                        <a href="/nl" class="language-item ${sanitizedLocale === 'nl' ? 'active' : ''}" title="${t(
                          'language.dutch',
                          sanitizedLocale
                        )}">🇳🇱 Nederlands</a>
                        <a href="/no" class="language-item ${sanitizedLocale === 'no' ? 'active' : ''}" title="${t(
                          'language.norwegian',
                          sanitizedLocale
                        )}">🇳🇴 Norsk</a>
                        <a href="/pl" class="language-item ${sanitizedLocale === 'pl' ? 'active' : ''}" title="${t(
                          'language.polish',
                          sanitizedLocale
                        )}">🇵🇱 Polski</a>
                        <a href="/ptPT" class="language-item ${sanitizedLocale === 'ptPT' ? 'active' : ''}" title="${t(
                          'language.portuguesePT',
                          sanitizedLocale
                        )}">🇵🇹 Português</a>
                        <a href="/ptBR" class="language-item ${sanitizedLocale === 'ptBR' ? 'active' : ''}" title="${t(
                          'language.portugueseBR',
                          sanitizedLocale
                        )}">🇧🇷 Português (Brasil)</a>
                        <a href="/ru" class="language-item ${sanitizedLocale === 'ru' ? 'active' : ''}" title="${t(
                          'language.russian',
                          sanitizedLocale
                        )}">🇷🇺 Русский</a>
                        <a href="/ro" class="language-item ${sanitizedLocale === 'ro' ? 'active' : ''}" title="${t(
                          'language.romanian',
                          sanitizedLocale
                        )}">🇷🇴 Română</a>
                        <a href="/sv" class="language-item ${sanitizedLocale === 'sv' ? 'active' : ''}" title="${t(
                          'language.swedish',
                          sanitizedLocale
                        )}">🇸🇪 Svenska</a>
                        <a href="/tl" class="language-item ${sanitizedLocale === 'tl' ? 'active' : ''}" title="${t(
                          'language.tagalog',
                          sanitizedLocale
                        )}">🇵🇭 Tagalog</a>
                        <a href="/th" class="language-item ${sanitizedLocale === 'th' ? 'active' : ''}" title="${t(
                          'language.thai',
                          sanitizedLocale
                        )}">🇹🇭 ไทย</a>
                        <a href="/tr" class="language-item ${sanitizedLocale === 'tr' ? 'active' : ''}" title="${t(
                          'language.turkish',
                          sanitizedLocale
                        )}">🇹🇷 Türkçe</a>
                        <a href="/uk" class="language-item ${sanitizedLocale === 'uk' ? 'active' : ''}" title="${t(
                          'language.ukrainian',
                          sanitizedLocale
                        )}">🇺🇦 Українська</a>
                        <a href="/vi" class="language-item ${sanitizedLocale === 'vi' ? 'active' : ''}" title="${t(
                          'language.vietnamese',
                          sanitizedLocale
                        )}">🇻🇳 Tiếng Việt</a>
                        <a href="/zh" class="language-item ${sanitizedLocale === 'zh' ? 'active' : ''}" title="${t(
                          'language.chinese',
                          sanitizedLocale
                        )}">🈶 中文</a>
                    </div>
                </li>
            </ul>
            
            <!-- Mobile Menu Overlay -->
            <div class="nav-overlay"></div>
        </div>
    </nav>

    <main class="main-content">
        <div class="hero-section">
            <h1>${t('home.hero.title', sanitizedLocale)}</h1>
            <p>${t('home.hero.subtitle', sanitizedLocale)}</p>
            <div class="cta-buttons">
                <a href="/${sanitizedLocale}/create-memo.html" class="btn btn-primary">${t(
                  'home.hero.btnPrimary',
                  sanitizedLocale
                )}</a>
                <a href="/${sanitizedLocale}/about.html" class="btn btn-secondary">${t(
                  'home.hero.btnSecondary',
                  sanitizedLocale
                )}</a>
            </div>
        </div>

        <div class="features-section">
            <h2>${t('home.features.title', sanitizedLocale)}</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <h3>${t('home.features.encrypt.title', sanitizedLocale)}</h3>
                    <p>${t('home.features.encrypt.description', sanitizedLocale)}</p>
                </div>
                <div class="feature-card">
                    <h3>${t('home.features.share.title', sanitizedLocale)}</h3>
                    <p>${t('home.features.share.description', sanitizedLocale)}</p>
                </div>
                <div class="feature-card">
                    <h3>${t('home.features.destruct.title', sanitizedLocale)}</h3>
                    <p>${t('home.features.destruct.description', sanitizedLocale)}</p>
                </div>
            </div>
        </div>

        <div class="security-section">
            <h2>${t('home.security.title', sanitizedLocale)}</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <h3>${t('home.security.encryption.title', sanitizedLocale)}</h3>
                    <p>${t('home.security.encryption.description', sanitizedLocale)}</p>
                </div>
                <div class="feature-card">
                    <h3>${t('home.security.delete.title', sanitizedLocale)}</h3>
                    <p>${t('home.security.delete.description', sanitizedLocale)}</p>
                </div>
                <div class="feature-card">
                    <h3>${t('home.security.password.title', sanitizedLocale)}</h3>
                    <p>${t('home.security.password.description', sanitizedLocale)}</p>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
          'footer.sourceCode',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/tos.html">${t(
          'footer.tos',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/privacy.html">${t(
          'footer.privacy',
          sanitizedLocale
        )}</a> | <a href="mailto:contact@securememo.app">contact@securememo.app</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', sanitizedLocale)}</p>
    </footer>

    <script src="/js/common.js" type="module" nonce="{{CSP_NONCE}}" defer></script>
</body>
</html>`;
}

export async function getAboutHTML(locale = 'en', origin = 'https://securememo.app') {
  const sanitizedLocale = sanitizeLocale(locale);
  const canonicalUrl = `${origin}/${sanitizedLocale}/about.html`;
  return `<!DOCTYPE html>
<html lang="${sanitizedLocale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.about.title', sanitizedLocale)} | securememo.app</title>
    <meta name="description" content="${t('page.about.description', sanitizedLocale)}">
    <meta name="keywords" content="${t('page.about.keywords', sanitizedLocale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.about.ogTitle', sanitizedLocale)}">
    <meta property="og:description" content="${t('page.about.ogDescription', sanitizedLocale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/${sanitizedLocale}/about.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.about.ogTitle', sanitizedLocale)}">
    <meta name="twitter:description" content="${t('page.about.twitterDescription', sanitizedLocale)}">
    <!-- Structured Data -->
    <script type="application/ld+json" nonce="{{CSP_NONCE}}">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "${t('faq.privacy.question', sanitizedLocale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.privacy.answer', sanitizedLocale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.encryption.question', sanitizedLocale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.encryption.answer', sanitizedLocale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.duration.question', sanitizedLocale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.duration.answer', sanitizedLocale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.recovery.question', sanitizedLocale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.recovery.answer', sanitizedLocale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.cost.question', sanitizedLocale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.cost.answer', sanitizedLocale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.technology.question', sanitizedLocale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.technology.answer', sanitizedLocale)}"
          }
        }
      ]
    }
    </script>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    <link rel="canonical" href="${canonicalUrl}">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${sanitizedLocale}" class="nav-logo">securememo.app</a>
            
            <!-- Hamburger Menu Button -->
            <button class="hamburger" type="button" aria-label="${t(
              'nav.toggleMenu',
              sanitizedLocale
            )}" aria-expanded="false">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
            
            <!-- Navigation Menu -->
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${sanitizedLocale}" class="nav-link">${t('nav.home', sanitizedLocale)}</a></li>
                <li><a href="/${sanitizedLocale}/about.html" class="nav-link active">${t(
                  'nav.about',
                  sanitizedLocale
                )}</a></li>
                <li><a href="/${sanitizedLocale}/create-memo.html" class="nav-link">${t(
                  'nav.create',
                  sanitizedLocale
                )}</a></li>
                <li class="language-dropdown">
                    <button class="language-toggle nav-link" aria-expanded="false" aria-haspopup="true">
                        ${getFlagEmoji(sanitizedLocale)} ${getLanguageDisplayName(sanitizedLocale)}
                    </button>
                    <div class="language-menu">
                        <a href="/ar/about.html" class="language-item ${
                          sanitizedLocale === 'ar' ? 'active' : ''
                        }" title="${t('language.arabic', sanitizedLocale)}">🌐 العربية</a>
                        <a href="/bn/about.html" class="language-item ${
                          sanitizedLocale === 'bn' ? 'active' : ''
                        }" title="${t('language.bengali', sanitizedLocale)}">🇧🇩 বাংলা</a>
                        <a href="/cs/about.html" class="language-item ${
                          sanitizedLocale === 'cs' ? 'active' : ''
                        }" title="${t('language.czech', sanitizedLocale)}">🇨🇿 Čeština</a>
                        <a href="/da/about.html" class="language-item ${
                          sanitizedLocale === 'da' ? 'active' : ''
                        }" title="${t('language.danish', sanitizedLocale)}">🇩🇰 Dansk</a>
                        <a href="/de/about.html" class="language-item ${
                          sanitizedLocale === 'de' ? 'active' : ''
                        }" title="${t('language.german', sanitizedLocale)}">🇩🇪 Deutsch</a>
                        <a href="/el/about.html" class="language-item ${
                          sanitizedLocale === 'el' ? 'active' : ''
                        }" title="${t('language.greek', sanitizedLocale)}">🇬🇷 Ελληνικά</a>
                        <a href="/en/about.html" class="language-item ${
                          sanitizedLocale === 'en' ? 'active' : ''
                        }" title="${t('language.english', sanitizedLocale)}">🇬🇧 English</a>
                        <a href="/es/about.html" class="language-item ${locale === 'es' ? 'active' : ''}" title="${t(
                          'language.spanish',
                          sanitizedLocale
                        )}">🇪🇸 Español</a>
                        <a href="/fi/about.html" class="language-item ${locale === 'fi' ? 'active' : ''}" title="${t(
                          'language.finnish',
                          sanitizedLocale
                        )}">🇫🇮 Suomi</a>
                        <a href="/fr/about.html" class="language-item ${locale === 'fr' ? 'active' : ''}" title="${t(
                          'language.french',
                          sanitizedLocale
                        )}">🇫🇷 Français</a>
                        <a href="/hi/about.html" class="language-item ${locale === 'hi' ? 'active' : ''}" title="${t(
                          'language.hindi',
                          sanitizedLocale
                        )}">🇮🇳 हिन्दी</a>
                        <a href="/hu/about.html" class="language-item ${locale === 'hu' ? 'active' : ''}" title="${t(
                          'language.hungarian',
                          sanitizedLocale
                        )}">🇭🇺 Magyar</a>
                        <a href="/id/about.html" class="language-item ${locale === 'id' ? 'active' : ''}" title="${t(
                          'language.indonesian',
                          sanitizedLocale
                        )}">🇮🇩 Bahasa Indonesia</a>
                        <a href="/it/about.html" class="language-item ${locale === 'it' ? 'active' : ''}" title="${t(
                          'language.italian',
                          sanitizedLocale
                        )}">🇮🇹 Italiano</a>
                        <a href="/ja/about.html" class="language-item ${locale === 'ja' ? 'active' : ''}" title="${t(
                          'language.japanese',
                          sanitizedLocale
                        )}">🇯🇵 日本語</a>
                        <a href="/ko/about.html" class="language-item ${locale === 'ko' ? 'active' : ''}" title="${t(
                          'language.korean',
                          sanitizedLocale
                        )}">🇰🇷 한국어</a>
                        <a href="/nl/about.html" class="language-item ${locale === 'nl' ? 'active' : ''}" title="${t(
                          'language.dutch',
                          sanitizedLocale
                        )}">🇳🇱 Nederlands</a>
                        <a href="/no/about.html" class="language-item ${locale === 'no' ? 'active' : ''}" title="${t(
                          'language.norwegian',
                          sanitizedLocale
                        )}">🇳🇴 Norsk</a>
                        <a href="/pl/about.html" class="language-item ${locale === 'pl' ? 'active' : ''}" title="${t(
                          'language.polish',
                          sanitizedLocale
                        )}">🇵🇱 Polski</a>
                        <a href="/ptPT/about.html" class="language-item ${
                          locale === 'ptPT' ? 'active' : ''
                        }" title="${t('language.portuguesePT', sanitizedLocale)}">🇵🇹 Português</a>
                        <a href="/ptBR/about.html" class="language-item ${
                          locale === 'ptBR' ? 'active' : ''
                        }" title="${t('language.portugueseBR', sanitizedLocale)}">🇧🇷 Português (Brasil)</a>
                        <a href="/ru/about.html" class="language-item ${locale === 'ru' ? 'active' : ''}" title="${t(
                          'language.russian',
                          sanitizedLocale
                        )}">🇷🇺 Русский</a>
                        <a href="/ro/about.html" class="language-item ${locale === 'ro' ? 'active' : ''}" title="${t(
                          'language.romanian',
                          sanitizedLocale
                        )}">🇷🇴 Română</a>
                        <a href="/sv/about.html" class="language-item ${locale === 'sv' ? 'active' : ''}" title="${t(
                          'language.swedish',
                          sanitizedLocale
                        )}">🇸🇪 Svenska</a>
                        <a href="/tl/about.html" class="language-item ${locale === 'tl' ? 'active' : ''}" title="${t(
                          'language.tagalog',
                          sanitizedLocale
                        )}">🇵🇭 Tagalog</a>
                        <a href="/th/about.html" class="language-item ${locale === 'th' ? 'active' : ''}" title="${t(
                          'language.thai',
                          sanitizedLocale
                        )}">🇹🇭 ไทย</a>
                        <a href="/tr/about.html" class="language-item ${locale === 'tr' ? 'active' : ''}" title="${t(
                          'language.turkish',
                          sanitizedLocale
                        )}">🇹🇷 Türkçe</a>
                        <a href="/uk/about.html" class="language-item ${locale === 'uk' ? 'active' : ''}" title="${t(
                          'language.ukrainian',
                          sanitizedLocale
                        )}">🇺🇦 Українська</a>
                        <a href="/vi/about.html" class="language-item ${locale === 'vi' ? 'active' : ''}" title="${t(
                          'language.vietnamese',
                          sanitizedLocale
                        )}">🇻🇳 Tiếng Việt</a>
                        <a href="/zh/about.html" class="language-item ${locale === 'zh' ? 'active' : ''}" title="${t(
                          'language.chinese',
                          sanitizedLocale
                        )}">🈶 中文</a>
                    </div>
                </li>
            </ul>
            
            <!-- Mobile Menu Overlay -->
            <div class="nav-overlay"></div>
        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>${t('about.hero.title', sanitizedLocale)}</h1>
            <p>${t('about.hero.subtitle', sanitizedLocale)}</p>
            
            <div class="tech-stack">
                <h2>${t('about.tech.title', sanitizedLocale)}</h2>
                <ul>
                    <li><strong>Cloudflare Workers:</strong> ${t('about.tech.cloudflare', sanitizedLocale)}</li>
                    <li><strong>D1 Database:</strong> ${t('about.tech.d1', sanitizedLocale)}</li>
                    <li><strong>Web Crypto API:</strong> ${t('about.tech.webcrypto', sanitizedLocale)}</li>
                    <li><strong>HTML/CSS/JavaScript:</strong> ${t('about.tech.frontend', sanitizedLocale)}</li>
                    <li><strong>${t(
                      'about.tech.github',
                      sanitizedLocale
                    )}</strong> <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
                      'about.tech.githubLink',
                      sanitizedLocale
                    )}</a></li>
                </ul>
            </div>

            <div class="features-detail">
                <h2>${t('about.features.title', sanitizedLocale)}</h2>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>${t('about.features.clientEncryption.title', sanitizedLocale)}</h3>
                        <p>${t('about.features.clientEncryption.description', sanitizedLocale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.passwordSharing.title', sanitizedLocale)}</h3>
                        <p>${t('about.features.passwordSharing.description', sanitizedLocale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.selfDestruct.title', sanitizedLocale)}</h3>
                        <p>${t('about.features.selfDestruct.description', sanitizedLocale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.noStorage.title', sanitizedLocale)}</h3>
                        <p>${t('about.features.noStorage.description', sanitizedLocale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.global.title', sanitizedLocale)}</h3>
                        <p>${t('about.features.global.description', sanitizedLocale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.privacy.title', sanitizedLocale)}</h3>
                        <p>${t('about.features.privacy.description', sanitizedLocale)}</p>
                    </div>
                </div>
            </div>

            <div class="usage-section">
                <h2>${t('about.usage.title', sanitizedLocale)}</h2>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>${t('about.usage.create.title', sanitizedLocale)}</h3>
                        <p>${t('about.usage.create.description', sanitizedLocale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.usage.share.title', sanitizedLocale)}</h3>
                        <p>${t('about.usage.share.description', sanitizedLocale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.usage.destruct.title', sanitizedLocale)}</h3>
                        <p>${t('about.usage.destruct.description', sanitizedLocale)}</p>
                    </div>
                </div>
            </div>
            <div class="video-embed" style="max-width:900px;margin:1.5rem auto;">
                <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
            <iframe src="https://www.youtube-nocookie.com/embed/V0vEHLLdDKk"
                title="How to use securememo.app"
                            frameborder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowfullscreen
                            loading="lazy"
                            style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;">
                    </iframe>
                </div>
                <p style="font-size:0.9rem;text-align:center;margin-top:0.5rem;">
                    <a href="https://www.youtube-nocookie.com/watch?v=V0vEHLLdDKk" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>
                </p>
                <noscript>
                    <p style="text-align:center;"><a href="https://www.youtube-nocookie.com/watch?v=V0vEHLLdDKk" target="_blank" rel="noopener noreferrer">Watch the video (JavaScript disabled)</a></p>
                </noscript>
            </div>
            <div class="cta-section">
                <h2>${t('about.cta.title', sanitizedLocale)}</h2>
                <p>${t('about.cta.subtitle', sanitizedLocale)}</p>
                <div class="cta-buttons">
                    <a href="/${sanitizedLocale}/create-memo.html" class="btn btn-primary">${t(
                      'about.cta.createBtn',
                      sanitizedLocale
                    )}</a>
                    <a href="/${sanitizedLocale}" class="btn btn-secondary">${t(
                      'about.cta.homeBtn',
                      sanitizedLocale
                    )}</a>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
          'footer.sourceCode',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/tos.html">${t(
          'footer.tos',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/privacy.html">${t(
          'footer.privacy',
          sanitizedLocale
        )}</a> | <a href="mailto:contact@securememo.app">contact@securememo.app</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', sanitizedLocale)}</p>
    </footer>

    <script src="/js/common.js" type="module" nonce="{{CSP_NONCE}}" defer></script>
</body>
</html>`;
}

export async function getCreateMemoHTML(locale = 'en', origin = 'https://securememo.app') {
  const sanitizedLocale = sanitizeLocale(locale);
  const canonicalUrl = `${origin}/${sanitizedLocale}/create-memo.html`;
  return `<!DOCTYPE html>
<html lang="${sanitizedLocale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.create.title', sanitizedLocale)} | securememo.app</title>
    <meta name="description" content="${t('create.hero.description', sanitizedLocale)}">
    <meta name="keywords" content="${t('page.create.keywords', sanitizedLocale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.create.title', sanitizedLocale)}">
    <meta property="og:description" content="${t('create.hero.ogDescription', sanitizedLocale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/${sanitizedLocale}/create-memo.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.create.title', sanitizedLocale)}">
    <meta name="twitter:description" content="${t('create.hero.twitterDescription', sanitizedLocale)}">
    <!-- Structured Data -->
    <script type="application/ld+json" nonce="{{CSP_NONCE}}">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${t('create.hero.title', sanitizedLocale)}",
      "description": "${t('create.schema.description', sanitizedLocale)}",
      "url": "https://securememo.app/${sanitizedLocale}/create-memo.html",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "${t('nav.home', sanitizedLocale)}",
            "item": "https://securememo.app/${sanitizedLocale}/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${t('nav.create', sanitizedLocale)}",
            "item": "https://securememo.app/${sanitizedLocale}/create-memo.html"
          }
        ]
      },
      "mainEntity": {
        "@type": "SoftwareApplication",
        "name": "${t('create.hero.title', sanitizedLocale)}",
        "applicationCategory": "SecurityApplication",
        "operatingSystem": "Web Browser",
        "description": "${t('create.schema.actionDescription', sanitizedLocale)}",
        "featureList": [
          "${t('schema.create.featureList.clientSide', sanitizedLocale)}",
          "${t('schema.create.featureList.selfDestruct', sanitizedLocale)}",
          "${t('schema.create.featureList.multiExpiry', sanitizedLocale)}",
          "${t('schema.create.featureList.noAccounts', sanitizedLocale)}",
          "${t('schema.create.featureList.maxChars', sanitizedLocale)}"
        ]
      }
    }
    </script>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    <link rel="canonical" href="${canonicalUrl}">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" nonce="{{CSP_NONCE}}" crossorigin="anonymous" async defer></script>
    <script src="/js/create-memo.js?locale=${sanitizedLocale}" nonce="{{CSP_NONCE}}" defer></script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${sanitizedLocale}" class="nav-logo">securememo.app</a>
            
            <!-- Hamburger Menu Button -->
            <button class="hamburger" type="button" aria-label="${t(
              'nav.toggleMenu',
              sanitizedLocale
            )}" aria-expanded="false">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
            
            <!-- Navigation Menu -->
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${sanitizedLocale}" class="nav-link">${t('nav.home', sanitizedLocale)}</a></li>
                <li><a href="/${sanitizedLocale}/about.html" class="nav-link">${t(
                  'nav.about',
                  sanitizedLocale
                )}</a></li>
                <li><a href="/${sanitizedLocale}/create-memo.html" class="nav-link active">${t(
                  'nav.create',
                  sanitizedLocale
                )}</a></li>
                <li class="language-dropdown">
                    <button class="language-toggle nav-link" aria-expanded="false" aria-haspopup="true">
                        ${getFlagEmoji(sanitizedLocale)} ${getLanguageDisplayName(sanitizedLocale)}
                    </button>
                    <div class="language-menu">
                        <a href="/ar/create-memo.html" class="language-item ${
                          sanitizedLocale === 'ar' ? 'active' : ''
                        }" title="${t('language.arabic', sanitizedLocale)}">🌐 العربية</a>
                        <a href="/bn/create-memo.html" class="language-item ${
                          sanitizedLocale === 'bn' ? 'active' : ''
                        }" title="${t('language.bengali', sanitizedLocale)}">🇧🇩 বাংলা</a>
                        <a href="/cs/create-memo.html" class="language-item ${
                          sanitizedLocale === 'cs' ? 'active' : ''
                        }" title="${t('language.czech', sanitizedLocale)}">🇨🇿 Čeština</a>
                        <a href="/da/create-memo.html" class="language-item ${
                          sanitizedLocale === 'da' ? 'active' : ''
                        }" title="${t('language.danish', sanitizedLocale)}">🇩🇰 Dansk</a>
                        <a href="/de/create-memo.html" class="language-item ${
                          sanitizedLocale === 'de' ? 'active' : ''
                        }" title="${t('language.german', sanitizedLocale)}">🇩🇪 Deutsch</a>
                        <a href="/el/create-memo.html" class="language-item ${
                          sanitizedLocale === 'el' ? 'active' : ''
                        }" title="${t('language.greek', sanitizedLocale)}">🇬🇷 Ελληνικά</a>
                        <a href="/en/create-memo.html" class="language-item ${
                          sanitizedLocale === 'en' ? 'active' : ''
                        }" title="${t('language.english', sanitizedLocale)}">🇬🇧 English</a>
                        <a href="/es/create-memo.html" class="language-item ${
                          sanitizedLocale === 'es' ? 'active' : ''
                        }" title="${t('language.spanish', sanitizedLocale)}">🇪🇸 Español</a>
                        <a href="/fi/create-memo.html" class="language-item ${
                          sanitizedLocale === 'fi' ? 'active' : ''
                        }" title="${t('language.finnish', sanitizedLocale)}">🇫🇮 Suomi</a>
                        <a href="/fr/create-memo.html" class="language-item ${
                          sanitizedLocale === 'fr' ? 'active' : ''
                        }" title="${t('language.french', sanitizedLocale)}">🇫🇷 Français</a>
                        <a href="/hi/create-memo.html" class="language-item ${
                          sanitizedLocale === 'hi' ? 'active' : ''
                        }" title="${t('language.hindi', sanitizedLocale)}">🇮🇳 हिन्दी</a>
                        <a href="/hu/create-memo.html" class="language-item ${
                          sanitizedLocale === 'hu' ? 'active' : ''
                        }" title="${t('language.hungarian', sanitizedLocale)}">🇭🇺 Magyar</a>
                        <a href="/id/create-memo.html" class="language-item ${
                          sanitizedLocale === 'id' ? 'active' : ''
                        }" title="${t('language.indonesian', sanitizedLocale)}">🇮🇩 Bahasa Indonesia</a>
                        <a href="/it/create-memo.html" class="language-item ${
                          sanitizedLocale === 'it' ? 'active' : ''
                        }" title="${t('language.italian', sanitizedLocale)}">🇮🇹 Italiano</a>
                        <a href="/ja/create-memo.html" class="language-item ${
                          sanitizedLocale === 'ja' ? 'active' : ''
                        }" title="${t('language.japanese', sanitizedLocale)}">🇯🇵 日本語</a>
                        <a href="/ko/create-memo.html" class="language-item ${
                          sanitizedLocale === 'ko' ? 'active' : ''
                        }" title="${t('language.korean', sanitizedLocale)}">🇰🇷 한국어</a>
                        <a href="/nl/create-memo.html" class="language-item ${
                          sanitizedLocale === 'nl' ? 'active' : ''
                        }" title="${t('language.dutch', sanitizedLocale)}">🇳🇱 Nederlands</a>
                        <a href="/no/create-memo.html" class="language-item ${
                          sanitizedLocale === 'no' ? 'active' : ''
                        }" title="${t('language.norwegian', sanitizedLocale)}">🇳🇴 Norsk</a>
                        <a href="/pl/create-memo.html" class="language-item ${
                          sanitizedLocale === 'pl' ? 'active' : ''
                        }" title="${t('language.polish', sanitizedLocale)}">🇵🇱 Polski</a>
                        <a href="/ptPT/create-memo.html" class="language-item ${
                          sanitizedLocale === 'ptPT' ? 'active' : ''
                        }" title="${t('language.portuguesePT', sanitizedLocale)}">🇵🇹 Português</a>
                        <a href="/ptBR/create-memo.html" class="language-item ${
                          sanitizedLocale === 'ptBR' ? 'active' : ''
                        }" title="${t('language.portugueseBR', sanitizedLocale)}">🇧🇷 Português (Brasil)</a>
                        <a href="/ru/create-memo.html" class="language-item ${
                          sanitizedLocale === 'ru' ? 'active' : ''
                        }" title="${t('language.russian', sanitizedLocale)}">🇷🇺 Русский</a>
                        <a href="/ro/create-memo.html" class="language-item ${
                          sanitizedLocale === 'ro' ? 'active' : ''
                        }" title="${t('language.romanian', sanitizedLocale)}">🇷🇴 Română</a>
                        <a href="/sv/create-memo.html" class="language-item ${
                          sanitizedLocale === 'sv' ? 'active' : ''
                        }" title="${t('language.swedish', sanitizedLocale)}">🇸🇪 Svenska</a>
                        <a href="/tl/create-memo.html" class="language-item ${
                          sanitizedLocale === 'tl' ? 'active' : ''
                        }" title="${t('language.tagalog', sanitizedLocale)}">🇵🇭 Tagalog</a>
                        <a href="/th/create-memo.html" class="language-item ${
                          sanitizedLocale === 'th' ? 'active' : ''
                        }" title="${t('language.thai', sanitizedLocale)}">🇹🇭 ไทย</a>
                        <a href="/tr/create-memo.html" class="language-item ${
                          sanitizedLocale === 'tr' ? 'active' : ''
                        }" title="${t('language.turkish', sanitizedLocale)}">🇹🇷 Türkçe</a>
                        <a href="/uk/create-memo.html" class="language-item ${
                          sanitizedLocale === 'uk' ? 'active' : ''
                        }" title="${t('language.ukrainian', sanitizedLocale)}">🇺🇦 Українська</a>
                        <a href="/vi/create-memo.html" class="language-item ${
                          sanitizedLocale === 'vi' ? 'active' : ''
                        }" title="${t('language.vietnamese', sanitizedLocale)}">🇻🇳 Tiếng Việt</a>
                        <a href="/zh/create-memo.html" class="language-item ${
                          sanitizedLocale === 'zh' ? 'active' : ''
                        }" title="${t('language.chinese', sanitizedLocale)}">🈶 中文</a>
                    </div>
                </li>
            </ul>
            
            <!-- Mobile Menu Overlay -->
            <div class="nav-overlay"></div>
        </div>
    </nav>

    <main class="main-content">
        <div class="memo-container">
            <div class="memo-card">
                <h1>${t('create.hero.title', sanitizedLocale)}</h1>
                <p class="memo-description">${t('create.hero.description', sanitizedLocale)}</p>
                <div id="turnstileOverlay" class="turnstile-overlay" style="display:none;">
                    <div class="turnstile-overlay-backdrop"></div>
                    <div class="turnstile-overlay-content" role="dialog" aria-modal="true" aria-label="Security Challenge">
                        <button type="button" id="closeTurnstileOverlay" class="overlay-close-btn" aria-label="Close">×</button>
                        <div id="dynamicTurnstileContainer"></div>
                    </div>
                </div>
                
                <form id="memoForm" class="memo-form">
                    <div class="form-group">
                        <label for="message">${t('form.message.label', sanitizedLocale)}</label>
                        <textarea id="message" name="message" required 
                                  placeholder="${t('form.message.placeholder', sanitizedLocale)}" 
                                  rows="8" maxlength="10000"></textarea>
                        <small class="form-help">${t('form.message.help', sanitizedLocale)}</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="expiryHours">${t('form.expiry.label', sanitizedLocale)}</label>
                        <select id="expiryHours" name="expiryHours">
                            <option value="8">${t('form.expiry.option.8h', sanitizedLocale)}</option>
                            <option value="24">${t('form.expiry.option.1d', sanitizedLocale)}</option>
                            <option value="48">${t('form.expiry.option.2d', sanitizedLocale)}</option>
                            <option value="168">${t('form.expiry.option.1w', sanitizedLocale)}</option>
                            <option value="720">${t('form.expiry.option.30d', sanitizedLocale)}</option>
                        </select>
                    </div>
                    <button type="submit" class="btn btn-primary" id="submitButton">${t(
                      'btn.create',
                      sanitizedLocale
                    )}</button>
                    
                    <!-- Loading indicator (hidden by default) -->
                    <div id="loadingIndicator" class="loading-spinner" style="display: none;">
                        <div class="spinner"></div>
                        <p>${t('msg.encrypting', sanitizedLocale)}</p>
                    </div>
                </form>
                
                <div id="result" class="result-section" style="display: none;">
                    <h3>${t('msg.memoCreated', sanitizedLocale)}</h3>
                    
                    <div class="memo-url-section">
                        <label for="memoUrl">${t('form.memoUrl.label', sanitizedLocale)}</label>
                        <div class="url-copy-container">
                            <input type="text" id="memoUrl" readonly onclick="this.select(); document.execCommand('copy'); showMessage('${t(
                              'msg.urlCopied',
                              sanitizedLocale
                            )}', '${t('common.success', sanitizedLocale)}');">
                            <button type="button" id="copyUrl" class="btn btn-primary">${t(
                              'btn.copyUrl',
                              sanitizedLocale
                            )}</button>
                        </div>
                        <small class="form-help">${t('form.memoUrl.help', sanitizedLocale)}</small>
                    </div>
                    
                    <div class="memo-password-section">
                        <label for="memoPassword">${t('form.memoPassword.label', sanitizedLocale)}</label>
                        <div class="url-copy-container">
                            <input type="password" id="memoPassword" readonly onclick="this.select(); document.execCommand('copy'); showMessage('${t(
                              'msg.passwordCopied',
                              sanitizedLocale
                            )}', '${t('common.success', sanitizedLocale)}');">
                            <button type="button" id="togglePassword" class="btn btn-primary" style="margin-right: 8px;">${t(
                              'btn.show',
                              sanitizedLocale
                            )}</button>
                            <button type="button" id="copyPassword" class="btn btn-primary">${t(
                              'btn.copyPassword',
                              sanitizedLocale
                            )}</button>
                        </div>
                        <small class="form-help">${t('form.memoPassword.help', sanitizedLocale)}</small>
                    </div>
                    
                    <div class="memo-warning">
                        <p><strong>${t('warning.important', sanitizedLocale)}</strong></p>
                        <ul>
                            <li>${t('warning.memoDeleted', sanitizedLocale)}</li>
                            <li>${t('warning.shareSecurely', sanitizedLocale)}</li>
                            <li>${t('warning.needBoth', sanitizedLocale)}</li>
                            <li>${t('warning.pageCleared', sanitizedLocale)}</li>
                        </ul>
                    </div>
                </div>
                
                <div id="statusMessage" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
          'footer.sourceCode',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/tos.html">${t(
          'footer.tos',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/privacy.html">${t(
          'footer.privacy',
          sanitizedLocale
        )}</a> | <a href="mailto:contact@securememo.app">contact@securememo.app</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', sanitizedLocale)}</p>
    </footer>

    <script src="/js/common.js" type="module" nonce="{{CSP_NONCE}}" defer></script>
</body>
</html>`;
}

export async function getReadMemoHTML(locale = 'en', origin = 'https://securememo.app') {
  const sanitizedLocale = sanitizeLocale(locale);
  const canonicalUrl = `${origin}/${sanitizedLocale}/read-memo.html`;
  return `<!DOCTYPE html>
<html lang="${sanitizedLocale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.read.title', sanitizedLocale)} | securememo.app</title>
    <meta name="description" content="${t('read.hero.description', sanitizedLocale)}">
    <meta name="keywords" content="${t('page.read.keywords', sanitizedLocale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.read.title', sanitizedLocale)}">
    <meta property="og:description" content="${t('read.hero.ogDescription', sanitizedLocale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/${sanitizedLocale}/read-memo.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.read.title', sanitizedLocale)}">
    <meta name="twitter:description" content="${t('read.hero.twitterDescription', sanitizedLocale)}">
    <!-- Structured Data -->
    <script type="application/ld+json" nonce="{{CSP_NONCE}}">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${t('read.hero.title', sanitizedLocale)}",
      "description": "${t('read.schema.description', sanitizedLocale)}",
      "url": "https://securememo.app/${sanitizedLocale}/read-memo.html",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "${t('nav.home', sanitizedLocale)}",
            "item": "https://securememo.app/${sanitizedLocale}/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${t('read.hero.title', sanitizedLocale)}",
            "item": "https://securememo.app/${sanitizedLocale}/read-memo.html"
          }
        ]
      },
      "mainEntity": {
        "@type": "SoftwareApplication",
        "name": "${t('read.hero.title', sanitizedLocale)}",
        "applicationCategory": "SecurityApplication",
        "operatingSystem": "Web Browser",
        "description": "${t('read.schema.description', sanitizedLocale)}",
        "featureList": [
          "${t('schema.read.featureList.clientDecryption', sanitizedLocale)}",
          "${t('schema.read.featureList.passwordProtected', sanitizedLocale)}",
          "${t('schema.read.featureList.autoDeletion', sanitizedLocale)}",
          "${t('schema.read.featureList.noDataRetention', sanitizedLocale)}",
          "${t('schema.read.featureList.privacyFocused', sanitizedLocale)}"
        ]
      }
    }
    </script>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    <link rel="canonical" href="${canonicalUrl}">
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" nonce="{{CSP_NONCE}}" crossorigin="anonymous" async defer></script>
    <script src="/js/read-memo.js?locale=${sanitizedLocale}" nonce="{{CSP_NONCE}}" defer></script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${sanitizedLocale}" class="nav-logo">securememo.app</a>
            
            <!-- Hamburger Menu Button -->
            <button class="hamburger" type="button" aria-label="${t(
              'nav.toggleMenu',
              sanitizedLocale
            )}" aria-expanded="false">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
            
            <!-- Navigation Menu -->
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${sanitizedLocale}" class="nav-link">${t('nav.home', sanitizedLocale)}</a></li>
                <li><a href="/${sanitizedLocale}/about.html" class="nav-link">${t(
                  'nav.about',
                  sanitizedLocale
                )}</a></li>
                <li><a href="/${sanitizedLocale}/create-memo.html" class="nav-link">${t(
                  'nav.create',
                  sanitizedLocale
                )}</a></li>
                <li class="language-dropdown">
                    <button class="language-toggle nav-link" aria-expanded="false" aria-haspopup="true">
                        ${getFlagEmoji(sanitizedLocale)} ${getLanguageDisplayName(sanitizedLocale)}
                    </button>
                    <div class="language-menu">
                        <a href="/ar/read-memo.html" class="language-item ${
                          sanitizedLocale === 'ar' ? 'active' : ''
                        }" title="${t('language.arabic', sanitizedLocale)}">🌐 العربية</a>
                        <a href="/bn/read-memo.html" class="language-item ${
                          sanitizedLocale === 'bn' ? 'active' : ''
                        }" title="${t('language.bengali', sanitizedLocale)}">🇧🇩 বাংলা</a>
                        <a href="/cs/read-memo.html" class="language-item ${
                          sanitizedLocale === 'cs' ? 'active' : ''
                        }" title="${t('language.czech', sanitizedLocale)}">🇨🇿 Čeština</a>
                        <a href="/da/read-memo.html" class="language-item ${
                          sanitizedLocale === 'da' ? 'active' : ''
                        }" title="${t('language.danish', sanitizedLocale)}">🇩🇰 Dansk</a>
                        <a href="/de/read-memo.html" class="language-item ${
                          sanitizedLocale === 'de' ? 'active' : ''
                        }" title="${t('language.german', sanitizedLocale)}">🇩🇪 Deutsch</a>
                        <a href="/el/read-memo.html" class="language-item ${
                          sanitizedLocale === 'el' ? 'active' : ''
                        }" title="${t('language.greek', sanitizedLocale)}">🇬🇷 Ελληνικά</a>
                        <a href="/en/read-memo.html" class="language-item ${
                          sanitizedLocale === 'en' ? 'active' : ''
                        }" title="${t('language.english', sanitizedLocale)}">🇬🇧 English</a>
                        <a href="/es/read-memo.html" class="language-item ${
                          sanitizedLocale === 'es' ? 'active' : ''
                        }" title="${t('language.spanish', sanitizedLocale)}">🇪🇸 Español</a>
                        <a href="/fi/read-memo.html" class="language-item ${
                          sanitizedLocale === 'fi' ? 'active' : ''
                        }" title="${t('language.finnish', sanitizedLocale)}">🇫🇮 Suomi</a>
                        <a href="/fr/read-memo.html" class="language-item ${
                          sanitizedLocale === 'fr' ? 'active' : ''
                        }" title="${t('language.french', sanitizedLocale)}">🇫🇷 Français</a>
                        <a href="/hi/read-memo.html" class="language-item ${
                          sanitizedLocale === 'hi' ? 'active' : ''
                        }" title="${t('language.hindi', sanitizedLocale)}">🇮🇳 हिन्दी</a>
                        <a href="/hu/read-memo.html" class="language-item ${
                          sanitizedLocale === 'hu' ? 'active' : ''
                        }" title="${t('language.hungarian', sanitizedLocale)}">🇭🇺 Magyar</a>
                        <a href="/id/read-memo.html" class="language-item ${
                          sanitizedLocale === 'id' ? 'active' : ''
                        }" title="${t('language.indonesian', sanitizedLocale)}">🇮🇩 Bahasa Indonesia</a>
                        <a href="/it/read-memo.html" class="language-item ${
                          sanitizedLocale === 'it' ? 'active' : ''
                        }" title="${t('language.italian', sanitizedLocale)}">🇮🇹 Italiano</a>
                        <a href="/ja/read-memo.html" class="language-item ${
                          sanitizedLocale === 'ja' ? 'active' : ''
                        }" title="${t('language.japanese', sanitizedLocale)}">🇯🇵 日本語</a>
                        <a href="/ko/read-memo.html" class="language-item ${
                          sanitizedLocale === 'ko' ? 'active' : ''
                        }" title="${t('language.korean', sanitizedLocale)}">🇰🇷 한국어</a>
                        <a href="/nl/read-memo.html" class="language-item ${
                          sanitizedLocale === 'nl' ? 'active' : ''
                        }" title="${t('language.dutch', sanitizedLocale)}">🇳🇱 Nederlands</a>
                        <a href="/no/read-memo.html" class="language-item ${
                          sanitizedLocale === 'no' ? 'active' : ''
                        }" title="${t('language.norwegian', sanitizedLocale)}">🇳🇴 Norsk</a>
                        <a href="/pl/read-memo.html" class="language-item ${
                          sanitizedLocale === 'pl' ? 'active' : ''
                        }" title="${t('language.polish', sanitizedLocale)}">🇵🇱 Polski</a>
                        <a href="/ptPT/read-memo.html" class="language-item ${
                          sanitizedLocale === 'ptPT' ? 'active' : ''
                        }" title="${t('language.portuguesePT', sanitizedLocale)}">🇵🇹 Português</a>
                        <a href="/ptBR/read-memo.html" class="language-item ${
                          sanitizedLocale === 'ptBR' ? 'active' : ''
                        }" title="${t('language.portugueseBR', sanitizedLocale)}">🇧🇷 Português (Brasil)</a>
                        <a href="/ru/read-memo.html" class="language-item ${
                          sanitizedLocale === 'ru' ? 'active' : ''
                        }" title="${t('language.russian', sanitizedLocale)}">🇷🇺 Русский</a>
                        <a href="/ro/read-memo.html" class="language-item ${
                          sanitizedLocale === 'ro' ? 'active' : ''
                        }" title="${t('language.romanian', sanitizedLocale)}">🇷🇴 Română</a>
                        <a href="/sv/read-memo.html" class="language-item ${
                          sanitizedLocale === 'sv' ? 'active' : ''
                        }" title="${t('language.swedish', sanitizedLocale)}">🇸🇪 Svenska</a>
                        <a href="/tl/read-memo.html" class="language-item ${
                          sanitizedLocale === 'tl' ? 'active' : ''
                        }" title="${t('language.tagalog', sanitizedLocale)}">🇵🇭 Tagalog</a>
                        <a href="/th/read-memo.html" class="language-item ${
                          sanitizedLocale === 'th' ? 'active' : ''
                        }" title="${t('language.thai', sanitizedLocale)}">🇹🇭 ไทย</a>
                        <a href="/tr/read-memo.html" class="language-item ${
                          sanitizedLocale === 'tr' ? 'active' : ''
                        }" title="${t('language.turkish', sanitizedLocale)}">🇹🇷 Türkçe</a>
                        <a href="/uk/read-memo.html" class="language-item ${
                          sanitizedLocale === 'uk' ? 'active' : ''
                        }" title="${t('language.ukrainian', sanitizedLocale)}">🇺🇦 Українська</a>
                        <a href="/vi/read-memo.html" class="language-item ${
                          sanitizedLocale === 'vi' ? 'active' : ''
                        }" title="${t('language.vietnamese', sanitizedLocale)}">🇻🇳 Tiếng Việt</a>
                        <a href="/zh/read-memo.html" class="language-item ${
                          sanitizedLocale === 'zh' ? 'active' : ''
                        }" title="${t('language.chinese', sanitizedLocale)}">🈶 中文</a>
                    </div>
                </li>
            </ul>
            
            <!-- Mobile Menu Overlay -->
            <div class="nav-overlay"></div>
        </div>
    </nav>

    <main class="main-content">
        <div class="memo-container">
            <div class="memo-card">
                <h1>${t('read.hero.title', sanitizedLocale)}</h1>
                <p class="memo-description">${t('read.hero.description', sanitizedLocale)}</p>
                <div id="turnstileOverlay" class="turnstile-overlay" style="display:none;">
                    <div class="turnstile-overlay-backdrop"></div>
                    <div class="turnstile-overlay-content" role="dialog" aria-modal="true" aria-label="Security Challenge">
                        <button type="button" id="closeTurnstileOverlay" class="overlay-close-btn" aria-label="Close">×</button>
                        <div id="dynamicTurnstileContainer"></div>
                    </div>
                </div>
                
                <div id="passwordForm" class="memo-form">
                    <form id="decryptForm">
                        <div class="form-group">
                            <label for="password">${t('form.password.label', sanitizedLocale)}</label>
                            <div class="password-input-container">
                                <input type="password" id="password" name="password" required 
                                       placeholder="${t('form.password.placeholder', sanitizedLocale)}">
                                <button type="button" id="toggleReadPassword" class="btn btn-primary">${t(
                                  'btn.show',
                                  sanitizedLocale
                                )}</button>
                            </div>
                            <small class="form-help">${t('form.password.help', sanitizedLocale)}</small>
                        </div>
                        <button type="submit" class="btn btn-primary" id="decryptButton">${t(
                          'btn.decrypt',
                          sanitizedLocale
                        )}</button>
                        
                        <!-- Decrypt loading indicator (hidden by default) -->
                        <div id="decryptLoadingIndicator" class="loading-spinner" style="display: none;">
                            <div class="spinner"></div>
                            <p>${t('msg.decrypting', sanitizedLocale)}</p>
                        </div>
                    </form>
                </div>
                
                <div id="memoContent" class="memo-content" style="display: none;">
                    <h3>${t('msg.yourSecureMemo', sanitizedLocale)}</h3>
                    <div class="memo-message">
                        <p id="decryptedMessage"></p>
                    </div>
                    <div class="memo-info">
                        <p><strong>${t('msg.status', sanitizedLocale)}</strong> <span id="memoStatus">${t(
                          'msg.memoDecrypted',
                          sanitizedLocale
                        )}</span></p>
                        <div id="deletionSpinner" class="loading-spinner" style="display: none;">
                            <div class="spinner"></div>
                            <p>${t('msg.deletingSecurely', sanitizedLocale)}</p>
                        </div>
                    </div>
                    <div class="memo-actions">
                        <a href="/${sanitizedLocale}/create-memo.html" class="btn btn-primary">${t(
                          'btn.createNew',
                          sanitizedLocale
                        )}</a>
                        <a href="/${sanitizedLocale}" class="btn btn-primary">${t('btn.goHome', sanitizedLocale)}</a>
                    </div>
                </div>
                
                <div id="errorContent" class="error-content" style="display: none;">
                    <h3>❌ ${t('common.error', sanitizedLocale)}</h3>
                    <p id="errorMessage"></p>
                    <div class="memo-actions">
                        <a href="/${sanitizedLocale}/create-memo.html" class="btn btn-primary">${t(
                          'btn.createNew',
                          sanitizedLocale
                        )}</a>
                        <a href="/${sanitizedLocale}" class="btn btn-primary">${t('btn.goHome', sanitizedLocale)}</a>
                    </div>
                </div>
                
                <div id="statusMessage" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
          'footer.sourceCode',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/tos.html">${t(
          'footer.tos',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/privacy.html">${t(
          'footer.privacy',
          sanitizedLocale
        )}</a> | <a href="mailto:contact@securememo.app">contact@securememo.app</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', sanitizedLocale)}</p>
    </footer>

    <script src="/js/common.js" type="module" nonce="{{CSP_NONCE}}" defer></script>
</body>
</html>`;
}

export async function getToSHTML(locale = 'en', origin = 'https://securememo.app') {
  const sanitizedLocale = sanitizeLocale(locale);
  const canonicalUrl = `${origin}/${sanitizedLocale}/tos.html`;
  return `<!DOCTYPE html>
<html lang="${sanitizedLocale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.tos.title', sanitizedLocale)}</title>
    <meta name="description" content="${t('page.tos.description', sanitizedLocale)}">
    <meta name="keywords" content="${t('page.tos.keywords', sanitizedLocale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.tos.ogTitle', sanitizedLocale)}">
    <meta property="og:description" content="${t('page.tos.ogDescription', sanitizedLocale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/tos.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.tos.ogTitle', sanitizedLocale)}">
    <meta name="twitter:description" content="${t('page.tos.twitterDescription', sanitizedLocale)}">
    <!-- Structured Data -->
    <script type="application/ld+json" nonce="{{CSP_NONCE}}">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${t('schema.tos.name', sanitizedLocale)}",
      "description": "${t('schema.tos.description', sanitizedLocale)}",
      "url": "https://securememo.app/tos.html",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "${t('schema.tos.breadcrumb.home', sanitizedLocale)}",
            "item": "https://securememo.app/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${t('schema.tos.breadcrumb.tos', sanitizedLocale)}",
            "item": "https://securememo.app/tos.html"
          }
        ]
      },
      "mainEntity": {
        "@type": "CreativeWork",
        "name": "${t('schema.tos.mainEntity.name', sanitizedLocale)}",
        "author": {
          "@type": "Organization",
          "name": "securememo.app"
        },
        "dateModified": "2025-08-09",
        "description": "${t('schema.tos.mainEntity.description', sanitizedLocale)}"
      }
    }
    </script>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    <link rel="canonical" href="${canonicalUrl}">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${sanitizedLocale}" class="nav-logo">securememo.app</a>
            
            <!-- Hamburger Menu Button -->
            <button class="hamburger" type="button" aria-label="${t(
              'nav.toggleMenu',
              sanitizedLocale
            )}" aria-expanded="false">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
            
            <!-- Navigation Menu -->
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${sanitizedLocale}" class="nav-link">${t('nav.home', sanitizedLocale)}</a></li>
                <li><a href="/${sanitizedLocale}/about.html" class="nav-link">${t(
                  'nav.about',
                  sanitizedLocale
                )}</a></li>
                <li><a href="/${sanitizedLocale}/create-memo.html" class="nav-link">${t(
                  'nav.create',
                  sanitizedLocale
                )}</a></li>
                <li class="language-dropdown">
                    <button class="language-toggle nav-link" aria-expanded="false" aria-haspopup="true">
                        ${getFlagEmoji(sanitizedLocale)} ${getLanguageDisplayName(sanitizedLocale)}
                    </button>
                    <div class="language-menu">
                        <a href="/ar/tos.html" class="language-item ${
                          sanitizedLocale === 'ar' ? 'active' : ''
                        }" title="${t('language.arabic', sanitizedLocale)}">🌐 العربية</a>
                        <a href="/bn/tos.html" class="language-item ${
                          sanitizedLocale === 'bn' ? 'active' : ''
                        }" title="${t('language.bengali', sanitizedLocale)}">🇧🇩 বাংলা</a>
                        <a href="/cs/tos.html" class="language-item ${
                          sanitizedLocale === 'cs' ? 'active' : ''
                        }" title="${t('language.czech', sanitizedLocale)}">🇨🇿 Čeština</a>
                        <a href="/da/tos.html" class="language-item ${
                          sanitizedLocale === 'da' ? 'active' : ''
                        }" title="${t('language.danish', sanitizedLocale)}">🇩🇰 Dansk</a>
                        <a href="/de/tos.html" class="language-item ${
                          sanitizedLocale === 'de' ? 'active' : ''
                        }" title="${t('language.german', sanitizedLocale)}">🇩🇪 Deutsch</a>
                        <a href="/el/tos.html" class="language-item ${
                          sanitizedLocale === 'el' ? 'active' : ''
                        }" title="${t('language.greek', sanitizedLocale)}">🇬🇷 Ελληνικά</a>
                        <a href="/en/tos.html" class="language-item ${
                          sanitizedLocale === 'en' ? 'active' : ''
                        }" title="${t('language.english', sanitizedLocale)}">🇬🇧 English</a>
                        <a href="/es/tos.html" class="language-item ${
                          sanitizedLocale === 'es' ? 'active' : ''
                        }" title="${t('language.spanish', sanitizedLocale)}">🇪🇸 Español</a>
                        <a href="/fi/tos.html" class="language-item ${
                          sanitizedLocale === 'fi' ? 'active' : ''
                        }" title="${t('language.finnish', sanitizedLocale)}">🇫🇮 Suomi</a>
                        <a href="/fr/tos.html" class="language-item ${
                          sanitizedLocale === 'fr' ? 'active' : ''
                        }" title="${t('language.french', sanitizedLocale)}">🇫🇷 Français</a>
                        <a href="/hi/tos.html" class="language-item ${
                          sanitizedLocale === 'hi' ? 'active' : ''
                        }" title="${t('language.hindi', sanitizedLocale)}">🇮🇳 हिन्दी</a>
                        <a href="/hu/tos.html" class="language-item ${
                          sanitizedLocale === 'hu' ? 'active' : ''
                        }" title="${t('language.hungarian', sanitizedLocale)}">🇭🇺 Magyar</a>
                        <a href="/id/tos.html" class="language-item ${
                          sanitizedLocale === 'id' ? 'active' : ''
                        }" title="${t('language.indonesian', sanitizedLocale)}">🇮🇩 Bahasa Indonesia</a>
                        <a href="/it/tos.html" class="language-item ${
                          sanitizedLocale === 'it' ? 'active' : ''
                        }" title="${t('language.italian', sanitizedLocale)}">🇮🇹 Italiano</a>
                        <a href="/ja/tos.html" class="language-item ${
                          sanitizedLocale === 'ja' ? 'active' : ''
                        }" title="${t('language.japanese', sanitizedLocale)}">🇯🇵 日本語</a>
                        <a href="/ko/tos.html" class="language-item ${
                          sanitizedLocale === 'ko' ? 'active' : ''
                        }" title="${t('language.korean', sanitizedLocale)}">🇰🇷 한국어</a>
                        <a href="/nl/tos.html" class="language-item ${
                          sanitizedLocale === 'nl' ? 'active' : ''
                        }" title="${t('language.dutch', sanitizedLocale)}">🇳🇱 Nederlands</a>
                        <a href="/no/tos.html" class="language-item ${
                          sanitizedLocale === 'no' ? 'active' : ''
                        }" title="${t('language.norwegian', sanitizedLocale)}">🇳🇴 Norsk</a>
                        <a href="/pl/tos.html" class="language-item ${
                          sanitizedLocale === 'pl' ? 'active' : ''
                        }" title="${t('language.polish', sanitizedLocale)}">🇵🇱 Polski</a>
                        <a href="/ptPT/tos.html" class="language-item ${
                          sanitizedLocale === 'ptPT' ? 'active' : ''
                        }" title="${t('language.portuguesePT', sanitizedLocale)}">🇵🇹 Português</a>
                        <a href="/ptBR/tos.html" class="language-item ${
                          sanitizedLocale === 'ptBR' ? 'active' : ''
                        }" title="${t('language.portugueseBR', sanitizedLocale)}">🇧🇷 Português (Brasil)</a>
                        <a href="/ru/tos.html" class="language-item ${
                          sanitizedLocale === 'ru' ? 'active' : ''
                        }" title="${t('language.russian', sanitizedLocale)}">🇷🇺 Русский</a>
                        <a href="/ro/tos.html" class="language-item ${
                          sanitizedLocale === 'ro' ? 'active' : ''
                        }" title="${t('language.romanian', sanitizedLocale)}">🇷🇴 Română</a>
                        <a href="/sv/tos.html" class="language-item ${
                          sanitizedLocale === 'sv' ? 'active' : ''
                        }" title="${t('language.swedish', sanitizedLocale)}">🇸🇪 Svenska</a>
                        <a href="/tl/tos.html" class="language-item ${
                          sanitizedLocale === 'tl' ? 'active' : ''
                        }" title="${t('language.tagalog', sanitizedLocale)}">🇵🇭 Tagalog</a>
                        <a href="/th/tos.html" class="language-item ${
                          sanitizedLocale === 'th' ? 'active' : ''
                        }" title="${t('language.thai', sanitizedLocale)}">🇹🇭 ไทย</a>
                        <a href="/tr/tos.html" class="language-item ${
                          sanitizedLocale === 'tr' ? 'active' : ''
                        }" title="${t('language.turkish', sanitizedLocale)}">🇹🇷 Türkçe</a>
                        <a href="/uk/tos.html" class="language-item ${
                          sanitizedLocale === 'uk' ? 'active' : ''
                        }" title="${t('language.ukrainian', sanitizedLocale)}">🇺🇦 Українська</a>
                        <a href="/vi/tos.html" class="language-item ${
                          sanitizedLocale === 'vi' ? 'active' : ''
                        }" title="${t('language.vietnamese', sanitizedLocale)}">🇻🇳 Tiếng Việt</a>
                        <a href="/zh/tos.html" class="language-item ${
                          sanitizedLocale === 'zh' ? 'active' : ''
                        }" title="${t('language.chinese', sanitizedLocale)}">🈶 中文</a>
                    </div>
                </li>
            </ul>
            
            <!-- Mobile Menu Overlay -->
            <div class="nav-overlay"></div>
        </div>
    </nav>

    <main class="main-content">
        <div class="legal-section">
            <h1>${t('tos.hero.title', sanitizedLocale)}</h1>
            <p class="legal-meta"><strong>${t('tos.lastUpdated', sanitizedLocale)}</strong></p>
            
            <div class="legal-toc">
                <h2>${t('tos.tableOfContents.title', sanitizedLocale)}</h2>
                <ol>
                    <li><a href="#service-description">${t(
                      'tos.tableOfContents.serviceDescription',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#acceptable-use">${t('tos.tableOfContents.acceptableUse', sanitizedLocale)}</a></li>
                    <li><a href="#privacy-data">${t('tos.tableOfContents.privacyData', sanitizedLocale)}</a></li>
                    <li><a href="#service-limitations">${t(
                      'tos.tableOfContents.serviceLimitations',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#security-disclaimers">${t(
                      'tos.tableOfContents.securityDisclaimers',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#intellectual-property">${t(
                      'tos.tableOfContents.intellectualProperty',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#indemnification">${t('tos.tableOfContents.indemnification', sanitizedLocale)}</a></li>
                    <li><a href="#termination">${t('tos.tableOfContents.termination', sanitizedLocale)}</a></li>
                    <li><a href="#changes-terms">${t('tos.tableOfContents.changesTerms', sanitizedLocale)}</a></li>
                    <li><a href="#governing-law">${t('tos.tableOfContents.governingLaw', sanitizedLocale)}</a></li>
                    <li><a href="#miscellaneous">${t('tos.tableOfContents.miscellaneous', sanitizedLocale)}</a></li>
                    <li><a href="#contact">${t('tos.tableOfContents.contact', sanitizedLocale)}</a></li>
                    <li><a href="#language-disclaimer">${t(
                      'tos.tableOfContents.languageDisclaimer',
                      sanitizedLocale
                    )}</a></li>
                </ol>
            </div>

            <div class="features-detail" id="service-description">
                <h2>${t('tos.serviceDescription.title', sanitizedLocale)}</h2>
                <p>${t('tos.serviceDescription.content', sanitizedLocale)}</p>
            </div>

            <div class="usage-section" id="acceptable-use">
                <h2>${t('tos.acceptableUse.title', sanitizedLocale)}</h2>
                <p>${t('tos.acceptableUse.intro', sanitizedLocale)}</p>
                <ul>
                    <li>${t('tos.acceptableUse.illegal', sanitizedLocale)}</li>
                    <li>${t('tos.acceptableUse.bypass', sanitizedLocale)}</li>
                    <li>${t('tos.acceptableUse.automated', sanitizedLocale)}</li>
                    <li>${t('tos.acceptableUse.malware', sanitizedLocale)}</li>
                    <li>${t('tos.acceptableUse.spam', sanitizedLocale)}</li>
                    <li>${t('tos.acceptableUse.reverse', sanitizedLocale)}</li>
                </ul>
            </div>

            <div class="features-detail" id="privacy-data">
                <h2>${t('tos.privacyData.title', sanitizedLocale)}</h2>
                <ul>
                    <li>${t('tos.privacyData.noAccess', sanitizedLocale)}</li>
                    <li>${t('tos.privacyData.noPersonal', sanitizedLocale)}</li>
                    <li>${t('tos.privacyData.securityLogging', sanitizedLocale)}</li>
                    <li>${t('tos.privacyData.automaticDeletion', sanitizedLocale)}</li>
                    <li>${t('tos.privacyData.noRecovery', sanitizedLocale)}</li>
                    <li>${t('tos.privacyData.gdpr', sanitizedLocale)}</li>
                </ul>
                <p>${t('tos.privacyData.moreDetails', sanitizedLocale)} <a href="/${sanitizedLocale}/privacy.html">${t(
                  'tos.privacyData.privacyNotice',
                  sanitizedLocale
                )}</a>.</p>
            </div>

            <div class="usage-section" id="service-limitations">
                <h2>${t('tos.serviceLimitations.title', sanitizedLocale)}</h2>
                <ul>
                    <li>${t('tos.serviceLimitations.messageSize', sanitizedLocale)}</li>
                    <li>${t('tos.serviceLimitations.expiryTimes', sanitizedLocale)}</li>
                    <li>${t('tos.serviceLimitations.availability', sanitizedLocale)}</li>
                    <li>${t('tos.serviceLimitations.noDelivery', sanitizedLocale)}</li>
                </ul>
            </div>

            <div class="features-detail" id="security-disclaimers">
                <h2>${t('tos.securityDisclaimers.title', sanitizedLocale)}</h2>
                <ul>
                    <li>${t('tos.securityDisclaimers.userResponsibility', sanitizedLocale)}</li>
                    <li>${t('tos.securityDisclaimers.noWarranty', sanitizedLocale)}</li>
                    <li>${t('tos.securityDisclaimers.limitation', sanitizedLocale)}</li>
                    <li>${t('tos.securityDisclaimers.securityMeasures', sanitizedLocale)}</li>
                    <li>${t('tos.securityDisclaimers.exportControls', sanitizedLocale)}</li>
                </ul>
            </div>

            <div class="usage-section" id="intellectual-property">
                <h2>${t('tos.intellectualProperty.title', sanitizedLocale)}</h2>
                <p>${t('tos.intellectualProperty.content', sanitizedLocale)}</p>
                <p>${t('tos.intellectualProperty.copyright', sanitizedLocale)}</p>
            </div>

            <div class="features-detail" id="indemnification">
                <h2>${t('tos.indemnification.title', sanitizedLocale)}</h2>
                <p>${t('tos.indemnification.content', sanitizedLocale)}</p>
            </div>

            <div class="usage-section" id="termination">
                <h2>${t('tos.termination.title', sanitizedLocale)}</h2>
                <p>${t('tos.termination.content', sanitizedLocale)}</p>
            </div>

            <div class="features-detail" id="changes-terms">
                <h2>${t('tos.changesTerms.title', sanitizedLocale)}</h2>
                <p>${t('tos.changesTerms.content', sanitizedLocale)}</p>
            </div>

            <div class="usage-section" id="governing-law">
                <h2>${t('tos.governingLaw.title', sanitizedLocale)}</h2>
                <p>${t('tos.governingLaw.content', sanitizedLocale)}</p>
            </div>

            <div class="features-detail" id="miscellaneous">
                <h2>${t('tos.miscellaneous.title', sanitizedLocale)}</h2>
                <ul>
                    <li>${t('tos.miscellaneous.severability', sanitizedLocale)}</li>
                    <li>${t('tos.miscellaneous.assignment', sanitizedLocale)}</li>
                    <li>${t('tos.miscellaneous.waiver', sanitizedLocale)}</li>
                    <li>${t('tos.miscellaneous.children', sanitizedLocale)}</li>
                </ul>
            </div>

            <div class="usage-section" id="contact">
                <h2>${t('tos.contact.title', sanitizedLocale)}</h2>
                <p>${t(
                  'tos.contact.content',
                  sanitizedLocale
                )} <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
                  'tos.contact.github',
                  sanitizedLocale
                )}</a> ${t('tos.contact.email', sanitizedLocale)}</p>
            </div>

            <div class="features-detail" id="language-disclaimer">
                <h2>${t('tos.languageDisclaimer.title', sanitizedLocale)}</h2>
                <p>${t('tos.languageDisclaimer.content', sanitizedLocale)}</p>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
          'footer.sourceCode',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/tos.html">${t(
          'footer.tos',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/privacy.html">${t(
          'footer.privacy',
          sanitizedLocale
        )}</a> | <a href="mailto:contact@securememo.app">contact@securememo.app</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', sanitizedLocale)}</p>
    </footer>

    <script src="/js/common.js" type="module" nonce="{{CSP_NONCE}}" defer></script>
</body>
</html>`;
}

export async function getPrivacyHTML(locale = 'en', origin = 'https://securememo.app') {
  const sanitizedLocale = sanitizeLocale(locale);
  const canonicalUrl = `${origin}/${sanitizedLocale}/privacy.html`;
  return `<!DOCTYPE html>
<html lang="${sanitizedLocale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.privacy.title', sanitizedLocale)}</title>
    <meta name="description" content="${t('page.privacy.description', sanitizedLocale)}">
    <meta name="keywords" content="${t('page.privacy.keywords', sanitizedLocale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.privacy.ogTitle', sanitizedLocale)}">
    <meta property="og:description" content="${t('page.privacy.ogDescription', sanitizedLocale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/privacy.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.privacy.ogTitle', sanitizedLocale)}">
    <meta name="twitter:description" content="${t('page.privacy.twitterDescription', sanitizedLocale)}">
    <!-- Structured Data -->
    <script type="application/ld+json" nonce="{{CSP_NONCE}}">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${t('schema.privacy.name', sanitizedLocale)}",
      "description": "${t('schema.privacy.description', sanitizedLocale)}",
      "url": "https://securememo.app/privacy.html",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "${t('schema.privacy.breadcrumb.home', sanitizedLocale)}",
            "item": "https://securememo.app/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${t('schema.privacy.breadcrumb.privacy', sanitizedLocale)}",
            "item": "https://securememo.app/privacy.html"
          }
        ]
      },
      "mainEntity": {
        "@type": "CreativeWork",
        "name": "${t('schema.privacy.mainEntity.name', sanitizedLocale)}",
        "author": {
          "@type": "Organization",
          "name": "securememo.app"
        },
        "dateModified": "2025-08-09",
        "description": "${t('schema.privacy.mainEntity.description', sanitizedLocale)}"
      }
    }
    </script>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    <link rel="canonical" href="${canonicalUrl}">
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${sanitizedLocale}" class="nav-logo">securememo.app</a>
            
            <!-- Hamburger Menu Button -->
            <button class="hamburger" type="button" aria-label="${t(
              'nav.toggleMenu',
              sanitizedLocale
            )}" aria-expanded="false">
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
                <span class="hamburger-line"></span>
            </button>
            
            <!-- Navigation Menu -->
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${sanitizedLocale}" class="nav-link">${t('nav.home', sanitizedLocale)}</a></li>
                <li><a href="/${sanitizedLocale}/about.html" class="nav-link">${t(
                  'nav.about',
                  sanitizedLocale
                )}</a></li>
                <li><a href="/${sanitizedLocale}/create-memo.html" class="nav-link">${t(
                  'nav.create',
                  sanitizedLocale
                )}</a></li>
                <li class="language-dropdown">
                    <button class="language-toggle nav-link" aria-expanded="false" aria-haspopup="true">
                        ${getFlagEmoji(sanitizedLocale)} ${getLanguageDisplayName(sanitizedLocale)}
                    </button>
                    <div class="language-menu">
                        <a href="/ar/privacy.html" class="language-item ${
                          sanitizedLocale === 'ar' ? 'active' : ''
                        }" title="${t('language.arabic', sanitizedLocale)}">🌐 العربية</a>
                        <a href="/bn/privacy.html" class="language-item ${
                          sanitizedLocale === 'bn' ? 'active' : ''
                        }" title="${t('language.bengali', sanitizedLocale)}">🇧🇩 বাংলা</a>
                        <a href="/cs/privacy.html" class="language-item ${
                          sanitizedLocale === 'cs' ? 'active' : ''
                        }" title="${t('language.czech', sanitizedLocale)}">🇨🇿 Čeština</a>
                        <a href="/da/privacy.html" class="language-item ${
                          sanitizedLocale === 'da' ? 'active' : ''
                        }" title="${t('language.danish', sanitizedLocale)}">🇩🇰 Dansk</a>
                        <a href="/de/privacy.html" class="language-item ${
                          sanitizedLocale === 'de' ? 'active' : ''
                        }" title="${t('language.german', sanitizedLocale)}">🇩🇪 Deutsch</a>
                        <a href="/el/privacy.html" class="language-item ${
                          sanitizedLocale === 'el' ? 'active' : ''
                        }" title="${t('language.greek', sanitizedLocale)}">🇬🇷 Ελληνικά</a>
                        <a href="/en/privacy.html" class="language-item ${
                          sanitizedLocale === 'en' ? 'active' : ''
                        }" title="${t('language.english', sanitizedLocale)}">🇬🇧 English</a>
                        <a href="/es/privacy.html" class="language-item ${
                          sanitizedLocale === 'es' ? 'active' : ''
                        }" title="${t('language.spanish', sanitizedLocale)}">🇪🇸 Español</a>
                        <a href="/fi/privacy.html" class="language-item ${
                          sanitizedLocale === 'fi' ? 'active' : ''
                        }" title="${t('language.finnish', sanitizedLocale)}">🇫🇮 Suomi</a>
                        <a href="/fr/privacy.html" class="language-item ${
                          sanitizedLocale === 'fr' ? 'active' : ''
                        }" title="${t('language.french', sanitizedLocale)}">🇫🇷 Français</a>
                        <a href="/hi/privacy.html" class="language-item ${
                          sanitizedLocale === 'hi' ? 'active' : ''
                        }" title="${t('language.hindi', sanitizedLocale)}">🇮🇳 हिन्दी</a>
                        <a href="/hu/privacy.html" class="language-item ${
                          sanitizedLocale === 'hu' ? 'active' : ''
                        }" title="${t('language.hungarian', sanitizedLocale)}">🇭🇺 Magyar</a>
                        <a href="/id/privacy.html" class="language-item ${
                          sanitizedLocale === 'id' ? 'active' : ''
                        }" title="${t('language.indonesian', sanitizedLocale)}">🇮🇩 Bahasa Indonesia</a>
                        <a href="/it/privacy.html" class="language-item ${
                          sanitizedLocale === 'it' ? 'active' : ''
                        }" title="${t('language.italian', sanitizedLocale)}">🇮🇹 Italiano</a>
                        <a href="/ja/privacy.html" class="language-item ${
                          sanitizedLocale === 'ja' ? 'active' : ''
                        }" title="${t('language.japanese', sanitizedLocale)}">🇯🇵 日本語</a>
                        <a href="/ko/privacy.html" class="language-item ${
                          sanitizedLocale === 'ko' ? 'active' : ''
                        }" title="${t('language.korean', sanitizedLocale)}">🇰🇷 한국어</a>
                        <a href="/nl/privacy.html" class="language-item ${
                          sanitizedLocale === 'nl' ? 'active' : ''
                        }" title="${t('language.dutch', sanitizedLocale)}">🇳🇱 Nederlands</a>
                        <a href="/no/privacy.html" class="language-item ${
                          sanitizedLocale === 'no' ? 'active' : ''
                        }" title="${t('language.norwegian', sanitizedLocale)}">🇳🇴 Norsk</a>
                        <a href="/pl/privacy.html" class="language-item ${
                          sanitizedLocale === 'pl' ? 'active' : ''
                        }" title="${t('language.polish', sanitizedLocale)}">🇵🇱 Polski</a>
                        <a href="/ptPT/privacy.html" class="language-item ${
                          sanitizedLocale === 'ptPT' ? 'active' : ''
                        }" title="${t('language.portuguesePT', sanitizedLocale)}">🇵🇹 Português</a>
                        <a href="/ptBR/privacy.html" class="language-item ${
                          sanitizedLocale === 'ptBR' ? 'active' : ''
                        }" title="${t('language.portugueseBR', sanitizedLocale)}">🇧🇷 Português (Brasil)</a>
                        <a href="/ru/privacy.html" class="language-item ${
                          sanitizedLocale === 'ru' ? 'active' : ''
                        }" title="${t('language.russian', sanitizedLocale)}">🇷🇺 Русский</a>
                        <a href="/ro/privacy.html" class="language-item ${
                          sanitizedLocale === 'ro' ? 'active' : ''
                        }" title="${t('language.romanian', sanitizedLocale)}">🇷🇴 Română</a>
                        <a href="/sv/privacy.html" class="language-item ${
                          sanitizedLocale === 'sv' ? 'active' : ''
                        }" title="${t('language.swedish', sanitizedLocale)}">🇸🇪 Svenska</a>
                        <a href="/tl/privacy.html" class="language-item ${
                          sanitizedLocale === 'tl' ? 'active' : ''
                        }" title="${t('language.tagalog', sanitizedLocale)}">🇵🇭 Tagalog</a>
                        <a href="/th/privacy.html" class="language-item ${
                          sanitizedLocale === 'th' ? 'active' : ''
                        }" title="${t('language.thai', sanitizedLocale)}">🇹🇭 ไทย</a>
                        <a href="/tr/privacy.html" class="language-item ${
                          sanitizedLocale === 'tr' ? 'active' : ''
                        }" title="${t('language.turkish', sanitizedLocale)}">🇹🇷 Türkçe</a>
                        <a href="/uk/privacy.html" class="language-item ${
                          sanitizedLocale === 'uk' ? 'active' : ''
                        }" title="${t('language.ukrainian', sanitizedLocale)}">🇺🇦 Українська</a>
                        <a href="/vi/privacy.html" class="language-item ${
                          sanitizedLocale === 'vi' ? 'active' : ''
                        }" title="${t('language.vietnamese', sanitizedLocale)}">🇻🇳 Tiếng Việt</a>
                        <a href="/zh/privacy.html" class="language-item ${
                          sanitizedLocale === 'zh' ? 'active' : ''
                        }" title="${t('language.chinese', sanitizedLocale)}">🈶 中文</a>
                    </div>
                </li>
            </ul>
            
            <!-- Mobile Menu Overlay -->
            <div class="nav-overlay"></div>
        </div>
    </nav>

    <main class="main-content">
        <div class="legal-section">
            <h1>${t('privacy.hero.title', sanitizedLocale)}</h1>
            <p class="legal-meta"><strong>${t('privacy.lastUpdated', sanitizedLocale)}</strong></p>
            
            <div class="legal-toc">
                <h2>${t('privacy.tableOfContents.title', sanitizedLocale)}</h2>
                <ol>
                    <li><a href="#information-collected">${t(
                      'privacy.tableOfContents.informationCollected',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#how-we-use">${t('privacy.tableOfContents.howWeUse', sanitizedLocale)}</a></li>
                    <li><a href="#data-sharing">${t('privacy.tableOfContents.dataSharing', sanitizedLocale)}</a></li>
                    <li><a href="#data-security">${t('privacy.tableOfContents.dataSecurity', sanitizedLocale)}</a></li>
                    <li><a href="#data-retention">${t(
                      'privacy.tableOfContents.dataRetention',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#your-rights">${t('privacy.tableOfContents.yourRights', sanitizedLocale)}</a></li>
                    <li><a href="#children-privacy">${t(
                      'privacy.tableOfContents.childrenPrivacy',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#international-transfers">${t(
                      'privacy.tableOfContents.internationalTransfers',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#changes-notice">${t(
                      'privacy.tableOfContents.changesNotice',
                      sanitizedLocale
                    )}</a></li>
                    <li><a href="#contact">${t('privacy.tableOfContents.contact', sanitizedLocale)}</a></li>
                </ol>
            </div>

            <div class="features-detail">
                <p>${t('privacy.intro.p1', sanitizedLocale)}</p>
                <p>${t('privacy.intro.p2', sanitizedLocale)}</p>
            </div>

            <div class="usage-section" id="information-collected">
                <h2>${t('privacy.informationCollected.title', sanitizedLocale)}</h2>
                <p>${t('privacy.informationCollected.intro', sanitizedLocale)}</p>
                <ul>
                    <li>${t('privacy.informationCollected.memoData', sanitizedLocale)}</li>
                    <li>${t('privacy.informationCollected.noPersonal', sanitizedLocale)}</li>
                    <li>${t('privacy.informationCollected.securityData', sanitizedLocale)}
                        <ul>
                            <li>${t('privacy.informationCollected.ipLogs', sanitizedLocale)}</li>
                            <li>${t('privacy.informationCollected.turnstile', sanitizedLocale)}</li>
                        </ul>
                    </li>
                </ul>
                <p>${t('privacy.informationCollected.noAnalytics', sanitizedLocale)}</p>
                <p>${t('privacy.informationCollected.noSensitive', sanitizedLocale)}</p>
            </div>

            <div class="features-detail" id="how-we-use">
                <h2>${t('privacy.howWeUse.title', sanitizedLocale)}</h2>
                <p>${t('privacy.howWeUse.intro', sanitizedLocale)}</p>
                <ul>
                    <li>${t('privacy.howWeUse.coreService', sanitizedLocale)}</li>
                    <li>${t('privacy.howWeUse.security', sanitizedLocale)}</li>
                    <li>${t('privacy.howWeUse.legal', sanitizedLocale)}</li>
                </ul>
                <p>${t('privacy.howWeUse.noOther', sanitizedLocale)}</p>
            </div>

            <div class="usage-section" id="data-sharing">
                <h2>${t('privacy.dataSharing.title', sanitizedLocale)}</h2>
                <p>${t('privacy.dataSharing.intro', sanitizedLocale)}</p>
                <ul>
                    <li>${t('privacy.dataSharing.serviceProviders', sanitizedLocale)}</li>
                    <li>${t('privacy.dataSharing.legal', sanitizedLocale)}</li>
                    <li>${t('privacy.dataSharing.business', sanitizedLocale)}</li>
                </ul>
            </div>

            <div class="features-detail" id="data-security">
                <h2>${t('privacy.dataSecurity.title', sanitizedLocale)}</h2>
                <ul>
                    <li>${t('privacy.dataSecurity.encryption', sanitizedLocale)}</li>
                    <li>${t('privacy.dataSecurity.deletion', sanitizedLocale)}</li>
                    <li>${t('privacy.dataSecurity.securityMeasures', sanitizedLocale)}</li>
                    <li>${t('privacy.dataSecurity.noRecovery', sanitizedLocale)}</li>
                </ul>
                <p>${t('privacy.dataSecurity.disclaimer', sanitizedLocale)}</p>
            </div>

            <div class="usage-section" id="data-retention">
                <h2>${t('privacy.dataRetention.title', sanitizedLocale)}</h2>
                <ul>
                    <li>${t('privacy.dataRetention.memos', sanitizedLocale)}</li>
                    <li>${t('privacy.dataRetention.logs', sanitizedLocale)}</li>
                    <li>${t('privacy.dataRetention.minimal', sanitizedLocale)}</li>
                </ul>
            </div>

            <div class="features-detail" id="your-rights">
                <h2>${t('privacy.yourRights.title', sanitizedLocale)}</h2>
                <p>${t('privacy.yourRights.intro', sanitizedLocale)}</p>
                <ul>
                    <li>${t('privacy.yourRights.noAccounts', sanitizedLocale)}</li>
                    <li>${t('privacy.yourRights.noRequests', sanitizedLocale)}</li>
                </ul>
                <p>${t('privacy.yourRights.contact', sanitizedLocale)}</p>
            </div>

            <div class="usage-section" id="children-privacy">
                <h2>${t('privacy.childrenPrivacy.title', sanitizedLocale)}</h2>
                <p>${t('privacy.childrenPrivacy.content', sanitizedLocale)}</p>
            </div>

            <div class="features-detail" id="international-transfers">
                <h2>${t('privacy.internationalTransfers.title', sanitizedLocale)}</h2>
                <p>${t('privacy.internationalTransfers.content', sanitizedLocale)}</p>
            </div>

            <div class="usage-section" id="changes-notice">
                <h2>${t('privacy.changesNotice.title', sanitizedLocale)}</h2>
                <p>${t('privacy.changesNotice.content', sanitizedLocale)}</p>
            </div>

            <div class="features-detail" id="contact">
                <h2>${t('privacy.contact.title', sanitizedLocale)}</h2>
                <p>${t(
                  'privacy.contact.intro',
                  sanitizedLocale
                )} <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
                  'privacy.contact.github',
                  sanitizedLocale
                )}</a> ${t('privacy.contact.email', sanitizedLocale)}</p>
                <p>${t('privacy.contact.disclaimer', sanitizedLocale)}</p>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t(
          'footer.sourceCode',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/tos.html">${t(
          'footer.tos',
          sanitizedLocale
        )}</a> | <a href="/${sanitizedLocale}/privacy.html">${t(
          'footer.privacy',
          sanitizedLocale
        )}</a> | <a href="mailto:contact@securememo.app">contact@securememo.app</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', sanitizedLocale)}</p>
    </footer>

    <script src="/js/common.js" type="module" nonce="{{CSP_NONCE}}" defer></script>
</body>
</html>`;
}
