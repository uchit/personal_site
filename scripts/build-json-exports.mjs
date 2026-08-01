#!/usr/bin/env node
/* build-json-exports.mjs — publish the site's structured content as JSON.
 *
 *   node scripts/build-json-exports.mjs
 *
 * Produces, alongside the existing dataset.json:
 *   /tools/diagnostics.json      six diagnostics — questions, capabilities,
 *                                levels, recommendations, framework citations
 *   /decisions/decisions.json    seven decision trees, ADR-shaped
 *   /anti-patterns/anti-patterns.json   fifteen named failure modes
 *   /glossary/glossary.json      practitioner glossary
 *
 * Why: this content is the most citable material on the site and it was locked
 * inside HTML and inline <script> blocks — invisible to anything that is not a
 * browser. As JSON it is quotable by AI systems, forkable, and embeddable.
 *
 * Extraction, not re-authoring. Every field is read from the live page, so the
 * exports cannot drift from what a visitor sees. Nothing here is hand-written.
 *
 * A note on approach: the diagnostics hold their config in a JS object literal
 * inside a DOMContentLoaded closure, referencing const bindings declared beside
 * it. That is not JSON and cannot be regex'd out safely, so the script is
 * actually executed in a sandbox with a stub Diag. Decision trees are already
 * strict JSON (window.TREE = {...}) and are simply parsed.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://hellouchit.com";
const LICENCE = "CC BY 4.0";
const ATTRIBUTION = "Uchit Vyas — hellouchit.com";

/* Dataset version is the site's existing convention; reuse it so all five
   exports declare provenance the same way. */
const VERSION = new Date().toISOString().slice(0, 10);

const entities = [
  [/&mdash;/g, "—"], [/&ndash;/g, "–"], [/&nbsp;/g, " "], [/&#8209;/g, "-"],
  [/&rsquo;/g, "’"], [/&lsquo;/g, "‘"], [/&ldquo;/g, "“"], [/&rdquo;/g, "”"],
  [/&amp;/g, "&"], [/&lt;/g, "<"], [/&gt;/g, ">"], [/&times;/g, "×"],
  [/&middot;/g, "·"], [/&hellip;/g, "…"], [/&quot;/g, '"'], [/&deg;/g, "°"],
  [/&rarr;/g, "→"], [/&larr;/g, "←"], [/&equiv;/g, "≡"],
];

function decode(s) {
  if (typeof s !== "string") return s;
  for (const [re, ch] of entities) s = s.replace(re, ch);
  return s.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
}

/* Strip presentational markup but keep the text. The HTML in these fields is
   emphasis and links, never structure, so flattening loses nothing a consumer
   of the JSON needs. */
function plain(s) {
  if (typeof s !== "string") return s;
  return decode(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();
}

/* Recursively clean every string in an extracted config. */
function clean(v) {
  if (typeof v === "string") return plain(v);
  if (Array.isArray(v)) return v.map(clean);
  if (v && typeof v === "object") {
    const out = {};
    for (const k of Object.keys(v)) out[k] = clean(v[k]);
    return out;
  }
  return v;
}

function inlineScripts(html) {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
    .filter(m => !/ld\+json/.test(m[0]))
    .map(m => m[1]);
}

function write(relPath, payload) {
  const abs = join(ROOT, relPath);
  writeFileSync(abs, JSON.stringify(payload, null, 2) + "\n", "utf8");
  const kb = (Buffer.byteLength(JSON.stringify(payload)) / 1024).toFixed(1);
  console.log(`  ${relPath.padEnd(38)} ${kb} KB`);
}

/* ------------------------------------------------------------ diagnostics */
function extractDiagnostics() {
  const slugs = [
    "devsecops-maturity", "genai-readiness", "sre-programme",
    "cloud-cost", "platform-engineering", "ea-operating-model",
  ];
  const out = [];

  for (const slug of slugs) {
    const file = join(ROOT, "tools", slug + ".html");
    if (!existsSync(file)) { console.warn(`  ! missing tools/${slug}.html`); continue; }
    const html = readFileSync(file, "utf8");

    const src = inlineScripts(html).find(s => s.includes("Diag.run("));
    if (!src) { console.warn(`  ! no Diag.run in ${slug}`); continue; }

    let captured = null;
    const sandbox = {
      /* The page wraps its config in a DOMContentLoaded handler; fire it
         synchronously instead of waiting for a DOM that will never exist. */
      window: { addEventListener: (_evt, fn) => fn() },
      document: { addEventListener: (_evt, fn) => fn() },
      Diag: { run: cfg => { captured = cfg; } },
      console: { log() {}, warn() {} },
    };
    sandbox.window.Diag = sandbox.Diag;

    try {
      vm.runInNewContext(src, sandbox, { timeout: 5000 });
    } catch (err) {
      console.warn(`  ! ${slug}: ${err.message}`);
      continue;
    }
    if (!captured) { console.warn(`  ! ${slug}: Diag.run never called`); continue; }

    const cfg = clean(captured);
    const title = plain((html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || slug)
      .split("—")[0].trim();

    out.push({
      id: slug,
      title,
      url: `${SITE}/tools/${slug}.html`,
      capabilityCount: (cfg.questions || []).length,
      maxScore: (cfg.questions || []).length * 5,
      /* The shareable-result convention, documented so a consumer can build a
         deep link rather than reverse-engineering it from the page. */
      resultUrlFormat: `${SITE}/tools/${slug}.html#a=<one digit 1-5 per capability>&s=<sector key>`,
      sectors: Object.entries(cfg.sectors || {}).map(([key, s]) => ({
        key, label: s.label, lens: s.lens,
      })),
      capabilities: (cfg.questions || []).map((q, i) => ({
        index: i + 1,
        capability: q.cap,
        question: q.t,
        mapsTo: (q.refs || []).map(r => ({ name: r.name, url: r.url })),
        levels: (q.o || []).map((text, k) => ({ level: k + 1, description: text })),
      })),
      levels: (cfg.levels || []).map(l => ({
        name: l.name,
        scoreRange: { minPercent: l.minPct, maxPercent: l.maxPct },
        summary: l.body,
        benchmark: l.benchmark,
        recommendations: (l.recs || []).map(r => ({
          what: r.what, why: r.why, tools: r.tools, constraint: r.constraint,
          references: (r.refs || []).map(x => ({ name: x.name, url: x.url })),
        })),
      })),
      references: (cfg.references || []).map(r => ({
        domain: r.domain, name: r.name, description: r.desc, url: r.url,
      })),
    });
  }
  return out;
}

/* -------------------------------------------------------------- decisions */
function extractDecisions() {
  const files = [
    "ai-gateway", "llm-integration-pattern", "policy-engine", "tenancy-model",
    "compute-platform", "service-communication", "service-decomposition",
  ];
  const out = [];

  for (const slug of files) {
    const file = join(ROOT, "decisions", slug + ".html");
    if (!existsSync(file)) { console.warn(`  ! missing decisions/${slug}.html`); continue; }
    const html = readFileSync(file, "utf8");

    const m = html.match(/window\.TREE\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
    if (!m) { console.warn(`  ! no window.TREE in ${slug}`); continue; }

    let tree;
    try {
      tree = JSON.parse(m[1]);
    } catch (err) {
      console.warn(`  ! ${slug}: ${err.message}`);
      continue;
    }

    const t = clean(tree);
    /* Count reachable end-states so a consumer can see the tree's shape
       without walking it. */
    let leaves = 0;
    for (const node of Object.values(t.nodes || {})) {
      for (const o of node.opts || []) if (o.leaf) leaves++;
    }

    out.push({
      id: t.id || slug,
      title: t.title,
      url: `${SITE}/decisions/${slug}.html`,
      startNode: t.start,
      questionCount: Object.keys(t.nodes || {}).length,
      endStateCount: leaves,
      resultUrlFormat: `${SITE}/decisions/${slug}.html#<base36 option index per step>`,
      nodes: t.nodes,
    });
  }
  return out;
}

/* ---------------------------------------------------------- anti-patterns */
function extractAntiPatterns() {
  const html = readFileSync(join(ROOT, "anti-patterns/index.html"), "utf8");
  const out = [];

  for (const m of html.matchAll(/<article class="ap" id="([^"]+)" data-f="([^"]*)"[^>]*>([\s\S]*?)<\/article>/g)) {
    const [, id, domainKey, body] = m;
    /* The name is an <h2> inside .ap-head, carrying a trailing full stop that
       belongs to the page's typography, not to the name. */
    const name = plain((body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || [])[1] || "")
      .replace(/\.$/, "");
    const number = plain((body.match(/<span class="ap-num">([\s\S]*?)<\/span>/) || [])[1] || "");
    const domainLabel = plain((body.match(/<span class="ap-dom">([\s\S]*?)<\/span>/) || [])[1] || "");

    /* Each block is labelled by its own <span class="ix">, so read the label
       rather than relying on document order. */
    const blocks = {};
    for (const b of body.matchAll(/<div class="ap-block">\s*<span class="ix">([\s\S]*?)<\/span>([\s\S]*?)<\/div>/g)) {
      blocks[plain(b[1]).toLowerCase()] = plain(b[2]);
    }
    const fix = plain((body.match(/<div class="ap-fix">[\s\S]*?<span class="lbl">[\s\S]*?<\/span>([\s\S]*?)<\/div>/) || [])[1] || "");

    const related = [...body.matchAll(/<div class="ap-meta">([\s\S]*?)<\/div>/g)]
      .flatMap(x => [...x[1].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)])
      .map(a => ({ title: plain(a[2]), url: a[1].startsWith("http") ? a[1] : SITE + a[1] }));

    out.push({
      id,
      number: number || null,
      name,
      domain: domainLabel || domainKey,
      domainKey,
      url: `${SITE}/anti-patterns/#${id}`,
      whereItAppears: blocks["where it appears"] || null,
      whyItsBad: blocks["why it’s bad"] || blocks["why it's bad"] || null,
      whatToDoInstead: fix || null,
      related,
    });
  }
  return out;
}

/* --------------------------------------------------------------- glossary */
function extractGlossary() {
  const html = readFileSync(join(ROOT, "glossary/index.html"), "utf8");
  const src = inlineScripts(html).find(s => /const\s+TERMS\s*=/.test(s));
  if (!src) { console.warn("  ! no TERMS array in glossary"); return []; }

  let terms = null;
  const sandbox = {
    window: { addEventListener() {} },
    document: { addEventListener() {}, getElementById: () => null, querySelector: () => null, querySelectorAll: () => [] },
    console: { log() {}, warn() {} },
  };
  const ctx = vm.createContext(sandbox);
  try {
    /* Evaluate only up to the array literal; the rendering code below it
       expects a DOM. Re-exporting TERMS is enough. */
    const arr = src.match(/const\s+TERMS\s*=\s*(\[[\s\S]*?\n\];)/);
    if (!arr) throw new Error("could not isolate TERMS literal");
    vm.runInContext(`globalThis.__terms = ${arr[1].replace(/;$/, "")}`, ctx, { timeout: 5000 });
    terms = sandbox.__terms;
  } catch (err) {
    console.warn(`  ! glossary: ${err.message}`);
    return [];
  }

  return clean(terms).map(t => ({
    term: t.t,
    domain: t.d,
    definition: t.body,
    url: `${SITE}/glossary/`,
  }));
}

/* ------------------------------------------------------------------- main */
console.log("");

const meta = (name, description, count, countLabel) => ({
  name,
  description,
  version: VERSION,
  license: LICENCE,
  attribution: ATTRIBUTION,
  source: SITE,
  [countLabel]: count,
});

const diagnostics = extractDiagnostics();
write("tools/diagnostics.json", {
  ...meta(
    "Practitioner diagnostics",
    "Six capability-scored diagnostics for regulated-industry engineering. Each capability maps to named public frameworks (NIST, ISO, OWASP, EU AI Act, APRA and others).",
    diagnostics.length, "diagnosticCount"),
  diagnostics,
});

const decisions = extractDecisions();
write("decisions/decisions.json", {
  ...meta(
    "Architecture decision trees",
    "Seven interactive decision trees for recurring architecture choices, each ending in a recommendation with trade-offs, watch-outs and when-not-to-pick conditions. ADR-shaped: usable as decision records.",
    decisions.length, "treeCount"),
  decisions,
});

const antiPatterns = extractAntiPatterns();
write("anti-patterns/anti-patterns.json", {
  ...meta(
    "Anti-patterns catalogue",
    "Named failure modes in enterprise architecture, platform engineering, DevSecOps and applied GenAI — where each appears, why it fails, and what to do instead.",
    antiPatterns.length, "antiPatternCount"),
  antiPatterns,
});

const glossary = extractGlossary();
write("glossary/glossary.json", {
  ...meta(
    "Practitioner glossary",
    "Named concepts and trade-offs across enterprise architecture, platform engineering, DevSecOps, SRE, data and applied GenAI.",
    glossary.length, "termCount"),
  terms: glossary,
});

console.log("");
console.log(`  ${diagnostics.length} diagnostics · ${decisions.length} decision trees · ` +
            `${antiPatterns.length} anti-patterns · ${glossary.length} glossary terms`);

/* An extractor that silently stops matching — a renamed class, a refactored
   config block — produces empty files or blank fields rather than an error.
   Both are checked: a whole-file check would not have caught the anti-pattern
   titles coming through empty when the heading level changed. */
const problems = [];

for (const [label, list] of [
  ["diagnostics", diagnostics], ["decisions", decisions],
  ["anti-patterns", antiPatterns], ["glossary", glossary],
]) {
  if (!list.length) problems.push(`${label}: empty — extractor did not match`);
}

const required = {
  diagnostics: ["id", "title", "capabilities", "levels"],
  decisions: ["id", "title", "nodes"],
  antiPatterns: ["id", "name", "whereItAppears", "whyItsBad", "whatToDoInstead"],
  glossary: ["term", "domain", "definition"],
};
const check = (label, list, fields) => {
  for (const item of list) {
    const missing = fields.filter(f => {
      const v = item[f];
      return v === undefined || v === null || v === "" ||
             (Array.isArray(v) && !v.length) ||
             (v && typeof v === "object" && !Array.isArray(v) && !Object.keys(v).length);
    });
    if (missing.length) problems.push(`${label}[${item.id || item.term}]: blank ${missing.join(", ")}`);
  }
};
check("diagnostics", diagnostics, required.diagnostics);
check("decisions", decisions, required.decisions);
check("anti-patterns", antiPatterns, required.antiPatterns);
check("glossary", glossary, required.glossary);

if (problems.length) {
  console.error("");
  for (const p of problems) console.error(`  FAIL  ${p}`);
  console.error("");
  process.exit(1);
}
console.log("");
