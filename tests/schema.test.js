const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  isBilingual,
  isBilingualStringArray,
  validateStorySchema,
  validateInjuryRow,
  validateMoveRow,
  validateScheduleRow,
  validateDayData,
  buildIndexEntry,
} = require("../api/_lib/schema.js");

// tests/fixtures/2026-08-15.json is a structural reconstruction of the real,
// live data/2026-08-15.json (same shape, wording not guaranteed byte-exact) —
// used here as a regression fixture so schema.js is checked against a
// realistic full day of data, not just synthetic minimal examples.
const FIXTURE_DAY = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/2026-08-15.json"), "utf-8"),
);
const FIXTURE_INDEX = JSON.parse(
  fs.readFileSync(path.join(__dirname, "fixtures/index.json"), "utf-8"),
);

test("isBilingual accepts a proper {ko, en} pair and rejects everything else", () => {
  assert.equal(isBilingual({ ko: "a", en: "b" }), true);
  assert.equal(isBilingual({ ko: "", en: "b" }), false);
  assert.equal(isBilingual({ ko: "a" }), false);
  assert.equal(isBilingual("a string"), false);
  assert.equal(isBilingual(null), false);
});

test("isBilingualStringArray requires matching non-empty ko/en arrays", () => {
  assert.equal(isBilingualStringArray({ ko: ["a"], en: ["b"] }), true);
  assert.equal(isBilingualStringArray({ ko: ["a", "b"], en: ["c"] }), false);
  assert.equal(isBilingualStringArray({ ko: [], en: [] }), false);
  assert.equal(isBilingualStringArray({ ko: ["a"], en: [""] }), false);
});

test("validateStorySchema accepts a well-formed story", () => {
  const errors = validateStorySchema(FIXTURE_DAY.stories[0]);
  assert.deepEqual(errors, []);
});

test("validateStorySchema reports every missing/invalid field", () => {
  const errors = validateStorySchema({
    icon: "",
    tags: [],
    title: {},
    facts: null,
    interp: null,
  });
  assert.ok(errors.length >= 5);
});

test("validateStorySchema catches mismatched facts array lengths", () => {
  const bad = JSON.parse(JSON.stringify(FIXTURE_DAY.stories[0]));
  bad.facts.en.pop();
  const errors = validateStorySchema(bad);
  assert.ok(errors.some((e) => e.includes("facts")));
});

test("validateStorySchema accepts a story with a source url (fetched via the news pipeline)", () => {
  const withUrl = {
    ...FIXTURE_DAY.stories[0],
    url: "https://www.packers.com/news/some-article",
  };
  assert.deepEqual(validateStorySchema(withUrl), []);
});

test("validateStorySchema accepts a story with no url (manual/legacy entries)", () => {
  assert.deepEqual(validateStorySchema(FIXTURE_DAY.stories[0]), []);
});

test("validateStorySchema rejects an empty-string url when the field is present", () => {
  const bad = { ...FIXTURE_DAY.stories[0], url: "" };
  const errors = validateStorySchema(bad);
  assert.ok(errors.some((e) => e.includes("url")));
});

test("validateStorySchema rejects a non-string url", () => {
  const bad = { ...FIXTURE_DAY.stories[0], url: 12345 };
  const errors = validateStorySchema(bad);
  assert.ok(errors.some((e) => e.includes("url")));
});

test("validateInjuryRow accepts a normal row and a watch-flagged row", () => {
  assert.deepEqual(validateInjuryRow(FIXTURE_DAY.injuries[0]), []);
  const watchRow = FIXTURE_DAY.injuries.find((r) => r.watch);
  assert.ok(watchRow);
  assert.deepEqual(validateInjuryRow(watchRow), []);
});

test("validateInjuryRow rejects a non-boolean watch flag", () => {
  const errors = validateInjuryRow({
    ...FIXTURE_DAY.injuries[0],
    watch: "yes",
  });
  assert.ok(errors.some((e) => e.includes("watch")));
});

test("validateMoveRow and validateScheduleRow accept fixture rows", () => {
  assert.deepEqual(validateMoveRow(FIXTURE_DAY.moves[0]), []);
  assert.deepEqual(validateScheduleRow(FIXTURE_DAY.schedule[0]), []);
});

test("validateScheduleRow preserves embedded newlines in bilingual date field", () => {
  const multiline = FIXTURE_DAY.schedule.find((s) => s.date.en.includes("\n"));
  assert.ok(multiline);
  assert.deepEqual(validateScheduleRow(multiline), []);
});

test("validateDayData accepts the full real-shaped fixture day with zero errors", () => {
  const errors = validateDayData(FIXTURE_DAY);
  assert.deepEqual(errors, []);
});

test("validateDayData rejects a day with a malformed date", () => {
  const bad = { ...FIXTURE_DAY, date: "08-15-2026" };
  const errors = validateDayData(bad);
  assert.ok(errors.some((e) => e.includes("date")));
});

test("validateDayData rejects a day with an empty stories array", () => {
  const bad = { ...FIXTURE_DAY, stories: [] };
  const errors = validateDayData(bad);
  assert.ok(errors.some((e) => e.includes("stories")));
});

test("validateDayData still passes when injuries/moves are empty (no news that day)", () => {
  const bad = { ...FIXTURE_DAY, injuries: [], moves: [] };
  assert.deepEqual(validateDayData(bad), []);
});

test("buildIndexEntry derives storyCount/moveCount/tags matching the real committed index.json", () => {
  const entry = buildIndexEntry(FIXTURE_DAY);
  assert.deepEqual(entry, FIXTURE_INDEX[0]);
});

test("buildIndexEntry dedupes tags across stories, preserving first-seen order", () => {
  const day = {
    date: "2099-01-01",
    dateLabel: { ko: "x", en: "y" },
    headline: { ko: "x", en: "y" },
    stories: [{ tags: ["A", "B"] }, { tags: ["B", "C"] }, { tags: ["A"] }],
    moves: [],
  };
  const entry = buildIndexEntry(day);
  assert.deepEqual(entry.tags, ["A", "B", "C"]);
  assert.equal(entry.storyCount, 3);
  assert.equal(entry.moveCount, 0);
});
