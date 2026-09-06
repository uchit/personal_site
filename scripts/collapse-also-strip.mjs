#!/usr/bin/env node
/* collapse-also-strip.mjs — collapses the second also-strip group ("More on
 * this site", 9 links) behind a <details> disclosure, leaving "Reference"
 * (7 links) visible. 16 links in one dense, divider-heavy row was reported
 * as cluttered — same disclosure pattern already used for the dataset page's
 * filter chips and the dependency graph's regulation filter.
 *
 *   node scripts/collapse-also-strip.mjs
 *
 * Matches on the "More on this site" group's link content specifically
 * (confirmed byte-identical across all 85 pages that have it, aside from
 * indentation) rather than assuming a fixed indentation level.
 */
import { readFileSync, writeFileSync, globSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = globSync("**/*.html", { cwd: ROOT })
  .filter(f => !f.startsWith("node_modules") && !f.startsWith("oss-projects"));

const RE = /<div class="also-grp">(\s*)<span class="lab">More on this site<\/span>([\s\S]*?<\/nav>)\s*<\/div>/;

let changed = 0;
for (const file of files) {
  const full = join(ROOT, file);
  const src = readFileSync(full, "utf8");
  const m = src.match(RE);
  if (!m) continue;

  const replacement =
    `<details class="also-grp also-more">${m[1]}<summary class="lab">More on this site</summary>${m[2]}\n      </details>`;
  const next = src.replace(RE, replacement);
  if (next === src) continue;
  writeFileSync(full, next);
  changed++;
}

console.log(`${changed} file(s) — "More on this site" collapsed behind a disclosure`);
