#!/usr/bin/env node
/* build-site.mjs — wraps every page body in src/pages/ with the shared shell.
 *
 *   node scripts/build-site.mjs
 *
 * One header, one footer, one <head>, written once here. The old site drifted
 * because each page carried its own copy of the nav; this is the fix.
 *
 * Each source file starts with a JSON comment:
 *
 *   <!--page {"out": "about/index.html", "title": "About", "description": "...",
 *             "nav": "about", "css": ["/css/tool.css"], "js": ["/js/x.js"]} -->
 *
 * A page that contains a class="ph" placeholder is automatically marked
 * noindex, so a half-finished page can never be indexed (check-drafts.mjs
 * enforces the same rule in CI).
 */
import { readFileSync, writeFileSync, mkdirSync, globSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://hellouchit.com";

const NAV = [
  ["work", "/case-studies/", "Work"],
  ["agents", "/agents/", "AI agents"],
  ["about", "/about/", "About"],
  ["contact", "/#contact", "Contact"],
];

/* Local CSS/JS get a content hash in the query string. Cloudflare caches
   assets for hours and a push doesn't purge it (docs/deploying.md); a new
   hash is a new URL, so a changed file is picked up immediately. */
const v = href => href.startsWith("/")
  ? `${href}?v=${createHash("sha1").update(readFileSync(join(ROOT, href))).digest("hex").slice(0, 8)}`
  : href;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function shell(meta, body) {
  const url = SITE + (meta.canonical ?? "/" + meta.out.replace(/index\.html$/, ""));
  const draft = /class="ph(?:-block)?"/.test(body);
  const title = meta.title === "Uchit Vyas" ? meta.title : `${meta.title} | Uchit Vyas`;
  const nav = NAV.map(([key, href, label]) =>
    `<a href="${href}"${meta.nav === key ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ");
  const css = (meta.css ?? []).map(h => `<link rel="stylesheet" href="${v(h)}" />`).join("\n");
  const js = (meta.js ?? []).map(h => `<script src="${v(h)}" defer></script>`).join("\n");
  const ld = meta.jsonld ? `<script type="application/ld+json">\n${JSON.stringify(meta.jsonld, null, 2)}\n</script>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(meta.description)}" />
${draft ? '<meta name="robots" content="noindex" />\n' : ""}<meta name="theme-color" content="#000000" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="${meta.ogType ?? "website"}" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE}/images/og-banner.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="icon" href="/images/favicon.svg?v=3" type="image/svg+xml" />
<link rel="alternate icon" href="/images/favicon.ico" sizes="32x32" />
<link rel="apple-touch-icon" href="/images/favicon-192.png" />
<link rel="stylesheet" href="${v("/css/main.css")}" />
<link rel="stylesheet" href="${v("/css/dark.css")}" />
${css}
<script src="${v("/js/main.js")}" defer></script>
<script src="${v("/js/wow.js")}" defer></script>
${js}
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XKE8WPKMMX"></script>
<script src="${v("/js/analytics.js")}" defer></script>
${ld}
</head>
<body class="theme-${meta.theme ?? "dark"}">
<a class="skip" href="#main">Skip to content</a>
<header class="site-head">
  <div class="wrap">
    <a class="wordmark" href="/">Uchit Vyas</a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="nav" id="site-nav" aria-label="Main">
        ${nav}
    </nav>
  </div>
</header>
<main id="main">
${body.trim()}
</main>
<footer class="site-foot">
  <div class="wrap">
    <span>Uchit Vyas, Melbourne. Personal site; views are my own.</span>
    <nav aria-label="Footer">
      <a href="mailto:contact@hellouchit.com">contact@hellouchit.com</a>
      <a href="https://www.linkedin.com/in/uchitvyas/" rel="noopener">LinkedIn</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

const sources = globSync("src/pages/**/*.html", { cwd: ROOT });
const sitemap = [];
for (const f of sources) {
  const raw = readFileSync(join(ROOT, f), "utf8");
  const m = raw.match(/^<!--page\s+(\{[\s\S]*?\})\s*-->/);
  if (!m) { console.error(`  no <!--page {...} --> header in ${f}`); process.exit(1); }
  const meta = JSON.parse(m[1]);
  const body = raw.slice(m[0].length);
  const html = shell(meta, body);
  const out = join(ROOT, meta.out);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
  const draft = /noindex/.test(html.slice(0, 1200));
  if (!draft && !meta.unlisted) sitemap.push(SITE + "/" + meta.out.replace(/index\.html$/, ""));
  console.log(`  ${draft ? "draft " : "built "} ${meta.out}`);
}

writeFileSync(join(ROOT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.sort().map(u => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`);
console.log(`  sitemap.xml: ${sitemap.length} indexable page(s)`);
