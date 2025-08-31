#!/usr/bin/env node

/**
 * Translation Checker Script
 * 
 * This script searches for English untranslated values in non-English language files.
 * It compares each non-English translation file against the English reference file
 * to identify values that appear to be English when they should be translated.
 */

import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LANG_DIR = join(__dirname, '..', 'src', 'lang');
const EXCLUDE_FILES = [
  'en_translations.js',
  'translations.js',
  'localization.js',
  'clientLocalization.js',
  'language_names.js'
];

// Common English words that should be translated
const COMMON_ENGLISH_WORDS = new Set([
  'Home', 'About', 'Error', 'Success', 'Warning', 'Loading', 'Copy', 'Copied',
  'Show', 'Hide', 'Create', 'Delete', 'Cancel', 'Save', 'Submit', 'Back',
  'Next', 'Previous', 'Continue', 'Close', 'Open', 'Edit', 'View', 'Search',
  'Settings', 'Help', 'Contact', 'Login', 'Logout', 'Register', 'Password',
  'Email', 'Name', 'Username', 'Profile', 'Dashboard', 'Menu', 'Navigation',
  'Page', 'Title', 'Description', 'Content', 'Message', 'Text', 'Input',
  'Output', 'File', 'Upload', 'Download', 'Export', 'Import'
]);

// Proper nouns and technical terms that are often kept in English
const PROPER_NOUNS_AND_TECHNICAL = new Set([
  'Timo Heimonen', 'Web Browser', 'GitHub', 'AES-256', 'HTML', 'CSS', 'JavaScript',
  'Cloudflare', 'Workers', 'D1', 'API', 'HTTP', 'HTTPS', 'URL', 'SSL', 'TLS',
  'JSON', 'XML', 'UTF-8', 'SHA-256', 'AES', 'RSA', 'Privacy Notice', 'Email',
  'securememo.app', 'GitHub repository'
]);

// Technical terms that appear in translations but may be acceptable
const TECHNICAL_TERMS = new Set([
  'browser', 'server', 'database', 'encryption', 'password', 'email', 'url',
  'api', 'json', 'html', 'css', 'javascript', 'http', 'https', 'ssl', 'tls'
]);

async function loadTranslations(filePath) {
  try {
    // Use dynamic import to load the translation module
    const module = await import(filePath);
    const exportedKeys = Object.keys(module);
    
    // Find the exported translation object (should be the language code)
    const translationKey = exportedKeys.find(key => key !== 'default');
    
    if (!translationKey || !module[translationKey]) {
      throw new Error(`Could not find translation object in ${filePath}`);
    }
    
    return module[translationKey];
  } catch (error) {
    console.error(`Error loading translations from ${filePath}:`, error.message);
    return null;
  }
}

async function checkForUntranslatedValues() {
  const jsonOutput = process.argv.includes('--json');
  
  if (!jsonOutput) {
    console.log('🔍 Checking for untranslated English values in language files...\n');
  }
  
  try {
    // Load English reference translations
    const enFilePath = `file://${join(LANG_DIR, 'en_translations.js')}`;
    const englishTranslations = await loadTranslations(enFilePath);
    
    if (!englishTranslations) {
      if (!jsonOutput) console.error('❌ Could not load English translations');
      return;
    }
    
    if (!jsonOutput) {
      console.log(`📖 Loaded ${Object.keys(englishTranslations).length} English translation keys\n`);
    }
    
    // Get all language files
    const files = await readdir(LANG_DIR);
    const translationFiles = files.filter(file => 
      file.endsWith('_translations.js') && !EXCLUDE_FILES.includes(file)
    );
    
    let totalIssues = 0;
    const results = {};
    
    // Check each non-English translation file
    for (const file of translationFiles) {
      const filePath = `file://${join(LANG_DIR, file)}`;
      const translations = await loadTranslations(filePath);
      
      if (!translations) {
        continue;
      }
      
      const issues = [];
      
      // Check for exact matches with English values
      for (const [key, englishValue] of Object.entries(englishTranslations)) {
        if (translations[key] && translations[key] === englishValue) {
          // Skip if it's a common term that might be the same across languages
          if (!isLikelyUntranslated(englishValue)) {
            continue;
          }
          
          issues.push({
            key,
            value: englishValue,
            type: 'exact_match'
          });
        }
      }
      
      // Check for values containing common English words
      for (const [key, value] of Object.entries(translations)) {
        if (containsCommonEnglishWords(value)) {
          issues.push({
            key,
            value,
            type: 'contains_english'
          });
        }
      }
      
      results[file] = issues;
      totalIssues += issues.length;
      
      // Report issues for this file
      if (!jsonOutput) {
        if (issues.length > 0) {
          console.log(`🚨 ${file}:`);
          for (const issue of issues) {
            console.log(`  ⚠️  ${issue.key}: "${issue.value}" (${issue.type})`);
          }
          console.log(`  📊 Found ${issues.length} potential issues\n`);
        } else {
          console.log(`✅ ${file}: No issues found`);
        }
      }
    }
    
    if (jsonOutput) {
      console.log(JSON.stringify({
        summary: {
          totalFiles: translationFiles.length,
          filesWithIssues: Object.values(results).filter(issues => issues.length > 0).length,
          totalIssues
        },
        results
      }, null, 2));
    } else {
      console.log(`\n📋 Summary: Found ${totalIssues} potential untranslated values across ${translationFiles.length} files`);
      
      if (totalIssues > 0) {
        console.log(`\n💡 Review these values to ensure they are properly translated for their respective languages.`);
        console.log(`\n🔧 Run with --json flag for machine-readable output.`);
      }
    }
    
  } catch (error) {
    if (jsonOutput) {
      console.error(JSON.stringify({ error: error.message }));
    } else {
      console.error('❌ Error during translation check:', error);
    }
  }
}

function isLikelyUntranslated(value) {
  // Skip proper nouns and technical terms
  if (PROPER_NOUNS_AND_TECHNICAL.has(value)) {
    return false;
  }
  
  // Check if value is likely untranslated English
  return COMMON_ENGLISH_WORDS.has(value) || 
         /^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/.test(value); // Title case English pattern
}

function containsCommonEnglishWords(value) {
  // Check if value contains common English words that should be translated
  const words = value.split(/\s+/);
  return words.some(word => {
    const cleanWord = word.replace(/[^\w]/g, ''); // Remove punctuation
    
    // Skip technical terms that are commonly kept in English
    if (TECHNICAL_TERMS.has(cleanWord.toLowerCase()) || PROPER_NOUNS_AND_TECHNICAL.has(cleanWord)) {
      return false;
    }
    
    return COMMON_ENGLISH_WORDS.has(cleanWord);
  });
}

// Run the check
checkForUntranslatedValues().catch(console.error);