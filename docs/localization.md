# Localization Content Policy

The English catalog is the source catalog. Localized catalogs must preserve its
keys, placeholders, markup, and meaning, but not its ordinary English wording.
Brand names, machine-readable values, and the technical names listed below are
intentional exceptions. This list is deliberately key-specific so that a new
English remnant is not silently treated as technical terminology.

## Invariant values

| Keys | Preserved value | Reason |
| --- | --- | --- |
| `home.hero.title` | `securememo.app` | Product and domain name |
| `schema.app.author` | `Timo Heimonen` | Person name; an established-script transliteration is also valid |
| `schema.app.price` | `0` | Machine-readable schema value; localized digits are also valid |
| `schema.app.currency` | `USD` | ISO 4217 currency code |
| `schema.app.category` | `SecurityApplication` | Machine-readable software category; a localized label is also valid |
| `schema.app.license`, `schema.app.repository` | Repository URLs | Machine-readable URLs |
| `language.*` | Each language's endonym | The language menu intentionally uses the same endonyms in every catalog |

Some ordinary words have the same spelling in English and the target language.
The intentional current cases are `common.error` in Spanish, `msg.status` in
Danish, German, Indonesian, Dutch, Norwegian, Polish, Brazilian Portuguese,
and Swedish, and `warning.important` in Romanian.

## Legacy key retention

The phase 3 audit reproduced the 111 potentially unused keys by replaying the
pre-keyed-replacement analysis against commit `023047a`. The audit treated a
key as used when its token occurred in tracked production Go, JavaScript, or
HTML, or when its English value occurred in an English HTML template handled
by the former document-wide replacement model. Tests and localization bundles
were excluded. The sorted candidate list, including its trailing newline, has
SHA-256 `c33e6ab865f6a05eafa22cd8f018ab0c9ce291d7316e8a078e70b687415cc759`.

Fourteen historical candidates are now reached indirectly through the explicit
browser API-error maps and must be retained:

- `error.DATABASE_ERROR`, `error.MEMO_ID_GENERATION_ERROR`,
  `error.INVALID_DELETION_TOKEN_HASH`, `error.MEMO_ACCESS_DENIED`,
  `error.DATABASE_READ_ERROR`, and `error.MEMO_DELETION_ERROR`;
- `error.REQUEST_TOO_LARGE`, `error.METHOD_NOT_ALLOWED`, `error.FORBIDDEN`,
  `error.GENERAL_ERROR`, and `error.RATE_LIMITED`;
- `error.CREATE_MEMO_ERROR`, `error.READ_MEMO_ERROR`, and
  `error.DEFAULT_FALLBACK`.

The current create path additionally reaches `error.STORAGE_LIMIT_REACHED`; it
is a new runtime key and is not part of the fourteen-key historical count.

Of the other historical candidates, 27 are named only by this content policy
and 70 occur only in the catalogs. Neither category is proof that a key is safe
to remove. Phase 3 therefore removes no catalog keys: every locale retains the
same 362-key set. Any later removal requires the deterministic runtime-key
registry and render plus browser error-path coverage planned for phase 4, and
must update English, every localized catalog, and this policy atomically.

## Technical names inside localized text

Only the named token may remain unchanged; the rest of each value must be
localized.

- `securememo.app`: `page.home.title`, `page.home.ogTitle`,
  `page.about.title`, `page.about.description`, `page.about.ogTitle`,
  `page.about.ogDescription`, `about.hero.title`, `about.hero.subtitle`,
  `faq.privacy.question`, `faq.privacy.answer`, `faq.encryption.question`,
  `faq.cost.question`, `faq.cost.answer`, `faq.technology.question`,
  `faq.technology.answer`, `about.current.hero.subtitle`, and
  `about.current.ogDescription`.
- `AES-256` and `AES-256-GCM`: `page.home.keywords`,
  `page.about.description`, `page.about.keywords`, `page.create.keywords`,
  `page.read.keywords`, `home.security.encryption.description`,
  `about.tech.webcrypto`, `about.features.clientEncryption.description`,
  `schema.app.description`, `schema.app.features.encryption`,
  `faq.privacy.answer`, `faq.encryption.answer`, `create.hero.ogDescription`,
  `create.schema.description`, `create.schema.actionDescription`,
  `read.schema.description`, and `about.current.encrypted.description`.
- `PBKDF2`: `faq.encryption.answer`.
- `Web Crypto API`: `about.tech.webcrypto`,
  `about.features.clientEncryption.description`, `faq.encryption.answer`, and
  `faq.technology.answer`.
- `Go`, `HTTP`, and `SQLite`: `about.tech.go`, `about.tech.sqlite`,
  `about.features.selfHosted.description`, `schema.app.features.selfHosted`,
  and `faq.technology.answer`, as applicable to the technology named by the
  source value.
- `HTML`, `HTML5`, `CSS`, and `JavaScript`: `about.tech.frontend`,
  `schema.app.requirements`, and `faq.technology.answer`, as applicable.
- `GitHub`: `footer.sourceCode`, `about.hero.subtitle`, `about.tech.github`,
  `about.tech.githubLink`, and `faq.technology.answer`.
- `URL`: `btn.copyUrl`, `form.password.help`, `msg.urlCopied`,
  `home.features.share.description`, `about.features.passwordSharing.description`,
  `about.usage.share.description`, `read.hero.description`, `form.memoUrl.label`,
  `form.memoUrl.help`, `form.memoPassword.help`, `warning.shareSecurely`,
  `warning.needBoth`, `error.INVALID_MEMO_URL`, `error.INVALID_MEMO_URL_ERROR`,
  `create.result.passwordHelp`, `msg.urlCopied.plain`,
  `read.password.help.sentence`, and `error.invalidMemoUrl`.
- `ID`: `revoke.confirm.sends` and `about.current.storage.stored.memoId`.
- `memo_id`: `error.MEMO_ID_GENERATION_MAX_RETRIES` only when referring to the
  exact internal identifier.
- `Ctrl+C` and `Cmd+C`: `msg.copyManual`.

The words *ciphertext*, *plaintext*, *privacy-first*, *memo*, and *token* are
not globally approved exceptions. A language may use a genuinely established
loanword or an inflected local form, but mixed-language wording is an error.
The established technical loanword *cookie* may remain in
`about.current.noAccounts.description` and
`about.current.storage.notStored.tracking`, including a target language's
normal inflection or transliteration. Those values only state that the service
does not use or store cookies; this exception does not permit cookie-based
behavior.
