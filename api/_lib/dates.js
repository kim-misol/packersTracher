// Pure date helpers for the news-fetch pipeline.
// No I/O here on purpose — kept easy to unit test.

const MONTHS = {
  january: "01",
  february: "02",
  march: "03",
  april: "04",
  may: "05",
  june: "06",
  july: "07",
  august: "08",
  september: "09",
  october: "10",
  november: "11",
  december: "12",
};

// "August 15, 2026" -> "2026-08-15". Returns null if it can't parse.
function parseUSDate(str) {
  if (!str) return null;
  const m = String(str)
    .trim()
    .match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const day = m[2].padStart(2, "0");
  return m[3] + "-" + month + "-" + day;
}

// true when `dateISO` is strictly after `baselineISO`. Both "YYYY-MM-DD".
function isNewerThan(dateISO, baselineISO) {
  if (!baselineISO) return true;
  return dateISO > baselineISO;
}

// Groups a flat list of items (each with a `.date` ISO field) by that date.
// Returns an object keyed by date, preserving first-seen order per group.
function groupByDate(items) {
  const groups = {};
  items.forEach(function (item) {
    if (!groups[item.date]) groups[item.date] = [];
    groups[item.date].push(item);
  });
  return groups;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_ABBR = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

// "2026-08-17" -> { ko: "2026-08-17 (현지)", en: "Aug 17, 2026 (local)" }
// matches the label style already used in data/2026-08-15.json.
function formatDateLabel(dateISO) {
  const parts = dateISO.split("-").map(Number);
  const y = parts[0],
    mo = parts[1],
    d = parts[2];
  const en = MONTH_ABBR[mo - 1] + " " + d + ", " + y + " (local)";
  const ko = dateISO + " (현지)";
  return { ko: ko, en: en };
}

module.exports = {
  parseUSDate: parseUSDate,
  isNewerThan: isNewerThan,
  groupByDate: groupByDate,
  formatDateLabel: formatDateLabel,
  WEEKDAYS: WEEKDAYS,
};
