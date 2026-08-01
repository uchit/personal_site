/**
 * Diagnostic benchmark — ingest and aggregate.
 *
 * Purpose: the six diagnostics are run by real practitioners and every result
 * is currently discarded. That throws away the only primary data this site
 * could ever have — a distribution of where regulated-industry teams actually
 * stand, which no vendor survey covers and nobody else can assemble.
 *
 * The privacy design is the point, and it is structural rather than promised:
 *
 *   - Nothing is stored per submission. There is no submissions table and no
 *     row that represents a person. Every write is an UPSERT against a counter,
 *     so what exists on disk is tallies and nothing else. There is no record to
 *     leak, subpoena, or re-identify.
 *   - No IP address, user agent, referrer, cookie or identifier is read or
 *     written. Cloudflare sees the request; this Worker deliberately does not
 *     persist anything from it.
 *   - The payload is a vector of small integers plus a sector string. Even in
 *     full, it describes a team's maturity, not a person.
 *   - Submission is opt-in and off by default.
 *
 * Cost of that choice, stated honestly: because nothing is stored per
 * submission, results cannot be de-duplicated or withdrawn. Someone submitting
 * twice counts twice. For a maturity distribution that is an acceptable trade;
 * for anything with consequences attached it would not be.
 */

const ALLOWED_ORIGIN = "https://hellouchit.com";

/* Capability counts, so a malformed or padded payload is rejected rather than
   silently skewing the distribution. Keep in sync with the diagnostics. */
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
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    if (url.pathname === "/v1/submit" && request.method === "POST") {
      return submit(request, env);
    }
    if (url.pathname === "/v1/stats" && request.method === "GET") {
      return stats(url, env);
    }
    return json({ error: "not_found" }, 404);
  },
};

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
