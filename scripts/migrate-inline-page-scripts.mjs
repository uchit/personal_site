#!/usr/bin/env node
/* migrate-inline-page-scripts.mjs — moves each page's inline <script> block
 * (Diag.run configs, window.TREE configs, one-off calculator/page logic) into
 * an external file under js/pages/, referenced via <script src defer>.
 *
 *   node scripts/migrate-inline-page-scripts.mjs
 *
 * One-time CSP-hardening migration. Skips application/ld+json blocks and any
 * <script> that already has a src — idempotent, safe to rerun.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "js/pages");
mkdirSync(OUT_DIR, { recursive: true });

const files = execSync("find . -name '*.html' -not -path './oss-projects/*'", { cwd: ROOT })
  .toString().trim().split("\n").filter(Boolean).map(f => f.replace(/^\.\//, ""));

const SCRIPT_RE = /<script(\s+[^>]*)?>([\s\S]*?)<\/script>/gi;

function slugFor(file) {
  let s = file.replace(/\.html$/, "");
  s = s.replace(/\/index$/, "");
  s = s.replace(/\//g, "-");
  return s || "home";
}

let changed = 0;
for (const file of files) {
  const full = join(ROOT, file);
  const src = readFileSync(full, "utf8");

  const matches = [];
  let m;
  SCRIPT_RE.lastIndex = 0;
  while ((m = SCRIPT_RE.exec(src))) {
    const attrs = m[1] || "";
    if (/\bsrc\s*=/i.test(attrs)) continue;
    if (/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    matches.push(m);
  }
  if (!matches.length) continue;

  const baseSlug = slugFor(file);
  let next = src;
  matches.forEach((match, idx) => {
    const suffix = matches.length > 1 ? `-${idx + 1}` : "";
    const jsRelPath = `js/pages/${baseSlug}${suffix}.js`;
    writeFileSync(join(ROOT, jsRelPath), match[2]);
    const replacement = `<script src="/${jsRelPath}" defer></script>`;
    next = next.replace(match[0], replacement);
  });

  writeFileSync(full, next);
  changed++;
}

console.log(`${changed} file(s) migrated; extracted scripts written to js/pages/`);
