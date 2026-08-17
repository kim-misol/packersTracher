// GitHub Contents API helpers.
// b64encode / buildContentsPutBody are pure and easy to unit test.
// getFile / putFile do real network I/O against api.github.com.

// UTF-8 safe base64 encode (Korean text, emoji, etc.)
function b64encode(str) {
  return Buffer.from(str, "utf-8").toString("base64");
}

// UTF-8 safe base64 decode.
function b64decode(b64) {
  return Buffer.from(b64, "base64").toString("utf-8");
}

// Builds the JSON body for a GitHub "create or update file contents" PUT
// request. `sha` is only required when overwriting an existing file;
// omit it (or pass undefined/null) when creating a brand new file.
function buildContentsPutBody({ content, message, sha }) {
  const body = {
    message: message,
    content: b64encode(content),
  };
  if (sha) body.sha = sha;
  return body;
}

const API_ROOT = "https://api.github.com";

// Fetches a file's current content + sha from the GitHub Contents API.
// Returns null if the file does not exist (404). Throws on any other
// non-2xx response.
async function getFile(owner, repo, path, token) {
  const url = API_ROOT + "/repos/" + owner + "/" + repo + "/contents/" + path;
  const res = await fetch(url, {
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "packersTracker-fetch-news",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error("GitHub getFile failed (" + res.status + "): " + text);
  }
  const json = await res.json();
  return {
    content: b64decode(json.content),
    sha: json.sha,
  };
}

// Creates or updates a file via the GitHub Contents API. Pass the sha
// returned by a prior getFile() call when overwriting; omit for a new file.
async function putFile(owner, repo, path, content, message, sha, token) {
  const url = API_ROOT + "/repos/" + owner + "/" + repo + "/contents/" + path;
  const body = buildContentsPutBody({
    content: content,
    message: message,
    sha: sha,
  });
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/vnd.github+json",
      "User-Agent": "packersTracker-fetch-news",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error("GitHub putFile failed (" + res.status + "): " + text);
  }
  return res.json();
}

module.exports = {
  b64encode: b64encode,
  b64decode: b64decode,
  buildContentsPutBody: buildContentsPutBody,
  getFile: getFile,
  putFile: putFile,
};
