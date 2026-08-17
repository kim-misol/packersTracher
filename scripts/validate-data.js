#!/usr/bin/env node
// PackersTracker data validator
// data/index.json (요약 목록) 과 data/<date>.json (상세 데이터) 의 정합성을 검사한다.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const INDEX_PATH = path.join(DATA_DIR, 'index.json');

const errors = [];
const warn = (msg) => errors.push(msg);

function readJson(filePath, label) {
    const raw = fs.readFileSync(filePath, 'utf8');
    try {
          return JSON.parse(raw);
    } catch (e) {
          warn('JSON 파싱 실패: ' + label + ' - ' + e.message);
          return null;
    }
}

if (!fs.existsSync(INDEX_PATH)) {
    console.error('data/index.json 파일이 없습니다.');
    process.exit(1);
}

const index = readJson(INDEX_PATH, 'data/index.json');
if (index === null) {
    console.error(errors.join('\n'));
    process.exit(1);
}

if (!Array.isArray(index)) {
    console.error('data/index.json 최상위는 배열이어야 합니다.');
    process.exit(1);
}

const REQUIRED_INDEX_FIELDS = ['date', 'dateLabel', 'headline', 'storyCount', 'moveCount', 'tags'];
const REQUIRED_DETAIL_FIELDS = ['date', 'dateLabel', 'headline', 'stories', 'injuries', 'moves', 'schedule'];

const referencedDates = new Set();

index.forEach(function (entry, i) {
    const label = 'data/index.json[' + i + ']';
    REQUIRED_INDEX_FIELDS.forEach(function (field) {
          if (!(field in entry)) warn(label + ': 필드 "' + field + '" 누락');
    });
    if (!entry.date) return;

                referencedDates.add(entry.date);

                const detailPath = path.join(DATA_DIR, entry.date + '.json');
    if (!fs.existsSync(detailPath)) {
          warn(label + ': 참조하는 상세 파일 data/' + entry.date + '.json 이 없습니다.');
          return;
    }

                const detail = readJson(detailPath, 'data/' + entry.date + '.json');
    if (detail === null) return;

                REQUIRED_DETAIL_FIELDS.forEach(function (field) {
                      if (!(field in detail)) warn('data/' + entry.date + '.json: 필드 "' + field + '" 누락');
                });

                if (detail.date && detail.date !== entry.date) {
                      warn('data/' + entry.date + '.json: date 값이 index.json과 다릅니다.');
                }

                if (Array.isArray(detail.stories) && typeof entry.storyCount === 'number' && detail.stories.length !== entry.storyCount) {
                      warn(label + ': storyCount(' + entry.storyCount + ')가 실제 stories 개수(' + detail.stories.length + ')와 다릅니다.');
                }

                if (Array.isArray(detail.moves) && typeof entry.moveCount === 'number' && detail.moves.length !== entry.moveCount) {
                      warn(label + ': moveCount(' + entry.moveCount + ')가 실제 moves 개수(' + detail.moves.length + ')와 다릅니다.');
                }
});

fs.readdirSync(DATA_DIR)
  .filter(function (f) { return f.endsWith('.json') && f !== 'index.json'; })
  .forEach(function (f) {
        const date = f.replace(/\.json$/, '');
        if (!referencedDates.has(date)) {
                warn('data/' + f + ': index.json에서 참조되지 않는 파일입니다 (고아 파일).');
        }
  });

if (errors.length > 0) {
    console.error(errors.join('\n'));
    console.error('총 ' + errors.length + '건의 문제를 찾았습니다.');
    process.exit(1);
}

console.log('data 무결성 검사 통과 (' + index.length + '개 브리핑)');
