const test = require("node:test");
const assert = require("node:assert/strict");
const {
  buildExtractListPrompt,
  buildOrganizePrompt,
  parseClaudeJson,
  callClaude,
} = require("../api/_lib/claude.js");

test("buildExtractListPrompt embeds the raw page text and asks for a JSON array", () => {
  const prompt = buildExtractListPrompt("RAW_PAGE_MARKER");
  assert.match(prompt, /RAW_PAGE_MARKER/);
  assert.match(prompt, /JSON array/);
  assert.match(prompt, /"publishedRaw"/);
});

test("buildOrganizePrompt embeds the date and article text and requires the full schema", () => {
  const prompt = buildOrganizePrompt("2026-08-17", "ARTICLE_TEXT_MARKER");
  assert.match(prompt, /2026-08-17/);
  assert.match(prompt, /ARTICLE_TEXT_MARKER/);
  assert.match(prompt, /"stories"/);
  assert.match(prompt, /"injuries"/);
  assert.match(prompt, /"moves"/);
  assert.match(prompt, /"schedule"/);
  assert.match(prompt, /English.*first/i);
});

test("buildOrganizePrompt asks each story to carry the source article's url", () => {
  const prompt = buildOrganizePrompt("2026-08-17", "ARTICLE_TEXT_MARKER");
  assert.match(prompt, /"url"/);
  assert.match(prompt, /URL:/);
});

test("parseClaudeJson parses plain JSON", () => {
  assert.deepEqual(parseClaudeJson('{"a":1}'), { a: 1 });
});

test("parseClaudeJson strips ```json fences", () => {
  assert.deepEqual(parseClaudeJson('```json\n{"a":1}\n```'), { a: 1 });
});

test("parseClaudeJson strips bare ``` fences", () => {
  assert.deepEqual(parseClaudeJson("```\n[1,2,3]\n```"), [1, 2, 3]);
});

test("parseClaudeJson tolerates surrounding whitespace", () => {
  assert.deepEqual(parseClaudeJson('  \n {"a":1} \n '), { a: 1 });
});

test("parseClaudeJson throws a descriptive error on invalid JSON", () => {
  assert.throws(() => parseClaudeJson("not json at all"), /parseClaudeJson/);
});

test("parseClaudeJson throws on non-string input", () => {
  assert.throws(() => parseClaudeJson(undefined), /expected a string/);
});

test("callClaude posts to the Messages API and returns concatenated text blocks", async () => {
  const originalFetch = global.fetch;
  let capturedOpts = null;
  global.fetch = async (url, opts) => {
    assert.equal(url, "https://api.anthropic.com/v1/messages");
    capturedOpts = opts;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [
          { type: "text", text: "hello " },
          { type: "text", text: "world" },
        ],
      }),
    };
  };
  try {
    const result = await callClaude({
      apiKey: "sk-test",
      system: "sys prompt",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 1000,
    });
    assert.equal(result, "hello world");
    assert.equal(capturedOpts.headers["x-api-key"], "sk-test");
    const body = JSON.parse(capturedOpts.body);
    assert.equal(body.system, "sys prompt");
    assert.equal(body.max_tokens, 1000);
  } finally {
    global.fetch = originalFetch;
  }
});

test("callClaude throws on a non-2xx response", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 401,
    text: async () => "bad key",
  });
  try {
    await assert.rejects(
      () => callClaude({ apiKey: "bad", system: "s", messages: [] }),
      /401/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("callClaude ignores non-text content blocks", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      content: [
        { type: "tool_use", text: "should be ignored" },
        { type: "text", text: "kept" },
      ],
    }),
  });
  try {
    const result = await callClaude({ apiKey: "k", system: "s", messages: [] });
    assert.equal(result, "kept");
  } finally {
    global.fetch = originalFetch;
  }
});
