#!/usr/bin/env node
/* build-agents.mjs — generates /agents/ from the agent controls in the dataset.
 *
 *   node scripts/build-agents.mjs
 *
 * The ten agentic controls are the sharpest thing on this site and they were
 * rows 57–66 of a compliance table. Someone looking for "how do I run agents in
 * a regulated environment" had no reason to open a page called Dataset, and the
 * corpus that AI systems ingest mentioned them three times in 253KB.
 *
 * This gives them a home. It is GENERATED from dataset.json rather than written
 * beside it, for the usual reason: two copies of the same claim disagree the
 * moment one is edited, and the disagreement always surfaces in front of the
 * reader who cared enough to check both.
 *
 * The order presented is the derived dependency order — identity before what it
 * may do, before how far it may go — not a ranking.
 *
 * Note the step-nav block emitted below. build-step-nav.mjs stamps every page
 * with its position in The Method, but this file rewrites the page from
 * scratch, so running this generator alone silently stripped it — the same
 * trap that bit /situations/. Emitting it here makes the two order-independent
 * instead of relying on one always running after the other.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "dataset/dataset.json"), "utf8"));
const REG = data.regulations;

const rows = data.rows.filter(r => r.id.startsWith("agent-"));
if (rows.length < 5) {
  console.error("\n  ERROR: expected the agent-* controls in dataset.json\n");
  process.exit(1);
}
const byId = new Map(rows.map(r => [r.id, r]));

const esc = s => String(s ?? "")
  .replace(/&(?![a-zA-Z#0-9]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* Dependency waves restricted to the agent controls. r043 (cost attribution)
   is a prerequisite from outside this set; it is named, not silently dropped. */
const waves = [];
{
  const remaining = new Set(rows.map(r => r.id));
  let guard = 0;
  while (remaining.size && guard++ < 50) {
    const ready = [...remaining].filter(id =>
      (byId.get(id).depends_on ?? []).every(p => !remaining.has(p)));
    if (!ready.length) { console.error("\n  ERROR: cycle among agent controls\n"); process.exit(1); }
    waves.push(ready);
    ready.forEach(id => remaining.delete(id));
  }
}
const order = waves.flat();

const NUM = new Map(order.map((id, i) => [id, String(i + 1).padStart(2, "0")]));

function control(id) {
  const r = byId.get(id);
  const regs = r.reg.map(k => esc(REG[k]?.label ?? k)).join(" &middot; ");

  const prereq = (r.depends_on ?? [])
    .filter(p => byId.has(p))
    .map(p => `<a href="#${esc(p)}">${esc(byId.get(p).ctrl.split(/[—,(]/)[0].trim())}</a>`)
    .join(", ");
  const outside = (r.depends_on ?? []).filter(p => !byId.has(p));

  const verify = (r.verify ?? []).map(v => `
        <div class="ag-vfy">
          <div class="ag-vhead"><span class="ag-plat">${esc(v.platform)}</span>${
            v.checked ? `<span class="ag-ok">syntax checked</span>` : `<span class="ag-un">not checked here</span>`
          }</div>
          <pre class="ag-cmd"><code>${esc(v.run)}</code></pre>
          <p class="ag-exp"><b>Expect:</b> ${esc(v.expect)}</p>
        </div>`).join("");

  return `
      <article class="ag" id="${esc(r.id)}">
        <header class="ag-head">
          <span class="ag-num">${NUM.get(r.id)}</span>
          <h2>${esc(r.ctrl)}</h2>
          <span class="ag-surface">${esc(r.surface)}</span>
        </header>

        <div class="ag-body">
          <div class="ag-why">
            <span class="ix">Why this one</span>
            <p>${esc(r.notes)}</p>
          </div>

          <div class="ag-ev">
            <span class="ix">What an assessor asks for</span>
            <p>${esc(r.evidence)}</p>
          </div>
${verify ? `
          <div class="ag-verify">
            <span class="ix">Verify it &mdash; read-only</span>${verify}
          </div>` : ""}
          <div class="ag-meta">
            ${prereq || outside.length
              ? `<span><b>Needs first:</b> ${[prereq, ...outside.map(p => `<a href="/dataset/#reg=cps230">${esc(p)}</a> (outside this set)`)].filter(Boolean).join(", ")}</span>`
              : `<span><b>Needs first:</b> nothing &mdash; this can start today</span>`}
            ${r.anti_pattern ? `<span><b>Fails as:</b> <a href="/anti-patterns/#${esc(r.anti_pattern)}">${esc(r.anti_pattern.replace(/-/g, " "))}</a></span>` : ""}
            <span><b>Maps to:</b> ${regs}</span>
          </div>
        </div>
      </article>`;
}

const waveList = waves.map((w, i) => `
          <li>
            <b>Wave ${i + 1}</b>
            <span>${w.map(id => `<a href="#${esc(id)}">${esc(byId.get(id).ctrl.split(/[—,(]/)[0].trim())}</a>`).join(" &middot; ")}</span>
          </li>`).join("");

const jsonld = {
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "@id": "https://hellouchit.com/agents/#article",
  headline: "Ten controls for running agents in a regulated environment",
  description:
    "The controls that decide whether an agent deployment survives contact with an auditor: own identity, tool authorisation outside the model, declared autonomy levels, replayable trajectories, bounded blast radius, action reversibility, indirect prompt-injection defence, cross-agent provenance and cost per resolved task.",
  author: { "@id": "https://hellouchit.com/#person" },
  publisher: { "@id": "https://hellouchit.com/#person" },
  isBasedOn: "https://hellouchit.com/dataset/dataset.json",
  license: "https://creativecommons.org/licenses/by/4.0/",
  dateModified: data.version,
  about: rows.map(r => ({ "@type": "Thing", name: r.ctrl })),
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Running agents in regulated environments &mdash; ten controls &mdash; Uchit Vyas</title>
<meta name="description" content="Ten controls that decide whether an agent deployment survives an audit: own workload identity, tool authorisation outside the model, declared autonomy per action class, replayable trajectories, bounded blast radius and a tested kill switch, action reversibility, indirect prompt-injection defence, cross-agent provenance, and cost per resolved task. With the evidence each one produces. CC BY 4.0." />
<link rel="canonical" href="https://hellouchit.com/agents/" />
<meta name="theme-color" content="#0c0d10" />
<link rel="icon" href="/images/favicon.svg?v=2" type="image/svg+xml" />
<meta property="og:type" content="article" />
<meta property="og:title" content="Running agents in regulated environments — ten controls" />
<meta property="og:description" content="The tool registry is the security boundary; the system prompt is a suggestion. Ten controls, the evidence each produces, and the order to build them in." />
<meta property="og:image" content="https://hellouchit.com/images/og-banner.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/css/site.css" />
<link rel="stylesheet" href="/css/enhance.css" />
<link rel="stylesheet" href="/css/agents.css" />
<link rel="stylesheet" href="/css/print.css" media="print" />
<script src="/js/site.js" defer></script>
<script src="/js/enhance.js" defer></script>
<script type="application/ld+json">${JSON.stringify(jsonld, null, 2)}</script>

  <!-- Google Analytics 4 — G-XKE8WPKMMX -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XKE8WPKMMX"></script>
  <script>
  window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());gtag('config','G-XKE8WPKMMX',{anonymize_ip:true});
  </script>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <div class="bg-fx" aria-hidden="true"></div><div class="grid-fx" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
  <header class="nav" role="banner"><div class="wrap nav-inner">
    <a href="/" class="brand"><span class="monogram">UV</span><span class="blab"><b>Uchit Vyas</b><span>Architecture &middot; Cloud &middot; GenAI</span></span></a>
    <nav class="links"><a href="/#about">About</a><a href="/#work">Work</a><a href="/tools/">The Method</a><a href="/writing/">Writing</a><a href="/#contact" class="nav-cta">Get in touch</a></nav>
    <button class="menu-btn mono" aria-label="Open menu" aria-expanded="false">&equiv;</button>
  </div></header>

  <main id="main" tabindex="-1">
    <section class="ag-hero"><div class="wrap">
      <nav class="crumb"><a href="/">Home</a><span>/</span><a href="/tools/">The Method</a><span>/</span><span class="cur">Agents</span></nav>
      <span class="eyebrow">Agentic systems &middot; CC BY 4.0</span>
      <h1>The tool registry is the security boundary. The system prompt is a <em>suggestion</em>.</h1>
      <p class="dek">
        Ten controls that decide whether an agent deployment survives contact
        with an auditor &mdash; and, mostly, whether it survives contact with
        production. Each one carries the evidence it has to produce, what it
        needs built first, and how it fails when someone declares it instead of
        enforcing it.
      </p>
      <div class="ag-facts">
        <span>Controls <b>${rows.length}</b></span>
        <span>Waves <b>${waves.length}</b></span>
        <span>Machine-readable <b><a href="/dataset/dataset.json">JSON</a></b></span>
        <span>Licence <b>CC BY 4.0</b></span>
      </div>
    </div></section>

    <section class="ag-order"><div class="wrap">
      <h2>Build them in this <em>order</em>.</h2>
      <p>
        Identity before what it may do, before how far it may go. This is
        derived from prerequisites &mdash; an edge means doing one without the
        other is incoherent, not that one matters more. <b>Nothing inside a wave
        is ordered</b>; it can all start at once.
      </p>
      <ol class="ag-waves">${waveList}
      </ol>
    </div></section>

    <section class="ag-list"><div class="wrap">${order.map(control).join("\n")}
    </div></section>

    <section class="ag-foot"><div class="wrap">
      <h2>Where this comes <em>from</em>.</h2>
      <p>
        These are ten rows of a larger control dataset &mdash; ${data.rows.length} controls
        across ${Object.keys(REG).length} regulations, with the tooling that implements each and
        the read-only command that produces its evidence. This page is generated
        from that dataset, so the two cannot disagree.
      </p>
      <p>
        <b>None of it is a compliance assessment.</b> It maps controls to
        evidence so a team starts from something concrete rather than a blank
        page. Take it, fork it, argue with it &mdash; it is CC BY 4.0.
      </p>
      <div class="ag-links">
        <a class="ag-cta" href="/dataset/">Browse the full dataset &rarr;</a>
        <a class="ag-cta ghost" href="/tools/agent-readiness.html">Score your own agent programme &rarr;</a>
      </div>
    </div></section>
  </main>

  <!-- STEP-NAV:START — generated by scripts/build-step-nav.mjs -->
  <nav class="step-nav" aria-label="Position in The Method">
    <div class="wrap">
      <a class="lab" href="/tools/">The Method</a>
      <div class="row">
        <a href="/tools/#s2">&larr; 02 Locate it</a>
        <b>03 &middot; Check it</b>
        <a href="/tools/#s4">04 Decide it &rarr;</a>
      </div>
    </div>
  </nav>
  <!-- STEP-NAV:END -->

  <footer class="foot"><div class="wrap foot-inner">
    <span><span class="foot-ix">&copy;</span> Uchit Vyas &middot; Melbourne, AU &middot; <span class="foot-disc" style="opacity:.6">personal site, views my own, not my employer&rsquo;s</span></span>
    <span><a href="/">&larr; Home</a> &middot; <a href="/glossary/">Glossary</a> &middot; <a href="/dataset/">Dataset</a> &middot; <a href="/tools/">The Method</a></span>
  </div></footer>
</body>
</html>
`;

mkdirSync(join(ROOT, "agents"), { recursive: true });
writeFileSync(join(ROOT, "agents/index.html"), html, "utf8");

console.log(`\n  agents/index.html — ${rows.length} controls in ${waves.length} waves`);
console.log(`    ${waves.map((w, i) => `wave ${i + 1}: ${w.length}`).join("  ")}`);
console.log(`    ${rows.filter(r => r.verify).length} with a verify command, ${rows.filter(r => r.anti_pattern).length} with a named failure mode\n`);
