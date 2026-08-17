const test = require("node:test");
const assert = require("node:assert/strict");
const {
  parseUSDate,
  isNewerThan,
  groupByDate,
  formatDateLabel,
  WEEKDAYS,
} = require("../api/_lib/dates.js");

test("parseUSDate parses a standard packers.com date", () => {
  assert.equal(parseUSDate("August 15, 2026"), "2026-08-15");
});

test("parseUSDate pads single-digit days", () => {
  assert.equal(parseUSDate("January 5, 2026"), "2026-01-05");
});

test("parseUSDate handles all twelve months", () => {
  assert.equal(parseUSDate("March 1, 2026"), "2026-03-01");
  assert.equal(parseUSDate("December 31, 2026"), "2026-12-31");
});

test("parseUSDate returns null for empty/undefined input", () => {
  assert.equal(parseUSDate(""), null);
  assert.equal(parseUSDate(undefined), null);
  assert.equal(parseUSDate(null), null);
});

test("parseUSDate returns null for garbage input", () => {
  assert.equal(parseUSDate("not a date"), null);
  assert.equal(parseUSDate("2026-08-15"), null);
});

test("parseUSDate returns null for unrecognized month names", () => {
  assert.equal(parseUSDate("Augtober 15, 2026"), null);
});

test("parseUSDate trims surrounding whitespace", () => {
  assert.equal(parseUSDate("  August 15, 2026  "), "2026-08-15");
});

test("isNewerThan is true when baseline is missing", () => {
  assert.equal(isNewerThan("2026-08-15", null), true);
  assert.equal(isNewerThan("2026-08-15", undefined), true);
  assert.equal(isNewerThan("2026-08-15", ""), true);
});

test("isNewerThan compares ISO date strings correctly", () => {
  assert.equal(isNewerThan("2026-08-16", "2026-08-15"), true);
  assert.equal(isNewerThan("2026-08-15", "2026-08-15"), false);
  assert.equal(isNewerThan("2026-08-14", "2026-08-15"), false);
});

test("isNewerThan handles month/year rollover", () => {
  assert.equal(isNewerThan("2026-09-01", "2026-08-31"), true);
  assert.equal(isNewerThan("2027-01-01", "2026-12-31"), true);
});

test("groupByDate groups items preserving first-seen order per group", () => {
  const items = [
    { date: "2026-08-16", title: "a" },
    { date: "2026-08-15", title: "b" },
    { date: "2026-08-16", title: "c" },
    { date: "2026-08-17", title: "d" },
  ];
  const groups = groupByDate(items);
  assert.deepEqual(Object.keys(groups), [
    "2026-08-16",
    "2026-08-15",
    "2026-08-17",
  ]);
  assert.equal(groups["2026-08-16"].length, 2);
  assert.equal(groups["2026-08-16"][0].title, "a");
  assert.equal(groups["2026-08-16"][1].title, "c");
  assert.equal(groups["2026-08-15"][0].title, "b");
});

test("groupByDate returns an empty object for an empty list", () => {
  assert.deepEqual(groupByDate([]), {});
});

test("formatDateLabel produces matching ko/en pair", () => {
  const label = formatDateLabel("2026-08-17");
  assert.equal(label.ko, "2026-08-17 (현지)");
  assert.equal(label.en, "Aug 17, 2026 (local)");
});

test("formatDateLabel handles single-digit day/month correctly", () => {
  const label = formatDateLabel("2026-01-05");
  assert.equal(label.ko, "2026-01-05 (현지)");
  assert.equal(label.en, "Jan 5, 2026 (local)");
});

test("WEEKDAYS exports the expected 7-day array", () => {
  assert.equal(WEEKDAYS.length, 7);
  assert.equal(WEEKDAYS[0], "Sun");
  assert.equal(WEEKDAYS[6], "Sat");
});
