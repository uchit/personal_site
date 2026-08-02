#!/usr/bin/env node
/* build-dataset-views.mjs — renders dataset.csv and the browsable rows in
 * dataset/index.html from dataset.json.
 *
 *   node scripts/build-dataset-views.mjs
 *
 * dataset.json is the source of truth. The CSV and the HTML table were
 * previously hand-maintained alongside it, which is fine at 56 rows and a
 * guaranteed drift once anything is added. This regenerates both.
 *
 * Only the block between the DATASET-ROWS markers in the HTML is replaced;
 * everything else on the page (hero, filters, footer) is left alone.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "dataset/dataset.json"), "utf8"));
const REG = data.regulations;

/* Written by scripts/build-coverage.mjs. Run that first — a stale coverage
   block is exactly the lie the coverage block exists to prevent. */
const COV = data.coverage;
if (!COV) {
  console.error("\n  ERROR: dataset.json has no coverage block.");
  console.error("  Run: node scripts/build-coverage.mjs\n");
  process.exit(1);
}

/* Escapes " as well as the angle brackets. This output goes into attributes
   (data-cmd on the copy button), and nine verify commands contain a quote —
   without this they terminate the attribute and the rest of the command becomes
   markup. */
const esc = s => String(s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

/* ------------------------------------------------------------------- CSV */
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
const csv = [
  "id,regulations,control,category,surface,tools,evidence,verify,sectors,notes",
  ...data.rows.map(r => [
    r.id,
    r.reg.map(k => REG[k]?.label ?? k).join("; "),
    r.ctrl,
    r.cat,
    r.surface,
    r.tools.map(([n, t, v]) => `${n} (${t}, ${v})`).join("; "),
    r.evidence,
    /* Flattened so the CSV is usable on its own; the JSON keeps the expected
       result and the syntax-check status alongside each command. */
    (r.verify ?? []).map(v => `[${v.platform}] ${v.run}`).join(" ;; "),
    r.sectors.join("; "),
    r.notes ?? "",
  ].map(csvCell).join(",")),
].join("\n") + "\n";
writeFileSync(join(ROOT, "dataset/dataset.csv"), csv, "utf8");

/* ------------------------------------------------------------------ HTML */
function rowHtml(r) {
  const primary = REG[r.reg[0]];
  const others = r.reg.slice(1);
  const jur = primary
    ? `${primary.jurisdiction}${others.length ? ` +${others.length}` : ""}`
    : "";
  const text = `${r.ctrl} ${r.surface} ${r.cat}`.toLowerCase();

  const tools = r.tools
    .map(([n, t]) => `<span class="tool ${t}">${esc(n)}<span class="ttype">${esc(t)}</span></span>`)
    .join("");

  const otherRegs = others.length
    ? `<span><b>Other regs:</b> ${others.map(k => esc(REG[k]?.label ?? k)).join(", ")}</span>`
    : "";

  const sectors = r.sectors
    .map(s => `<span class="sector">${esc(s)}</span>`).join("");

  const anti = r.anti_pattern
    ? `        <div>
          <h4>Anti-pattern to avoid</h4><p><a href="/anti-patterns/#${esc(r.anti_pattern)}" style="color:var(--accent);border-bottom:1px solid var(--accent)">See anti-pattern catalogue &rarr;</a></p>
        </div>\n`
    : "";

  /* The command that produces the artefact. Every one is read-only, and each
     carries whether its syntax was machine-checked — a command presented with
     more confidence than it has earned is the failure mode here. */
  const verify = r.verify
    ? `        <div class="vfy-wrap">
          <h4>Verify it &mdash; read-only</h4>
${r.verify.map(v => `          <div class="vfy">
            <div class="vfy-head"><span class="vfy-plat">${esc(v.platform)}</span>${
              v.checked
                ? `<span class="vfy-ok" title="Syntax parsed by the CLI at build time">syntax checked</span>`
                : `<span class="vfy-un" title="This CLI is not installed in the build environment, so the syntax could not be machine-checked">not checked here</span>`
            }<button class="vfy-copy" type="button" data-cmd="${esc(v.run)}">Copy</button></div>
            <pre class="vfy-cmd"><code>${esc(v.run)}</code></pre>
            <p class="vfy-exp"><b>Expect:</b> ${esc(v.expect)}</p>
            <p class="vfy-yield">${esc(v.yields)}</p>
          </div>`).join("\n")}
        </div>\n`
    : "";

  return `    <div class="ds-row" data-id="${esc(r.id)}"
         data-regs="${esc(r.reg.join(" "))}"
         data-cat="${esc(r.cat)}"
         data-sectors="${esc(r.sectors.join(" "))}"
         data-text="${esc(text)}">
      <div class="reg">${esc(primary?.label ?? r.reg[0])}<span class="reg-jur">${esc(jur)}</span></div>
      <div>
        <div class="ctrl">${esc(r.ctrl)}</div>
        <span class="ctrl-sub">${esc(r.surface)}</span>
      </div>
      <div class="cat">${esc(r.cat)}</div>
      <div class="tcount">${r.tools.length} tool${r.tools.length === 1 ? "" : "s"}</div>
    </div>
    <div class="ds-detail">
      <div class="grid">
        <div>
          <h4>Tooling options</h4>
          <div class="tools">${tools}</div>
        </div>
        <div>
          <h4>Evidence shape</h4>
          <p>${esc(r.evidence)}</p>
        </div>
        <div>
          <h4>Notes</h4>
          <p>${esc(r.notes ?? "")}</p>
          <div class="meta-line">
            ${otherRegs}
            <span class="sectors"><b style="color:var(--accent);font-weight:500">Sectors:</b> ${sectors}</span>
          </div>
        </div>
${anti}      </div>
${verify}    </div>`;
}

const START = "<!-- DATASET-ROWS:START — generated by scripts/build-dataset-views.mjs -->";
const END = "<!-- DATASET-ROWS:END -->";

const page = join(ROOT, "dataset/index.html");
let html = readFileSync(page, "utf8");
const body = data.rows.map(rowHtml).join("\n");

if (html.includes(START)) {
  html = html.replace(
    new RegExp(`${START}[\\s\\S]*?${END}`),
    () => `${START}\n${body}\n    ${END}`);
} else {
  /* First run: wrap the existing hand-written rows so future runs are surgical.
     Bound the block by the container that holds it (#ds-rows) rather than by
     guessing at the last closing tags — an earlier version used lastIndexOf on
     "</div>\n    </div>" and swallowed the #ds-empty element and the container
     close along with the rows, which broke the filter JS at runtime. */
  const first = html.indexOf('    <div class="ds-row"');
  const lastRow = html.lastIndexOf('<div class="ds-detail">');
  const lastEnd = lastRow === -1 ? -1
    : html.indexOf("</div>", html.indexOf("</div>", html.indexOf("</div>", lastRow) + 6) + 6) + 6;
  if (first === -1 || lastEnd <= first) {
    console.error("  could not locate the existing row block — aborting\n");
    process.exit(1);
  }
  html = html.slice(0, first) + `${START}\n${body}\n    ${END}` + html.slice(lastEnd);
}

/* ----------------------------------------------------------------- CHIPS
   The filter chips carry per-facet counts. Hand-maintained they go stale the
   moment a row is added — and a chip whose count is wrong is worse than no
   chip, because it looks authoritative. */
function chips(kind, entries) {
  return entries.map(([value, label, count, tier]) =>
    `<button class="ds-chip${tier ? ` t-${tier}` : ""}" data-filter="${kind}" data-value="${esc(value)}"${tier ? ` data-tier="${tier}"` : ""}>${esc(label)} <span class="count">${count}</span></button>`
  ).join("");
}
const countBy = (fn) => {
  const m = new Map();
  for (const r of data.rows) for (const v of [].concat(fn(r))) m.set(v, (m.get(v) || 0) + 1);
  return m;
};
const regCounts = countBy(r => r.reg);
const catCounts = countBy(r => r.cat);
const secCounts = countBy(r => r.sectors);

const SECTOR_LABEL = { "critical-infrastructure": "critical infrastructure" };

const chipBlocks = {
  "DATASET-CHIPS-REG": chips("reg",
    Object.keys(REG).filter(k => regCounts.has(k))
      .map(k => [k, REG[k].label, regCounts.get(k), COV.by_regulation?.[k]?.tier])),
  "DATASET-CHIPS-CAT": chips("cat",
    [...catCounts.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => [c, c, n])),
  "DATASET-CHIPS-SECTOR": chips("sector",
    [...secCounts.entries()].filter(([s]) => s !== "all").sort((a, b) => b[1] - a[1])
      .map(([s, n]) => [s, SECTOR_LABEL[s] ?? s, n])),
};

/* -------------------------------------------------------------- COVERAGE
   "28 regulations" is true and misleading in the same breath. Stating the
   depth per regulation costs a little swagger and buys the only thing that
   matters here — that someone can trust the number they came for. */
{
  const byTier = {};
  for (const [k, v] of Object.entries(COV.by_regulation)) (byTier[v.tier] ||= []).push(k);

  const groups = COV.tiers.map(t => {
    const list = byTier[t.id] || [];
    if (!list.length) return "";
    return `
        <div class="cov-tier cov-${t.id}">
          <div class="cov-head"><b>${esc(t.label)}</b><span>${list.length} regulation${list.length === 1 ? "" : "s"} &middot; ${esc(t.min_controls)}+ controls</span></div>
          <p class="cov-note">${esc(t.note)}</p>
          <div class="cov-list">${list
            .map(k => `<button class="cov-chip" data-filter="reg" data-value="${esc(k)}">${esc(REG[k]?.label ?? k)} <span>${COV.by_regulation[k].controls}</span></button>`)
            .join("")}</div>
        </div>`;
  }).join("");

  const block = `
      <details class="cov">
        <summary><b>How deeply is each regulation actually covered?</b><span class="cov-cue">Read before you rely on it</span></summary>
        <div class="cov-body">
          <p>
            The mapping spans ${Object.keys(COV.by_regulation).length} regulations, but not evenly, and an
            average would hide that. ISO&nbsp;27001 has ${COV.by_regulation.iso27001?.controls ?? "?"} mapped controls;
            several have one. Depth per regulation is counted from the rows at
            build time, so this cannot drift from what is actually here.
          </p>${groups}
          <p class="cov-foot">
            Thin coverage is a gap in this dataset, not a claim that the
            regulation is thin. <b>Nothing here is a compliance assessment</b> &mdash;
            it maps controls to evidence so you can start from something
            concrete instead of a blank page.
          </p>
        </div>
      </details>`;

  const start = "<!-- DATASET-COVERAGE:START — generated by scripts/build-dataset-views.mjs -->";
  const end = "<!-- DATASET-COVERAGE:END -->";
  if (html.includes(start)) {
    html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => `${start}${block}\n      ${end}`);
  } else {
    /* Sits directly under the filter bar, before the rows. */
    const anchor = html.indexOf('<!-- DATASET-ROWS:START');
    if (anchor === -1) {
      console.error("  could not locate the rows marker to anchor coverage — aborting\n");
      process.exit(1);
    }
    const lineStart = html.lastIndexOf("\n", anchor) + 1;
    html = html.slice(0, lineStart) + `      ${start}${block}\n      ${end}\n\n` + html.slice(lineStart);
  }
}

/* ------------------------------------------------------------ ROW COUNTS
   The row total appeared in three hand-maintained places — the status line,
   the meta description and the JSON-LD — and all three still said 56 after
   the dataset grew to 66. "Showing 66 of 56" is a small error that tells a
   reader the numbers here aren't watched. Derive them. */
{
  const n = data.rows.length;
  const nReg = new Set(data.rows.flatMap(r => r.reg)).size;

  /* Presence, not mutation — on a clean re-run the values are already right
     and a mutation check would cry wolf every second build. */
  const stamps = [
    [/Showing <b id="ds-count">\d+<\/b> of \d+/g,
     `Showing <b id="ds-count">${n}</b> of ${n}`],
    [/map of \d+ regulatory controls across \d+ regulations/g,
     `map of ${n} regulatory controls across ${nReg} regulations`],
    [/<b>\d+ concrete controls<\/b>/g,
     `<b>${n} concrete controls</b>`],
  ];
  for (const [re, to] of stamps) {
    if (!re.test(html)) {
      console.error(`\n  ERROR: row-count stamp not found in dataset/index.html: ${re}`);
      console.error("  The markup changed — fix the pattern rather than let the count drift.\n");
      process.exit(1);
    }
    html = html.replace(re, () => to);
  }
}

/* -------------------------------------------------------------- SEQUENCE
   Rendered for every regulation but revealed by dataset.js only when exactly
   one regulation filter is active — that is the moment the reader has said
   which obligation they are working to, and "which of these first" becomes
   answerable rather than generic. */
{
  const SEQ = data.sequence;
  if (!SEQ) {
    console.error("\n  ERROR: dataset.json has no sequence block. Run: node scripts/build-sequence.mjs\n");
    process.exit(1);
  }
  const byId = new Map(data.rows.map(r => [r.id, r]));

  const blocks = Object.entries(SEQ.by_regulation).map(([reg, s]) => {
    const waves = s.waves.map((w, i) => `
            <li class="sq-wave">
              <div class="sq-wn"><b>Wave ${i + 1}</b><span>${w.length} control${w.length === 1 ? "" : "s"} &middot; no order within the wave</span></div>
              <ul class="sq-items">${w.map(({ id, carried }) => {
                const r = byId.get(id);
                return `<li${carried ? ' class="carried"' : ""}><button type="button" class="sq-jump" data-id="${esc(id)}">${esc(r?.ctrl ?? id)}</button>${
                  carried ? `<span class="sq-carry" title="A prerequisite this regulation does not itself name">prerequisite</span>` : ""
                }</li>`;
              }).join("")}</ul>
            </li>`).join("");

    return `
        <div class="sq" data-reg="${esc(reg)}" hidden>
          <div class="sq-head">
            <b>${esc(REG[reg]?.label ?? reg)} &mdash; order of work</b>
            <span>${s.controls} mapped${s.carried ? ` &middot; ${s.carried} prerequisite${s.carried === 1 ? "" : "s"} carried in` : ""} &middot; ${s.waves.length} waves</span>
          </div>
          <ol class="sq-waves">${waves}
          </ol>
          <p class="sq-foot">
            Derived from prerequisite edges, where an edge means doing one
            without the other is technically incoherent &mdash; not that one is
            more important. <b>Nothing inside a wave is ordered</b>; it can all
            start at once. Items marked <i>prerequisite</i> are pulled in
            because something here depends on them, even though this regulation
            doesn&rsquo;t name them.
          </p>
        </div>`;
  }).join("");

  const start = "<!-- DATASET-SEQUENCE:START — generated by scripts/build-dataset-views.mjs -->";
  const end = "<!-- DATASET-SEQUENCE:END -->";
  const wrapped = `${start}
      <div id="ds-seq">${blocks}
      </div>
      ${end}`;

  if (html.includes(start)) {
    html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => wrapped);
  } else {
    const anchor = html.indexOf('<!-- DATASET-ROWS:START');
    const lineStart = html.lastIndexOf("\n", anchor) + 1;
    html = html.slice(0, lineStart) + `      ${wrapped}\n\n` + html.slice(lineStart);
  }
}

for (const [marker, block] of Object.entries(chipBlocks)) {
  const start = `<!-- ${marker}:START -->`, end = `<!-- ${marker}:END -->`;
  if (html.includes(start)) {
    html = html.replace(new RegExp(`${start}[\\s\\S]*?${end}`), () => `${start}${block}${end}`);
  } else {
    /* First run: wrap the existing hand-written chip row for this facet. */
    const kind = marker.split("-").pop().toLowerCase();
    const re = new RegExp(`(<button class="ds-chip" data-filter="${kind}"[\\s\\S]*?</button>)(?!<button class="ds-chip" data-filter="${kind}")`);
    const m = html.match(re);
    if (m) html = html.replace(m[0], `${start}${block}${end}`);
    else console.warn(`  ! could not wrap chips for ${kind}`);
  }
}
writeFileSync(page, html, "utf8");

const regs = new Set(data.rows.flatMap(r => r.reg));
const tools = new Set(data.rows.flatMap(r => r.tools.map(t => t[0])));
console.log(`\n  dataset.csv     ${data.rows.length + 1} lines`);
console.log(`  index.html      ${data.rows.length} rows rendered`);
console.log(`  counts          ${data.rows.length} controls × ${regs.size} regulations × ${tools.size} tools\n`);
