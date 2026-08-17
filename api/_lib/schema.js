// Validation + derivation helpers for the site's bilingual data schema.
// All pure/no I/O — validated against the real committed data/2026-08-15.json
// as a regression fixture in tests/schema.test.js.

function isNonEmptyString(v) {
  return typeof v === "string" && v.trim().length > 0;
}

function isBilingual(v) {
  return (
    !!v &&
    typeof v === "object" &&
    isNonEmptyString(v.ko) &&
    isNonEmptyString(v.en)
  );
}

function isBilingualStringArray(v) {
  if (!v || typeof v !== "object") return false;
  if (!Array.isArray(v.ko) || !Array.isArray(v.en)) return false;
  if (v.ko.length === 0 || v.en.length === 0) return false;
  if (v.ko.length !== v.en.length) return false;
  return v.ko.every(isNonEmptyString) && v.en.every(isNonEmptyString);
}

// Validates one story card. Returns an array of error strings (empty = valid).
function validateStorySchema(story) {
  const errors = [];
  if (!story || typeof story !== "object") return ["story is not an object"];

  if (!isNonEmptyString(story.icon))
    errors.push("story.icon must be a non-empty string");
  if (!isNonEmptyString(story.status))
    errors.push("story.status must be a non-empty string");
  if (
    !Array.isArray(story.tags) ||
    story.tags.length === 0 ||
    !story.tags.every(isNonEmptyString)
  ) {
    errors.push("story.tags must be a non-empty array of non-empty strings");
  }
  if (!isBilingual(story.title))
    errors.push("story.title must be {ko, en} non-empty strings");
  if (!isBilingualStringArray(story.facts)) {
    errors.push(
      "story.facts must be {ko: [...], en: [...]} with matching, non-zero length",
    );
  }
  if (!isBilingual(story.interp))
    errors.push("story.interp must be {ko, en} non-empty strings");

  return errors;
}

function validateInjuryRow(row) {
  const errors = [];
  if (!row || typeof row !== "object") return ["injury row is not an object"];
  if (!isBilingual(row.player)) errors.push("injury.player must be {ko, en}");
  if (!isBilingual(row.issue)) errors.push("injury.issue must be {ko, en}");
  if (!isBilingual(row.status)) errors.push("injury.status must be {ko, en}");
  if ("watch" in row && typeof row.watch !== "boolean")
    errors.push("injury.watch must be boolean when present");
  return errors;
}

function validateMoveRow(row) {
  const errors = [];
  if (!row || typeof row !== "object") return ["move row is not an object"];
  if (!isNonEmptyString(row.date))
    errors.push("move.date must be a non-empty string");
  if (!isBilingual(row.text)) errors.push("move.text must be {ko, en}");
  return errors;
}

function validateScheduleRow(row) {
  const errors = [];
  if (!row || typeof row !== "object") return ["schedule row is not an object"];
  if (!isBilingual(row.date)) errors.push("schedule.date must be {ko, en}");
  if (!isBilingual(row.text)) errors.push("schedule.text must be {ko, en}");
  return errors;
}

// Validates a full day-file object (the shape of data/<date>.json).
// Returns an array of error strings (empty = valid).
function validateDayData(day) {
  const errors = [];
  if (!day || typeof day !== "object") return ["day data is not an object"];

  if (!isNonEmptyString(day.date) || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) {
    errors.push("day.date must be a YYYY-MM-DD string");
  }
  if (!isBilingual(day.dateLabel))
    errors.push("day.dateLabel must be {ko, en}");
  if (!isBilingual(day.headline)) errors.push("day.headline must be {ko, en}");

  if (!Array.isArray(day.stories) || day.stories.length === 0) {
    errors.push("day.stories must be a non-empty array");
  } else {
    day.stories.forEach(function (story, i) {
      validateStorySchema(story).forEach(function (e) {
        errors.push("stories[" + i + "]: " + e);
      });
    });
  }

  if (!Array.isArray(day.injuries)) {
    errors.push("day.injuries must be an array");
  } else {
    day.injuries.forEach(function (row, i) {
      validateInjuryRow(row).forEach(function (e) {
        errors.push("injuries[" + i + "]: " + e);
      });
    });
  }

  if (!Array.isArray(day.moves)) {
    errors.push("day.moves must be an array");
  } else {
    day.moves.forEach(function (row, i) {
      validateMoveRow(row).forEach(function (e) {
        errors.push("moves[" + i + "]: " + e);
      });
    });
  }

  if (!Array.isArray(day.schedule)) {
    errors.push("day.schedule must be an array");
  } else {
    day.schedule.forEach(function (row, i) {
      validateScheduleRow(row).forEach(function (e) {
        errors.push("schedule[" + i + "]: " + e);
      });
    });
  }

  return errors;
}

// Derives the index.json summary entry for a validated day object.
// Tags are the union of all story tags, deduplicated, in first-seen order
// (matches the ordering already present in the live data/index.json).
function buildIndexEntry(day) {
  const seen = new Set();
  const tags = [];
  (day.stories || []).forEach(function (story) {
    (story.tags || []).forEach(function (tag) {
      if (!seen.has(tag)) {
        seen.add(tag);
        tags.push(tag);
      }
    });
  });

  return {
    date: day.date,
    dateLabel: day.dateLabel,
    headline: day.headline,
    storyCount: (day.stories || []).length,
    moveCount: (day.moves || []).length,
    tags: tags,
  };
}

module.exports = {
  isNonEmptyString: isNonEmptyString,
  isBilingual: isBilingual,
  isBilingualStringArray: isBilingualStringArray,
  validateStorySchema: validateStorySchema,
  validateInjuryRow: validateInjuryRow,
  validateMoveRow: validateMoveRow,
  validateScheduleRow: validateScheduleRow,
  validateDayData: validateDayData,
  buildIndexEntry: buildIndexEntry,
};
