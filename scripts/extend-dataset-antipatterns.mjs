#!/usr/bin/env node
/* extend-dataset-antipatterns.mjs — links controls to the failure modes in the
 * catalogue, and refuses to let a link point at nothing.
 *
 *   node scripts/extend-dataset-antipatterns.mjs
 *
 * Six entries in the anti-pattern catalogue were reachable only by scrolling
 * /anti-patterns/ — no control pointed at them, so the reader most likely to
 * need one (someone reading the control it applies to) never saw it. That is
 * a wiring problem, not a writing problem, and it is fixed here.
 *
 * What this deliberately does NOT do is invent failure modes for the controls
 * that lack one. A plausible-sounding anti-pattern written from the outside is
 * exactly the content that makes a practitioner stop trusting the rest of the
 * page — and the whole value of this catalogue is that it reads like someone
 * who was in the room. The count of controls still missing one is reported
 * rather than quietly filled.
 *
 * Also validates that every anti_pattern slug resolves to a real anchor in
 * anti-patterns/index.html. A dead link here is a 404 inside the artefact a
 * reader is most likely to cite.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = join(ROOT, "dataset/dataset.json");
const CATALOGUE = join(ROOT, "anti-patterns/index.html");

/* Links added here — each one an existing catalogue entry finding the control
   it actually describes. No new prose. */
const LINK = {
  r041: "paved-path-no-adoption",  // the golden path nobody is on
  r046: "model-as-latest",         // unpinned model version as a supply-chain hole
  r012: "data-mesh-no-substrate",  // domain ownership without an enforcing platform
  r010: "lakehouse-as-swamp",      // storage without lineage
  r045: "ai-workshop-tourism",     // risk workshops that never produce a classification
};

/* sast-as-strategy stays unlinked on purpose. The vulnerability-management
   control it belongs to already carries sbom-shelfware, and the adjacent rows
   are about OS patching and allowlisting — neither is "a scanner running is
   not a security programme". Attaching it to the nearest-looking row would be
   the same failure as inventing an anti-pattern: it puts something in front of
   a reader that doesn't survive them thinking about it. It needs a SAST /
   code-scanning control in the dataset, which doesn't exist yet. */

const data = JSON.parse(readFileSync(PATH, "utf8"));
const html = readFileSync(CATALOGUE, "utf8");

const anchors = new Set([...html.matchAll(/<article class="ap" id="([^"]+)"/g)].map(m => m[1]));
const byId = new Map(data.rows.map(r => [r.id, r]));

const bad = [];
for (const [id, slug] of Object.entries(LINK)) {
  if (!byId.has(id)) bad.push(`unknown control: ${id}`);
  if (!anchors.has(slug)) bad.push(`${id} → no such anti-pattern: ${slug}`);
  const existing = byId.get(id)?.anti_pattern;
  if (existing && existing !== slug) bad.push(`${id} already links to ${existing}; refusing to overwrite`);
}
if (bad.length) {
  console.error("\n  ERROR:\n" + bad.map(b => `    ${b}`).join("\n") + "\n");
  process.exit(1);
}

let added = 0;
for (const [id, slug] of Object.entries(LINK)) {
  const row = byId.get(id);
  if (row.anti_pattern !== slug) { row.anti_pattern = slug; added++; }
}

/* Every link in the dataset, not just the ones added above, must resolve. */
const dead = data.rows
  .filter(r => r.anti_pattern && !anchors.has(r.anti_pattern))
  .map(r => `${r.id} → ${r.anti_pattern}`);
if (dead.length) {
  console.error(`\n  ERROR: anti-pattern links pointing at nothing:\n${dead.map(d => `    ${d}`).join("\n")}\n`);
  process.exit(1);
}

writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

const linked = data.rows.filter(r => r.anti_pattern).length;
const used = new Set(data.rows.map(r => r.anti_pattern).filter(Boolean));
const orphan = [...anchors].filter(a => !used.has(a));

console.log(`\n  ${added} link(s) added`);
console.log(`  ${linked} of ${data.rows.length} controls carry a failure mode`);
console.log(`  ${used.size} of ${anchors.size} catalogue entries are reachable from a control`);
if (orphan.length) console.log(`  still unreachable: ${orphan.join(", ")}`);
console.log(`  ${data.rows.length - linked} controls have none — reported, not invented\n`);
