#!/usr/bin/env node
/* check-routes.mjs — validates js/routes.js against the site on disk.
 *
 *   node scripts/check-routes.mjs
 *
 * Two failure modes this catches:
 *   1. A route pointing at a page that does not exist (or was renamed).
 *   2. A level name in the table that no diagnostic actually produces — a typo
 *      there fails silently at runtime, showing the reader no routes at all
 *      rather than throwing.
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/* routes.js assigns to window; give it one and eval in that scope. */
const win = {};
new Function("window", readFileSync(join(ROOT, "js/routes.js"), "utf8"))(win);
const TABLE = win.DIAG_ROUTES;

let errors = 0;
let checked = 0;
const external = [];

/* Routes may now point off-site — the agentcheck tool lives on GitHub and npm
   rather than being served from here, which is the whole point of it being
   listed somewhere third-party.
 *
 * Those cannot be verified against the filesystem, and verifying them over the
 * network would make an offline build fail for reasons that have nothing to do
 * with the change being built. So they are collected and printed instead:
 * never silently trusted, never silently failing. Same posture as the verify
 * commands in the dataset — "not checked here" is a fact, not a pass. */
function resolves(href) {
  if (/^https?:\/\//i.test(href)) { external.push(href); return true; }
  const p = href.replace(/^\//, "").split(/[#?]/)[0];
  if (!p) return true;
  if (existsSync(join(ROOT, p))) return true;
  if (existsSync(join(ROOT, p, "index.html"))) return true;
  if (p.endsWith("/") && existsSync(join(ROOT, p, "index.html"))) return true;
  return false;
}

/* Level names as the diagnostics actually declare them. */
function levelsOf(slug) {
  const candidates = [`tools/${slug}.html`, `tools/${slug}/index.html`];
  const file = candidates.find(f => existsSync(join(ROOT, f)));
  if (!file) return null;
  const src = readFileSync(join(ROOT, file), "utf8");
  return new Set(
    [...src.matchAll(/minPct:\s*[\d.]+\s*,\s*maxPct:\s*[\d.]+\s*,\s*name:\s*"([^"]+)"/g)]
      .map(m => m[1])
  );
}

for (const [slug, levels] of Object.entries(TABLE)) {
  const declared = levelsOf(slug);
  if (!declared) {
    console.error(`  MISSING DIAGNOSTIC  ${slug} — no tools/${slug}.html`);
    errors++;
    continue;
  }
  for (const [levelName, routes] of Object.entries(levels)) {
    if (!declared.has(levelName)) {
      console.error(`  UNKNOWN LEVEL       ${slug} → "${levelName}"`);
      console.error(`                      declared: ${[...declared].join(", ")}`);
      errors++;
    }
    for (const r of routes) {
      checked++;
      if (!resolves(r.href)) {
        console.error(`  BROKEN ROUTE        ${slug}/${levelName} → ${r.href}`);
        errors++;
      }
      for (const field of ["kind", "title", "body", "href"]) {
        if (!r[field]) {
          console.error(`  MISSING FIELD       ${slug}/${levelName} → ${field}`);
          errors++;
        }
      }
    }
  }
  /* A level with no routes renders an empty "Where to go next" heading, which
     reads worse than having no section. The engine hides it, but the gap is
     almost always an oversight rather than a decision. */
  for (const name of declared) {
    if (!levels[name]) {
      console.warn(`  no routes           ${slug} → "${name}"`);
    }
  }
}

console.log(`\n  ${checked} routes checked across ${Object.keys(TABLE).length} diagnostics`);
if (external.length) {
  const uniq = [...new Set(external)];
  console.log(`  ${uniq.length} off-site route target(s) not checked here:`);
  for (const u of uniq) console.log(`    ${u}`);
}
if (errors) {
  console.error(`  ${errors} error(s)\n`);
  process.exit(1);
}
console.log("  all routes resolve, all level names match\n");
