// Prompt builders + response parsing for the Claude API calls used by the
// news-fetch pipeline. Prompt/parse functions are pure and unit-testable;
// callClaude is the only piece that does real network I/O.

// Builds the prompt asking Claude to extract a flat article list (title,
// url, publish date as printed on the page) from a lightly-stripped dump
// of packers.com/news/all-news HTML/text.
function buildExtractListPrompt(rawText) {
  return [
    "You are extracting a news article index from a Green Bay Packers news",
    "listing page (packers.com/news/all-news). Below is the page content",
    "(HTML has been lightly stripped).",
    "",
    "Return ONLY a JSON array (no prose, no markdown fences) where each",
    "item has this exact shape:",
    '{"title": string, "url": string, "publishedRaw": string}',
    "",
    '"publishedRaw" must be copied verbatim as it appears on the page',
    '(e.g. "August 15, 2026"). Skip any item where you cannot find a title,',
    "url, and date. Do not invent articles that are not present in the text.",
    "",
    "--- PAGE CONTENT START ---",
    rawText,
    "--- PAGE CONTENT END ---",
  ].join("\n");
}

// Builds the prompt asking Claude to organize one day's raw article text
// into the site's bilingual story-card schema (see data/2026-08-15.json
// for the exact target shape), including the English-first-then-Korean
// translation pass.
function buildOrganizePrompt(dateISO, articlesText) {
  return [
    "You are the editor for a Green Bay Packers daily briefing site. Below",
    "is the raw text of one or more articles published on " + dateISO + ".",
    'Each article starts with its own "URL: <link>" marker line.',
    "",
    "Organize this into JSON matching EXACTLY this shape (no prose, no",
    "markdown fences, return only the JSON object):",
    "",
    "{",
    '  "headline": {"ko": string, "en": string},',
    '  "stories": [',
    "    {",
    '      "icon": string (one emoji that fits the story topic),',
    '      "status": "NEW" | "UPDATE" | "CONFIRMED" | "RUMOR" | "UPCOMING",',
    '      "tags": [string, ...] (short uppercase codes like "QB", "OL", "DEFENSE"),',
    '      "title": {"ko": string, "en": string},',
    '      "facts": {"ko": [string, ...], "en": [string, ...]} (same number of bullets in both languages, 2-4 bullets, concrete facts only),',
    '      "interp": {"ko": string, "en": string} (1-2 sentence "why this matters" analysis, written like a beat reporter),',
    '      "url": string (the source article this story is based on — copied EXACTLY, verbatim, from that article\'s "URL:" marker line above; if the story draws on multiple articles, use the URL of the one it is primarily based on)',
    "    }",
    "  ],",
    '  "injuries": [{"player": {"ko": string, "en": string}, "issue": {"ko": string, "en": string}, "status": {"ko": string, "en": string}, "watch": boolean (optional, true only for a notable new concern)}],',
    '  "moves": [{"date": "MM-DD", "text": {"ko": string, "en": string}}],',
    '  "schedule": [{"date": {"ko": string, "en": string}, "text": {"ko": string, "en": string}}]',
    "}",
    "",
    "Rules:",
    "- Write the English text first from the source material, then translate",
    "  it into natural, idiomatic Korean (not a literal word-for-word translation).",
    '- "headline" is a 1-3 sentence roundup of the day across all stories.',
    '- Only include "injuries", "moves", or "schedule" entries that are',
    "  actually supported by the article text; use empty arrays if none.",
    "- Every ko/en pair must be non-empty and convey the same meaning.",
    "",
    "--- ARTICLE TEXT START ---",
    articlesText,
    "--- ARTICLE TEXT END ---",
  ].join("\n");
}

// Strips a leading/trailing ```json ... ``` or ``` ... ``` fence if present,
// then JSON.parses the result. Throws a descriptive error on failure rather
// than returning null, so callers don't silently proceed with bad data.
function parseClaudeJson(text) {
  if (typeof text !== "string") {
    throw new Error("parseClaudeJson: expected a string, got " + typeof text);
  }
  let trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenced) trimmed = fenced[1].trim();
  try {
    return JSON.parse(trimmed);
  } catch (err) {
    throw new Error(
      "parseClaudeJson: failed to parse JSON (" +
        err.message +
        "): " +
        trimmed.slice(0, 200),
    );
  }
}

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-sonnet-4-5-20250929";

// Calls the Claude Messages API and returns the concatenated text of the
// response. Throws on any non-2xx response.
async function callClaude({ apiKey, system, messages, maxTokens }) {
  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens || 4096,
      system: system,
      messages: messages,
    }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Claude API call failed (" + res.status + "): " + errText);
  }
  const json = await res.json();
  return (json.content || [])
    .filter(function (block) {
      return block.type === "text";
    })
    .map(function (block) {
      return block.text;
    })
    .join("");
}

module.exports = {
  buildExtractListPrompt: buildExtractListPrompt,
  buildOrganizePrompt: buildOrganizePrompt,
  parseClaudeJson: parseClaudeJson,
  callClaude: callClaude,
};
