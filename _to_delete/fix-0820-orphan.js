const fs = require('fs');
const schema = require('./api/_lib/schema.js');
const day = JSON.parse(fs.readFileSync('data/2026-08-20.json', 'utf8'));
const errs = schema.validateDayData(day);
if (errs.length) { console.error('INVALID 08-20:', JSON.stringify(errs, null, 2)); process.exit(1); }
const entry = schema.buildIndexEntry(day);
const idx = JSON.parse(fs.readFileSync('data/index.json', 'utf8'));
if (!idx.find(e => e.date === '2026-08-20')) idx.push(entry);
idx.sort((a,b) => b.date.localeCompare(a.date));
fs.writeFileSync('data/index.json', JSON.stringify(idx, null, 2) + '\n');
console.log('index.json now has:', idx.map(e=>e.date));
