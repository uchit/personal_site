#!/usr/bin/env node
/* add-search-nav-link.mjs — inserts a "Search" link into the shared primary
 * nav, right after the "Writing" link, on every page that has one.
 *
 *   node scripts/add-search-nav-link.mjs
 *
 * The nav markup isn't byte-identical across pages (a "current page" class
 * moves between links), so this anchors on the one substring verified stable
 * across 86 of 88 pages: `href="/writing/">Writing</a>`. The 2 without it are
 * cv-servicenow-presales.html (gitignored, never deployed) and an unpublished
 * draft under letters/_drafts/ — both intentionally skipped.
 */
import { readFileSync, writeFileSync, globSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = globSync("**/*.html", { cwd: ROOT })
  .filter(f => !f.startsWith("node_modules") && !f.startsWith("oss-projects"));

const ANCHOR = 'href="/writing/">Writing</a>';
const INSERT = '<a href="/search/">Search</a>';

let changed = 0;
for (const file of files) {
  const full = join(ROOT, file);
  const src = readFileSync(full, "utf8");
  if (!src.includes(ANCHOR)) continue;
  if (src.includes('href="/search/">Search</a>')) continue; // idempotent

  const next = src.replace(ANCHOR, ANCHOR + INSERT);
  writeFileSync(full, next);
  changed++;
}

console.log(`${changed} file(s) got a Search nav link`);
