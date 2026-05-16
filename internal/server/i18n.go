package server

import (
	"encoding/json"
	"fmt"
	"html"
	"regexp"
	"sort"
	"strings"

	"github.com/timoheimonen/securememo/internal/frontend"
)

var translationCatalog = loadTranslationCatalog()

type localeLabel struct {
	Flag string
	Name string
}

var localeLabels = map[string]localeLabel{
	"ar":   {"🌐", "العربية"},
	"bn":   {"🇧🇩", "বাংলা"},
	"cs":   {"🇨🇿", "Čeština"},
	"da":   {"🇩🇰", "Dansk"},
	"de":   {"🇩🇪", "Deutsch"},
	"el":   {"🇬🇷", "Ελληνικά"},
	"en":   {"🇬🇧", "English"},
	"es":   {"🇪🇸", "Español"},
	"fi":   {"🇫🇮", "Suomi"},
	"fr":   {"🇫🇷", "Français"},
	"hi":   {"🇮🇳", "हिन्दी"},
	"hu":   {"🇭🇺", "Magyar"},
	"id":   {"🇮🇩", "Bahasa Indonesia"},
	"it":   {"🇮🇹", "Italiano"},
	"ja":   {"🇯🇵", "日本語"},
	"ko":   {"🇰🇷", "한국어"},
	"nl":   {"🇳🇱", "Nederlands"},
	"no":   {"🇳🇴", "Norsk"},
	"pl":   {"🇵🇱", "Polski"},
	"ptPT": {"🇵🇹", "Português"},
	"ptBR": {"🇧🇷", "Português (Brasil)"},
	"ro":   {"🇷🇴", "Română"},
	"ru":   {"🇷🇺", "Русский"},
	"sv":   {"🇸🇪", "Svenska"},
	"tl":   {"🇵🇭", "Tagalog"},
	"th":   {"🇹🇭", "ไทย"},
	"tr":   {"🇹🇷", "Türkçe"},
	"uk":   {"🇺🇦", "Українська"},
	"vi":   {"🇻🇳", "Tiếng Việt"},
	"zh":   {"🈶", "中文"},
}

func loadTranslationCatalog() map[string]map[string]string {
	out := make(map[string]map[string]string, len(supportedLocales))
	for _, locale := range supportedLocales {
		body, err := frontend.FS.ReadFile(fmt.Sprintf("generated/js/clientLocalization.%s.js", locale))
		if err != nil {
			continue
		}
		raw := extractTranslationJSON(string(body))
		if raw == "" {
			continue
		}
		var fileCatalog map[string]map[string]string
		if err := json.Unmarshal([]byte(raw), &fileCatalog); err != nil {
			continue
		}
		if messages := fileCatalog[locale]; len(messages) > 0 {
			out[locale] = messages
		}
	}
	return out
}

func extractTranslationJSON(js string) string {
	startIndex := -1
	for _, start := range []string{"const TRANSLATIONS = ", "const LOCAL_TRANSLATIONS = "} {
		startIndex = strings.Index(js, start)
		if startIndex >= 0 {
			startIndex += len(start)
			break
		}
	}
	if startIndex < 0 {
		return ""
	}
	endIndex := strings.Index(js[startIndex:], ";\nfunction")
	if endIndex < 0 {
		endIndex = strings.Index(js[startIndex:], ";\n")
	}
	if endIndex < 0 {
		return ""
	}
	return js[startIndex : startIndex+endIndex]
}

func localizeHTML(templateHTML, locale, pathWithoutLocale, publicOrigin string) string {
	locale = sanitizeSupportedLocale(locale)
	out := applyTranslations(templateHTML, locale)
	out = rewriteLocaleURLs(out, locale, pathWithoutLocale, publicOrigin)
	out = rewriteLocaleChrome(out, locale, pathWithoutLocale)
	out = rewriteSEO(out, locale, pathWithoutLocale, publicOrigin)
	return out
}

func applyTranslations(input, locale string) string {
	if locale == "en" {
		return input
	}
	english := translationCatalog["en"]
	localized := translationCatalog[locale]
	if len(english) == 0 || len(localized) == 0 {
		return input
	}

	keys := make([]string, 0, len(english))
	for key, value := range english {
		if value != "" && localized[key] != "" && localized[key] != value {
			keys = append(keys, key)
		}
	}
	sort.Slice(keys, func(i, j int) bool {
		return len(english[keys[i]]) > len(english[keys[j]])
	})

	return replaceOutsideScriptTags(input, func(part string, inScript bool) string {
		out := part
		for _, key := range keys {
			from := english[key]
			to := localized[key]
			if inScript {
				out = strings.ReplaceAll(out, jsonStringBody(from), jsonStringBody(to))
				continue
			}
			out = strings.ReplaceAll(out, html.EscapeString(from), html.EscapeString(to))
			out = strings.ReplaceAll(out, from, to)
		}
		return out
	})
}

func replaceOutsideScriptTags(input string, replace func(part string, inScript bool) string) string {
	var out strings.Builder
	remaining := input
	for {
		start := strings.Index(strings.ToLower(remaining), "<script")
		if start < 0 {
			out.WriteString(replace(remaining, false))
			return out.String()
		}
		out.WriteString(replace(remaining[:start], false))
		remaining = remaining[start:]
		end := strings.Index(strings.ToLower(remaining), "</script>")
		if end < 0 {
			out.WriteString(replace(remaining, true))
			return out.String()
		}
		end += len("</script>")
		out.WriteString(replace(remaining[:end], true))
		remaining = remaining[end:]
	}
}

func jsonStringBody(value string) string {
	body, err := json.Marshal(value)
	if err != nil || len(body) < 2 {
		return value
	}
	return string(body[1 : len(body)-1])
}

func rewriteLocaleChrome(input, locale, pathWithoutLocale string) string {
	label := localeLabels[locale]
	out := strings.Replace(input, `<html lang="en">`, fmt.Sprintf(`<html lang="%s">`, locale), 1)
	out = languageToggleRegexp.ReplaceAllString(out, fmt.Sprintf(`<button class="language-toggle nav-link" aria-expanded="false" aria-haspopup="true">
                        %s %s
                    </button>`, label.Flag, label.Name))
	out = languageMenuRegexp.ReplaceAllString(out, buildLanguageMenu(locale, pathWithoutLocale))
	return out
}

func rewriteLocaleURLs(input, locale, pathWithoutLocale, publicOrigin string) string {
	out := strings.ReplaceAll(input, `href="/en`, fmt.Sprintf(`href="/%s`, locale))
	out = strings.ReplaceAll(out, `href="https://securememo.app/en`, fmt.Sprintf(`href="%s/%s`, publicOrigin, locale))
	out = strings.ReplaceAll(out, `content="https://securememo.app/en`, fmt.Sprintf(`content="%s/%s`, publicOrigin, locale))
	out = strings.ReplaceAll(out, `item": "https://securememo.app/en`, fmt.Sprintf(`item": "%s/%s`, publicOrigin, locale))
	out = strings.ReplaceAll(out, `url": "https://securememo.app/en`, fmt.Sprintf(`url": "%s/%s`, publicOrigin, locale))

	localizedPage := buildLocalizedPath(locale, pathWithoutLocale)
	out = strings.ReplaceAll(out, `href="{{PUBLIC_ORIGIN}}/en`, fmt.Sprintf(`href="{{PUBLIC_ORIGIN}}/%s`, locale))
	out = strings.ReplaceAll(out, `content="https://securememo.app/privacy.html"`, fmt.Sprintf(`content="%s%s"`, publicOrigin, localizedPage))
	out = strings.ReplaceAll(out, `url": "https://securememo.app/privacy.html"`, fmt.Sprintf(`url": "%s%s"`, publicOrigin, localizedPage))
	out = strings.ReplaceAll(out, `item": "https://securememo.app/privacy.html"`, fmt.Sprintf(`item": "%s%s"`, publicOrigin, localizedPage))
	out = keepLegalLinksEnglish(out, locale)
	return out
}

func keepLegalLinksEnglish(input, locale string) string {
	if locale == "en" {
		return input
	}
	out := strings.ReplaceAll(input, fmt.Sprintf(`href="/%s/tos.html"`, locale), `href="/en/tos.html"`)
	out = strings.ReplaceAll(out, fmt.Sprintf(`href="/%s/privacy.html"`, locale), `href="/en/privacy.html"`)
	return out
}

func buildLanguageMenu(activeLocale, pathWithoutLocale string) string {
	var out strings.Builder
	out.WriteString(`<div class="language-menu">`)
	locales := supportedLocales
	if isEnglishOnlyLegalPage(pathWithoutLocale) {
		locales = []string{"en"}
		activeLocale = "en"
	}
	for _, locale := range locales {
		label := localeLabels[locale]
		activeClass := ""
		if locale == activeLocale {
			activeClass = "active"
		}
		out.WriteString(fmt.Sprintf(`
                        <a href="%s" class="language-item %s" title="%s">%s %s</a>`, buildLocalizedPath(locale, pathWithoutLocale), activeClass, html.EscapeString(label.Name), label.Flag, html.EscapeString(label.Name)))
	}
	out.WriteString(`
                    </div>`)
	return out.String()
}

var languageToggleRegexp = regexp.MustCompile(`(?s)<button class="language-toggle nav-link" aria-expanded="false" aria-haspopup="true">.*?</button>`)
var languageMenuRegexp = regexp.MustCompile(`(?s)<div class="language-menu">.*?</div>`)
