const fs = require('fs');
const schema = require('./api/_lib/schema.js');
const files = ['data/2026-08-15.json', 'data/2026-08-17.json', 'data/2026-08-18.json'];
files.forEach(f => {
  let raw = fs.readFileSync(f, 'utf8');
  const before = raw;
  raw = raw.split('오전 11시').join('오전 10시 (정정: 기존 11시 안내 오류)');
  raw = raw.split('11am KST').join('10am KST (corrected from an earlier 11am note)');
  if (raw !== before) {
    fs.writeFileSync(f, raw);
    const day = JSON.parse(raw);
    const errs = schema.validateDayData(day);
    console.log(f, 'updated;', errs.length === 0 ? 'schema OK' : 'SCHEMA ERROR: ' + JSON.stringify(errs));
  } else {
    console.log(f, 'no match, unchanged');
  }
});
