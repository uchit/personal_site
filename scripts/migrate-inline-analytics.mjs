#!/usr/bin/env node
/* migrate-inline-analytics.mjs — replaces every inline GA4 <script> block with
 * an external <script src=".../js/analytics.js" defer> tag.
 *
 *   node scripts/migrate-inline-analytics.mjs
 *
 * One-time CSP-hardening migration: the inline dataLayer/gtag block was
 * duplicated (with drift) across every page. Idempotent — files that no
 * longer have the inline block are skipped.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const files = execSync("find . -name '*.html' -not -path './oss-projects/*'", { cwd: ROOT })
  .toString().trim().split("\n").filter(Boolean).map(f => f.replace(/^\.\//, ""));

const BLOCK_RE = /<script>\s*\n\s*window\.dataLayer=window\.dataLayer\|\|\[\];[\s\S]*?<\/script>/;

let changed = 0;
for (const file of files) {
  const full = join(ROOT, file);
  const src = readFileSync(full, "utf8");
  if (!BLOCK_RE.test(src)) continue;

  const depth = relative(ROOT, dirname(full)) === "" ? 0 : 1;
  const scriptSrc = depth === 0 ? "js/analytics.js" : "/js/analytics.js";
  const replacement = `<script src="${scriptSrc}" defer></script>`;

  const next = src.replace(BLOCK_RE, replacement);
  if (next !== src) {
    writeFileSync(full, next);
    changed++;
  }
}

console.log(`${changed} file(s) migrated to external analytics.js`);
