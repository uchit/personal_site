#!/usr/bin/env node
/* build-coverage.mjs — derives how deeply each regulation is actually covered.
 *
 *   node scripts/build-coverage.mjs
 *
 * The dataset claims 28 regulations. That number is true and misleading in the
 * same breath: ISO 27001 has 26 mapped controls, IEC 62304 has one. An
 * architect who checks the regulation they care about, finds a single row, and
 * concludes the whole thing is thin is reading it correctly.
 *
 * So the depth is stated per regulation, in the data and on the page. The
 * important property is that it is DERIVED — counted from the rows at build
 * time and written into dataset.json. A completeness claim maintained by hand
 * starts lying the moment a row is added, and a dataset that lies about its
 * own coverage is worth less than no dataset.
 *
 * Tiers are deliberately coarse. The point is to stop someone wasting their
 * time, not to imply a precision the mapping doesn't have.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = join(ROOT, "dataset/dataset.json");
const data = JSON.parse(readFileSync(PATH, "utf8"));

/* Thresholds. A regulation needs enough mapped controls that following them
   is a defensible starting position rather than an anecdote. */
const TIERS = [
  { id: "mapped",     min: 8, label: "Mapped",     note: "Enough controls to work from as a starting position." },
  { id: "partial",    min: 4, label: "Partial",    note: "The main themes are covered; treat gaps as expected." },
  { id: "indicative", min: 1, label: "Indicative", note: "Illustrative only — not a basis for an assessment." },
];

const tierFor = n => TIERS.find(t => n >= t.min) ?? TIERS[TIERS.length - 1];

const counts = {};
for (const row of data.rows) {
  for (const k of row.reg) counts[k] = (counts[k] || 0) + 1;
}

/* A regulation declared in the metadata but mapped by no row at all is worse
   than a thin one — it is a claim with nothing behind it. Fail rather than
   quietly publish it. */
const orphans = Object.keys(data.regulations).filter(k => !counts[k]);
if (orphans.length) {
  console.error(`\n  ERROR: declared but unmapped regulations: ${orphans.join(", ")}`);
  console.error("  Either map at least one control or remove them from regulations.\n");
  process.exit(1);
}

const unknown = Object.keys(counts).filter(k => !data.regulations[k]);
if (unknown.length) {
  console.error(`\n  ERROR: rows reference regulations absent from metadata: ${unknown.join(", ")}\n`);
  process.exit(1);
}

const coverage = {};
for (const [k, n] of Object.entries(counts)) {
  const t = tierFor(n);
  coverage[k] = { controls: n, tier: t.id };
}

data.coverage = {
  generated_by: "scripts/build-coverage.mjs",
  tiers: TIERS.map(({ id, min, label, note }) => ({ id, min_controls: min, label, note })),
  by_regulation: Object.fromEntries(
    Object.entries(coverage).sort((a, b) => b[1].controls - a[1].controls)
  ),
};

writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

const byTier = {};
for (const [k, v] of Object.entries(coverage)) (byTier[v.tier] ||= []).push(k);

console.log(`\n  coverage derived from ${data.rows.length} controls across ${Object.keys(counts).length} regulations\n`);
for (const t of TIERS) {
  const list = (byTier[t.id] || []).sort((a, b) => counts[b] - counts[a]);
  console.log(`    ${t.label.padEnd(11)} ${String(list.length).padStart(2)}  ${list.map(k => `${k}(${counts[k]})`).join(" ")}`);
}
console.log("");
