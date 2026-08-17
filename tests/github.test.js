const test = require("node:test");
const assert = require("node:assert/strict");
const {
  b64encode,
  b64decode,
  buildContentsPutBody,
  getFile,
  putFile,
} = require("../api/_lib/github.js");

test("b64encode/b64decode round-trip plain ASCII", () => {
  const encoded = b64encode("hello world");
  assert.equal(encoded, Buffer.from("hello world").toString("base64"));
  assert.equal(b64decode(encoded), "hello world");
});

test("b64encode/b64decode round-trip Korean text correctly (UTF-8 safe)", () => {
  const original = "패커스 브리핑 트래커 \u{1F3C8}";
  const encoded = b64encode(original);
  assert.equal(b64decode(encoded), original);
});

test("buildContentsPutBody omits sha when not provided", () => {
  const body = buildContentsPutBody({ content: "hi", message: "msg" });
  assert.equal(body.message, "msg");
  assert.equal(body.content, b64encode("hi"));
  assert.equal("sha" in body, false);
});

test("buildContentsPutBody includes sha when provided", () => {
  const body = buildContentsPutBody({
    content: "hi",
    message: "msg",
    sha: "abc123",
  });
  assert.equal(body.sha, "abc123");
});

test("buildContentsPutBody omits sha when explicitly null/undefined", () => {
  assert.equal(
    "sha" in buildContentsPutBody({ content: "hi", message: "m", sha: null }),
    false,
  );
  assert.equal(
    "sha" in
      buildContentsPutBody({ content: "hi", message: "m", sha: undefined }),
    false,
  );
});

test("getFile returns decoded content + sha on success", async () => {
  const originalFetch = global.fetch;
  global.fetch = async (url, opts) => {
    assert.equal(
      url,
      "https://api.github.com/repos/o/r/contents/data/index.json",
    );
    assert.equal(opts.headers.Authorization, "Bearer tok123");
    return {
      ok: true,
      status: 200,
      json: async () => ({ content: b64encode('{"a":1}'), sha: "shaval" }),
    };
  };
  try {
    const result = await getFile("o", "r", "data/index.json", "tok123");
    assert.deepEqual(result, { content: '{"a":1}', sha: "shaval" });
  } finally {
    global.fetch = originalFetch;
  }
});

test("getFile returns null on 404", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: false, status: 404 });
  try {
    const result = await getFile("o", "r", "data/missing.json", "tok123");
    assert.equal(result, null);
  } finally {
    global.fetch = originalFetch;
  }
});

test("getFile throws on a non-404 error response", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => "server error",
  });
  try {
    await assert.rejects(
      () => getFile("o", "r", "data/x.json", "tok123"),
      /500/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("putFile sends a PUT with the base64-encoded body and returns the JSON response", async () => {
  const originalFetch = global.fetch;
  let capturedBody = null;
  global.fetch = async (url, opts) => {
    assert.equal(url, "https://api.github.com/repos/o/r/contents/data/x.json");
    assert.equal(opts.method, "PUT");
    capturedBody = JSON.parse(opts.body);
    return {
      ok: true,
      status: 200,
      json: async () => ({ commit: { sha: "newsha" } }),
    };
  };
  try {
    const result = await putFile(
      "o",
      "r",
      "data/x.json",
      '{"a":1}',
      "commit msg",
      "oldsha",
      "tok123",
    );
    assert.equal(capturedBody.message, "commit msg");
    assert.equal(capturedBody.sha, "oldsha");
    assert.equal(capturedBody.content, b64encode('{"a":1}'));
    assert.deepEqual(result, { commit: { sha: "newsha" } });
  } finally {
    global.fetch = originalFetch;
  }
});

test("putFile throws on a non-2xx response", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: false,
    status: 422,
    text: async () => "sha mismatch",
  });
  try {
    await assert.rejects(
      () => putFile("o", "r", "data/x.json", "x", "m", "sha", "tok"),
      /422/,
    );
  } finally {
    global.fetch = originalFetch;
  }
});
