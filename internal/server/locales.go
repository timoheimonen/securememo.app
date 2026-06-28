package server

import "strings"

var supportedLocales = []string{
	"ar", "bn", "cs", "da", "de", "el", "en", "es", "fi", "fr",
	"hi", "hu", "id", "it", "ja", "ko", "nl", "no", "pl", "ptBR",
	"ptPT", "ru", "ro", "sv", "tl", "th", "tr", "uk", "vi", "zh",
}

var supportedLocaleSet = func() map[string]bool {
	out := map[string]bool{}
	for _, locale := range supportedLocales {
		out[locale] = true
	}
	return out
}()

type localeInfo struct {
	Locale            string
	PathWithoutLocale string
	NeedsRedirect     bool
}

func sanitizeSupportedLocale(locale string) string {
	if supportedLocaleSet[locale] {
		return locale
	}
	return "en"
}

func extractLocaleFromPath(pathname string) localeInfo {
	segments := strings.Split(strings.TrimLeft(pathname, "/"), "/")
	if len(segments) > 0 && supportedLocaleSet[segments[0]] {
		locale := segments[0]
		remaining := segments[1:]
		clean := remaining
		hasNested := false
		for len(clean) > 0 && supportedLocaleSet[clean[0]] {
			clean = clean[1:]
			hasNested = true
		}
		if hasNested {
			pathWithoutLocale := "/"
			if len(clean) > 0 {
				pathWithoutLocale += strings.Join(clean, "/")
			}
			return localeInfo{Locale: "en", PathWithoutLocale: pathWithoutLocale, NeedsRedirect: true}
		}
		pathWithoutLocale := "/"
		if len(remaining) > 0 && remaining[0] != "" {
			pathWithoutLocale += strings.Join(remaining, "/")
		}
		return localeInfo{Locale: locale, PathWithoutLocale: pathWithoutLocale}
	}
	return localeInfo{Locale: "en", PathWithoutLocale: pathname}
}

func buildLocalizedPath(locale, targetPath string) string {
	locale = sanitizeSupportedLocale(locale)
	if targetPath == "/" || targetPath == "" {
		return "/" + locale
	}
	return "/" + locale + targetPath
}

func isEnglishOnlyLegalPage(pathname string) bool {
	switch pathname {
	case "/tos.html", "/privacy.html":
		return true
	default:
		return false
	}
}

func isEnglishOnlyPage(pathname string) bool {
	return isEnglishOnlyLegalPage(pathname)
}

func localeRedirectPath(pathname string) string {
	if strings.HasPrefix(pathname, "/api/") ||
		strings.HasPrefix(pathname, "/js/") ||
		strings.HasPrefix(pathname, "/styles.css") ||
		strings.HasPrefix(pathname, "/favicon") ||
		strings.Contains(pathname, ".png") ||
		strings.Contains(pathname, ".ico") ||
		pathname == "/sitemap.xml" {
		return ""
	}
	info := extractLocaleFromPath(pathname)
	if info.Locale == "en" && !strings.HasPrefix(pathname, "/en") {
		return buildLocalizedPath("en", pathname)
	}
	return ""
}
