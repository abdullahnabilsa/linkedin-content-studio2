/**
 * Merge persona i18n keys into main ar.json / en.json files.
 *
 * Run: node scripts/merge-persona-i18n.js
 *
 * This script reads the personas-ar.json and personas-en.json files
 * and merges them into the main i18n/ar.json and i18n/en.json files.
 */
const fs = require('fs');
const path = require('path');

function mergeDeep(target, source) {
  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const i18nDir = path.join(__dirname, '..', 'i18n');

// Merge Arabic
const arMain = JSON.parse(fs.readFileSync(path.join(i18nDir, 'ar.json'), 'utf-8'));
const arPersonas = JSON.parse(fs.readFileSync(path.join(i18nDir, 'personas-ar.json'), 'utf-8'));
const arMerged = mergeDeep(arMain, arPersonas);
fs.writeFileSync(path.join(i18nDir, 'ar.json'), JSON.stringify(arMerged, null, 2), 'utf-8');
console.log('✅ Merged personas keys into ar.json');

// Merge English
const enMain = JSON.parse(fs.readFileSync(path.join(i18nDir, 'en.json'), 'utf-8'));
const enPersonas = JSON.parse(fs.readFileSync(path.join(i18nDir, 'personas-en.json'), 'utf-8'));
const enMerged = mergeDeep(enMain, enPersonas);
fs.writeFileSync(path.join(i18nDir, 'en.json'), JSON.stringify(enMerged, null, 2), 'utf-8');
console.log('✅ Merged personas keys into en.json');

console.log('\n🎉 Persona i18n merge complete!');