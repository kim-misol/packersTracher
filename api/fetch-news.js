// POST /api/fetch-news
//
// Orchestrates the whole "뉴스 가져오기" pipeline:
//   1. Read data/index.json from GitHub to find the most recent saved date.
//   2. Fetch packers.com/news/all-news (raw HTML — Vercel's runtime has
//      normal internet access, unlike some sandboxed dev environments).
//   3. Ask Claude to extract a flat {title, url, publishedRaw} article list.
//   4. Keep only articles newer than the saved baseline date, group same-day
//      articles together.
//   5. For each new date: fetch each article page, ask Claude to organize +
//      translate the day's stories into the site's bilingual schema.
//   6. Validate the result, derive the index.json summary entry, and commit
//      both the new data/<date>.json and the updated index.json back to
//      GitHub via the Contents API.
//
// Required environment variables (set in the Vercel project dashboard —
// never hardcoded, never logged):
//   ANTHROPIC_API_KEY   - used only server-side to call the Claude API
//   GITHUB_TOKEN        - a GitHub PAT with contents:write on the repo
//   GITHUB_OWNER        - defaults to "kim-misol"
//   GITHUB_REPO         - defaults to "packersTracher"
//   ALLOWED_ORIGIN      - defaults to "https://kim-misol.github.io"

const { isNewerThan, groupByDate, parseUSDate } = require("./_lib/dates.js");
const { getFile, putFile } = require("./_lib/github.js");
const {
  buildExtractListPrompt,
  buildOrganizePrompt,
  parseClaudeJson,
  callClaude,
} = require("./_lib/claude.js");
const { validateDayData, buildIndexEntry } = require("./_lib/schema.js");

const NEWS_LIST_URL = "https://www.packers.com/news/all-news";

function setCors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

// Strips scripts/styles and collapses whitespace so we don't blow the
// Claude context window with a full page of inline JS/CSS. Deliberately
// simple/regex-based since the output only needs to be readable text for
// an LLM to extract a title/url/date list from, not a DOM.
function stripHtmlForExtraction(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; packersTracker-bot/1.0)",
    },
  });
  if (!res.ok)
    throw new Error("Failed to fetch " + url + " (" + res.status + ")");
  return res.text();
}

module.exports = async function handler(req, res) {
  const allowedOrigin =
    process.env.ALLOWED_ORIGIN || "https://kim-misol.github.io";
  setCors(res, allowedOrigin);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const githubToken = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER || "kim-misol";
  const repo = process.env.GITHUB_REPO || "packersTracher";

  if (!apiKey || !githubToken) {
    res
      .status(500)
      .json({ error: "Server is missing ANTHROPIC_API_KEY or GITHUB_TOKEN" });
    return;
  }

  const added = [];
  const errors = [];

  try {
    const indexFile = await getFile(
      owner,
      repo,
      "data/index.json",
      githubToken,
    );
    const index = indexFile ? JSON.parse(indexFile.content) : [];
    const baselineDate = index.length
      ? index
          .map((e) => e.date)
          .sort()
          .slice(-1)[0]
      : null;

    const listHtml = await fetchText(NEWS_LIST_URL);
    const extractResponse = await callClaude({
      apiKey: apiKey,
      system:
        "You extract structured data from HTML. Respond with raw JSON only.",
      messages: [
        {
          role: "user",
          content: buildExtractListPrompt(
            stripHtmlForExtraction(listHtml).slice(0, 60000),
          ),
        },
      ],
      maxTokens: 4096,
    });
    const rawArticles = parseClaudeJson(extractResponse);

    const dated = rawArticles
      .map((a) => ({ ...a, date: parseUSDate(a.publishedRaw) }))
      .filter((a) => a.date && isNewerThan(a.date, baselineDate));

    const groups = groupByDate(dated);
    const newDates = Object.keys(groups).sort();

    for (const dateISO of newDates) {
      try {
        const articles = groups[dateISO];
        const bodies = await Promise.all(
          articles.map(async (a) => {
            const header = "URL: " + a.url + "\n" + a.title + "\n\n";
            try {
              const html = await fetchText(a.url);
              return header + stripHtmlForExtraction(html).slice(0, 15000);
            } catch (err) {
              return (
                header +
                "[Could not fetch full article body: " +
                err.message +
                "]"
              );
            }
          }),
        );
        const articlesText = bodies.join("\n\n---\n\n");

        const organizeResponse = await callClaude({
          apiKey: apiKey,
          system:
            "You are a sports news editor. Respond with raw JSON only, matching the schema exactly.",
          messages: [
            {
              role: "user",
              content: buildOrganizePrompt(dateISO, articlesText),
            },
          ],
          maxTokens: 8192,
        });
        const organized = parseClaudeJson(organizeResponse);

        const dateLabel = {
          ko: dateISO + " (현지)",
          en: dateISO,
        };
        const day = {
          date: dateISO,
          dateLabel: dateLabel,
          headline: organized.headline,
          stories: organized.stories || [],
          injuries: organized.injuries || [],
          moves: organized.moves || [],
          schedule: organized.schedule || [],
        };

        const dayErrors = validateDayData(day);
        if (dayErrors.length) {
          errors.push({ date: dateISO, errors: dayErrors });
          continue;
        }

        const dayPath = "data/" + dateISO + ".json";
        const existingDay = await getFile(owner, repo, dayPath, githubToken);
        await putFile(
          owner,
          repo,
          dayPath,
          JSON.stringify(day, null, 2) + "\n",
          "뉴스 가져오기: " + dateISO + " 브리핑 추가",
          existingDay ? existingDay.sha : undefined,
          githubToken,
        );

        const entry = buildIndexEntry(day);
        const nextIndex = index
          .filter((e) => e.date !== dateISO)
          .concat([entry])
          .sort((a, b) => a.date.localeCompare(b.date));
        const latestIndexFile = await getFile(
          owner,
          repo,
          "data/index.json",
          githubToken,
        );
        await putFile(
          owner,
          repo,
          "data/index.json",
          JSON.stringify(nextIndex, null, 2) + "\n",
          "뉴스 가져오기: index.json에 " + dateISO + " 반영",
          latestIndexFile ? latestIndexFile.sha : undefined,
          githubToken,
        );
        index.length = 0;
        index.push(...nextIndex);

        added.push(dateISO);
      } catch (err) {
        errors.push({ date: dateISO, errors: [err.message] });
      }
    }

    res
      .status(200)
      .json({ added: added, errors: errors, checkedArticles: dated.length });
  } catch (err) {
    res.status(500).json({ error: err.message, added: added, errors: errors });
  }
};
