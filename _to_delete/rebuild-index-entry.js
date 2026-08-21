const fs = require('fs');
const schema = require('./api/_lib/schema.js');

const day = JSON.parse(fs.readFileSync('data/2026-08-17.json', 'utf8'));
const errs = schema.validateDayData(day);
if (errs.length) {
  console.error('INVALID day file:', JSON.stringify(errs, null, 2));
  process.exit(1);
}

const newEntry = schema.buildIndexEntry(day);
const idx = JSON.parse(fs.readFileSync('data/index.json', 'utf8'));
const i = idx.findIndex(e => e.date === '2026-08-17');
if (i === -1) { console.error('2026-08-17 not found in index.json'); process.exit(1); }
idx[i] = newEntry;
idx.sort((a, b) => b.date.localeCompare(a.date));
fs.writeFileSync('data/index.json', JSON.stringify(idx, null, 2) + '\n');
console.log('OK. New index entry for 2026-08-17:');
console.log(JSON.stringify(newEntry, null, 2));
