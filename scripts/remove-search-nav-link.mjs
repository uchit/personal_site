#!/usr/bin/env node
/* remove-search-nav-link.mjs — strips the "Search" nav link sitewide.
 * Pagefind full-text search is being removed in favor of Ask alone — the two
 * solved the same problem (find something on the site) and having both was
 * exactly the kind of redundant-feature bloat this pass is cutting.
 *
 *   node scripts/remove-search-nav-link.mjs
 */
import { readFileSync, writeFileSync, globSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = globSync("**/*.html", { cwd: ROOT })
  .filter(f => !f.startsWith("node_modules") && !f.startsWith("oss-projects"));

const TARGET = '<a href="/search/">Search</a>';

let changed = 0;
for (const file of files) {
  const full = join(ROOT, file);
  const src = readFileSync(full, "utf8");
  if (!src.includes(TARGET)) continue;
  writeFileSync(full, src.split(TARGET).join(""));
  changed++;
}

console.log(`${changed} file(s) — Search nav link removed`);
