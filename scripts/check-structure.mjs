#!/usr/bin/env node
/* check-structure.mjs — fails the build if a page's skeleton is duplicated.
 *
 *   node scripts/check-structure.mjs
 *
 * This exists because of a bug that shipped and survived several builds
 * unnoticed. dataset/index.html contained THREE copies of its own page tail —
 * `</main>`, the step nav, the site-map strip and the footer — 5KB of injected
 * duplicate markup, invisible unless you counted.
 *
 * The cause is worth stating because it will happen again otherwise. Generated
 * content was passed to String.replace() as the replacement STRING:
 *
 *     html.replace(re, body)          // body came from dataset.json
 *
 * One of the verify commands contains `$'`, which .replace() treats as a
 * special pattern meaning "everything after the match". So the generator
 * substituted the entire remainder of the document into the middle of the page,
 * twice. The fix is to pass a function, which disables `$` interpretation:
 *
 *     html.replace(re, () => body)    // literal
 *
 * No amount of reading the generator would show this; only counting the output
 * does. Hence this check.
 *
 * It also catches the ordinary version of the same failure — a marker block
 * accidentally nested, or a hand-edit pasting a second footer.
 */

import { readFileSync, globSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* Elements that must appear at most once in a complete page. */
const SINGLETON = [
  ["</main>", /<\/main>/g],
  ["<footer", /<footer[\s>]/g],
  ["<h1", /<h1[\s>]/g],
  ["</html>", /<\/html>/g],
  ["also-strip", /<section class="also-strip"/g],
  ["nav.links", /<nav class="links"/g],
];

/* Marker pairs must be balanced 1:1 — an unmatched END is how a non-greedy
   replace silently leaves stale content behind. */
const MARKERS = [
  "DATASET-ROWS", "DATASET-COVERAGE", "DATASET-SEQUENCE",
  "DATASET-CHIPS-REG", "DATASET-CHIPS-CAT", "DATASET-CHIPS-SECTOR",
  "STEP-NAV",
];

const files = globSync("**/*.html", { cwd: ROOT }).filter(f => !f.startsWith("node_modules"));

let errors = 0;
let checked = 0;

for (const f of files) {
  const html = readFileSync(join(ROOT, f), "utf8");
  /* Fragments without <html> are not complete pages; skip them. */
  if (!/<html[\s>]/i.test(html)) continue;
  checked++;

  for (const [name, re] of SINGLETON) {
    const n = (html.match(re) || []).length;
    if (n > 1) {
      console.error(`  DUPLICATE  ${f}  ${name} x${n}`);
      errors++;
    }
  }

  for (const m of MARKERS) {
    const s = (html.match(new RegExp(`${m}:START`, "g")) || []).length;
    const e = (html.match(new RegExp(`${m}:END`, "g")) || []).length;
    if (s !== e) {
      console.error(`  UNBALANCED ${f}  ${m}  START x${s} END x${e}`);
      errors++;
    }
  }

  /* An attribute value that swallowed markup — the other half of the same bug,
     where an unescaped quote ends the attribute early. */
  if (/data-cmd="[^"]*<(?:div|span|section|footer|nav)\b/.test(html)) {
    console.error(`  BROKEN ATTR ${f}  data-cmd contains raw markup — check esc()`);
    errors++;
  }
}

console.log(`\n  ${checked} pages checked for duplicated structure`);
if (errors) {
  console.error(`  ${errors} problem(s)\n`);
  process.exit(1);
}
console.log("  no duplicated skeletons, all markers balanced\n");
