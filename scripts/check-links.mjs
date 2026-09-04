#!/usr/bin/env node
/* check-links.mjs — every internal <a href>, <img src> and <link href> must
 * resolve to a real file on disk.
 *
 *   node scripts/check-links.mjs
 *
 * Off-site (http/https to another host), mailto:, tel:, and same-page (#hash)
 * links are skipped — those aren't filesystem targets. A link with a #hash
 * onto another page only has its page part checked, not the anchor.
 */
import { readFileSync, globSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = globSync("**/*.html", { cwd: ROOT })
  .filter(f => !f.startsWith("node_modules") && !f.startsWith("oss-projects"));

function resolves(target) {
  const p = target.replace(/^\//, "").split(/[#?]/)[0];
  if (!p) return true; // "/" or "" or "#..." on the same page
  if (existsSync(join(ROOT, p))) return true;
  if (existsSync(join(ROOT, p, "index.html"))) return true;
  return false;
}

/* /v1/* is served by the Cloudflare Worker in worker/benchmark, routed at the
   edge (Cloudflare dashboard, not this repo) — never a static file here. */
const NOT_STATIC = [/^\/v1\//];

let checked = 0, broken = 0, external = 0;
for (const file of files) {
  const src = readFileSync(join(ROOT, file), "utf8");
  const dir = dirname(file);

  for (const m of src.matchAll(/<(?:a|link)\s[^>]*\shref="([^"]+)"|<img\s[^>]*\ssrc="([^"]+)"/g)) {
    const raw = m[1] || m[2];
    if (/^(https?:)?\/\//i.test(raw)) continue;
    if (/^(mailto|tel|javascript):/i.test(raw)) continue;
    if (raw.startsWith("#")) continue;
    if (NOT_STATIC.some(re => re.test(raw))) { external++; continue; }

    checked++;
    const target = raw.startsWith("/") ? raw : join(dir, raw).replace(/^\.\//, "");
    if (!resolves(target)) {
      console.error(`  BROKEN LINK  ${file} -> ${raw}`);
      broken++;
    }
  }
}

if (broken) { console.error(`\n  ${broken} broken link(s) of ${checked} checked\n`); process.exit(1); }
console.log(`\n  ${checked} internal link(s)/image(s) checked across ${files.length} pages, all resolve`);
console.log(`  ${external} edge-routed (not a static file, not checked here)\n`);
