package server

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"strings"
)

type seoPage struct {
	Prefix      string
	Description string
	OGTitle     string
	OGDesc      string
	TwitterDesc string
	Keywords    string
	NoIndex     bool
	Hreflang    bool
	Schema      string
	PageName    string
	Breadcrumb  string
	MainEntity  string
	FeatureKeys []string
}

var seoPages = map[string]seoPage{
	"/": {
		Prefix:      "home",
		Description: "page.home.description",
		OGTitle:     "page.home.ogTitle",
		OGDesc:      "page.home.ogDescription",
		TwitterDesc: "page.home.twitterDescription",
		Keywords:    "page.home.keywords",
		Hreflang:    true,
		Schema:      "app",
	},
	"/about.html": {
		Prefix:      "about",
		Description: "page.about.description",
		OGTitle:     "page.about.ogTitle",
		OGDesc:      "page.about.ogDescription",
		TwitterDesc: "page.about.twitterDescription",
		Keywords:    "page.about.keywords",
		Hreflang:    true,
		Schema:      "faq",
	},
	"/create-memo.html": {
		Prefix:      "create",
		Description: "create.hero.description",
		OGTitle:     "page.create.title",
		OGDesc:      "create.hero.ogDescription",
		TwitterDesc: "create.hero.twitterDescription",
		Keywords:    "page.create.keywords",
		NoIndex:     true,
		Schema:      "softwarePage",
		PageName:    "create.hero.title",
		Breadcrumb:  "create.hero.title",
		MainEntity:  "create.hero.title",
		FeatureKeys: []string{
			"schema.create.featureList.clientSide",
			"schema.create.featureList.selfDestruct",
			"schema.create.featureList.multiExpiry",
			"schema.create.featureList.noAccounts",
			"schema.create.featureList.maxChars",
		},
	},
	"/read-memo.html": {
		Prefix:      "read",
		Description: "read.hero.description",
		OGTitle:     "page.read.title",
		OGDesc:      "read.hero.ogDescription",
		TwitterDesc: "read.hero.twitterDescription",
		Keywords:    "page.read.keywords",
		NoIndex:     true,
		Schema:      "softwarePage",
		PageName:    "read.hero.title",
		Breadcrumb:  "read.hero.title",
		MainEntity:  "read.hero.title",
		FeatureKeys: []string{
			"schema.read.featureList.clientDecryption",
			"schema.read.featureList.passwordProtected",
			"schema.read.featureList.autoDeletion",
			"schema.read.featureList.noDataRetention",
			"schema.read.featureList.privacyFocused",
		},
	},
}

func rewriteSEO(input, locale, pathWithoutLocale, publicOrigin string) string {
	if isEnglishOnlyLegalPage(pathWithoutLocale) {
		return rewriteEnglishOnlyLegalSEO(input, pathWithoutLocale, publicOrigin)
	}
	if isEnglishOnlyPage(pathWithoutLocale) {
		return rewriteEnglishOnlyNoIndexSEO(input, pathWithoutLocale, publicOrigin)
	}
	page, ok := seoPages[pathWithoutLocale]
	if !ok {
		return input
	}
	locale = sanitizeSupportedLocale(locale)
	canonical := publicOrigin + buildLocalizedPath(locale, pathWithoutLocale)

	title := tr(locale, "page."+page.Prefix+".title")
	description := tr(locale, page.Description)
	ogTitle := tr(locale, page.OGTitle)
	ogDescription := tr(locale, page.OGDesc)
	twitterDescription := tr(locale, page.TwitterDesc)
	keywords := tr(locale, page.Keywords)

	out := input
	out = replaceRegexp(out, `(?s)<title>.*?</title>`, fmt.Sprintf("<title>%s</title>", html.EscapeString(title)))
	out = replaceMeta(out, "description", description)
	out = replaceMeta(out, "keywords", keywords)
	out = replaceProperty(out, "og:title", ogTitle)
	out = replaceProperty(out, "og:description", ogDescription)
	out = replaceProperty(out, "og:url", canonical)
	out = replaceMeta(out, "twitter:title", ogTitle)
	out = replaceMeta(out, "twitter:description", twitterDescription)
	out = replaceCanonical(out, canonical)
	out = rewriteRobotsMeta(out, page.NoIndex)
	out = rewriteAlternateLinks(out, locale, pathWithoutLocale, publicOrigin, page.Hreflang)
	out = rewriteJSONLD(out, buildJSONLD(page, locale, pathWithoutLocale, publicOrigin, canonical, description))
	return out
}

func rewriteEnglishOnlyLegalSEO(input, pathWithoutLocale, publicOrigin string) string {
	canonical := publicOrigin + buildLocalizedPath("en", pathWithoutLocale)
	out := replaceProperty(input, "og:url", canonical)
	out = replaceCanonical(out, canonical)
	out = rewriteRobotsMeta(out, true)
	out = rewriteAlternateLinks(out, "en", pathWithoutLocale, publicOrigin, false)
	return out
}

func rewriteEnglishOnlyNoIndexSEO(input, pathWithoutLocale, publicOrigin string) string {
	canonical := publicOrigin + buildLocalizedPath("en", pathWithoutLocale)
	out := replaceProperty(input, "og:url", canonical)
	out = replaceCanonical(out, canonical)
	out = rewriteRobotsMeta(out, true)
	out = rewriteAlternateLinks(out, "en", pathWithoutLocale, publicOrigin, false)
	return out
}

func tr(locale, key string) string {
	if value := translationCatalog[locale][key]; value != "" {
		return value
	}
	if value := translationCatalog["en"][key]; value != "" {
		return value
	}
	return key
}

func replaceMeta(input, name, content string) string {
	pattern := fmt.Sprintf(`<meta name="%s" content="[^"]*">`, regexp.QuoteMeta(name))
	replacement := fmt.Sprintf(`<meta name="%s" content="%s">`, name, html.EscapeString(content))
	return replaceRegexp(input, pattern, replacement)
}

func replaceProperty(input, property, content string) string {
	pattern := fmt.Sprintf(`<meta property="%s" content="[^"]*">`, regexp.QuoteMeta(property))
	replacement := fmt.Sprintf(`<meta property="%s" content="%s">`, property, html.EscapeString(content))
	return replaceRegexp(input, pattern, replacement)
}

func replaceCanonical(input, href string) string {
	return replaceRegexp(input, `<link rel="canonical" href="[^"]*">`, fmt.Sprintf(`<link rel="canonical" href="%s">`, html.EscapeString(href)))
}

func rewriteRobotsMeta(input string, noIndex bool) string {
	out := regexp.MustCompile(`\n\s*<meta name="robots" content="[^"]*">`).ReplaceAllString(input, "")
	if !noIndex {
		return out
	}
	robots := `    <meta name="robots" content="noindex,follow">`
	if strings.Contains(out, `<meta name="viewport"`) {
		return regexp.MustCompile(`(<meta name="viewport" content="[^"]*">\n)`).ReplaceAllString(out, "${1}"+robots+"\n")
	}
	return strings.Replace(out, "<head>\n", "<head>\n"+robots+"\n", 1)
}

func rewriteAlternateLinks(input, locale, pathWithoutLocale, publicOrigin string, enabled bool) string {
	out := regexp.MustCompile(`\n\s*<link rel="alternate" hreflang="[^"]+" href="[^"]+">`).ReplaceAllString(input, "")
	if !enabled {
		return out
	}
	var links strings.Builder
	for _, candidate := range supportedLocales {
		fmt.Fprintf(&links, `    <link rel="alternate" hreflang="%s" href="%s">`+"\n", hreflangCode(candidate), html.EscapeString(publicOrigin+buildLocalizedPath(candidate, pathWithoutLocale)))
	}
	fmt.Fprintf(&links, `    <link rel="alternate" hreflang="x-default" href="%s">`+"\n", html.EscapeString(publicOrigin+buildLocalizedPath("en", pathWithoutLocale)))
	return regexp.MustCompile(`(<link rel="canonical" href="[^"]+">\n)`).ReplaceAllString(out, "${1}"+links.String())
}

func hreflangCode(locale string) string {
	switch locale {
	case "ptBR":
		return "pt-BR"
	case "ptPT":
		return "pt-PT"
	default:
		return locale
	}
}

func replaceRegexp(input, pattern, replacement string) string {
	return regexp.MustCompile(pattern).ReplaceAllStringFunc(input, func(string) string {
		return replacement
	})
}

func rewriteJSONLD(input, body string) string {
	if body == "" {
		return input
	}
	re := regexp.MustCompile(`(?s)(<script type="application/ld\+json" nonce="[^"]*">\n).*?(\n\s*</script>)`)
	return re.ReplaceAllString(input, "${1}"+body+"${2}")
}

func buildJSONLD(page seoPage, locale, pathWithoutLocale, publicOrigin, canonical, description string) string {
	var data map[string]interface{}
	switch page.Schema {
	case "app":
		data = appJSONLD(locale, canonical, description)
	case "faq":
		data = faqJSONLD(locale)
	case "softwarePage":
		data = softwarePageJSONLD(page, locale, pathWithoutLocale, publicOrigin, canonical, description)
	case "creativeWork":
		data = creativeWorkJSONLD(page, locale, pathWithoutLocale, publicOrigin, canonical, description)
	default:
		return ""
	}
	body, err := json.MarshalIndent(data, "    ", "  ")
	if err != nil {
		return ""
	}
	return string(body)
}

func appJSONLD(locale, canonical, description string) map[string]interface{} {
	return map[string]interface{}{
		"@context":            "https://schema.org",
		"@type":               "WebApplication",
		"name":                "securememo.app",
		"description":         description,
		"url":                 canonical,
		"applicationCategory": tr(locale, "schema.app.category"),
		"operatingSystem":     tr(locale, "schema.app.os"),
		"browserRequirements": tr(locale, "schema.app.requirements"),
		"author": map[string]string{
			"@type": "Person",
			"name":  tr(locale, "schema.app.author"),
			"url":   "https://github.com/timoheimonen",
		},
		"creator": map[string]string{
			"@type": "Person",
			"name":  tr(locale, "schema.app.author"),
			"url":   "https://github.com/timoheimonen",
		},
		"offers": map[string]string{
			"@type":         "Offer",
			"price":         tr(locale, "schema.app.price"),
			"priceCurrency": tr(locale, "schema.app.currency"),
		},
		"featureList": []string{
			tr(locale, "schema.app.features.encryption"),
			tr(locale, "schema.app.features.selfDestruct"),
			tr(locale, "schema.app.features.zeroKnowledge"),
			tr(locale, "schema.app.features.noAccounts"),
			tr(locale, "schema.app.features.selfHosted"),
			tr(locale, "schema.app.features.privacyFirst"),
		},
		"screenshot":          "https://securememo.app/android-chrome-512x512.png",
		"license":             tr(locale, "schema.app.license"),
		"codeRepository":      tr(locale, "schema.app.repository"),
		"inLanguage":          hreflangCode(locale),
		"isAccessibleForFree": true,
	}
}

func faqJSONLD(locale string) map[string]interface{} {
	return map[string]interface{}{
		"@context":   "https://schema.org",
		"@type":      "FAQPage",
		"inLanguage": hreflangCode(locale),
		"mainEntity": []map[string]interface{}{
			faqItem(locale, "faq.privacy.question", "faq.privacy.answer"),
			faqItem(locale, "faq.encryption.question", "faq.encryption.answer"),
			faqItem(locale, "faq.duration.question", "faq.duration.answer"),
			faqItem(locale, "faq.recovery.question", "faq.recovery.answer"),
			faqItem(locale, "faq.cost.question", "faq.cost.answer"),
			faqItem(locale, "faq.technology.question", "faq.technology.answer"),
		},
	}
}

func faqItem(locale, questionKey, answerKey string) map[string]interface{} {
	return map[string]interface{}{
		"@type": "Question",
		"name":  tr(locale, questionKey),
		"acceptedAnswer": map[string]string{
			"@type": "Answer",
			"text":  tr(locale, answerKey),
		},
	}
}

func softwarePageJSONLD(page seoPage, locale, pathWithoutLocale, publicOrigin, canonical, description string) map[string]interface{} {
	features := make([]string, 0, len(page.FeatureKeys))
	for _, key := range page.FeatureKeys {
		features = append(features, tr(locale, key))
	}
	return map[string]interface{}{
		"@context":    "https://schema.org",
		"@type":       "WebPage",
		"name":        tr(locale, page.PageName),
		"description": description,
		"url":         canonical,
		"inLanguage":  hreflangCode(locale),
		"breadcrumb":  breadcrumb(locale, pathWithoutLocale, publicOrigin, tr(locale, page.Breadcrumb)),
		"mainEntity": map[string]interface{}{
			"@type":               "SoftwareApplication",
			"name":                tr(locale, page.MainEntity),
			"applicationCategory": "SecurityApplication",
			"operatingSystem":     "Web Browser",
			"description":         description,
			"featureList":         features,
		},
	}
}

func creativeWorkJSONLD(page seoPage, locale, pathWithoutLocale, publicOrigin, canonical, description string) map[string]interface{} {
	return map[string]interface{}{
		"@context":    "https://schema.org",
		"@type":       "WebPage",
		"name":        tr(locale, page.PageName),
		"description": description,
		"url":         canonical,
		"inLanguage":  hreflangCode(locale),
		"breadcrumb":  breadcrumb(locale, pathWithoutLocale, publicOrigin, tr(locale, page.Breadcrumb)),
		"mainEntity": map[string]interface{}{
			"@type":       "CreativeWork",
			"name":        tr(locale, page.MainEntity),
			"author":      map[string]string{"@type": "Organization", "name": "securememo.app"},
			"description": description,
		},
	}
}

func breadcrumb(locale, pathWithoutLocale, publicOrigin, currentName string) map[string]interface{} {
	return map[string]interface{}{
		"@type": "BreadcrumbList",
		"itemListElement": []map[string]interface{}{
			{
				"@type":    "ListItem",
				"position": 1,
				"name":     tr(locale, "ui.breadcrumb.home"),
				"item":     publicOrigin + buildLocalizedPath(locale, "/"),
			},
			{
				"@type":    "ListItem",
				"position": 2,
				"name":     currentName,
				"item":     publicOrigin + buildLocalizedPath(locale, pathWithoutLocale),
			},
		},
	}
}
