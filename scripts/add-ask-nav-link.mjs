#!/usr/bin/env node
/* add-ask-nav-link.mjs — inserts an "Ask" link into the shared primary nav,
 * right after "Search" — same pattern as scripts/add-search-nav-link.mjs.
 *
 *   node scripts/add-ask-nav-link.mjs
 *
 * /ask/ launched contextually-linked-only (from /search/) on the theory that
 * it didn't need nav real estate. Real usage showed otherwise — nobody found
 * it. Anchors on `href="/search/">Search</a>`, verified stable across 90 of
 * 92 pages (same 2 exclusions as the Search rollout: a gitignored CV variant,
 * an unpublished draft).
 */
import { readFileSync, writeFileSync, globSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = globSync("**/*.html", { cwd: ROOT })
  .filter(f => !f.startsWith("node_modules") && !f.startsWith("oss-projects"));

const ANCHOR = 'href="/search/">Search</a>';
const INSERT = '<a href="/ask/">Ask</a>';

let changed = 0;
for (const file of files) {
  const full = join(ROOT, file);
  const src = readFileSync(full, "utf8");
  if (!src.includes(ANCHOR)) continue;
  if (src.includes('href="/ask/">Ask</a>')) continue; // idempotent

  const next = src.replace(ANCHOR, ANCHOR + INSERT);
  writeFileSync(full, next);
  changed++;
}

console.log(`${changed} file(s) got an Ask nav link`);
