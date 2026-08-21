const fs = require('fs');
const schema = require('./api/_lib/schema.js');
const day = JSON.parse(fs.readFileSync('data/2026-08-19.json', 'utf8'));
const errs = schema.validateDayData(day);
if (errs.length) { console.error('INVALID:', JSON.stringify(errs, null, 2)); process.exit(1); }
const newEntry = schema.buildIndexEntry(day);
const idx = JSON.parse(fs.readFileSync('data/index.json', 'utf8'));
const i = idx.findIndex(e => e.date === '2026-08-19');
idx[i] = newEntry;
idx.sort((a,b) => b.date.localeCompare(a.date));
fs.writeFileSync('data/index.json', JSON.stringify(idx, null, 2) + '\n');
console.log('08-19 index entry rebuilt, storyCount:', newEntry.storyCount, 'moveCount:', newEntry.moveCount);
