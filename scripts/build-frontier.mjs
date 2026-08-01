#!/usr/bin/env node
/* build-frontier.mjs — generates /frontier/.
 *
 *   node scripts/build-frontier.mjs
 *
 * The rest of this site documents the 2026 consensus: EU AI Act, NIST AI RMF,
 * ISO 42001. That makes someone a well-informed implementer. It does not make
 * them early.
 *
 * The failure mode of "frontier" writing is well known and this page is built
 * to avoid it. Name three papers, gesture at a trend, sound early, prove
 * nothing, age badly in six weeks. Unfalsifiable by construction.
 *
 * So every entry here obeys four rules:
 *
 *   1. IT NAMES A CONTROL. Not "here is an interesting paper" but "this moves
 *      control 07, in this direction." The pairing is the only thing here that
 *      someone without a published control set cannot write.
 *
 *   2. IT SAYS WHICH WAY. validates / complicates / invalidates. An entry that
 *      only ever validates the author's existing position is marketing.
 *
 *   3. THE SOURCE IS PRIMARY AND CHECKED. Author, publisher, date, link. Every
 *      claim below was read at the source, not taken from a summary — see the
 *      note at the bottom of the page for three that did not survive that.
 *
 *   4. IT DATES ITSELF. An entry is a claim made on a day, and it stays on the
 *      page when it ages badly.
 *
 * Entries are ordered newest first and the source date is shown, not the date
 * it was added here, because the gap between those two is itself information.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(ROOT, "dataset/dataset.json"), "utf8"));
const agents = new Map(
  data.rows.filter(r => r.id.startsWith("agent-")).map(r => [r.id, r.ctrl]));

const esc = s => String(s ?? "")
  .replace(/&(?![a-zA-Z#0-9]+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/* effect: "validates" | "complicates" | "invalidates" */
const ENTRIES = [
  {
    id: "bounded-system-assumption",
    sourceDate: "2026-05-01",
    title: "The governance frameworks assume the thing they govern has edges",
    control: "agent-multi-agent-provenance",
    effect: "validates",
    what: `A smart-city accountability paper puts the structural problem plainly: the EU AI Act, the NIST AI RMF and ISO/IEC 42001 "all presume that the governed object is a bounded system." They were built around individual-system compliance. An agent that calls another agent, which calls a third, produces consequences that emerge from coordination no single assessment captures &mdash; and a resident harmed by cascading effects across three systems "has no single authority to hold accountable."`,
    soWhat: `This is the clearest statement I have seen of why cross-agent provenance has no regulatory home. Every framework a procurement team will name at you governs one system at a time. If you wait for a standard to require provenance across agents, you will wait past the incident that needed it.`,
    sources: [
      { name: "Butt, Iqbal &amp; Iqbal — Governing What the EU AI Act Excludes", pub: "arXiv:2605.01091", date: "1 May 2026",
        url: "https://arxiv.org/html/2605.01091v1" },
    ],
  },
  {
    id: "article-73-single-causality",
    sourceDate: "2026-01-13",
    title: "Article 73 incident reporting assumes one system caused it",
    control: "agent-multi-agent-provenance",
    effect: "validates",
    what: `The EU AI Act's serious-incident reporting guidelines become binding this month. Analysis of the draft finds they focus on "single-agent and single-occurrence failures, and assume a simplistic one-on-one causality map for AI-related incidents" &mdash; while the incidents that actually matter are "emergent, stemming not from a failure in one system (and attributable to one actor), but from system-level interaction." The draft also provides no structured pathway for third-party or whistleblower reporting.`,
    soWhat: `The reporting obligation lands regardless. If your agents compose and you cannot produce the upstream chain for a specific output, you will be answering an incident report with a description of your architecture instead of a trace. Build the join before you need it, because the regulation is not going to ask you for it until it does.`,
    sources: [
      { name: "Fern&aacute;ndez Ashman, Anwar &amp; Bie&#324;kiewicz — EU Regulations Are Not Ready for Multi-Agent AI Incidents", pub: "Tech Policy Press", date: "13 Jan 2026",
        url: "https://www.techpolicy.press/eu-regulations-are-not-ready-for-multiagent-ai-incidents/" },
    ],
  },
  {
    id: "provenance-standards-insufficient",
    sourceDate: "2026-06-28",
    title: "OpenTelemetry and W3C PROV-DM do not capture what an agent run is",
    control: "agent-trajectory-trace",
    effect: "complicates",
    what: `A survey of evidence tracing and execution provenance in LLM agents finds that the established traditions &mdash; W3C PROV-DM for provenance, OpenTelemetry for distributed traces &mdash; "add semantic and procedural objects that these traditions do not fully capture." The list of what falls through: retrieved passages, generated claims, tool-call rationales, memory items, natural-language observations, external state changes, and inter-agent messages.`,
    soWhat: `This complicates my own advice. I point people at the OpenTelemetry GenAI semantic conventions as the vendor-neutral shape to adopt early, and that is still the right first move &mdash; but it is a floor, not a ceiling. A team that implements the conventions and stops has a trace of the calls and not a record of the reasoning. Budget for the semantic layer on top rather than assuming the standard covers it.`,
    sources: [
      { name: "Wang et al. — From Agent Traces to Trust: A Survey of Evidence Tracing and Execution Provenance in LLM Agents", pub: "arXiv:2606.04990v4", date: "28 Jun 2026",
        url: "https://arxiv.org/html/2606.04990v4" },
    ],
  },
  {
    id: "containment-gap-2026",
    sourceDate: "2026-05-01",
    title: "Most organisations cannot stop an agent they have decided to stop",
    control: "agent-blast-radius",
    effect: "validates",
    what: `Kiteworks' 2026 Data Security and Compliance Risk Forecast reports that <b>60% of organisations cannot quickly terminate a misbehaving AI agent</b>, 63% cannot enforce purpose limitations on one, and 55% cannot isolate an AI system from sensitive networks. In the government sector the kill-switch number is worse.`,
    soWhat: `I wrote that the kill switch matters more than the ceiling and is almost never tested mid-run. This is the first population-level number I have seen attached to it, and it is worse than I would have guessed. Treat "we have a kill switch" as an untested claim until someone has run the game day, and record the time from decision to stop &mdash; that number is the control, not the switch.`,
    sources: [
      { name: "Kiteworks — 2026 Data Security and Compliance Risk Forecast", pub: "cited via agentmodeai.com", date: "May 2026",
        url: "https://agentmodeai.com/agent-kill-switch-containment-architecture/" },
    ],
    caveat: "Vendor-published survey. Read the direction, not the decimal — the sampling and the question wording are not public.",
  },
  {
    id: "cost-per-solved-task-spread",
    sourceDate: "2026-01-01",
    title: "Cost per solved task and cost per task differ by more than 10&times;",
    control: "agent-cost-per-outcome",
    effect: "validates",
    what: `Working from Aider's polyglot coding benchmark, per-task costs land around $0.028 for one model at a 72% pass rate and $0.129 for another at 88%. Normalised to <em>solved</em> tasks the range runs roughly $0.012 to $0.147 &mdash; an order of magnitude &mdash; and the cheapest per-task model is not the cheapest per solved task.`,
    soWhat: `This is the argument for the control in one table. Cost per token ranks models one way and cost per resolved task ranks them differently, because the failures you pay for and retry do not appear in the first number. Any agent FinOps conversation held in tokens is being held in the wrong unit.`,
    sources: [
      { name: "Ganglani — AI Agent Cost Per Task 2026, from Aider's polyglot benchmark", pub: "kunalganglani.com", date: "2026",
        url: "https://www.kunalganglani.com/blog/ai-agent-cost-per-task-2026" },
    ],
    caveat: "A coding benchmark, not your workload. The ratio is the transferable part; the absolute numbers are not.",
  },
];

/* Claims that were in search results, did not survive reading the source, and
   are named here rather than quietly dropped. This section is the reason to
   trust the rest of the page. */
const REJECTED = [
  {
    claim: `"The NIST AI RMF, ISO/IEC 42001 and the EU AI Act contain no references to 'agent' or 'agentic'."`,
    why: `Appeared in a search summary attributed to arXiv:2605.01091. The paper does not say it. Its actual claim is that the frameworks "presume that the governed object is a bounded system" — weaker, and defensible. The stronger version is the kind of thing a reader checks in ninety seconds.`,
  },
  {
    claim: `"A 5× retry multiplier pushes cost per successful task from $5.73 to $28.65."`,
    why: `Attributed by a search summary to an article that does not contain those figures, or any retry-multiplier calculation. Unable to locate a primary source, so it is not on the page — the underlying point about retries is made from the benchmark spread instead.`,
  },
  {
    claim: `"CISA, the NSA and allied agencies issued joint agentic-AI guidance in April 2026."`,
    why: `Surfaced in a search summary; not present in the source it was attributed to, and not verified elsewhere. Possibly true and still not citable by me.`,
  },
];

const EFFECT = {
  validates:   { label: "Validates", note: "supports a control already on the site" },
  complicates: { label: "Complicates", note: "makes existing advice partly wrong" },
  invalidates: { label: "Invalidates", note: "the control needs rewriting" },
};

const bad = ENTRIES.filter(e => !agents.has(e.control));
if (bad.length) {
  console.error(`\n  ERROR: entries name controls that do not exist: ${bad.map(e => e.control).join(", ")}\n`);
  process.exit(1);
}

const sorted = [...ENTRIES].sort((a, b) => b.sourceDate.localeCompare(a.sourceDate));
const fmt = d => new Date(d + "T00:00:00Z").toLocaleDateString("en-GB", { year: "numeric", month: "short", timeZone: "UTC" });

const entryHtml = e => `
      <article class="fr" id="${esc(e.id)}">
        <header class="fr-head">
          <time datetime="${esc(e.sourceDate)}">${esc(fmt(e.sourceDate))}</time>
          <span class="fr-eff fr-${esc(e.effect)}" title="${esc(EFFECT[e.effect].note)}">${esc(EFFECT[e.effect].label)}</span>
          <a class="fr-ctrl" href="/agents/#${esc(e.control)}">${esc(agents.get(e.control))}</a>
        </header>
        <h2>${e.title}</h2>
        <div class="fr-what"><p>${e.what}</p></div>
        <div class="fr-so">
          <span class="ix">What it changes</span>
          <p>${e.soWhat}</p>
        </div>
        ${e.caveat ? `<p class="fr-caveat"><b>Read it with:</b> ${esc(e.caveat)}</p>` : ""}
        <div class="fr-src">
          ${e.sources.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${s.name}</a> <span>${s.pub} &middot; ${esc(s.date)}</span>`).join("<br />")}
        </div>
      </article>`;

const jsonld = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": "https://hellouchit.com/frontier/#blog",
  name: "Frontier log",
  description:
    "Developments in agentic systems, each paired with the specific control it moves and whether it validates, complicates or invalidates it. Primary sources only.",
  author: { "@id": "https://hellouchit.com/#person" },
  publisher: { "@id": "https://hellouchit.com/#person" },
  blogPost: sorted.map(e => ({
    "@type": "BlogPosting",
    headline: e.title.replace(/&[a-z]+;/g, ""),
    datePublished: e.sourceDate,
    author: { "@id": "https://hellouchit.com/#person" },
    citation: e.sources.map(s => s.url),
  })),
};

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Frontier log &mdash; what moves the agent controls &mdash; Uchit Vyas</title>
<meta name="description" content="Developments in agentic systems, each paired with the specific control it moves and whether it validates, complicates or invalidates it. Primary sources, read at the source, with the claims that did not survive checking listed at the bottom." />
<link rel="canonical" href="https://hellouchit.com/frontier/" />
<meta name="theme-color" content="#0c0d10" />
<link rel="icon" href="/images/favicon.svg?v=2" type="image/svg+xml" />
<meta property="og:type" content="article" />
<meta property="og:title" content="Frontier log — what moves the agent controls" />
<meta property="og:description" content="Not a reading list. Every entry names the control it moves and says which way — including the ones that make my own advice partly wrong." />
<meta property="og:image" content="https://hellouchit.com/images/og-banner.jpg" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/css/site.css" />
<link rel="stylesheet" href="/css/enhance.css" />
<link rel="stylesheet" href="/css/agents.css" />
<link rel="stylesheet" href="/css/frontier.css" />
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
    <a href="/" class="brand"><span class="monogram">UV</span><span class="blab"><b>Uchit Vyas</b><span>Architecture &middot; Cloud &middot; Agents</span></span></a>
    <nav class="links"><a href="/#about">About</a><a href="/#work">Work</a><a href="/tools/">The Method</a><a href="/writing/">Writing</a><a href="/#contact" class="nav-cta">Get in touch</a></nav>
    <button class="menu-btn mono" aria-label="Open menu" aria-expanded="false">&equiv;</button>
  </div></header>

  <main id="main" tabindex="-1">
    <section class="ag-hero"><div class="wrap">
      <nav class="crumb"><a href="/">Home</a><span>/</span><a href="/agents/">Agents</a><span>/</span><span class="cur">Frontier</span></nav>
      <span class="eyebrow">Frontier log &middot; ${sorted.length} entries</span>
      <h1>Everything here names the control it <em>moves</em>.</h1>
      <p class="dek">
        A reading list proves you read. This is the other thing: each entry
        takes a development and says which of the <a href="/agents/">ten
        controls</a> it touches, and whether it <b>validates</b> that control,
        <b>complicates</b> it, or <b>invalidates</b> it. Pairing the two is the
        part that needs a published control set to write at all.
      </p>
      <p class="dek" style="margin-top:14px">
        Every claim below was read at the primary source. Three that did not
        survive that are <a href="#rejected">listed at the bottom</a>, because a
        page like this is only worth reading if you know what it rejects.
      </p>
    </div></section>

    <section class="fr-list"><div class="wrap">${sorted.map(entryHtml).join("\n")}
    </div></section>

    <section class="fr-rejected" id="rejected"><div class="wrap">
      <h2>What didn&rsquo;t make it, and <em>why</em>.</h2>
      <p>
        Each of these appeared in a search result, looked good, and failed on
        contact with the source. They are here because the useful signal from a
        page like this is not what it publishes &mdash; it is the ratio.
      </p>
      <ol class="fr-rej">
${REJECTED.map(r => `        <li>
          <p class="rc">${r.claim}</p>
          <p class="rw">${r.why}</p>
        </li>`).join("\n")}
      </ol>
    </div></section>

    <section class="ag-foot"><div class="wrap">
      <h2>How this stays <em>honest</em>.</h2>
      <p>
        Entries are dated by their <b>source</b>, not by when I added them, so
        the lag between the two is visible. Nothing is removed when it ages
        badly &mdash; an entry that turned out wrong is more useful than one
        that was quietly deleted. And an entry that only ever <em>validates</em>
        what I already published would be marketing, which is why the effect
        label is on every one.
      </p>
      <div class="ag-links">
        <a class="ag-cta" href="/agents/">The ten controls &rarr;</a>
        <a class="ag-cta ghost" href="/tools/agent-readiness.html">Score your own programme &rarr;</a>
      </div>
    </div></section>
  </main>

  <!-- STEP-NAV:START — generated by scripts/build-step-nav.mjs -->
  <nav class="step-nav" aria-label="Position in The Method">
    <div class="wrap">
      <a class="lab" href="/tools/">The Method</a>
      <div class="row">
        <a href="/tools/#s6">&larr; 06 Prove it</a>
        <b>07 &middot; Go deeper</b>
        <a href="/situations/">back to 01 Name it &rarr;</a>
      </div>
    </div>
  </nav>
  <!-- STEP-NAV:END -->

  <footer class="foot"><div class="wrap foot-inner">
    <span><span class="foot-ix">&copy;</span> Uchit Vyas &middot; Melbourne, AU &middot; <span class="foot-disc" style="opacity:.6">personal site, views my own, not my employer&rsquo;s</span></span>
    <span><a href="/">&larr; Home</a> &middot; <a href="/agents/">Agents</a> &middot; <a href="/dataset/">Dataset</a> &middot; <a href="/tools/">The Method</a></span>
  </div></footer>
</body>
</html>
`;

mkdirSync(join(ROOT, "frontier"), { recursive: true });
writeFileSync(join(ROOT, "frontier/index.html"), html, "utf8");

const byEffect = {};
for (const e of ENTRIES) byEffect[e.effect] = (byEffect[e.effect] || 0) + 1;
console.log(`\n  frontier/index.html — ${ENTRIES.length} entries, ${REJECTED.length} rejected claims listed`);
console.log(`    ${Object.entries(byEffect).map(([k, v]) => `${k}: ${v}`).join("  ")}`);
console.log(`    controls touched: ${new Set(ENTRIES.map(e => e.control)).size} of ${agents.size}\n`);
