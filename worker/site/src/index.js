/**
 * hellouchit.com's one backend Worker — two features, one deployment:
 *
 *   /v1/submit, /v1/stats  — opt-in diagnostic benchmark (D1 tallies)
 *   /v2/chat               — "Ask this site" RAG chat (Workers AI + KV)
 *
 * These were two separately-deployed Workers (hellouchit-benchmark,
 * hellouchit-chat) until consolidated here — same site, same origin, same
 * CORS policy, no reason for one person to operate and monitor two services
 * where one routes fine. The path prefixes (/v1/*, /v2/*) are historical
 * (each was versioned independently before the merge) and kept as-is rather
 * than renumbered, since renumbering would be pure churn with no benefit.
 */

const ALLOWED_ORIGIN = "https://hellouchit.com";

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...cors, ...extra },
  });

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(request.url);

    if (url.pathname === "/v1/submit" && request.method === "POST") return submit(request, env);
    if (url.pathname === "/v1/stats" && request.method === "GET") return stats(url, env);
    if (url.pathname === "/v2/chat" && request.method === "POST") return chat(request, env, ctx);

    return json({ error: "not_found" }, 404);
  },
};

/* =====================================================================
 * /v1/* — diagnostic benchmark
 *
 * The privacy design is the point, and it is structural rather than
 * promised:
 *
 *   - Nothing is stored per submission. There is no submissions table and
 *     no row that represents a person. Every write is an UPSERT against a
 *     counter, so what exists on disk is tallies and nothing else. There is
 *     no record to leak, subpoena, or re-identify.
 *   - No IP address, user agent, referrer, cookie or identifier is read or
 *     written for this endpoint. (The chat endpoint below does keep a
 *     per-IP request *count* — see its own note.)
 *   - The payload is a vector of small integers plus a sector string. Even
 *     in full, it describes a team's maturity, not a person.
 *   - Submission is opt-in and off by default.
 *
 * Cost of that choice, stated honestly: because nothing is stored per
 * submission, results cannot be de-duplicated or withdrawn. Someone
 * submitting twice counts twice. For a maturity distribution that is an
 * acceptable trade; for anything with consequences attached it would not be.
 * ===================================================================== */

/* Capability counts, so a malformed or padded payload is rejected rather
   than silently skewing the distribution. Keep in sync with the diagnostics. */
const DIAGNOSTICS = {
  "devsecops-maturity": 10,
  "genai-readiness": 12,
  "sre-programme": 10,
  "cloud-cost": 8,
  "platform-engineering": 10,
  "ea-operating-model": 8,
  "agent-readiness": 10,
};

const SECTORS = new Set([
  "tech", "fsi", "government", "healthcare", "retail", "critinfra",
]);

async function submit(request, env) {
  /* Only accept from the site itself. Not a security boundary — an origin
     header is trivially forged — but it keeps casual noise out. */
  const origin = request.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "bad_origin" }, 403);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "bad_json" }, 400);
  }

  const { diagnostic, sector, levels } = body || {};

  const expected = DIAGNOSTICS[diagnostic];
  if (!expected) return json({ error: "unknown_diagnostic" }, 400);
  if (!SECTORS.has(sector)) return json({ error: "unknown_sector" }, 400);
  if (!Array.isArray(levels) || levels.length !== expected) {
    return json({ error: "bad_levels" }, 400);
  }
  if (!levels.every(n => Number.isInteger(n) && n >= 1 && n <= 5)) {
    return json({ error: "bad_levels" }, 400);
  }

  /* Day granularity only. Enough to show the dataset is live and growing;
     not enough to correlate a submission with anything. */
  const day = new Date().toISOString().slice(0, 10);

  const stmts = [
    /* Per-capability distribution — the actual signal. */
    ...levels.map((lvl, i) =>
      env.DB.prepare(
        `INSERT INTO tally (diagnostic, dimension, bucket, n) VALUES (?, ?, ?, 1)
         ON CONFLICT(diagnostic, dimension, bucket) DO UPDATE SET n = n + 1`
      ).bind(diagnostic, `cap:${i}`, String(lvl))
    ),
    /* Overall score band, so the headline distribution is cheap to read. */
    env.DB.prepare(
      `INSERT INTO tally (diagnostic, dimension, bucket, n) VALUES (?, 'band', ?, 1)
       ON CONFLICT(diagnostic, dimension, bucket) DO UPDATE SET n = n + 1`
    ).bind(diagnostic, band(levels)),
    env.DB.prepare(
      `INSERT INTO tally (diagnostic, dimension, bucket, n) VALUES (?, 'sector', ?, 1)
       ON CONFLICT(diagnostic, dimension, bucket) DO UPDATE SET n = n + 1`
    ).bind(diagnostic, sector),
    env.DB.prepare(
      `INSERT INTO tally (diagnostic, dimension, bucket, n) VALUES (?, 'day', ?, 1)
       ON CONFLICT(diagnostic, dimension, bucket) DO UPDATE SET n = n + 1`
    ).bind(diagnostic, day),
    env.DB.prepare(
      `INSERT INTO tally (diagnostic, dimension, bucket, n) VALUES (?, 'meta', 'runs', 1)
       ON CONFLICT(diagnostic, dimension, bucket) DO UPDATE SET n = n + 1`
    ).bind(diagnostic),
  ];

  try {
    await env.DB.batch(stmts);
  } catch (e) {
    return json({ error: "write_failed" }, 500);
  }
  return json({ ok: true });
}

/* Five bands matching the diagnostics' own level thresholds, so the published
   distribution speaks the same language as an individual result. */
function band(levels) {
  const pct = levels.reduce((a, b) => a + b, 0) / (levels.length * 5);
  if (pct <= 0.2) return "1";
  if (pct <= 0.4) return "2";
  if (pct <= 0.6) return "3";
  if (pct <= 0.8) return "4";
  return "5";
}

async function stats(url, env) {
  const only = url.searchParams.get("diagnostic");

  const q = only
    ? env.DB.prepare(`SELECT diagnostic, dimension, bucket, n FROM tally WHERE diagnostic = ?`).bind(only)
    : env.DB.prepare(`SELECT diagnostic, dimension, bucket, n FROM tally`);

  let rows;
  try {
    ({ results: rows } = await q.all());
  } catch {
    return json({ error: "read_failed" }, 500);
  }

  const out = {};
  for (const r of rows) {
    const d = (out[r.diagnostic] ||= { runs: 0, band: {}, sector: {}, capabilities: {} });
    if (r.dimension === "meta" && r.bucket === "runs") d.runs = r.n;
    else if (r.dimension === "band") d.band[r.bucket] = r.n;
    else if (r.dimension === "sector") d.sector[r.bucket] = r.n;
    else if (r.dimension.startsWith("cap:")) {
      const i = r.dimension.slice(4);
      (d.capabilities[i] ||= {})[r.bucket] = r.n;
    }
  }

  /* Suppress anything too thin to be meaningful. A distribution over four runs
     is noise presented as evidence, and publishing it would be worse than
     publishing nothing. */
  const MIN = 25;
  for (const [k, v] of Object.entries(out)) {
    v.published = v.runs >= MIN;
    if (!v.published) { v.band = {}; v.sector = {}; v.capabilities = {}; }
  }

  return json(
    {
      schema: "hellouchit.benchmark.v1",
      license: "CC BY 4.0",
      attribution: "Uchit Vyas — hellouchit.com",
      note:
        "Self-reported, self-selected, opt-in. Counters only — no per-submission " +
        "record exists. Distributions are withheld below 25 runs.",
      minimum_n: MIN,
      diagnostics: out,
    },
    200,
    { "Cache-Control": "public, max-age=300" }
  );
}

/* =====================================================================
 * /v2/chat — "Ask this site" RAG chat
 *
 * Retrieval is lexical (term-overlap scoring over llms-full.txt's 41
 * per-page sections), not embeddings. The corpus is small enough — 41
 * chunks — that keyword scoring finds the right section for on-topic
 * questions without needing Vectorize or a build-time embedding step.
 * If the corpus grows by an order of magnitude this stops being true and
 * embeddings become the right call; not yet.
 *
 * Nothing here is stored. There's no conversation history kept server-side —
 * the client resends the transcript each turn — and the only state that
 * persists is a per-IP request counter, used purely as an abuse backstop
 * and holding no content, only a count.
 * ===================================================================== */

const CORPUS_URL = "https://hellouchit.com/llms-full.txt";
const MODEL = "@cf/meta/llama-3.1-8b-instruct-fast";

const RATE_LIMIT_PER_DAY = 20;
const MAX_MESSAGES = 8;
const MAX_MESSAGE_LEN = 1500;
const TOP_K = 3;
const CHUNK_CHAR_CAP = 4000;

async function chat(request, env, ctx) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "bad_origin" }, 403);

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const limited = await isRateLimited(ip, env);
  if (limited) {
    return json({ error: "rate_limited", message: "That's the daily limit for this — try again tomorrow." }, 429);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad_json" }, 400); }

  const messages = validateMessages(body && body.messages);
  if (!messages) return json({ error: "bad_messages" }, 400);

  const lastUser = [...messages].reverse().find(m => m.role === "user");
  if (!lastUser) return json({ error: "bad_messages" }, 400);

  let chunks;
  try {
    chunks = await getCorpus(ctx);
  } catch {
    return json({ error: "corpus_unavailable" }, 500);
  }

  const context = retrieve(lastUser.content, chunks, TOP_K);
  const systemPrompt = buildSystemPrompt(context);

  let answer;
  try {
    const result = await env.AI.run(MODEL, {
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      max_tokens: 512,
    });
    answer = result.response || "";
  } catch (e) {
    console.error("AI.run failed:", e && e.message, e && e.stack);
    return json({ error: "model_failed" }, 500);
  }

  return json({
    answer,
    sources: context.map(c => ({ title: c.title, url: c.url })),
  });
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > MAX_MESSAGES) return null;
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant")) return null;
    if (typeof m.content !== "string" || !m.content.trim() || m.content.length > MAX_MESSAGE_LEN) return null;
  }
  return messages;
}

async function isRateLimited(ip, env) {
  const day = new Date().toISOString().slice(0, 10);
  const key = `rl:${ip}:${day}`;
  const current = Number((await env.RATE_LIMIT.get(key)) || "0");
  if (current >= RATE_LIMIT_PER_DAY) return true;
  await env.RATE_LIMIT.put(key, String(current + 1), { expirationTtl: 60 * 60 * 26 });
  return false;
}

/* Cache the parsed corpus at the edge for an hour, so a burst of chat traffic
   doesn't mean a burst of re-fetches and re-parses of a 280KB text file. */
async function getCorpus(ctx) {
  const cache = caches.default;
  const cacheKey = new Request(CORPUS_URL);
  const cached = await cache.match(cacheKey);
  if (cached) return cached.json();

  const res = await fetch(CORPUS_URL);
  if (!res.ok) throw new Error("fetch_failed");
  const text = await res.text();
  const chunks = parseCorpus(text);

  const response = new Response(JSON.stringify(chunks), {
    headers: { "Content-Type": "application/json", "Cache-Control": "max-age=3600" },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return chunks;
}

/* llms-full.txt is delimited by "Source: <url>" lines, one per page, with a
   "## Title" line just above. Split on that rather than the coarser
   "SECTION:" headers (13 of those span multiple unrelated pages each). */
function parseCorpus(text) {
  const lines = text.split("\n");
  const chunks = [];
  let title = null, urlLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^Source: (https?:\/\/\S+)/);
    if (!m) continue;
    // Title is the nearest preceding "## " line.
    for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
      const t = lines[j].match(/^##\s+(.+)/);
      if (t) { title = t[1].replace(/\.$/, ""); break; }
    }
    urlLine = i;
    chunks.push({ title: title || m[1], url: m[1], start: urlLine + 1 });
  }
  for (let i = 0; i < chunks.length; i++) {
    const startLine = chunks[i].start;
    const endLine = i + 1 < chunks.length ? findChunkEnd(lines, chunks, i) : lines.length;
    chunks[i].body = lines.slice(startLine, endLine).join("\n").trim();
    delete chunks[i].start;
  }
  return chunks.filter(c => c.body.length > 40);
}

function findChunkEnd(lines, chunks, i) {
  // End just before the next chunk's own "## Title" line (a few lines above
  // its Source: line), so titles don't bleed into the previous chunk's body.
  const nextSourceLine = chunks[i + 1].start - 1;
  for (let j = nextSourceLine - 1; j > chunks[i].start; j--) {
    if (/^##\s+/.test(lines[j])) return j;
  }
  return nextSourceLine;
}

const STOPWORDS = new Set(("the a an of to in on for and or is are was were be been " +
  "this that these those it its as at by with from into over under how what " +
  "why when where who does do did i you he she they we").split(" "));

function terms(s) {
  return (s.toLowerCase().match(/[a-z0-9][a-z0-9-]{2,}/g) || []).filter(w => !STOPWORDS.has(w));
}

/* BM25, computed fresh per request from the cached (already-parsed) chunks —
   41 short documents is cheap enough to re-tokenize and re-score every call,
   and doing so means one cache entry (the corpus) rather than two things that
   can drift out of sync.
 *
 * A plain term-overlap score was tried first and rejected: it ranked a long,
 * loosely-related chunk (Anti-patterns, 15KB) above the exact-match chunk for
 * "the payment platform case study" purely because more of its incidental
 * words happened to appear somewhere in 15KB of text. BM25's length
 * normalization (the dl/avgdl term) and IDF weighting (rare terms count for
 * more than common ones) fixes that.
 *
 * MIN_SCORE exists because BM25 still returns a nonzero score for almost any
 * query against almost any corpus (a stray shared word is enough) — without a
 * floor, an off-topic question ("what's the weather today") would still pull
 * in some chunk and let the model treat it as relevant context instead of
 * saying it doesn't know. 4.5 was picked empirically: clearly on-topic
 * queries scored 5.5-12, clearly off-topic ones scored 2.4-3.9. */
const MIN_SCORE = 4.5;

function buildIndex(chunks) {
  const docs = chunks.map(c => terms(c.body));
  const N = docs.length;
  const avgdl = docs.reduce((a, d) => a + d.length, 0) / (N || 1);
  const df = new Map();
  docs.forEach(d => new Set(d).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
  return { docs, N, avgdl, df };
}

function retrieve(query, chunks, k) {
  const qTerms = [...new Set(terms(query))];
  if (!qTerms.length) return [];

  const { docs, N, avgdl, df } = buildIndex(chunks);
  const K1 = 1.5, B = 0.75;

  const scored = chunks.map((c, i) => {
    const doc = docs[i];
    const dl = doc.length || 1;
    let score = 0;
    for (const t of qTerms) {
      const dfT = df.get(t) || 0;
      if (!dfT) continue;
      const idf = Math.log((N - dfT + 0.5) / (dfT + 0.5) + 1);
      const f = doc.filter(w => w === t).length;
      if (!f) continue;
      score += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * dl / avgdl));
    }
    /* Title-match bonus: a flat +4 per query term also in the chunk's own
       title. Needed because BM25's IDF alone fails exactly for "what is X"
       queries about a named, widely-cross-referenced concept — the term
       appears in ~half the corpus (a 21-of-41 document frequency for "the
       4-Discipline Stack", the site's own framework name), so IDF crushes it
       to near-zero everywhere, including on the one chunk that's actually
       about it. */
    const titleTerms = terms(c.title);
    const titleMatches = qTerms.filter(t => titleTerms.includes(t)).length;
    score += titleMatches * 4;
    return { ...c, score };
  });

  return scored
    .filter(c => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(c => ({ ...c, body: c.body.slice(0, CHUNK_CHAR_CAP) }));
}

function buildSystemPrompt(context) {
  if (!context.length) {
    return "You are a Q&A assistant for hellouchit.com, Uchit Vyas's personal site. " +
      "No matching content was found in the site's corpus for this question. " +
      "Say plainly that you couldn't find anything on the site about this. If the question " +
      "sounds like it's about a decision tree, diagnostic, or the regulation dataset, mention " +
      "that those are interactive tools (not covered by this search) at /decisions/, /tools/ " +
      "and /dataset/ respectively. Do not answer from general knowledge — you only know what " +
      "this site says.";
  }
  const excerpts = context.map((c, i) =>
    `[${i + 1}] "${c.title}" (${c.url})\n${c.body}`
  ).join("\n\n---\n\n");

  return "You are a Q&A assistant for hellouchit.com, Uchit Vyas's personal site. " +
    "Answer ONLY using the excerpts below — do not use outside knowledge, and do not " +
    "invent claims, numbers or dates not present in them. If the excerpts don't answer " +
    "the question, say so plainly rather than guessing. Write the answer in plain prose, " +
    "not a copy of the excerpt formatting. The sources are shown to the reader separately " +
    "below your answer, so don't repeat titles or URLs in your own text — just answer the " +
    "question. Keep it short: a few sentences, not an essay.\n\n" + excerpts;
}
