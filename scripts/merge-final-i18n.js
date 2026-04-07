/**
 * Merge landing + error i18n keys into main ar.json / en.json.
 *
 * Run:  node scripts/merge-final-i18n.js
 */
const fs = require('fs');
const path = require('path');

function mergeDeep(target, source) {
  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

const i18nDir = path.join(__dirname, '..', 'i18n');
const pairs = [
  ['ar.json', ['landing-ar.json', 'errors-ar.json']],
  ['en.json', ['landing-en.json', 'errors-en.json']],
];

for (const [mainFile, partials] of pairs) {
  const mainPath = path.join(i18nDir, mainFile);
  let main = {};
  try { main = JSON.parse(fs.readFileSync(mainPath, 'utf-8')); } catch { /* new file */ }
  for (const p of partials) {
    try {
      const partial = JSON.parse(fs.readFileSync(path.join(i18nDir, p), 'utf-8'));
      mergeDeep(main, partial);
      console.log('  ✅ Merged ' + p + ' -> ' + mainFile);
    } catch { /* skip missing */ }
  }
  fs.writeFileSync(mainPath, JSON.stringify(main, null, 2), 'utf-8');
}

console.log('\n🎉 Final i18n merge complete!');