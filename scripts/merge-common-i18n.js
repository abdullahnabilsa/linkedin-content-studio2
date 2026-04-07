/**
 * Merge common + nav i18n keys into the main ar.json / en.json.
 *
 * Run:  node scripts/merge-common-i18n.js
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

// Arabic
const arMain = JSON.parse(
  fs.readFileSync(path.join(i18nDir, 'ar.json'), 'utf-8'),
);
const arCommon = JSON.parse(
  fs.readFileSync(path.join(i18nDir, 'common-ar.json'), 'utf-8'),
);
fs.writeFileSync(
  path.join(i18nDir, 'ar.json'),
  JSON.stringify(mergeDeep(arMain, arCommon), null, 2),
  'utf-8',
);
console.log('✅ Merged common keys into ar.json');

// English
const enMain = JSON.parse(
  fs.readFileSync(path.join(i18nDir, 'en.json'), 'utf-8'),
);
const enCommon = JSON.parse(
  fs.readFileSync(path.join(i18nDir, 'common-en.json'), 'utf-8'),
);
fs.writeFileSync(
  path.join(i18nDir, 'en.json'),
  JSON.stringify(mergeDeep(enMain, enCommon), null, 2),
  'utf-8',
);
console.log('✅ Merged common keys into en.json');

console.log('\n🎉 Common i18n merge complete!');