#!/usr/bin/env node
/* build-agents.mjs — generates the /agents/ page body from dataset/dataset.json.
 *
 *   node scripts/build-agents.mjs && node scripts/build-site.mjs
 *
 * Writes src/pages/agents/index.html; build-site.mjs then wraps it in the
 * shared shell. The control text lives in dataset.json (and is published there
 * as JSON), so edit it there, never in the generated page.
 *
 * Controls are listed in dependency order: a control comes after anything it
 * needs first. The numbers are that order, not a ranking.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "dataset/dataset.json"), "utf8"));
const REG = data.regulations;
const rows = data.rows.filter(r => r.id.startsWith("agent-"));
if (rows.length !== 10) { console.error(`expected 10 agent-* controls, found ${rows.length}`); process.exit(1); }
const byId = new Map(rows.map(r => [r.id, r]));
const external = new Map(data.rows.filter(r => !r.id.startsWith("agent-")).map(r => [r.id, r]));

const esc = s => String(s ?? "")
  .replace(/&(?![a-zA-Z#0-9]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
/* Typographic apostrophes in data text: "human's" -> "human’s". */
const sq = t => String(t ?? "").replace(/(\w)'(\w)/g, "$1\u2019$2");
for (const r of rows) {
  r.ctrl = sq(r.ctrl); r.notes = sq(r.notes); r.evidence = sq(r.evidence);
  (r.verify ?? []).forEach(v => { v.expect = sq(v.expect); });
}
const short = r => r.ctrl.split(/[—:,(]/)[0].trim();

/* Dependency waves. */
const waves = [];
const remaining = new Set(rows.map(r => r.id));
while (remaining.size) {
  const ready = [...remaining].filter(id => (byId.get(id).depends_on ?? []).every(p => !remaining.has(p)));
  if (!ready.length) { console.error("cycle among agent controls"); process.exit(1); }
  waves.push(ready);
  ready.forEach(id => remaining.delete(id));
}
/* Within the later waves, sit each control next to what it needs, so the
   numbering, the graph and the list below all read in the same order. */
const right = [];
for (const id of waves[0]) for (const w of waves.slice(1).flat())
  if ((byId.get(w).depends_on ?? [])[0] === id && !right.includes(w)) right.push(w);
for (const w of waves.slice(1).flat()) if (!right.includes(w)) right.push(w);
const order = [...waves[0], ...right];
const NUM = new Map(order.map((id, i) => [id, i + 1]));

function control(id) {
  const r = byId.get(id);
  const needs = (r.depends_on ?? []).map(p => byId.has(p)
    ? `<a href="#${esc(p)}">${NUM.get(p)}. ${esc(short(byId.get(p)))}</a>`
    : esc(external.get(p)?.ctrl ?? p));
  // One visible line per control: the first sentence of why it matters.
  // Everything an auditor or engineer needs sits behind the disclosure.
  const why = r.notes.split(/(?<=\.)\s+/)[0];
  const rest = r.notes.slice(why.length).trim();
  const verify = (r.verify ?? []).map(v => `
            <div class="ctl-verify">
              <p class="ctl-label">Check it yourself (read-only, ${esc(v.platform)})</p>
              <pre><code>${esc(v.run)}</code></pre>
              <p class="small">You should see: ${esc(v.expect)}</p>
            </div>`).join("");
  return `
    <article class="ctl" id="${esc(r.id)}">
      <div class="ctl-num">${NUM.get(r.id)}</div>
      <div class="ctl-body">
        <h2>${esc(short(r))}</h2>
        <p class="ctl-why">${esc(why)}</p>
        <details class="ctl-more">
          <summary>Evidence, checks and mappings</summary>
          <div class="ctl-detail">
            <p class="ctl-full">${esc(r.ctrl)}.</p>
${rest ? `            <p>${esc(rest)}</p>
` : ""}            <p class="ctl-label">What an auditor will ask for</p>
            <p>${esc(r.evidence)}</p>${verify}
            <dl class="ctl-meta">
              <div><dt>Build first</dt><dd>${needs.length ? needs.join(", ") : "Nothing. You can start today."}</dd></div>
              <div><dt>Maps to</dt><dd>${r.reg.map(k => esc(REG[k]?.label ?? k)).join(", ")}</dd></div>
            </dl>
          </div>
        </details>
      </div>
    </article>`;
}

/* Dependency graph: first wave on the left, the rest on the right, each
   right-hand node placed next to what it needs. js/wow.js draws the lines. */
const gnode = id => {
  const r = byId.get(id);
  const deps = (r.depends_on ?? []).filter(p => byId.has(p));
  return `<a class="gnode" href="#${id}" data-node="${id}"${deps.length ? ` data-needs="${deps.join(" ")}"` : ""}><span class="n">${NUM.get(id)}</span><span>${esc(short(r))}</span>${
    deps.length ? `<span class="needs">Needs ${deps.map(d => NUM.get(d)).join(" and ")} first</span>` : ""}</a>`;
};
const graphHtml = `
    <div class="graph" data-wow="graph">
      <svg aria-hidden="true"></svg>
      <div class="graph-col">
        <h3>Start with these</h3>
        ${waves[0].map(gnode).join("\n        ")}
      </div>
      <div class="graph-col">
        <h3>Then these, once what they need is in place</h3>
        ${right.map(gnode).join("\n        ")}
      </div>
    </div>`;

const waveHtml = waves.map((w, i) => `
      <div class="wave">
        <h3>${i === 0 ? "Start with these" : "Then these"}</h3>
        <ol start="${NUM.get(w[0])}">
          ${w.map(id => `<li><a href="#${id}">${esc(short(byId.get(id)))}</a></li>`).join("\n          ")}
        </ol>
      </div>`).join("");

const items = JSON.stringify(order.map(id => short(byId.get(id)).replace(/[\u2019]/g, "'")));
const page = `<!--page {"out": "agents/index.html", "title": "Ten controls for AI agents", "nav": "agents", "css": ["/css/agents.css"],
 "schema": "controls", "published": "2026-08-01", "updated": "2026-11-09", "crumb": "AI agents", "items": ${items},
 "description": "Ten controls to build before an AI agent goes live in a regulated company, with the evidence auditors ask for, mapped to the EU AI Act, NIST and APRA."} -->
<!-- GENERATED by scripts/build-agents.mjs from dataset/dataset.json. Do not edit by hand. -->

<section class="page-head">
  <div class="wrap">
    <h1 class="h1">Ten things a regulator will ask to see before your AI agent goes live.</h1>
    <p class="lede">Build them in this order. Each one opens to the evidence an auditor wants and a read-only command to check it.</p>
    <div class="actions">
      <a class="btn" href="/tools/agent-readiness.html">Score your agents in two minutes</a>
      <a class="link-strong" href="/dataset/dataset.json">Download as JSON</a>
    </div>
  </div>
</section>

<section class="section mist tight" aria-labelledby="order-h">
  <div class="wrap">
    <div class="section-head">
      <h2 class="h2" id="order-h">Identity first. Everything else attaches to it.</h2>
      <p class="lede">The four on the left can start today. The six on the right need what they point to.</p>
    </div>
${graphHtml}
  </div>
</section>

<section class="section" aria-label="The controls">
  <div class="wrap">${order.map(control).join("\n")}
  </div>
</section>

<section class="section tight" style="padding-top:0">
  <div class="wrap">
    <p class="small" style="max-width:44em">Free to reuse under <a href="https://creativecommons.org/licenses/by/4.0/" rel="noopener">CC BY 4.0</a>. These are my own views, not my employer&rsquo;s, and they are not legal advice. Spotted something wrong? Email <a href="mailto:contact@hellouchit.com">contact@hellouchit.com</a>.</p>
  </div>
</section>
`;

mkdirSync(join(ROOT, "src/pages/agents"), { recursive: true });
writeFileSync(join(ROOT, "src/pages/agents/index.html"), page);
console.log(`  wrote src/pages/agents/index.html (${order.length} controls, ${waves.length} waves)`);
