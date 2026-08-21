const fs = require('fs');
const schema = require('./api/_lib/schema.js');
const day = JSON.parse(fs.readFileSync('data/2026-08-18.json', 'utf8'));

const before = day.stories.length;
day.stories = day.stories.filter(s => !(s.title.ko || '').includes('아든 워커'));
console.log('stories:', before, '->', day.stories.length);

const movesBefore = day.moves.length;
day.moves = day.moves.filter(m => !(m.text.ko || '').includes('아든 워커'));
console.log('moves:', movesBefore, '->', day.moves.length);

const errs = schema.validateDayData(day);
if (errs.length) { console.error('INVALID:', JSON.stringify(errs, null, 2)); process.exit(1); }
fs.writeFileSync('data/2026-08-18.json', JSON.stringify(day, null, 2) + '\n');

const newEntry = schema.buildIndexEntry(day);
const idx = JSON.parse(fs.readFileSync('data/index.json', 'utf8'));
const i = idx.findIndex(e => e.date === '2026-08-18');
idx[i] = newEntry;
idx.sort((a,b) => b.date.localeCompare(a.date));
fs.writeFileSync('data/index.json', JSON.stringify(idx, null, 2) + '\n');
console.log('index.json 08-18 entry rebuilt, storyCount:', newEntry.storyCount);
