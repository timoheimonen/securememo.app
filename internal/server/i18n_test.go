package server

import (
	"fmt"
	"html"
	"regexp"
	"strings"
	"testing"

	"github.com/timoheimonen/securememo/internal/frontend"
)

var localizedTemplatePages = []struct {
	filename string
	path     string
}{
	{"index.html", "/"},
	{"about.html", "/about.html"},
	{"create-memo.html", "/create-memo.html"},
	{"read-memo.html", "/read-memo.html"},
	{"revoke-memo.html", "/revoke-memo.html"},
}

var expectedLocalizedTextKeys = map[string]string{
	"index.html": `
		nav.home nav.about nav.create
		home.current.hero.title home.current.hero.subtitle home.hero.btnPrimary home.hero.btnSecondary
		home.current.features.title home.current.write.title home.current.write.description
		home.current.share.title home.current.share.description home.current.delete.title home.current.delete.description
		footer.sourceCode footer.tos footer.privacy footer.tagline`,
	"about.html": `
		nav.home nav.about nav.create about.hero.title about.current.hero.subtitle about.cta.createBtn
		about.current.privacy.title about.current.encrypted.title about.current.encrypted.description
		about.current.passwords.title about.current.passwords.description about.current.delete.title about.current.delete.description
		about.current.noAccounts.title about.current.noAccounts.description about.current.storage.title about.current.storage.description
		about.current.storage.stored.title about.current.storage.stored.ciphertext about.current.storage.stored.expiry
		about.current.storage.stored.memoId about.current.storage.stored.deletionHash about.current.storage.stored.revokeHash
		about.current.storage.notStored.title about.current.storage.notStored.plaintext about.current.storage.notStored.passwords
		about.current.storage.notStored.rawTokens about.current.storage.notStored.accounts about.current.storage.notStored.tracking
		about.current.share.title about.current.write.title about.current.write.description
		about.current.shareSeparately.title about.current.shareSeparately.description
		about.current.readOnce.title about.current.readOnce.description about.current.cta.title about.current.cta.subtitle
		about.cta.createBtn about.cta.homeBtn footer.sourceCode footer.tos footer.privacy footer.tagline`,
	"create-memo.html": `
		nav.home nav.about nav.create create.hero.title create.hero.description form.message.label form.message.help
		form.expiry.label form.expiry.option.8h form.expiry.option.1d form.expiry.option.2d form.expiry.option.1w form.expiry.option.2w
		btn.create common.loading schema.app.requirements msg.encrypting create.result.title form.memoUrl.label btn.copyUrl
		form.memoUrl.help form.memoPassword.label btn.show btn.copyPassword create.result.passwordHelp
		create.result.revokeLabel btn.copyRevokeLink create.result.revokeHelp warning.important warning.memoDeleted
		warning.shareSecurely create.result.revokeWarning warning.needBoth warning.pageCleared
		about.current.privacy.title about.current.encrypted.title about.current.encrypted.description
		about.current.passwords.title about.current.passwords.description about.current.delete.title about.current.delete.description
		about.current.noAccounts.title about.current.noAccounts.description footer.sourceCode footer.tos footer.privacy footer.tagline`,
	"read-memo.html": `
		nav.home nav.about nav.create read.hero.title read.hero.description form.password.label btn.show
		read.password.help.sentence btn.decrypt common.loading schema.app.requirements msg.decrypting read.memo.title
		msg.status msg.memoDecrypted msg.deletingSecurely btn.createNew btn.goHome common.error error.missingMemoId
		btn.createNew btn.goHome footer.sourceCode footer.tos footer.privacy footer.tagline`,
	"revoke-memo.html": `
		nav.home nav.about nav.create revoke.hero.title revoke.hero.description revoke.confirm.title revoke.confirm.before
		revoke.confirm.exists revoke.confirm.permanent revoke.confirm.recipient revoke.confirm.sends btn.deleteMemo btn.createNew
		revoke.status.deleting revoke.success.title revoke.success.description btn.createNew btn.goHome revoke.error.title
		btn.createNew btn.goHome footer.sourceCode footer.tos footer.privacy footer.tagline`,
}

var expectedLocalizedAttributeKeys = map[string]string{
	"index.html":       "nav.toggleMenu",
	"about.html":       "nav.toggleMenu",
	"create-memo.html": "nav.toggleMenu form.message.placeholder",
	"read-memo.html":   "nav.toggleMenu form.password.placeholder",
	"revoke-memo.html": "nav.toggleMenu",
}

var leafTextElementRegexp = regexp.MustCompile(`(?s)<([A-Za-z][A-Za-z0-9]*)\b([^>]*)>([^<]*[^\s<][^<]*)</([A-Za-z][A-Za-z0-9]*)\s*>`)

func TestLocalizedTemplateMarkersAreCompleteAndRemoved(t *testing.T) {
	for _, page := range localizedTemplatePages {
		t.Run(page.filename, func(t *testing.T) {
			templateHTML := readLocalizedTemplate(t, page.filename)
			assertNoUnmarkedLocalizedLeafText(t, page.filename, templateHTML)
			assertNoUnmarkedLocalizedAttributes(t, page.filename, templateHTML)
			textMarkers := localizedTextRegexp.FindAllStringSubmatch(templateHTML, -1)
			attributeMarkers := localizedAttributeMarkerRegexp.FindAllStringSubmatch(templateHTML, -1)
			assertMarkerSequence(t, page.filename+" text", textMarkers, 3, strings.Fields(expectedLocalizedTextKeys[page.filename]))
			assertMarkerSequence(t, page.filename+" attributes", attributeMarkers, 2, strings.Fields(expectedLocalizedAttributeKeys[page.filename]))

			for _, marker := range textMarkers {
				key := marker[3]
				if got, want := html.UnescapeString(marker[4]), tr("en", key); got != want {
					t.Fatalf("%s marker %q source text = %q, want English catalog value %q", page.filename, key, got, want)
				}
				assertMarkerExistsInEveryLocale(t, page.filename, key)
			}
			for _, marker := range attributeMarkers {
				assertMarkerExistsInEveryLocale(t, page.filename, marker[2])
			}
			for _, tag := range htmlTagRegexp.FindAllString(templateHTML, -1) {
				for _, marker := range localizedAttributeMarkerRegexp.FindAllStringSubmatch(tag, -1) {
					attribute, key := marker[1], marker[2]
					if !localizableHTMLAttributes[attribute] {
						t.Fatalf("%s marker %q targets unsupported attribute %q", page.filename, key, attribute)
					}
					valueRegexp := regexp.MustCompile(fmt.Sprintf(`\s%s="([^"]*)"`, regexp.QuoteMeta(attribute)))
					valueMatch := valueRegexp.FindStringSubmatch(tag)
					if len(valueMatch) != 2 {
						t.Fatalf("%s marker %q has no %s attribute", page.filename, key, attribute)
					}
					if got, want := html.UnescapeString(valueMatch[1]), tr("en", key); got != want {
						t.Fatalf("%s marker %q source %s = %q, want English catalog value %q", page.filename, key, attribute, got, want)
					}
				}
			}

			for _, locale := range supportedLocales {
				rendered := localizeHTML(templateHTML, locale, page.path, "https://securememo.app")
				if strings.Contains(rendered, "data-i18n") {
					t.Fatalf("%s/%s rendered output contains a translation marker", locale, page.filename)
				}
			}
		})
	}
}

func TestLocalizedRenderUsesMarkerKeyInsteadOfSharedEnglishValue(t *testing.T) {
	createTemplate := readLocalizedTemplate(t, "create-memo.html")
	japaneseCreate := localizeHTML(createTemplate, "ja", "/create-memo.html", "https://securememo.app")
	assertContainsLocalizedElement(t, japaneseCreate, "h1", "", tr("ja", "create.hero.title"))
	assertContainsLocalizedElement(t, japaneseCreate, "button", `id="submitButton"`, tr("ja", "btn.create"))

	aboutTemplate := readLocalizedTemplate(t, "about.html")
	czechAbout := localizeHTML(aboutTemplate, "cs", "/about.html", "https://securememo.app")
	assertContainsLocalizedElement(t, czechAbout, "a", `class="btn btn-secondary"`, tr("cs", "about.cta.homeBtn"))

	swedishCreate := localizeHTML(createTemplate, "sv", "/create-memo.html", "https://securememo.app")
	assertContainsLocalizedElement(t, swedishCreate, "small", `class="form-help"`, tr("sv", "form.message.help"))
}

func TestLocalizedMarkersEscapeTextAndAttributeContexts(t *testing.T) {
	const textKey = "test.localization.textEscape"
	const attributeKey = "test.localization.attributeEscape"
	textValue := `</p><script>alert("text")</script>&`
	attributeValue := `"><img src=x onerror=alert("attribute")>&`

	englishCatalog := translationCatalog["en"]
	oldText, hadText := englishCatalog[textKey]
	oldAttribute, hadAttribute := englishCatalog[attributeKey]
	englishCatalog[textKey] = textValue
	englishCatalog[attributeKey] = attributeValue
	t.Cleanup(func() {
		if hadText {
			englishCatalog[textKey] = oldText
		} else {
			delete(englishCatalog, textKey)
		}
		if hadAttribute {
			englishCatalog[attributeKey] = oldAttribute
		} else {
			delete(englishCatalog, attributeKey)
		}
	})

	input := `<p data-i18n="` + textKey + `">safe</p><input placeholder="safe" data-i18n-placeholder="` + attributeKey + `">`
	got := applyLocalizedText(applyLocalizedAttributes(input, "en"), "en")
	want := `<p>` + html.EscapeString(textValue) + `</p><input placeholder="` + html.EscapeString(attributeValue) + `">`
	if got != want {
		t.Fatalf("escaped marker output = %q, want %q", got, want)
	}
	if strings.Contains(got, "<script>") || strings.Contains(got, "<img") || strings.Contains(got, "data-i18n") {
		t.Fatalf("escaped marker output contains executable markup or an unresolved marker: %s", got)
	}
}

func TestLocalizedRenderPreservesStructuralHTMLAttributes(t *testing.T) {
	templateHTML := readLocalizedTemplate(t, "create-memo.html")
	structuralValues := []string{
		`content="width=device-width, initial-scale=1.0"`,
		`sizes="180x180"`,
		`sizes="192x192"`,
		`sizes="512x512"`,
		`rows="8"`,
		`maxlength="10000"`,
		`value="8"`,
		`value="24"`,
		`value="48"`,
		`value="168"`,
		`value="336"`,
	}

	for _, locale := range supportedLocales {
		t.Run(locale, func(t *testing.T) {
			rendered := localizeHTML(templateHTML, locale, "/create-memo.html", "https://securememo.app")
			for _, value := range structuralValues {
				if !strings.Contains(rendered, value) {
					t.Fatalf("localized create page changed structural attribute %s", value)
				}
			}
		})
	}
}

func TestLocalizedRenderIsDeterministic(t *testing.T) {
	for _, page := range localizedTemplatePages {
		templateHTML := readLocalizedTemplate(t, page.filename)
		for _, locale := range supportedLocales {
			t.Run(locale+"/"+page.filename, func(t *testing.T) {
				want := localizeHTML(templateHTML, locale, page.path, "https://securememo.app")
				for attempt := 0; attempt < 10; attempt++ {
					if got := localizeHTML(templateHTML, locale, page.path, "https://securememo.app"); got != want {
						t.Fatalf("localized render changed on attempt %d", attempt+1)
					}
				}
			})
		}
	}
}

func readLocalizedTemplate(t *testing.T, filename string) string {
	t.Helper()
	body, err := frontend.FS.ReadFile("generated/pages/en/" + filename)
	if err != nil {
		t.Fatalf("read %s: %v", filename, err)
	}
	return string(body)
}

func assertMarkerExistsInEveryLocale(t *testing.T, filename, key string) {
	t.Helper()
	for _, locale := range supportedLocales {
		if translationCatalog[locale][key] == "" {
			t.Fatalf("%s marker %q is missing from locale %s", filename, key, locale)
		}
	}
}

func assertNoUnmarkedLocalizedLeafText(t *testing.T, filename, templateHTML string) {
	t.Helper()
	for _, element := range leafTextElementRegexp.FindAllStringSubmatch(templateHTML, -1) {
		tag, attributes, value, closingTag := element[1], element[2], strings.TrimSpace(element[3]), element[4]
		if !strings.EqualFold(tag, closingTag) || strings.Contains(attributes, "data-i18n=") {
			continue
		}
		if tag == "title" || tag == "script" ||
			strings.Contains(attributes, `class="nav-logo"`) ||
			strings.Contains(attributes, `class="language-toggle`) ||
			strings.Contains(attributes, `class="language-item`) ||
			strings.Contains(attributes, `class="step-number"`) {
			continue
		}
		t.Fatalf("%s contains unmarked localizable <%s> text %q", filename, tag, value)
	}
}

func assertNoUnmarkedLocalizedAttributes(t *testing.T, filename, templateHTML string) {
	t.Helper()
	for _, tag := range htmlTagRegexp.FindAllString(templateHTML, -1) {
		for _, attribute := range []string{"alt", "aria-label", "placeholder", "title"} {
			attributeRegexp := regexp.MustCompile(fmt.Sprintf(`\s%s="[^"]*"`, regexp.QuoteMeta(attribute)))
			if !attributeRegexp.MatchString(tag) {
				continue
			}
			if attribute == "title" && strings.Contains(tag, `class="language-item`) {
				continue
			}
			if !strings.Contains(tag, "data-i18n-"+attribute+`="`) {
				t.Fatalf("%s contains an unmarked localizable %s attribute in %s", filename, attribute, tag)
			}
		}
	}
}

func assertMarkerSequence(t *testing.T, context string, markers [][]string, keyIndex int, want []string) {
	t.Helper()
	got := make([]string, 0, len(markers))
	for _, marker := range markers {
		got = append(got, marker[keyIndex])
	}
	if strings.Join(got, " ") != strings.Join(want, " ") {
		t.Fatalf("%s marker keys = %v, want %v", context, got, want)
	}
}

func assertContainsLocalizedElement(t *testing.T, body, tag, requiredAttribute, value string) {
	t.Helper()
	attributePattern := `[^>]*`
	if requiredAttribute != "" {
		attributePattern = `[^>]*` + regexp.QuoteMeta(requiredAttribute) + `[^>]*`
	}
	pattern := fmt.Sprintf(`<%s%s>%s</%s>`, tag, attributePattern, regexp.QuoteMeta(html.EscapeString(value)), tag)
	if !regexp.MustCompile(pattern).MatchString(body) {
		t.Fatalf("localized <%s> does not contain catalog value %q", tag, value)
	}
}
