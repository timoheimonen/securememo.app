import { t } from '../utils/localization.js';

export async function getIndexHTML(locale = 'en', origin = 'https://securememo.app') {
  const canonicalUrl = `${origin}/${locale}`;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.home.title', locale)} | securememo.app</title>
    <meta name="description" content="${t('page.home.description', locale)}">
    <meta name="keywords" content="${t('page.home.keywords', locale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.home.ogTitle', locale)}">
    <meta property="og:description" content="${t('page.home.ogDescription', locale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.home.ogTitle', locale)}">
    <meta name="twitter:description" content="${t('page.home.twitterDescription', locale)}">
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
    <link rel="icon" type="image/png" sizes="192x192" href="/android-chrome-192x192.png">
    <link rel="icon" type="image/png" sizes="512x512" href="/android-chrome-512x512.png">
    <link rel="canonical" href="${canonicalUrl}">
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      "name": "securememo.app",
      "description": "${t('schema.app.description', locale)}",
      "url": "https://securememo.app/",
      "applicationCategory": "${t('schema.app.category', locale)}",
      "operatingSystem": "${t('schema.app.os', locale)}",
      "browserRequirements": "${t('schema.app.requirements', locale)}",
      "author": {
        "@type": "Person",
        "name": "${t('schema.app.author', locale)}",
        "url": "https://github.com/timoheimonen"
      },
      "creator": {
        "@type": "Person",
        "name": "${t('schema.app.author', locale)}",
        "url": "https://github.com/timoheimonen"
      },
      "offers": {
        "@type": "Offer",
        "price": "${t('schema.app.price', locale)}",
        "priceCurrency": "${t('schema.app.currency', locale)}"
      },
      "featureList": [
        "${t('schema.app.features.encryption', locale)}",
        "${t('schema.app.features.selfDestruct', locale)}",
        "${t('schema.app.features.zeroKnowledge', locale)}",
        "${t('schema.app.features.noAccounts', locale)}",
        "${t('schema.app.features.globalPerformance', locale)}",
        "${t('schema.app.features.privacyFirst', locale)}"
      ],
      "screenshot": "https://securememo.app/android-chrome-512x512.png",
      "softwareVersion": "1.0",
      "datePublished": "2025-01-01",
      "dateModified": "2025-08-09",
      "license": "${t('schema.app.license', locale)}",
      "codeRepository": "${t('schema.app.repository', locale)}"
    }
    </script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${locale}" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${locale}" class="nav-link active">${t('nav.home', locale)}</a></li>
                <li><a href="/${locale}/about.html" class="nav-link">${t('nav.about', locale)}</a></li>
                <li><a href="/${locale}/create-memo.html" class="nav-link">${t('nav.create', locale)}</a></li>
                <li class="language-links">
                    <a href="/en" class="nav-link ${locale === 'en' ? 'active' : ''}" title="English">EN</a>
                    <span class="language-separator">|</span>
                    <a href="/es" class="nav-link ${locale === 'es' ? 'active' : ''}" title="Español">ES</a>
                    <span class="language-separator">|</span>
                    <a href="/fr" class="nav-link ${locale === 'fr' ? 'active' : ''}" title="Français">FR</a>
                    <span class="language-separator">|</span>
                    <a href="/de" class="nav-link ${locale === 'de' ? 'active' : ''}" title="Deutsch">DE</a>
                    <span class="language-separator">|</span>
                    <a href="/hi" class="nav-link ${locale === 'hi' ? 'active' : ''}" title="हिन्दी">हिन्दी</a>
                    <span class="language-separator">|</span>
                    <a href="/zh" class="nav-link ${locale === 'zh' ? 'active' : ''}" title="中文">中文</a>
                </li>
            </ul>

        </div>
    </nav>

    <main class="main-content">
        <div class="hero-section">
            <h1>${t('home.hero.title', locale)}</h1>
            <p>${t('home.hero.subtitle', locale)}</p>
            <div class="cta-buttons">
                <a href="/${locale}/create-memo.html" class="btn btn-primary">${t('home.hero.btnPrimary', locale)}</a>
                <a href="/${locale}/about.html" class="btn btn-secondary">${t('home.hero.btnSecondary', locale)}</a>
            </div>
        </div>

        <div class="features-section">
            <h2>${t('home.features.title', locale)}</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <h3>${t('home.features.encrypt.title', locale)}</h3>
                    <p>${t('home.features.encrypt.description', locale)}</p>
                </div>
                <div class="feature-card">
                    <h3>${t('home.features.share.title', locale)}</h3>
                    <p>${t('home.features.share.description', locale)}</p>
                </div>
                <div class="feature-card">
                    <h3>${t('home.features.destruct.title', locale)}</h3>
                    <p>${t('home.features.destruct.description', locale)}</p>
                </div>
            </div>
        </div>

        <div class="security-section">
            <h2>${t('home.security.title', locale)}</h2>
            <div class="features-grid">
                <div class="feature-card">
                    <h3>${t('home.security.encryption.title', locale)}</h3>
                    <p>${t('home.security.encryption.description', locale)}</p>
                </div>
                <div class="feature-card">
                    <h3>${t('home.security.delete.title', locale)}</h3>
                    <p>${t('home.security.delete.description', locale)}</p>
                </div>
                <div class="feature-card">
                    <h3>${t('home.security.password.title', locale)}</h3>
                    <p>${t('home.security.password.description', locale)}</p>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('footer.sourceCode', locale)}</a> | <a href="/${locale}/tos.html">${t('footer.tos', locale)}</a> | <a href="/${locale}/privacy.html">${t('footer.privacy', locale)}</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', locale)}</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
}

export async function getAboutHTML(locale = 'en', origin = 'https://securememo.app') {
  const canonicalUrl = `${origin}/${locale}/about.html`;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.about.title', locale)} | securememo.app</title>
    <meta name="description" content="${t('page.about.description', locale)}">
    <meta name="keywords" content="${t('page.about.keywords', locale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.about.ogTitle', locale)}">
    <meta property="og:description" content="${t('page.about.ogDescription', locale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/${locale}/about.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.about.ogTitle', locale)}">
    <meta name="twitter:description" content="${t('page.about.twitterDescription', locale)}">
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "${t('faq.privacy.question', locale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.privacy.answer', locale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.encryption.question', locale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.encryption.answer', locale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.duration.question', locale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.duration.answer', locale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.recovery.question', locale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.recovery.answer', locale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.cost.question', locale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.cost.answer', locale)}"
          }
        },
        {
          "@type": "Question",
          "name": "${t('faq.technology.question', locale)}",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "${t('faq.technology.answer', locale)}"
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
            <a href="/${locale}" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${locale}" class="nav-link">${t('nav.home', locale)}</a></li>
                <li><a href="/${locale}/about.html" class="nav-link active">${t('nav.about', locale)}</a></li>
                <li><a href="/${locale}/create-memo.html" class="nav-link">${t('nav.create', locale)}</a></li>
                <li class="language-links">
                    <a href="/en/about.html" class="nav-link ${locale === 'en' ? 'active' : ''}" title="English">EN</a>
                    <span class="language-separator">|</span>
                    <a href="/es/about.html" class="nav-link ${locale === 'es' ? 'active' : ''}" title="Español">ES</a>
                    <span class="language-separator">|</span>
                    <a href="/fr/about.html" class="nav-link ${locale === 'fr' ? 'active' : ''}" title="Français">FR</a>
                    <span class="language-separator">|</span>
                    <a href="/de/about.html" class="nav-link ${locale === 'de' ? 'active' : ''}" title="Deutsch">DE</a>
                    <span class="language-separator">|</span>
                    <a href="/hi/about.html" class="nav-link ${locale === 'hi' ? 'active' : ''}" title="हिन्दी">हिन्दी</a>
                    <span class="language-separator">|</span>
                    <a href="/zh/about.html" class="nav-link ${locale === 'zh' ? 'active' : ''}" title="中文">中文</a>
                </li>
            </ul>

        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>${t('about.hero.title', locale)}</h1>
            <p>${t('about.hero.subtitle', locale)}</p>
            
            <div class="tech-stack">
                <h2>${t('about.tech.title', locale)}</h2>
                <ul>
                    <li><strong>Cloudflare Workers:</strong> ${t('about.tech.cloudflare', locale)}</li>
                    <li><strong>D1 Database:</strong> ${t('about.tech.d1', locale)}</li>
                    <li><strong>Web Crypto API:</strong> ${t('about.tech.webcrypto', locale)}</li>
                    <li><strong>HTML/CSS/JavaScript:</strong> ${t('about.tech.frontend', locale)}</li>
                    <li><strong>${t('about.tech.github', locale)}</strong> <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('about.tech.githubLink', locale)}</a></li>
                </ul>
            </div>

            <div class="features-detail">
                <h2>${t('about.features.title', locale)}</h2>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>${t('about.features.clientEncryption.title', locale)}</h3>
                        <p>${t('about.features.clientEncryption.description', locale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.passwordSharing.title', locale)}</h3>
                        <p>${t('about.features.passwordSharing.description', locale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.selfDestruct.title', locale)}</h3>
                        <p>${t('about.features.selfDestruct.description', locale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.noStorage.title', locale)}</h3>
                        <p>${t('about.features.noStorage.description', locale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.global.title', locale)}</h3>
                        <p>${t('about.features.global.description', locale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.features.privacy.title', locale)}</h3>
                        <p>${t('about.features.privacy.description', locale)}</p>
                    </div>
                </div>
            </div>

            <div class="usage-section">
                <h2>${t('about.usage.title', locale)}</h2>
                <div class="feature-list">
                    <div class="feature-item">
                        <h3>${t('about.usage.create.title', locale)}</h3>
                        <p>${t('about.usage.create.description', locale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.usage.share.title', locale)}</h3>
                        <p>${t('about.usage.share.description', locale)}</p>
                    </div>
                    <div class="feature-item">
                        <h3>${t('about.usage.destruct.title', locale)}</h3>
                        <p>${t('about.usage.destruct.description', locale)}</p>
                    </div>
                </div>
            </div>

            <div class="cta-section">
                <h2>${t('about.cta.title', locale)}</h2>
                <p>${t('about.cta.subtitle', locale)}</p>
                <div class="cta-buttons">
                    <a href="/${locale}/create-memo.html" class="btn btn-primary">${t('about.cta.createBtn', locale)}</a>
                    <a href="/${locale}" class="btn btn-secondary">${t('about.cta.homeBtn', locale)}</a>
                </div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('footer.sourceCode', locale)}</a> | <a href="/${locale}/tos.html">${t('footer.tos', locale)}</a> | <a href="/${locale}/privacy.html">${t('footer.privacy', locale)}</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', locale)}</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
}

export async function getCreateMemoHTML(locale = 'en', origin = 'https://securememo.app') {
  const canonicalUrl = `${origin}/${locale}/create-memo.html`;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.create.title', locale)} | securememo.app</title>
    <meta name="description" content="${t('create.hero.description', locale)}">
    <meta name="keywords" content="${t('page.create.keywords', locale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.create.title', locale)}">
    <meta property="og:description" content="${t('create.hero.ogDescription', locale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/${locale}/create-memo.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.create.title', locale)}">
    <meta name="twitter:description" content="${t('create.hero.twitterDescription', locale)}">
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${t('create.hero.title', locale)}",
      "description": "${t('create.schema.description', locale)}",
      "url": "https://securememo.app/${locale}/create-memo.html",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "${t('nav.home', locale)}",
            "item": "https://securememo.app/${locale}/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${t('nav.create', locale)}",
            "item": "https://securememo.app/${locale}/create-memo.html"
          }
        ]
      },
      "mainEntity": {
        "@type": "SoftwareApplication",
        "name": "${t('create.hero.title', locale)}",
        "applicationCategory": "SecurityApplication",
        "operatingSystem": "Web Browser",
        "description": "${t('create.schema.actionDescription', locale)}",
        "featureList": [
          "${t('schema.create.featureList.clientSide', locale)}",
          "${t('schema.create.featureList.selfDestruct', locale)}",
          "${t('schema.create.featureList.multiExpiry', locale)}",
          "${t('schema.create.featureList.noAccounts', locale)}",
          "${t('schema.create.featureList.maxChars', locale)}"
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
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" integrity="sha384-8tTMUpBXDOsQTxlbB/LdlISG/7nPjF1RWr/rNDxPsh5quEpybtbFHO/flV79t6uO" crossorigin="anonymous" async defer></script>
    <script src="/js/create-memo.js" defer></script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${locale}" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${locale}" class="nav-link">${t('nav.home', locale)}</a></li>
                <li><a href="/${locale}/about.html" class="nav-link">${t('nav.about', locale)}</a></li>
                <li><a href="/${locale}/create-memo.html" class="nav-link active">${t('nav.create', locale)}</a></li>
                <li class="language-links">
                    <a href="/en/create-memo.html" class="nav-link ${locale === 'en' ? 'active' : ''}" title="English">EN</a>
                    <span class="language-separator">|</span>
                    <a href="/es/create-memo.html" class="nav-link ${locale === 'es' ? 'active' : ''}" title="Español">ES</a>
                    <span class="language-separator">|</span>
                    <a href="/fr/create-memo.html" class="nav-link ${locale === 'fr' ? 'active' : ''}" title="Français">FR</a>
                    <span class="language-separator">|</span>
                    <a href="/de/create-memo.html" class="nav-link ${locale === 'de' ? 'active' : ''}" title="Deutsch">DE</a>
                    <span class="language-separator">|</span>
                    <a href="/hi/create-memo.html" class="nav-link ${locale === 'hi' ? 'active' : ''}" title="हिन्दी">हिन्दी</a>
                    <span class="language-separator">|</span>
                    <a href="/zh/create-memo.html" class="nav-link ${locale === 'zh' ? 'active' : ''}" title="中文">中文</a>
                </li>
            </ul>

        </div>
    </nav>

    <main class="main-content">
        <div class="memo-container">
            <div class="memo-card">
                <h1>${t('create.hero.title', locale)}</h1>
                <p class="memo-description">${t('create.hero.description', locale)}</p>
                
                <form id="memoForm" class="memo-form">
                    <div class="form-group">
                        <label for="message">${t('form.message.label', locale)}</label>
                        <textarea id="message" name="message" required 
                                  placeholder="${t('form.message.placeholder', locale)}" 
                                  rows="8" maxlength="10000"></textarea>
                        <small class="form-help">${t('form.message.help', locale)}</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="expiryHours">${t('form.expiry.label', locale)}</label>
                        <select id="expiryHours" name="expiryHours">
                            <option value="8">${t('form.expiry.option.8h', locale)}</option>
                            <option value="24">${t('form.expiry.option.1d', locale)}</option>
                            <option value="48">${t('form.expiry.option.2d', locale)}</option>
                            <option value="168">${t('form.expiry.option.1w', locale)}</option>
                            <option value="720">${t('form.expiry.option.30d', locale)}</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <div class="cf-turnstile" data-sitekey="{{TURNSTILE_SITE_KEY}}"></div>
                        <small class="form-help">${t('form.security.help', locale)}</small>
                    </div>
                    
                    <button type="submit" class="btn btn-primary" id="submitButton">${t('btn.create', locale)}</button>
                    
                    <!-- Loading indicator (hidden by default) -->
                    <div id="loadingIndicator" class="loading-spinner" style="display: none;">
                        <div class="spinner"></div>
                        <p>${t('msg.encrypting', locale)}</p>
                    </div>
                </form>
                
                <div id="result" class="result-section" style="display: none;">
                    <h3>${t('msg.memoCreated', locale)}</h3>
                    
                    <div class="memo-url-section">
                        <label for="memoUrl">${t('form.memoUrl.label', locale)}</label>
                        <div class="url-copy-container">
                            <input type="text" id="memoUrl" readonly onclick="this.select(); document.execCommand('copy'); showMessage('${t('msg.urlCopied', locale)}', 'success');">
                            <button type="button" id="copyUrl" class="btn btn-primary">${t('btn.copy', locale)} URL</button>
                        </div>
                        <small class="form-help">${t('form.memoUrl.help', locale)}</small>
                    </div>
                    
                    <div class="memo-password-section">
                        <label for="memoPassword">${t('form.memoPassword.label', locale)}</label>
                        <div class="url-copy-container">
                            <input type="password" id="memoPassword" readonly onclick="this.select(); document.execCommand('copy'); showMessage('${t('msg.passwordCopied', locale)}', 'success');">
                            <button type="button" id="togglePassword" class="btn btn-primary" style="margin-right: 8px;">${t('btn.show', locale)}</button>
                            <button type="button" id="copyPassword" class="btn btn-primary">${t('btn.copy', locale)} Password</button>
                        </div>
                        <small class="form-help">${t('form.memoPassword.help', locale)}</small>
                    </div>
                    
                    <div class="memo-warning">
                        <p><strong>${t('warning.important', locale)}</strong></p>
                        <ul>
                            <li>${t('warning.memoDeleted', locale)}</li>
                            <li>${t('warning.shareSecurely', locale)}</li>
                            <li>${t('warning.needBoth', locale)}</li>
                            <li>${t('warning.pageCleared', locale)}</li>
                        </ul>
                    </div>
                </div>
                
                <div id="statusMessage" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('footer.sourceCode', locale)}</a> | <a href="/${locale}/tos.html">${t('footer.tos', locale)}</a> | <a href="/${locale}/privacy.html">${t('footer.privacy', locale)}</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', locale)}</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
}

export async function getReadMemoHTML(locale = 'en', origin = 'https://securememo.app') {
  const canonicalUrl = `${origin}/${locale}/read-memo.html`;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.read.title', locale)} | securememo.app</title>
    <meta name="description" content="${t('read.hero.description', locale)}">
    <meta name="keywords" content="${t('page.read.keywords', locale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.read.title', locale)}">
    <meta property="og:description" content="${t('read.hero.ogDescription', locale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/${locale}/read-memo.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.read.title', locale)}">
    <meta name="twitter:description" content="${t('read.hero.twitterDescription', locale)}">
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${t('read.hero.title', locale)}",
      "description": "${t('read.schema.description', locale)}",
      "url": "https://securememo.app/${locale}/read-memo.html",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "${t('nav.home', locale)}",
            "item": "https://securememo.app/${locale}/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${t('read.hero.title', locale)}",
            "item": "https://securememo.app/${locale}/read-memo.html"
          }
        ]
      },
      "mainEntity": {
        "@type": "SoftwareApplication",
        "name": "${t('read.hero.title', locale)}",
        "applicationCategory": "SecurityApplication",
        "operatingSystem": "Web Browser",
        "description": "${t('read.schema.description', locale)}",
        "featureList": [
          "${t('schema.read.featureList.clientDecryption', locale)}",
          "${t('schema.read.featureList.passwordProtected', locale)}",
          "${t('schema.read.featureList.autoDeletion', locale)}",
          "${t('schema.read.featureList.noDataRetention', locale)}",
          "${t('schema.read.featureList.privacyFocused', locale)}"
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
    <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" integrity="sha384-8tTMUpBXDOsQTxlbB/LdlISG/7nPjF1RWr/rNDxPsh5quEpybtbFHO/flV79t6uO" crossorigin="anonymous" async defer></script>
    <script src="/js/read-memo.js" defer></script>
</head>
<body>
    <nav class="navbar">
        <div class="nav-container">
            <a href="/${locale}" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${locale}" class="nav-link">${t('nav.home', locale)}</a></li>
                <li><a href="/${locale}/about.html" class="nav-link">${t('nav.about', locale)}</a></li>
                <li><a href="/${locale}/create-memo.html" class="nav-link">${t('nav.create', locale)}</a></li>
                <li class="language-links">
                    <a href="/en/read-memo.html" class="nav-link ${locale === 'en' ? 'active' : ''}" title="English">EN</a>
                    <span class="language-separator">|</span>
                    <a href="/es/read-memo.html" class="nav-link ${locale === 'es' ? 'active' : ''}" title="Español">ES</a>
                    <span class="language-separator">|</span>
                    <a href="/fr/read-memo.html" class="nav-link ${locale === 'fr' ? 'active' : ''}" title="Français">FR</a>
                    <span class="language-separator">|</span>
                    <a href="/de/read-memo.html" class="nav-link ${locale === 'de' ? 'active' : ''}" title="Deutsch">DE</a>
                    <span class="language-separator">|</span>
                    <a href="/hi/read-memo.html" class="nav-link ${locale === 'hi' ? 'active' : ''}" title="हिन्दी">हिन्दी</a>
                    <span class="language-separator">|</span>
                    <a href="/zh/read-memo.html" class="nav-link ${locale === 'zh' ? 'active' : ''}" title="中文">中文</a>
                </li>
            </ul>

        </div>
    </nav>

    <main class="main-content">
        <div class="memo-container">
            <div class="memo-card">
                <h1>${t('read.hero.title', locale)}</h1>
                <p class="memo-description">${t('read.hero.description', locale)}</p>
                
                <div id="passwordForm" class="memo-form">
                    <form id="decryptForm">
                        <div class="form-group">
                            <label for="password">${t('form.password.label', locale)}</label>
                            <div class="password-input-container">
                                <input type="password" id="password" name="password" required 
                                       placeholder="${t('form.password.placeholder', locale)}">
                                <button type="button" id="toggleReadPassword" class="btn btn-primary">${t('btn.show', locale)}</button>
                            </div>
                            <small class="form-help">${t('form.password.help', locale)}</small>
                        </div>
                        <div class="form-group">
                            <div class="cf-turnstile"></div>
                            <small class="form-help">${t('form.security.help', locale)}</small>
                        </div>
                        <button type="submit" class="btn btn-primary">${t('btn.decrypt', locale)}</button>
                    </form>
                </div>
                
                <div id="memoContent" class="memo-content" style="display: none;">
                    <h3>${t('msg.yourSecureMemo', locale)}</h3>
                    <div class="memo-message">
                        <p id="decryptedMessage"></p>
                    </div>
                    <div class="memo-info">
                        <p><strong>${t('msg.status', locale)}</strong> <span id="memoStatus">${t('msg.memoDecrypted', locale)}</span></p>
                        <div id="deletionSpinner" class="loading-spinner" style="display: none;">
                            <div class="spinner"></div>
                            <p>${t('msg.deletingSecurely', locale)}</p>
                        </div>
                    </div>
                    <div class="memo-actions">
                        <a href="/${locale}/create-memo.html" class="btn btn-primary">${t('btn.createNew', locale)}</a>
                        <a href="/${locale}" class="btn btn-secondary">${t('btn.goHome', locale)}</a>
                    </div>
                </div>
                
                <div id="errorContent" class="error-content" style="display: none;">
                    <h3>❌ ${t('common.error', locale)}</h3>
                    <p id="errorMessage"></p>
                    <div class="memo-actions">
                        <a href="/${locale}/create-memo.html" class="btn btn-primary">${t('btn.createNew', locale)}</a>
                        <a href="/${locale}" class="btn btn-secondary">${t('btn.goHome', locale)}</a>
                    </div>
                </div>
                
                <div id="statusMessage" class="message"></div>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('footer.sourceCode', locale)}</a> | <a href="/${locale}/tos.html">${t('footer.tos', locale)}</a> | <a href="/${locale}/privacy.html">${t('footer.privacy', locale)}</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', locale)}</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
}

export async function getToSHTML(locale = 'en', origin = 'https://securememo.app') {
  const canonicalUrl = `${origin}/${locale}/tos.html`;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.tos.title', locale)}</title>
    <meta name="description" content="${t('page.tos.description', locale)}">
    <meta name="keywords" content="${t('page.tos.keywords', locale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.tos.ogTitle', locale)}">
    <meta property="og:description" content="${t('page.tos.ogDescription', locale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/tos.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.tos.ogTitle', locale)}">
    <meta name="twitter:description" content="${t('page.tos.twitterDescription', locale)}">
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${t('schema.tos.name', locale)}",
      "description": "${t('schema.tos.description', locale)}",
      "url": "https://securememo.app/tos.html",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "${t('schema.tos.breadcrumb.home', locale)}",
            "item": "https://securememo.app/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${t('schema.tos.breadcrumb.tos', locale)}",
            "item": "https://securememo.app/tos.html"
          }
        ]
      },
      "mainEntity": {
        "@type": "CreativeWork",
        "name": "${t('schema.tos.mainEntity.name', locale)}",
        "author": {
          "@type": "Organization",
          "name": "securememo.app"
        },
        "dateModified": "2025-08-09",
        "description": "${t('schema.tos.mainEntity.description', locale)}"
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
            <a href="/${locale}" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${locale}" class="nav-link">${t('nav.home', locale)}</a></li>
                <li><a href="/${locale}/about.html" class="nav-link">${t('nav.about', locale)}</a></li>
                <li><a href="/${locale}/create-memo.html" class="nav-link">${t('nav.create', locale)}</a></li>
                <li class="language-links">
                    <a href="/en/tos.html" class="nav-link ${locale === 'en' ? 'active' : ''}" title="English">EN</a>
                    <span class="language-separator">|</span>
                    <a href="/es/tos.html" class="nav-link ${locale === 'es' ? 'active' : ''}" title="Español">ES</a>
                    <span class="language-separator">|</span>
                    <a href="/fr/tos.html" class="nav-link ${locale === 'fr' ? 'active' : ''}" title="Français">FR</a>
                    <span class="language-separator">|</span>
                    <a href="/de/tos.html" class="nav-link ${locale === 'de' ? 'active' : ''}" title="Deutsch">DE</a>
                    <span class="language-separator">|</span>
                    <a href="/hi/tos.html" class="nav-link ${locale === 'hi' ? 'active' : ''}" title="हिन्दी">हिन्दी</a>
                    <span class="language-separator">|</span>
                    <a href="/zh/tos.html" class="nav-link ${locale === 'zh' ? 'active' : ''}" title="中文">中文</a>
                </li>
            </ul>

        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>${t('tos.hero.title', locale)}</h1>
            <p><strong>${t('tos.lastUpdated', locale)}</strong></p>
            
            <div class="tech-stack">
                <h2>${t('tos.tableOfContents.title', locale)}</h2>
                <ol>
                    <li><a href="#service-description">${t('tos.tableOfContents.serviceDescription', locale)}</a></li>
                    <li><a href="#acceptable-use">${t('tos.tableOfContents.acceptableUse', locale)}</a></li>
                    <li><a href="#privacy-data">${t('tos.tableOfContents.privacyData', locale)}</a></li>
                    <li><a href="#service-limitations">${t('tos.tableOfContents.serviceLimitations', locale)}</a></li>
                    <li><a href="#security-disclaimers">${t('tos.tableOfContents.securityDisclaimers', locale)}</a></li>
                    <li><a href="#intellectual-property">${t('tos.tableOfContents.intellectualProperty', locale)}</a></li>
                    <li><a href="#indemnification">${t('tos.tableOfContents.indemnification', locale)}</a></li>
                    <li><a href="#termination">${t('tos.tableOfContents.termination', locale)}</a></li>
                    <li><a href="#changes-terms">${t('tos.tableOfContents.changesTerms', locale)}</a></li>
                    <li><a href="#governing-law">${t('tos.tableOfContents.governingLaw', locale)}</a></li>
                    <li><a href="#miscellaneous">${t('tos.tableOfContents.miscellaneous', locale)}</a></li>
                    <li><a href="#contact">${t('tos.tableOfContents.contact', locale)}</a></li>
                    <li><a href="#language-disclaimer">${t('tos.tableOfContents.languageDisclaimer', locale)}</a></li>
                </ol>
            </div>

            <div class="features-detail" id="service-description">
                <h2>${t('tos.serviceDescription.title', locale)}</h2>
                <p>${t('tos.serviceDescription.content', locale)}</p>
            </div>

            <div class="usage-section" id="acceptable-use">
                <h2>${t('tos.acceptableUse.title', locale)}</h2>
                <p>${t('tos.acceptableUse.intro', locale)}</p>
                <ul>
                    <li>${t('tos.acceptableUse.illegal', locale)}</li>
                    <li>${t('tos.acceptableUse.bypass', locale)}</li>
                    <li>${t('tos.acceptableUse.automated', locale)}</li>
                    <li>${t('tos.acceptableUse.malware', locale)}</li>
                    <li>${t('tos.acceptableUse.spam', locale)}</li>
                    <li>${t('tos.acceptableUse.reverse', locale)}</li>
                </ul>
            </div>

            <div class="features-detail" id="privacy-data">
                <h2>${t('tos.privacyData.title', locale)}</h2>
                <ul>
                    <li>${t('tos.privacyData.noAccess', locale)}</li>
                    <li>${t('tos.privacyData.noPersonal', locale)}</li>
                    <li>${t('tos.privacyData.securityLogging', locale)}</li>
                    <li>${t('tos.privacyData.automaticDeletion', locale)}</li>
                    <li>${t('tos.privacyData.noRecovery', locale)}</li>
                    <li>${t('tos.privacyData.gdpr', locale)}</li>
                </ul>
                <p>${t('tos.privacyData.moreDetails', locale)} <a href="/${locale}/privacy.html">${t('tos.privacyData.privacyNotice', locale)}</a>.</p>
            </div>

            <div class="usage-section" id="service-limitations">
                <h2>${t('tos.serviceLimitations.title', locale)}</h2>
                <ul>
                    <li>${t('tos.serviceLimitations.messageSize', locale)}</li>
                    <li>${t('tos.serviceLimitations.expiryTimes', locale)}</li>
                    <li>${t('tos.serviceLimitations.availability', locale)}</li>
                    <li>${t('tos.serviceLimitations.noDelivery', locale)}</li>
                </ul>
            </div>

            <div class="features-detail" id="security-disclaimers">
                <h2>${t('tos.securityDisclaimers.title', locale)}</h2>
                <ul>
                    <li>${t('tos.securityDisclaimers.userResponsibility', locale)}</li>
                    <li>${t('tos.securityDisclaimers.noWarranty', locale)}</li>
                    <li>${t('tos.securityDisclaimers.limitation', locale)}</li>
                    <li>${t('tos.securityDisclaimers.securityMeasures', locale)}</li>
                    <li>${t('tos.securityDisclaimers.exportControls', locale)}</li>
                </ul>
            </div>

            <div class="usage-section" id="intellectual-property">
                <h2>${t('tos.intellectualProperty.title', locale)}</h2>
                <p>${t('tos.intellectualProperty.content', locale)}</p>
                <p>${t('tos.intellectualProperty.copyright', locale)}</p>
            </div>

            <div class="features-detail" id="indemnification">
                <h2>${t('tos.indemnification.title', locale)}</h2>
                <p>${t('tos.indemnification.content', locale)}</p>
            </div>

            <div class="usage-section" id="termination">
                <h2>${t('tos.termination.title', locale)}</h2>
                <p>${t('tos.termination.content', locale)}</p>
            </div>

            <div class="features-detail" id="changes-terms">
                <h2>${t('tos.changesTerms.title', locale)}</h2>
                <p>${t('tos.changesTerms.content', locale)}</p>
            </div>

            <div class="usage-section" id="governing-law">
                <h2>${t('tos.governingLaw.title', locale)}</h2>
                <p>${t('tos.governingLaw.content', locale)}</p>
            </div>

            <div class="features-detail" id="miscellaneous">
                <h2>${t('tos.miscellaneous.title', locale)}</h2>
                <ul>
                    <li>${t('tos.miscellaneous.severability', locale)}</li>
                    <li>${t('tos.miscellaneous.assignment', locale)}</li>
                    <li>${t('tos.miscellaneous.waiver', locale)}</li>
                    <li>${t('tos.miscellaneous.children', locale)}</li>
                </ul>
            </div>

            <div class="usage-section" id="contact">
                <h2>${t('tos.contact.title', locale)}</h2>
                <p>${t('tos.contact.content', locale)} <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('tos.contact.github', locale)}</a> ${t('tos.contact.email', locale)}</p>
            </div>

            <div class="features-detail" id="language-disclaimer">
                <h2>${t('tos.languageDisclaimer.title', locale)}</h2>
                <p>${t('tos.languageDisclaimer.content', locale)}</p>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('footer.sourceCode', locale)}</a> | <a href="/${locale}/tos.html">${t('footer.tos', locale)}</a> | <a href="/${locale}/privacy.html">${t('footer.privacy', locale)}</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', locale)}</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
}

export async function getPrivacyHTML(locale = 'en', origin = 'https://securememo.app') {
  const canonicalUrl = `${origin}/${locale}/privacy.html`;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('page.privacy.title', locale)}</title>
    <meta name="description" content="${t('page.privacy.description', locale)}">
    <meta name="keywords" content="${t('page.privacy.keywords', locale)}">
    <!-- Open Graph for social sharing -->
    <meta property="og:title" content="${t('page.privacy.ogTitle', locale)}">
    <meta property="og:description" content="${t('page.privacy.ogDescription', locale)}">
    <meta property="og:type" content="website">
    <meta property="og:url" content="https://securememo.app/privacy.html">
    <meta property="og:image" content="https://securememo.app/android-chrome-512x512.png">
    <!-- Twitter Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${t('page.privacy.ogTitle', locale)}">
    <meta name="twitter:description" content="${t('page.privacy.twitterDescription', locale)}">
    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "${t('schema.privacy.name', locale)}",
      "description": "${t('schema.privacy.description', locale)}",
      "url": "https://securememo.app/privacy.html",
      "breadcrumb": {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "${t('schema.privacy.breadcrumb.home', locale)}",
            "item": "https://securememo.app/"
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "${t('schema.privacy.breadcrumb.privacy', locale)}",
            "item": "https://securememo.app/privacy.html"
          }
        ]
      },
      "mainEntity": {
        "@type": "CreativeWork",
        "name": "${t('schema.privacy.mainEntity.name', locale)}",
        "author": {
          "@type": "Organization",
          "name": "securememo.app"
        },
        "dateModified": "2025-08-09",
        "description": "${t('schema.privacy.mainEntity.description', locale)}"
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
            <a href="/${locale}" class="nav-logo">securememo.app</a>
            <ul class="nav-menu" id="navMenu">
                <li><a href="/${locale}" class="nav-link">${t('nav.home', locale)}</a></li>
                <li><a href="/${locale}/about.html" class="nav-link">${t('nav.about', locale)}</a></li>
                <li><a href="/${locale}/create-memo.html" class="nav-link">${t('nav.create', locale)}</a></li>
                <li class="language-links">
                    <a href="/en/privacy.html" class="nav-link ${locale === 'en' ? 'active' : ''}" title="English">EN</a>
                    <span class="language-separator">|</span>
                    <a href="/es/privacy.html" class="nav-link ${locale === 'es' ? 'active' : ''}" title="Español">ES</a>
                    <span class="language-separator">|</span>
                    <a href="/fr/privacy.html" class="nav-link ${locale === 'fr' ? 'active' : ''}" title="Français">FR</a>
                    <span class="language-separator">|</span>
                    <a href="/de/privacy.html" class="nav-link ${locale === 'de' ? 'active' : ''}" title="Deutsch">DE</a>
                    <span class="language-separator">|</span>
                    <a href="/hi/privacy.html" class="nav-link ${locale === 'hi' ? 'active' : ''}" title="हिन्दी">हिन्दी</a>
                    <span class="language-separator">|</span>
                    <a href="/zh/privacy.html" class="nav-link ${locale === 'zh' ? 'active' : ''}" title="中文">中文</a>
                </li>
            </ul>

        </div>
    </nav>

    <main class="main-content">
        <div class="about-section">
            <h1>${t('privacy.hero.title', locale)}</h1>
            <p><strong>${t('privacy.lastUpdated', locale)}</strong></p>
            
            <div class="tech-stack">
                <h2>${t('privacy.tableOfContents.title', locale)}</h2>
                <ol>
                    <li><a href="#information-collected">${t('privacy.tableOfContents.informationCollected', locale)}</a></li>
                    <li><a href="#how-we-use">${t('privacy.tableOfContents.howWeUse', locale)}</a></li>
                    <li><a href="#data-sharing">${t('privacy.tableOfContents.dataSharing', locale)}</a></li>
                    <li><a href="#data-security">${t('privacy.tableOfContents.dataSecurity', locale)}</a></li>
                    <li><a href="#data-retention">${t('privacy.tableOfContents.dataRetention', locale)}</a></li>
                    <li><a href="#your-rights">${t('privacy.tableOfContents.yourRights', locale)}</a></li>
                    <li><a href="#children-privacy">${t('privacy.tableOfContents.childrenPrivacy', locale)}</a></li>
                    <li><a href="#international-transfers">${t('privacy.tableOfContents.internationalTransfers', locale)}</a></li>
                    <li><a href="#changes-notice">${t('privacy.tableOfContents.changesNotice', locale)}</a></li>
                    <li><a href="#contact">${t('privacy.tableOfContents.contact', locale)}</a></li>
                </ol>
            </div>

            <div class="features-detail">
                <p>${t('privacy.intro.p1', locale)}</p>
                <p>${t('privacy.intro.p2', locale)}</p>
            </div>

            <div class="usage-section" id="information-collected">
                <h2>${t('privacy.informationCollected.title', locale)}</h2>
                <p>${t('privacy.informationCollected.intro', locale)}</p>
                <ul>
                    <li>${t('privacy.informationCollected.memoData', locale)}</li>
                    <li>${t('privacy.informationCollected.noPersonal', locale)}</li>
                    <li>${t('privacy.informationCollected.securityData', locale)}
                        <ul>
                            <li>${t('privacy.informationCollected.ipLogs', locale)}</li>
                            <li>${t('privacy.informationCollected.turnstile', locale)}</li>
                        </ul>
                    </li>
                </ul>
                <p>${t('privacy.informationCollected.noAnalytics', locale)}</p>
                <p>${t('privacy.informationCollected.noSensitive', locale)}</p>
            </div>

            <div class="features-detail" id="how-we-use">
                <h2>${t('privacy.howWeUse.title', locale)}</h2>
                <p>${t('privacy.howWeUse.intro', locale)}</p>
                <ul>
                    <li>${t('privacy.howWeUse.coreService', locale)}</li>
                    <li>${t('privacy.howWeUse.security', locale)}</li>
                    <li>${t('privacy.howWeUse.legal', locale)}</li>
                </ul>
                <p>${t('privacy.howWeUse.noOther', locale)}</p>
            </div>

            <div class="usage-section" id="data-sharing">
                <h2>${t('privacy.dataSharing.title', locale)}</h2>
                <p>${t('privacy.dataSharing.intro', locale)}</p>
                <ul>
                    <li>${t('privacy.dataSharing.serviceProviders', locale)}</li>
                    <li>${t('privacy.dataSharing.legal', locale)}</li>
                    <li>${t('privacy.dataSharing.business', locale)}</li>
                </ul>
            </div>

            <div class="features-detail" id="data-security">
                <h2>${t('privacy.dataSecurity.title', locale)}</h2>
                <ul>
                    <li>${t('privacy.dataSecurity.encryption', locale)}</li>
                    <li>${t('privacy.dataSecurity.deletion', locale)}</li>
                    <li>${t('privacy.dataSecurity.securityMeasures', locale)}</li>
                    <li>${t('privacy.dataSecurity.noRecovery', locale)}</li>
                </ul>
                <p>${t('privacy.dataSecurity.disclaimer', locale)}</p>
            </div>

            <div class="usage-section" id="data-retention">
                <h2>${t('privacy.dataRetention.title', locale)}</h2>
                <ul>
                    <li>${t('privacy.dataRetention.memos', locale)}</li>
                    <li>${t('privacy.dataRetention.logs', locale)}</li>
                    <li>${t('privacy.dataRetention.minimal', locale)}</li>
                </ul>
            </div>

            <div class="features-detail" id="your-rights">
                <h2>${t('privacy.yourRights.title', locale)}</h2>
                <p>${t('privacy.yourRights.intro', locale)}</p>
                <ul>
                    <li>${t('privacy.yourRights.noAccounts', locale)}</li>
                    <li>${t('privacy.yourRights.noRequests', locale)}</li>
                </ul>
                <p>${t('privacy.yourRights.contact', locale)}</p>
            </div>

            <div class="usage-section" id="children-privacy">
                <h2>${t('privacy.childrenPrivacy.title', locale)}</h2>
                <p>${t('privacy.childrenPrivacy.content', locale)}</p>
            </div>

            <div class="features-detail" id="international-transfers">
                <h2>${t('privacy.internationalTransfers.title', locale)}</h2>
                <p>${t('privacy.internationalTransfers.content', locale)}</p>
            </div>

            <div class="usage-section" id="changes-notice">
                <h2>${t('privacy.changesNotice.title', locale)}</h2>
                <p>${t('privacy.changesNotice.content', locale)}</p>
            </div>

            <div class="features-detail" id="contact">
                <h2>${t('privacy.contact.title', locale)}</h2>
                <p>${t('privacy.contact.intro', locale)} <a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('privacy.contact.github', locale)}</a> ${t('privacy.contact.email', locale)}</p>
                <p>${t('privacy.contact.disclaimer', locale)}</p>
            </div>
        </div>
    </main>

    <footer class="footer">
        <p><a href="https://github.com/timoheimonen/securememo.app" target="_blank" rel="noopener noreferrer">${t('footer.sourceCode', locale)}</a> | <a href="/${locale}/tos.html">${t('footer.tos', locale)}</a> | <a href="/${locale}/privacy.html">${t('footer.privacy', locale)}</a></p>
        <p style="font-size: 0.8em; margin-top: 0.5em; opacity: 0.8;">${t('footer.tagline', locale)}</p>
    </footer>

    <script src="/js/common.js" defer></script>
</body>
</html>`;
} 