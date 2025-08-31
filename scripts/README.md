# Translation Checker Script

This script searches for English untranslated values in non-English language files from `/src/lang/*`.

## Purpose

When maintaining multiple language translations, it's easy for some values to remain in English when they should be translated. This script helps identify:

1. **Exact matches**: Values that are identical to the English version
2. **Contains English**: Values that contain common English words that should probably be translated

## Usage

Run the script using npm:

```bash
npm run check-translations
```

Or directly with node:

```bash
node scripts/check-translations.js
```

## Output

The script will analyze all non-English translation files and report:

- ✅ Files with no issues found
- 🚨 Files with potential untranslated values
- ⚠️ Specific translation keys and values that need review
- 📊 Summary of issues found per file

## Examples of Issues Found

- **Exact match**: `'nav.home': 'Home'` in Italian file (should be `'Casa'` or similar)
- **Contains English**: `'Error al confirmar'` in Spanish file (contains untranslated "Error")

## Configuration

The script filters out common proper nouns and technical terms that are often kept in English:

- Author names (e.g., "Timo Heimonen")
- Technical terms (e.g., "Web Browser", "GitHub", "AES-256")
- Brand names and URLs

You can modify the filtering lists in the script:
- `COMMON_ENGLISH_WORDS`: Words that should be translated
- `PROPER_NOUNS_AND_TECHNICAL`: Terms that are acceptable to keep in English
- `TECHNICAL_TERMS`: Technical words that may appear in translations

## Files Checked

All files matching the pattern `*_translations.js` in `/src/lang/` except:
- `en_translations.js` (reference file)
- `translations.js` (aggregation file)
- `localization.js` (utility file)
- `clientLocalization.js` (utility file)
- `language_names.js` (language names file)

## Integration

This script can be run as part of:
- Development workflow to check translations before commits
- CI/CD pipeline to prevent untranslated content from being deployed
- Regular maintenance to audit translation completeness