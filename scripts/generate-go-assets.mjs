import { mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { getStyles } from '../src/styles/styles.js';
import { getIndexHTML, getAboutHTML, getCreateMemoHTML, getReadMemoHTML, getToSHTML, getPrivacyHTML } from '../src/templates/pages.js';
import { getCreateMemoJS, getReadMemoJS, getCommonJS } from '../src/templates/js.js';
import { getClientLocalizationJS } from '../src/lang/clientLocalization.js';
import { getSupportedLocales, t } from '../src/lang/localization.js';
import { minifyCSS, minifyJS } from '../src/utils/minifiers.js';
import { getErrorMessage } from '../src/utils/errorMessages.js';

const outDir = 'internal/frontend/generated';
const originPlaceholder = '{{PUBLIC_ORIGIN}}';

function escapeJavaScript(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function createMemoJS(locale) {
  return getCreateMemoJS()
    .replace(/{{MISSING_MESSAGE_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_MESSAGE', locale)))
    .replace(/{{MESSAGE_TOO_LONG_ERROR}}/g, escapeJavaScript(getErrorMessage('MESSAGE_TOO_LONG', locale)))
    .replace(/{{MISSING_SECURITY_CHALLENGE_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_SECURITY_CHALLENGE', locale)))
    .replace(/{{RATE_LIMITED_ERROR}}/g, escapeJavaScript(getErrorMessage('RATE_LIMITED', locale)))
    .replace(/{{CREATE_MEMO_FAILED_ERROR}}/g, escapeJavaScript(getErrorMessage('CREATE_MEMO_FAILED', locale)))
    .replace(/{{CREATE_MEMO_ERROR}}/g, escapeJavaScript(getErrorMessage('CREATE_MEMO_ERROR', locale)))
    .replace(/{{DECRYPTION_ERROR}}/g, escapeJavaScript(getErrorMessage('DECRYPTION_ERROR', locale)))
    .replace(/{{READ_MEMO_ERROR}}/g, escapeJavaScript(getErrorMessage('READ_MEMO_ERROR', locale)))
    .replace(/{{PASSWORD_COPIED_MESSAGE}}/g, escapeJavaScript(t('msg.passwordCopied', locale)))
    .replace(/{{URL_COPIED_MESSAGE}}/g, escapeJavaScript(t('msg.urlCopied', locale)))
    .replace(/{{COPY_MANUAL_MESSAGE}}/g, escapeJavaScript(t('msg.copyManual', locale)))
    .replace(/{{MSG_ENCRYPTING}}/g, escapeJavaScript(t('msg.encrypting', locale)))
    .replace(/{{BTN_CREATING}}/g, escapeJavaScript(t('btn.creating', locale)))
    .replace(/{{BTN_CREATE}}/g, escapeJavaScript(t('btn.create', locale)))
    .replace(/{{BTN_COPIED}}/g, escapeJavaScript(t('btn.copied', locale)))
    .replace(/{{BTN_SHOW}}/g, escapeJavaScript(t('btn.show', locale)))
    .replace(/{{BTN_HIDE}}/g, escapeJavaScript(t('btn.hide', locale)))
    .replace(/{{BTN_COPY}}/g, escapeJavaScript(t('btn.copy', locale)));
}

function readMemoJS(locale) {
  return getReadMemoJS()
    .replace(/{{MISSING_MEMO_ID_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_MEMO_ID', locale)))
    .replace(/{{MISSING_PASSWORD_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_PASSWORD_ERROR', locale)))
    .replace(/{{INVALID_MEMO_URL_ERROR}}/g, escapeJavaScript(getErrorMessage('INVALID_MEMO_URL_ERROR', locale)))
    .replace(/{{MISSING_SECURITY_CHALLENGE_ERROR}}/g, escapeJavaScript(getErrorMessage('MISSING_SECURITY_CHALLENGE_ERROR', locale)))
    .replace(/{{MEMO_ALREADY_READ_DELETED_ERROR}}/g, escapeJavaScript(getErrorMessage('MEMO_ALREADY_READ_DELETED_ERROR', locale)))
    .replace(/{{MEMO_EXPIRED_DELETED_ERROR}}/g, escapeJavaScript(getErrorMessage('MEMO_EXPIRED_DELETED_ERROR', locale)))
    .replace(/{{INVALID_PASSWORD_CHECK_ERROR}}/g, escapeJavaScript(getErrorMessage('INVALID_PASSWORD_CHECK_ERROR', locale)))
    .replace(/{{RATE_LIMITED_ERROR}}/g, escapeJavaScript(getErrorMessage('RATE_LIMITED', locale)))
    .replace(/{{READ_MEMO_ERROR}}/g, escapeJavaScript(getErrorMessage('READ_MEMO_ERROR', locale)))
    .replace(/{{DECRYPTION_ERROR}}/g, escapeJavaScript(getErrorMessage('DECRYPTION_ERROR', locale)))
    .replace(/{{MEMO_DECRYPTED_MESSAGE}}/g, escapeJavaScript(t('msg.memoDecrypted', locale)))
    .replace(/{{MEMO_DELETED_MESSAGE}}/g, escapeJavaScript(t('msg.memoDeleted', locale)))
    .replace(/{{BTN_DECRYPTING}}/g, escapeJavaScript(t('btn.decrypting', locale)))
    .replace(/{{BTN_DECRYPT}}/g, escapeJavaScript(t('btn.decrypt', locale)))
    .replace(/{{BTN_SHOW}}/g, escapeJavaScript(t('btn.show', locale)))
    .replace(/{{BTN_HIDE}}/g, escapeJavaScript(t('btn.hide', locale)))
    .replace(/{{BTN_COPIED}}/g, escapeJavaScript(t('btn.copied', locale)))
    .replace(/{{DELETION_ERROR_MESSAGE}}/g, escapeJavaScript(t('msg.deletionError', locale)));
}

async function main() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(join(outDir, 'js'), { recursive: true });
  await mkdir(join(outDir, 'pages'), { recursive: true });

  await writeFile(join(outDir, 'styles.css'), minifyCSS(getStyles()));
  await writeFile(join(outDir, 'js', 'common.js'), minifyJS(getCommonJS()));

  for (const locale of getSupportedLocales()) {
    await mkdir(join(outDir, 'pages', locale), { recursive: true });
    await writeFile(join(outDir, 'pages', locale, 'index.html'), await getIndexHTML(locale, originPlaceholder));
    await writeFile(join(outDir, 'pages', locale, 'about.html'), await getAboutHTML(locale, originPlaceholder));
    await writeFile(join(outDir, 'pages', locale, 'create-memo.html'), await getCreateMemoHTML(locale, originPlaceholder));
    await writeFile(join(outDir, 'pages', locale, 'read-memo.html'), await getReadMemoHTML(locale, originPlaceholder));
    await writeFile(join(outDir, 'pages', locale, 'tos.html'), await getToSHTML(locale, originPlaceholder));
    await writeFile(join(outDir, 'pages', locale, 'privacy.html'), await getPrivacyHTML(locale, originPlaceholder));

    await writeFile(join(outDir, 'js', `create-memo.${locale}.js`), minifyJS(createMemoJS(locale)));
    await writeFile(join(outDir, 'js', `read-memo.${locale}.js`), minifyJS(readMemoJS(locale)));
    await writeFile(join(outDir, 'js', `clientLocalization.${locale}.js`), minifyJS(getClientLocalizationJS(locale)));
  }

  await cp('public', join(outDir, 'public'), { recursive: true });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
