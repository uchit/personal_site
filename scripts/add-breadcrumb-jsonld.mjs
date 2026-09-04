#!/usr/bin/env node
/* add-breadcrumb-jsonld.mjs — derives a BreadcrumbList JSON-LD block from each
 * page's existing visual <nav class="crumb">...</nav> and inserts it right
 * after the page's TechArticle JSON-LD.
 *
 *   node scripts/add-breadcrumb-jsonld.mjs
 *
 * Scope: case-studies/*.html and writing/*.html (articles + their index) —
 * the pages with a canonical Home > Section > Page breadcrumb and an existing
 * TechArticle block to sit next to. Idempotent: skips a file that already has
 * a BreadcrumbList.
 */
import { readFileSync, writeFileSync, globSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://hellouchit.com";

const files = [
  ...globSync("case-studies/*.html", { cwd: ROOT }),
  ...globSync("writing/*.html", { cwd: ROOT }),
];

let changed = 0;
for (const file of files) {
  const full = join(ROOT, file);
  const src = readFileSync(full, "utf8");
  if (/"@type":\s*"BreadcrumbList"/.test(src)) continue;

  const navMatch = src.match(/<nav class="crumb[^"]*"[^>]*>([\s\S]*?)<\/nav>/);
  if (!navMatch) { console.warn(`  no crumb nav found — skipped: ${file}`); continue; }
  const inner = navMatch[1];

  const items = [];
  for (const m of inner.matchAll(/<a[^>]*\shref="([^"]+)"[^>]*>([^<]+)<\/a>/g)) {
    const href = m[1].startsWith("http") ? m[1] : SITE + (m[1].startsWith("/") ? m[1] : "/" + m[1]);
    items.push({ name: m[2].trim(), url: href });
  }
  // Trailing <span>Current Page</span> (no href) — the page itself.
  const tail = inner.match(/<span class="[^"]*">([^<]+)<\/span>\s*$/);
  const canonicalMatch = src.match(/<link rel="canonical" href="([^"]+)"/);
  const selfUrl = canonicalMatch ? canonicalMatch[1] : SITE + "/" + file.replace(/index\.html$/, "");
  if (tail) items.push({ name: tail[1].trim(), url: selfUrl });

  if (items.length < 2) { console.warn(`  fewer than 2 crumb items — skipped: ${file}`); continue; }

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };

  const block = `  <script type="application/ld+json">\n${JSON.stringify(breadcrumb, null, 2)
    .split("\n").map((l, i) => i === 0 ? l : "  " + l).join("\n")}\n  </script>\n`;

  // Insert right after the existing TechArticle ld+json block, if present;
  // otherwise before </head>.
  const techArticleEnd = src.search(/"@type":\s*"TechArticle"[\s\S]*?<\/script>\n/);
  let next;
  if (techArticleEnd !== -1) {
    const insertAt = src.indexOf("</script>\n", techArticleEnd) + "</script>\n".length;
    next = src.slice(0, insertAt) + block + src.slice(insertAt);
  } else {
    next = src.replace("</head>", block + "</head>");
  }

  writeFileSync(full, next);
  changed++;
}

console.log(`${changed} file(s) got a BreadcrumbList block`);
