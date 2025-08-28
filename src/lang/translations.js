// Shared translation data for securememo.app
// Used by both server-side and client-side localization
// Translations are auto translated. Errors are possible.

import { ar } from './ar_translations.js';
import { bn } from './bn_translations.js';
import { cs } from './cs_translations.js';
import { da } from './da_translations.js';
import { de } from './de_translations.js';
import { el } from './el_translations.js';
import { en } from './en_translations.js';
import { es } from './es_translations.js';
import { fi } from './fi_translations.js';
import { fr } from './fr_translations.js';
import { hi } from './hi_translations.js';
import { hu } from './hu_translations.js';
import { id } from './id_translations.js';
import { it } from './it_translations.js';
import { ja } from './ja_translations.js';
import { ko } from './ko_translations.js';
import { nl } from './nl_translations.js';
import { no } from './no_translations.js';
import { pl } from './pl_translations.js';
import { ptBR } from './ptBR_translations.js';
import { ptPT } from './ptPT_translations.js';
import { ru } from './ru_translations.js';
import { ro } from './ro_translations.js';
import { sv } from './sv_translations.js';
import { tl } from './tl_translations.js';
import { th } from './th_translations.js';
import { tr } from './tr_translations.js';
import { uk } from './uk_translations.js';
import { vi } from './vi_translations.js';
import { zh } from './zh_translations.js';
import { LANGUAGE_NAMES } from './language_names.js';
function withLanguageNames(localeMap) {
  return { ...localeMap, ...LANGUAGE_NAMES };
}

export const TRANSLATIONS = {
  ar: withLanguageNames(ar),
  bn: withLanguageNames(bn),
  cs: withLanguageNames(cs),
  da: withLanguageNames(da),
  de: withLanguageNames(de),
  el: withLanguageNames(el),
  en: withLanguageNames(en),
  es: withLanguageNames(es),
  fi: withLanguageNames(fi),
  fr: withLanguageNames(fr),
  hi: withLanguageNames(hi),
  hu: withLanguageNames(hu),
  id: withLanguageNames(id),
  it: withLanguageNames(it),
  ja: withLanguageNames(ja),
  ko: withLanguageNames(ko),
  nl: withLanguageNames(nl),
  no: withLanguageNames(no),
  pl: withLanguageNames(pl),
  ptBR: withLanguageNames(ptBR),
  ptPT: withLanguageNames(ptPT),
  ru: withLanguageNames(ru),
  ro: withLanguageNames(ro),
  sv: withLanguageNames(sv),
  tl: withLanguageNames(tl),
  th: withLanguageNames(th),
  tr: withLanguageNames(tr),
  uk: withLanguageNames(uk),
  vi: withLanguageNames(vi),
  zh: withLanguageNames(zh)
};