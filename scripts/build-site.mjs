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
 *             "nav": "about", "css": ["/css/tool.css"], "js": ["/js/x.js"],
 *             "schema": "article", "published": "2026-05-15", "updated": "2026-11-09",
 *             "crumb": "About"} -->
 *
 * SEO and AI-search metadata is generated here too, so every page gets the
 * same complete set: title, description, canonical, robots, Open Graph,
 * Twitter, article dates, and one JSON-LD @graph (Person, WebSite, the page
 * itself, breadcrumbs, plus Books, Dataset or WebApplication where they
 * apply). The build also writes sitemap.xml (with lastmod) and llms-full.txt
 * (the readable text of every indexable page, for AI crawlers).
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
const NAME = "Uchit Vyas";
const OG_IMAGE = `${SITE}/images/og-banner.jpg`;
const OG_ALT = "Uchit Vyas, lead forward deployed engineer: most enterprise AI never leaves the pilot. I get it into production.";

const NAV = [
  ["work", "/case-studies/", "Work"],
  ["agents", "/agents/", "AI agents"],
  ["about", "/about/", "About"],
  ["contact", "/#contact", "Contact"],
];
const PARENTS = { work: ["Work", "/case-studies/"], agents: ["AI agents", "/agents/"] };

/* Local CSS/JS get a content hash in the query string. Cloudflare caches
   assets for hours and a push doesn't purge it (docs/deploying.md); a new
   hash is a new URL, so a changed file is picked up immediately. */
const v = href => href.startsWith("/")
  ? `${href}?v=${createHash("sha1").update(readFileSync(join(ROOT, href))).digest("hex").slice(0, 8)}`
  : href;

const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
/* Decode the handful of entities the page sources use, in one pass so an
   already-decoded "&" is never decoded twice. Unknown entities are dropped. */
const ENTITIES = { "&rsquo;": "\u2019", "&lsquo;": "\u2018", "&ldquo;": "\u201c", "&rdquo;": "\u201d",
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&hellip;": "\u2026", "&nbsp;": " ", "&times;": "\u00d7" };
const plain = s => String(s).replace(/&[a-z]+;/gi, e => ENTITIES[e.toLowerCase()] ?? "");

/* ---------- Structured data ---------- */

const PERSON = {
  "@type": "Person",
  "@id": `${SITE}/#person`,
  name: NAME,
  givenName: "Uchit",
  familyName: "Vyas",
  url: `${SITE}/`,
  image: `${SITE}/images/uchit-portrait.jpg`,
  jobTitle: "Lead Forward Deployed Engineer",
  description: "Lead forward deployed engineer in Melbourne focused on AI-led enterprise transformation: taking AI from pilot to production in regulated companies, along with the data and core platforms it depends on.",
  email: "mailto:contact@hellouchit.com",
  address: { "@type": "PostalAddress", addressLocality: "Melbourne", addressRegion: "VIC", addressCountry: "AU" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "Gujarat University" },
  knowsAbout: [
    "Forward deployed engineering", "AI agents", "Agentic AI governance", "Generative AI in regulated industries",
    "Enterprise architecture", "Platform engineering", "DevSecOps", "Site reliability engineering",
    "Data platforms", "Cloud architecture", "Amazon Web Services", "Core banking modernisation",
    "EU AI Act", "NIST AI Risk Management Framework", "ISO/IEC 42001", "APRA CPS 230", "APRA CPS 234",
  ],
  sameAs: [
    "https://www.linkedin.com/in/uchitvyas/",
    "https://www.wikidata.org/entity/Q139971067",
    "https://medium.com/@uchit86",
    "https://patents.google.com/patent/US11334348B2/en",
  ],
};
const WEBSITE = {
  "@type": "WebSite",
  "@id": `${SITE}/#website`,
  url: `${SITE}/`,
  name: NAME,
  description: "Lead forward deployed engineer: case studies, ten controls for AI agents, and an agent readiness check.",
  inLanguage: "en-AU",
  publisher: { "@id": `${SITE}/#person` },
};
const PATENT = {
  "@type": "CreativeWork",
  "@id": `${SITE}/#patent`,
  name: "Utilizing machine learning to identify and correct differences in application programming interface (API) specifications",
  identifier: "US11334348B2",
  datePublished: "2022-05-17",
  url: "https://patents.google.com/patent/US11334348B2/en",
  creator: { "@id": `${SITE}/#person` },
};
const BOOKS = [
  ["Applied OpenStack Design Patterns", "Apress", "2016", "9781484224540", "https://link.springer.com/book/10.1007/978-1-4842-2454-0"],
  ["Mastering AWS Development", "Packt", "2015", "9781782173632", "https://www.packtpub.com/networking-and-servers/mastering-aws-development"],
  ["AWS Development Essentials", "Packt", "2014", "9781782173618", "https://www.packtpub.com/virtualization-and-cloud/aws-development-essentials"],
  ["DynamoDB Applied Design Patterns", "Packt", "2014", null, "https://www.packtpub.com/dynamodb-applied-design-patterns/book"],
  ["Mule ESB Cookbook", "Packt", "2013", "9781782164401", "https://www.packtpub.com/muleesb-to-build-enterprise-solutions-cookbook/book"],
].map(([name, publisher, year, isbn, url]) => ({
  "@type": "Book", name, datePublished: year, url,
  publisher: { "@type": "Organization", name: publisher },
  author: { "@id": `${SITE}/#person` },
  ...(isbn ? { isbn } : {}),
}));

function graph(meta, url, crumbs) {
  const OG_IMAGE = ogImage(meta);
  const ref = { "@id": `${SITE}/#person` };
  const pageId = `${url}#webpage`;
  const base = {
    "@id": pageId, url, name: plain(meta.title), description: plain(meta.description),
    inLanguage: "en-AU", isPartOf: { "@id": `${SITE}/#website` },
    primaryImageOfPage: { "@type": "ImageObject", url: OG_IMAGE, width: 1200, height: 630 },
    ...(meta.updated ? { dateModified: meta.updated } : {}),
  };
  const nodes = [WEBSITE, PERSON];
  const schema = meta.schema ?? "webpage";

  if (schema === "profile") {
    nodes.push({ "@type": "ProfilePage", ...base, mainEntity: ref, about: ref });
    nodes.push(PATENT, ...BOOKS);
  } else if (schema === "article") {
    nodes.push({ "@type": "WebPage", ...base, mainEntity: { "@id": `${url}#article` } });
    nodes.push({
      "@type": "Article", "@id": `${url}#article`, headline: plain(meta.title), description: plain(meta.description),
      image: OG_IMAGE, author: ref, publisher: ref, mainEntityOfPage: { "@id": pageId },
      datePublished: meta.published, dateModified: meta.updated ?? meta.published,
      inLanguage: "en-AU", ...(meta.about ? { about: meta.about.map(name => ({ "@type": "Thing", name })) } : {}),
    });
  } else if (schema === "collection") {
    nodes.push({ "@type": "CollectionPage", ...base, about: ref,
      mainEntity: { "@type": "ItemList", itemListElement: (meta.items ?? []).map((u, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + u })) } });
  } else if (schema === "controls") {
    nodes.push({ "@type": "WebPage", ...base, mainEntity: { "@id": `${url}#article` } });
    nodes.push({
      "@type": "TechArticle", "@id": `${url}#article`, headline: plain(meta.title), description: plain(meta.description),
      image: OG_IMAGE, author: ref, publisher: ref, mainEntityOfPage: { "@id": pageId },
      datePublished: meta.published, dateModified: meta.updated ?? meta.published, inLanguage: "en-AU",
      license: "https://creativecommons.org/licenses/by/4.0/",
      ...(meta.items ? { hasPart: { "@type": "ItemList", name: "Ten controls for AI agents", itemListOrder: "https://schema.org/ItemListOrderAscending",
        itemListElement: meta.items.map((name, i) => ({ "@type": "ListItem", position: i + 1, name })) } } : {}),
    });
    nodes.push({
      "@type": "Dataset", "@id": `${SITE}/dataset/dataset.json#dataset`, name: "Controls for running AI agents in regulated companies",
      description: "Machine-readable controls for AI agents, with the evidence an auditor will ask for, read-only verification commands, prerequisites and mappings to the EU AI Act, NIST AI RMF, ISO/IEC 42001 and APRA standards.",
      creator: ref, license: "https://creativecommons.org/licenses/by/4.0/", isAccessibleForFree: true,
      distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: `${SITE}/dataset/dataset.json` },
                     { "@type": "DataDownload", encodingFormat: "text/csv", contentUrl: `${SITE}/dataset/dataset.csv` }],
    });
  } else if (schema === "app") {
    nodes.push({ "@type": "WebPage", ...base, mainEntity: { "@id": `${url}#app` } });
    nodes.push({
      "@type": "WebApplication", "@id": `${url}#app`, name: plain(meta.title), description: plain(meta.description), url,
      applicationCategory: "BusinessApplication", operatingSystem: "Any (runs in the browser)", isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "AUD" }, author: ref,
    });
  } else if (schema === "home") {
    nodes.push({ "@type": "ProfilePage", ...base, mainEntity: ref, about: ref });
  } else {
    nodes.push({ "@type": "WebPage", ...base });
  }

  if (crumbs.length > 1) {
    nodes.push({ "@type": "BreadcrumbList", "@id": `${url}#breadcrumb`,
      itemListElement: crumbs.map(([name, href], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE + href })) });
    nodes.find(n => n["@id"] === pageId).breadcrumb = { "@id": `${url}#breadcrumb` };
  }
  return { "@context": "https://schema.org", "@graph": nodes };
}

/* Per-page social image (images/og/*.jpg, rendered from scripts/og-template.html),
   falling back to the homepage banner. */
const ogImage = meta => meta.ogImage ? SITE + meta.ogImage : OG_IMAGE;
const ogAlt = meta => meta.ogImage ? `${plain(meta.title)}. Uchit Vyas, lead forward deployed engineer.` : OG_ALT;

/* ---------- Page shell ---------- */

function shell(meta, body) {
  const path = meta.canonical ?? "/" + meta.out.replace(/index\.html$/, "");
  const url = SITE + path;
  const draft = /class="ph(?:-block)?"/.test(body);
  const noindex = draft || meta.noindex;
  const title = meta.title === NAME ? `${NAME}, lead forward deployed engineer` : `${meta.title} | ${NAME}`;
  const nav = NAV.map(([key, href, label]) =>
    `<a href="${href}"${meta.nav === key ? ' aria-current="page"' : ""}>${label}</a>`).join("\n        ");
  const css = (meta.css ?? []).map(h => `<link rel="stylesheet" href="${v(h)}" />`).join("\n");
  const js = (meta.js ?? []).map(h => `<script src="${v(h)}" defer></script>`).join("\n");

  const crumbs = [["Home", "/"]];
  if (path !== "/") {
    const parent = PARENTS[meta.nav];
    if (parent && parent[1] !== path) crumbs.push(parent);
    crumbs.push([meta.crumb ?? plain(meta.title), path]);
  }
  const ld = noindex ? "" : `<script type="application/ld+json">\n${JSON.stringify(graph(meta, url, crumbs), null, 1)}\n</script>`;
  const article = meta.schema === "article" || meta.schema === "controls";

  const head = [
    `<title>${esc(title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<meta name="author" content="${NAME}" />`,
    `<meta name="robots" content="${noindex ? "noindex" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"}" />`,
    `<meta name="theme-color" content="#000000" />`,
    `<link rel="canonical" href="${url}" />`,
    `<link rel="alternate" type="text/plain" title="AI-readable summary" href="${SITE}/llms.txt" />`,
    `<meta property="og:site_name" content="${NAME}" />`,
    `<meta property="og:locale" content="en_AU" />`,
    `<meta property="og:type" content="${article ? "article" : meta.ogType ?? "website"}" />`,
    `<meta property="og:title" content="${esc(meta.title === NAME ? title : meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${ogImage(meta)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="${esc(ogAlt(meta))}" />`,
    ...(article && meta.published ? [
      `<meta property="article:published_time" content="${meta.published}" />`,
      `<meta property="article:modified_time" content="${meta.updated ?? meta.published}" />`,
      `<meta property="article:author" content="${SITE}/about/" />`,
    ] : []),
    ...(meta.ogType === "profile" || meta.schema === "home" || meta.schema === "profile" ? [
      `<meta property="profile:first_name" content="Uchit" />`,
      `<meta property="profile:last_name" content="Vyas" />`,
    ] : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(meta.title === NAME ? title : meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
    `<meta name="twitter:image" content="${ogImage(meta)}" />`,
    `<meta name="twitter:image:alt" content="${esc(ogAlt(meta))}" />`,
  ].join("\n");

  return `<!DOCTYPE html>
<html lang="en-AU">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
${head}
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
      <a href="https://medium.com/@uchit86" rel="noopener">Medium</a>
    </nav>
  </div>
</footer>
</body>
</html>
`;
}

/* Readable text of a page body, for llms-full.txt. A small scanner rather
   than regexes, so tags are always removed completely and script/style
   content never leaks into the text. Inputs are this repo's own sources. */
const BLOCK = new Set(["p", "div", "dt", "dd", "figcaption", "pre", "section", "article", "ul", "ol", "br", "blockquote", "figure"]);
function toText(body) {
  let out = "", i = 0;
  const lower = body.toLowerCase();
  while (i < body.length) {
    if (body[i] !== "<") { out += body[i++]; continue; }
    const end = body.indexOf(">", i);
    if (end === -1) break;
    const tag = lower.slice(i + 1, end).trim();
    const name = tag.replace(/^\//, "").split(/[\s/]/)[0];
    if (!tag.startsWith("/") && (name === "script" || name === "style")) {
      const close = lower.indexOf("</" + name, end);
      i = close === -1 ? body.length : lower.indexOf(">", close) + 1 || body.length;
      continue;
    }
    if (/^h[1-3]$/.test(name)) out += tag.startsWith("/") ? "\n" : "\n\n## ";
    else if (name === "li" && !tag.startsWith("/")) out += "\n- ";
    else if (BLOCK.has(name)) out += "\n";
    i = end + 1;
  }
  return plain(out).replace(/[ \t]+/g, " ").replace(/\n /g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

const sources = globSync("src/pages/**/*.html", { cwd: ROOT }).sort();
const sitemap = [];
const corpus = [];
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
  const draft = /<meta name="robots" content="noindex"/.test(html);
  if (!draft && !meta.unlisted) {
    const loc = SITE + "/" + meta.out.replace(/index\.html$/, "");
    sitemap.push({ loc, lastmod: meta.updated, priority: meta.out === "index.html" ? "1.0" : "0.8" });
    corpus.push({ loc, title: plain(meta.title), description: plain(meta.description), text: toText(body) });
  }
  console.log(`  ${draft ? "noindex" : "built  "} ${meta.out}`);
}

sitemap.sort((a, b) => a.loc.localeCompare(b.loc));
writeFileSync(join(ROOT, "sitemap.xml"),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap.map(s => `  <url><loc>${s.loc}</loc>${s.lastmod ? `<lastmod>${s.lastmod}</lastmod>` : ""}<priority>${s.priority}</priority></url>`).join("\n")}
</urlset>
`);

corpus.sort((a, b) => (a.loc === SITE + "/" ? -1 : b.loc === SITE + "/" ? 1 : a.loc.localeCompare(b.loc)));
writeFileSync(join(ROOT, "llms-full.txt"),
`# ${NAME}: full text

> The readable text of every page on ${SITE}, generated from the page sources by scripts/build-site.mjs. The short manifest is ${SITE}/llms.txt. Controls data (CC BY 4.0): ${SITE}/dataset/dataset.json

${corpus.map(c => `---\n\n# ${c.title}\n\nURL: ${c.loc}\n\n${c.description}\n\n${c.text}\n`).join("\n")}`);

console.log(`  sitemap.xml and llms-full.txt: ${sitemap.length} indexable page(s)`);
