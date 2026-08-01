#!/usr/bin/env node
/* build-situations.mjs — generates /situations/ from the definitions below.
 *
 *   node scripts/build-situations.mjs
 *
 * Why a generator: /for/ is sector-shaped (banks, government, healthcare,
 * critical infrastructure). That works for someone who already knows they are
 * a bank. It does not work for the reader who arrives with a problem — "we
 * have a deadline and no architecture" — because the problem is what they
 * would search for, and no page on the site was named after one.
 *
 * These pages are entry points, not new content. Every route points at
 * something that already exists; the value is the naming and the ordering.
 * Generated so all five stay structurally identical and the routes can be
 * link-checked in one pass.
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://hellouchit.com";

const SITUATIONS = [
  {
    slug: "deadline-no-architecture",
    summary: "A date committed externally, and the design underneath it does not exist yet. What to decide up front, and what to defer on purpose.",
    nav: "Deadline, no architecture",
    title: "There&rsquo;s a <em>hard deadline</em> and no architecture.",
    meta: "Regulatory date &middot; fixed scope &middot; no target state",
    dek: "A date has been committed externally &mdash; to a regulator, a board, a customer &mdash; and the design underneath it does not exist yet. The instinct is to start building and document later. That is usually right, and it is also how the next two years of rework get created.",
    symptoms: [
      "The date came from outside engineering and is not moving.",
      "Two or more teams are building against assumptions nobody has written down.",
      "&ldquo;We&rsquo;ll fix it after go-live&rdquo; has been said out loud more than once.",
      "There is a slide deck describing the target state and no artefact a developer can act on.",
    ],
    diagnosis: `<p>The failure mode here is almost never technical. It is that the
      decisions which constrain everything else &mdash; tenancy, decomposition,
      how services talk, where state lives &mdash; get made implicitly, by
      whoever writes code first, and then cost a re-platform to reverse.</p>
      <p>What actually helps under deadline is not more architecture. It is
      <b>deciding the four or five things that are expensive to change</b>,
      writing them down in a form that survives the project, and explicitly
      deferring everything else. The rest can be discovered.</p>`,
    routes: [
      { kind: "Decision trees", title: "The choices that are expensive to reverse", body: "Seven recurring decisions with the conditions that make each answer right. Work through the two or three that bind your build; skip the rest.", href: "/decisions/" },
      { kind: "Case study", title: "A payment platform in three months", body: "Multi-region payment rails against a hard regulatory deadline &mdash; what got decided up front, and what was deliberately left to discover.", href: "/case-studies/payment-platform.html" },
      { kind: "Diagnostic", title: "EA operating model", body: "Eight capabilities. Tells you whether your architecture function will be able to make decisions at the speed this deadline needs.", href: "/tools/ea-operating-model.html" },
      { kind: "Anti-pattern", title: "The architect-as-reviewer trap", body: "Under deadline, a review gate becomes the bottleneck teams route around. The alternative is an enablement clinic.", href: "/anti-patterns/#architect-as-reviewer" },
    ],
    caveat: "If the deadline is genuinely impossible, no architecture fixes it &mdash; and the most useful thing an architect does is say so early, in writing, with the specific scope that would have to move. Everything above assumes the date is hard but the scope has some give.",
  },
  {
    slug: "ai-pilot-stuck",
    summary: "The model works and the demo lands. It has been in front of risk for a quarter because nobody translated the obligation into engineering work.",
    nav: "AI pilot stuck at risk",
    title: "The AI pilot works. <em>Risk won&rsquo;t sign it off.</em>",
    meta: "Demo works &middot; legal blocked &middot; no path to production",
    dek: "The model does the thing. The demo lands well. And it has been sitting in front of risk, legal or compliance for a quarter with no clear list of what would unblock it &mdash; because nobody has translated the obligation into engineering work.",
    symptoms: [
      "The pilot has been &ldquo;two weeks from production&rdquo; for three months.",
      "Nobody can answer &ldquo;what happens if it gets this wrong for a customer?&rdquo; with evidence.",
      "There is no eval set &mdash; quality is assessed by someone trying it and being impressed.",
      "Prompts live in application code and change without review.",
      "Risk has asked for &ldquo;the audit trail&rdquo; and the honest answer is application logs.",
    ],
    diagnosis: `<p>Risk functions are rarely obstructing on principle. They are
      being asked to accept an obligation they cannot discharge, because the
      system produces no evidence they can point at later.</p>
      <p>The gap is almost always the same handful of controls: an eval set,
      versioned prompts, input and output guardrails, per-decision traceability,
      and a named human-oversight mechanism for whatever the model gets wrong.
      <b>None of those are model work.</b> They are platform work, and they are
      what turns &ldquo;trust us&rdquo; into something a regulator can check.</p>`,
    routes: [
      { kind: "Essay", title: "The nine controls that make GenAI defensible", body: "The gap between a demo and something a customer &mdash; and a regulator &mdash; can use. Mapped to NIST AI RMF, EU AI Act, ISO 42001 and OWASP LLM Top 10.", href: "/writing/genai-9-controls.html" },
      { kind: "Diagnostic", title: "GenAI readiness", body: "Twelve capabilities scored. Produces the specific list of what is missing, which is usually what risk has been trying to articulate.", href: "/tools/genai-readiness.html" },
      { kind: "Playbook", title: "EU AI Act high-risk readiness in 12 weeks", body: "Week-by-week with named gates. High-risk obligations bind from August 2026.", href: "/playbooks/eu-ai-act-12-weeks.html" },
      { kind: "Reference architecture", title: "Regulated GenAI platform", body: "The target-state with the audit surface designed in rather than retrofitted under deadline.", href: "/reference-architectures/regulated-genai-platform.html" },
    ],
    caveat: "Occasionally risk is right and the use-case should not ship &mdash; typically when an unreviewable model decision lands directly on a customer&rsquo;s credit, care or entitlement. The controls above make that judgement explicit rather than making it disappear.",
  },
  {
    slug: "platform-nobody-uses",
    summary: "Funded, built, and quietly bypassed. Adoption gets reported as a communications problem. It is not a communications problem.",
    nav: "Platform nobody uses",
    title: "You built a platform. <em>Teams route around it.</em>",
    meta: "Golden cage &middot; low adoption &middot; shadow tooling",
    dek: "There is an internal platform. It was funded, it was built, and the teams it was built for have quietly kept their own pipelines. Adoption metrics are reported as a communications problem. It is not a communications problem.",
    symptoms: [
      "Adoption is tracked as a percentage and the percentage is not moving.",
      "Teams describe the platform as something they have to comply with.",
      "The fastest path to production is still the one that bypasses it.",
      "The platform team hears about requirements after the fact.",
      "There is a mandate, and the mandate is doing the work that developer experience should be doing.",
    ],
    diagnosis: `<p>Platforms get routed around when using them is slower than not
      using them. That is the whole diagnosis, and it survives almost every
      attempt to explain it away as culture.</p>
      <p>The distinction that matters is <b>paved path versus golden cage</b>. A
      paved path is the easiest route to production and teams take it because it
      is easiest. A cage is a mandated route that is slower, and mandates buy
      compliance rather than adoption &mdash; which shows up later as shadow
      tooling nobody is securing.</p>`,
    routes: [
      { kind: "Diagnostic", title: "Platform engineering readiness", body: "Ten capabilities. The adoption questions are the ones that usually explain the gap.", href: "/tools/platform-engineering.html" },
      { kind: "Reference architecture", title: "Platform engineering IDP", body: "Golden paths over golden cages &mdash; the shape that gets adopted rather than mandated.", href: "/reference-architectures/platform-engineering-idp.html" },
      { kind: "Essay", title: "Platform engineering is the AI delivery moat", body: "Why this work compounds, and the argument for funding it properly rather than as a side project.", href: "/writing/platform-engineering-ai-moat.html" },
      { kind: "Anti-patterns", title: "The catalogue", body: "Several of the fifteen named failure modes are platform-adoption failures wearing different clothes.", href: "/anti-patterns/" },
    ],
    caveat: "Sometimes the platform is good and the org genuinely has too few teams to amortise it &mdash; five services do not need an IDP. Building the platform was then the wrong call, and the useful move is to shrink it to the two or three paved paths that pay for themselves.",
  },
  {
    slug: "cloud-bill-out-of-control",
    summary: "Finance is asking questions engineering cannot answer, and the last cost-cutting sprint bought three months before spend regrew.",
    nav: "Cloud bill out of control",
    title: "The cloud bill is growing <em>faster than the business</em>.",
    meta: "No owner &middot; no unit economics &middot; finance asking",
    dek: "Finance has started asking questions engineering cannot answer. The bill goes up every quarter, nobody can attribute it to a product decision, and the reflex &mdash; a cost-cutting sprint &mdash; buys three months before it grows back.",
    symptoms: [
      "Nobody can say what a single customer, transaction or feature costs to serve.",
      "Cost shows up as a monthly surprise rather than a signal attached to a deploy.",
      "There has already been at least one cost-cutting exercise, and spend recovered.",
      "Reserved capacity and commitments were sized on vendor advice rather than usage.",
      "AI features have started landing and nobody has modelled what they will cost at adoption.",
    ],
    diagnosis: `<p>Cost-cutting sprints fail for a structural reason: they treat
      spend as waste to remove rather than as a signal that is not reaching the
      people who create it. The bill regrows because the mechanism that produced
      it never changed.</p>
      <p>What moves it durably is boring and sequenced: <b>attribution first,
      ownership second, optimisation last</b>. Optimising before anyone owns the
      number produces a sawtooth graph and a tired platform team.</p>`,
    routes: [
      { kind: "Diagnostic", title: "Cloud cost maturity", body: "Eight capabilities. Where the bill actually escapes control &mdash; and it is rarely instance sizing.", href: "/tools/cloud-cost.html" },
      { kind: "Playbook", title: "Cloud cost: Aware to Controlled in a quarter", body: "Week-by-week with named gates. Written for the point where visibility exists but ownership does not.", href: "/playbooks/cloud-cost-aware-to-controlled.html" },
      { kind: "Calculator", title: "Commitment optimiser", body: "Size reservations and savings plans against real usage rather than a vendor&rsquo;s recommendation.", href: "/tools/calculators/commitment-optimiser.html" },
      { kind: "Calculator", title: "GenAI cost model", body: "Token spend is the fastest-growing line item in otherwise controlled estates. Model it before the feature ships, not after.", href: "/tools/calculators/genai-cost.html" },
    ],
    caveat: "If the bill is growing because the business is growing and unit cost is flat or falling, this is not a cost problem &mdash; and a cost programme will slow you down for nothing. Establish the unit metric first; it tells you whether there is anything to fix.",
  },
];

const NAV = `  <header class="nav" role="banner">
    <div class="wrap nav-inner">
      <a href="/" class="brand"><span class="monogram">UV</span><span class="blab"><b>Uchit Vyas</b><span>Architecture · Cloud · GenAI</span></span></a>
      <nav class="links"><a href="/#about">About</a><a href="/#work">Work</a><a href="/tools/">Explore</a><a href="/writing/">Writing</a><a href="/#contact" class="nav-cta">Get in touch</a></nav>
      <button class="menu-btn mono" aria-label="Open menu" aria-expanded="false">&equiv;</button>
    </div>
  </header>`;

const GA = `  <!-- Google Analytics 4 — G-XKE8WPKMMX -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-XKE8WPKMMX"></script>
  <script>
  window.dataLayer=window.dataLayer||[];
  function gtag(){dataLayer.push(arguments);}
  gtag('js',new Date());
  gtag('config','G-XKE8WPKMMX',{anonymize_ip:true});
  document.addEventListener('click',function(e){
    var a=e.target.closest('a');if(!a||!a.href)return;
    var u;try{u=new URL(a.href,location.href);}catch(_){return;}
    if(!u.hostname||u.hostname===location.hostname)return;
    var dest='outbound_click',h=u.hostname.replace(/^www\\./,'');
    if(/substack\\.com$/.test(h))dest='substack_click';
    else if(/linkedin\\.com$/.test(h))dest='linkedin_click';
    else if(/github\\.com$/.test(h))dest='github_click';
    gtag('event',dest,{link_url:a.href,link_domain:h,link_text:(a.innerText||'').slice(0,80)});
  });
  </script>`;

/* Step marker for The Method. Emitted here rather than only by
   build-step-nav.mjs because this generator overwrites its pages — a stamp
   applied afterwards is silently lost on the next regeneration, which has now
   happened once. Keep in sync with scripts/build-step-nav.mjs. */
const STEP_NAV = `  <!-- STEP-NAV:START — generated by scripts/build-step-nav.mjs -->
  <nav class="step-nav" aria-label="Position in The Method">
    <div class="wrap">
      <a class="lab" href="/tools/">The Method</a>
      <div class="row">
        <span class="edge">start of the arc</span>
        <b>01 &middot; Name it</b>
        <a href="/tools/#s2">02 Locate it &rarr;</a>
      </div>
    </div>
  </nav>
  <!-- STEP-NAV:END -->`;

const ALSO = `  <section class="also-strip" aria-label="More on this site">
    <div class="wrap">
      <span class="lab">Also on this site</span>
      <nav class="also-links">
        <a href="/situations/">Situations</a>
        <a href="/talks/">Talks</a>
        <a href="/letters/">Letters</a>
        <a href="/4-discipline-stack/">4-Discipline Stack</a>
        <a href="/reading/">Reading list</a>
        <a href="/state-of-2026/">State of 2026</a>
        <a href="/oss/">Open source</a>
        <a href="/press/">Press kit</a>
        <a href="/ai/">AI entity</a>
      </nav>
    </div>
  </section>`;

const FOOT = `  <footer class="foot"><div class="wrap foot-inner">
    <span><span class="foot-ix">&copy;</span> Uchit Vyas &middot; Melbourne, AU &middot; <span class="foot-disc" style="opacity:.6">personal site, views my own, not my employer&rsquo;s</span></span>
    <span><a href="/">&larr; Home</a> &middot; <a href="/situations/">All situations</a></span>
  </div></footer>`;

const head = (title, desc, canonical) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
<meta name="description" content="${desc}" />
<link rel="canonical" href="${canonical}" />
<meta name="theme-color" content="#0c0d10" />
<link rel="icon" href="/images/favicon.svg?v=2" type="image/svg+xml" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${desc}" />
<meta property="og:image" content="https://hellouchit.com/images/og-banner.jpg" />
<meta property="og:url" content="${canonical}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;0,9..144,700;1,9..144,400;1,9..144,500&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="/css/site.css" />
<link rel="stylesheet" href="/css/enhance.css" />
<link rel="stylesheet" href="/css/diagnostic.css" />
<script src="/js/site.js" defer></script>
<script src="/js/enhance.js" defer></script>
${GA}
</head>`;

const crumb = last => `      <nav class="crumb" style="display:flex;gap:8px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.12em;color:var(--faint);margin-bottom:20px"><a href="/" style="color:var(--muted)">Home</a><span style="opacity:.5">/</span><a href="/situations/" style="color:var(--muted)">Situations</a><span style="opacity:.5">/</span><span style="color:var(--accent)">${last}</span></nav>`;

function situationPage(s) {
  const plainTitle = s.title.replace(/<[^>]+>/g, "").replace(/&rsquo;/g, "’").replace(/&mdash;/g, "—");
  const desc = s.dek.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").slice(0, 180).trim();

  return `${head(`${plainTitle} — Uchit Vyas`, desc, `${SITE}/situations/${s.slug}/`)}
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <div class="bg-fx" aria-hidden="true"></div><div class="grid-fx" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
${NAV}

  <main id="main" tabindex="-1">
    <section style="padding:clamp(120px,14vw,176px) 0 clamp(28px,4vw,44px)"><div class="wrap">
${crumb(s.nav)}
      <span class="eyebrow">Situation</span>
      <h1 style="font-family:'Fraunces',serif;font-weight:500;font-size:clamp(38px,5.4vw,64px);line-height:1.04;letter-spacing:-.02em;margin-top:14px;max-width:20ch">${s.title.replace(/<em>/g, '<em style="font-style:italic;color:var(--accent)">')}</h1>
      <p style="margin-top:20px;color:var(--muted);font-size:clamp(16px,1.35vw,18.5px);line-height:1.7;max-width:62ch">${s.dek}</p>
      <div style="margin-top:22px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.08em;color:var(--faint)">${s.meta}</div>
    </div></section>

    <section style="padding:clamp(36px,4vw,52px) 0;border-top:1px solid var(--line)"><div class="wrap">
      <h2 style="font-family:'Fraunces',serif;font-weight:500;font-size:clamp(24px,3vw,32px);line-height:1.15;margin-bottom:20px">You&rsquo;ll recognise this if&hellip;</h2>
      <ul style="list-style:none;padding:0;margin:0;max-width:70ch">
${s.symptoms.map(x => `        <li style="position:relative;padding-left:28px;margin-bottom:12px;color:var(--muted);font-size:15.5px;line-height:1.65"><span style="position:absolute;left:4px;top:11px;width:13px;height:1px;background:var(--accent)"></span>${x}</li>`).join("\n")}
      </ul>
    </div></section>

    <section style="padding:clamp(36px,4vw,52px) 0;border-top:1px solid var(--line)"><div class="wrap">
      <h2 style="font-family:'Fraunces',serif;font-weight:500;font-size:clamp(24px,3vw,32px);line-height:1.15;margin-bottom:18px">What&rsquo;s usually <em style="font-style:italic;color:var(--accent)">actually</em> wrong.</h2>
      <div class="sit-diagnosis" style="max-width:68ch;color:var(--muted);font-size:16px;line-height:1.75">
${s.diagnosis.split("\n").map(l => "        " + l.trim()).join("\n")}
      </div>
    </div></section>

    <section style="padding:clamp(36px,4vw,52px) 0 clamp(20px,3vw,28px);border-top:1px solid var(--line)"><div class="wrap">
      <div class="routes-section" style="margin-top:0;padding-top:0;border-top:0">
        <h3>Start here</h3>
        <p class="dek">In order. The first is the single next thing to do; the rest are supporting depth.</p>
        <div class="routes-grid">
${s.routes.map(r => `          <a class="route-card" href="${r.href}">
            <div class="kind">${r.kind}</div>
            <div class="name">${r.title}</div>
            <div class="desc">${r.body}</div>
            <span class="go">Open &rarr;</span>
          </a>`).join("\n")}
        </div>
      </div>
    </div></section>

    <section style="padding:clamp(20px,3vw,28px) 0 clamp(80px,10vw,120px)"><div class="wrap">
      <div style="max-width:68ch;padding:20px 24px;border-left:2px solid var(--accent);background:var(--accent-soft);border-radius:0 8px 8px 0">
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;letter-spacing:.2em;color:var(--accent);text-transform:uppercase;margin-bottom:10px">When this framing is wrong</div>
        <p style="color:var(--muted);font-size:15px;line-height:1.7;margin:0">${s.caveat}</p>
      </div>
      <p style="margin-top:36px;color:var(--muted);font-size:14.5px;line-height:1.7">
        Different problem? <a href="/situations/" style="color:var(--accent);border-bottom:1px dotted var(--accent)">See all situations</a>,
        or browse by <a href="/for/" style="color:var(--accent);border-bottom:1px dotted var(--accent)">sector</a>.
      </p>
    </div></section>
  </main>

${STEP_NAV}

${ALSO}
${FOOT}
</body>
</html>
`;
}

function indexPage() {
  return `${head(
    "Situations — start from the problem — Uchit Vyas",
    "Entry points by problem rather than by sector: a hard deadline with no architecture, an AI pilot stuck at risk review, a platform nobody uses, a cloud bill growing faster than the business.",
    `${SITE}/situations/`)}
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <div class="bg-fx" aria-hidden="true"></div><div class="grid-fx" aria-hidden="true"></div><div class="grain" aria-hidden="true"></div>
${NAV}

  <main id="main" tabindex="-1">
    <section style="padding:clamp(120px,14vw,176px) 0 clamp(36px,4vw,56px)"><div class="wrap">
      <nav class="crumb" style="display:flex;gap:8px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.12em;color:var(--faint);margin-bottom:20px"><a href="/" style="color:var(--muted)">Home</a><span style="opacity:.5">/</span><span style="color:var(--accent)">Situations</span></nav>
      <span class="eyebrow">Start from the problem</span>
      <h1 style="font-family:'Fraunces',serif;font-weight:500;font-size:clamp(40px,6vw,72px);line-height:1.02;letter-spacing:-.02em;margin-top:14px;max-width:20ch">
        Named for what&rsquo;s <em style="font-style:italic;color:var(--accent)">actually going wrong</em>.
      </h1>
      <p style="margin-top:20px;color:var(--muted);font-size:clamp(16px,1.3vw,18px);line-height:1.7;max-width:62ch">
        <a href="/for/" style="color:var(--ink);border-bottom:1px dotted var(--accent)">The sector views</a>
        are for readers who already know they are a bank. These are for the ones
        who arrive with a problem instead &mdash; the four that recur most across
        engagements. Each names the symptoms, says what is usually actually
        wrong, and routes to the diagnostic, playbook or paved path that moves it.
      </p>
    </div></section>

    <section style="padding:clamp(40px,5vw,64px) 0 clamp(80px,10vw,128px);border-top:1px solid var(--line)"><div class="wrap">
      <div class="writing-grid">
${SITUATIONS.map(s => `        <a class="essay" href="/situations/${s.slug}/">
          <span class="essay-meta">${s.meta}</span>
          <h3>${s.title.replace(/<em>/g, "<em>")}</h3>
          <p>${s.summary}</p>
          <span class="essay-cta">Start here &rarr;</span>
        </a>`).join("\n")}
      </div>
      <p style="margin-top:48px;color:var(--muted);font-size:14.5px;line-height:1.7;max-width:66ch">
        These are entry points, not new material &mdash; every route points at
        something already on the site. If your situation is not here, the
        <a href="/tools/" style="color:var(--accent);border-bottom:1px dotted var(--accent)">diagnostics</a>
        are the fastest way to find out which one you are actually in.
      </p>
    </div></section>
  </main>

${STEP_NAV}

${ALSO}
${FOOT}
</body>
</html>
`;
}

/* ------------------------------------------------------------------- write */
mkdirSync(join(ROOT, "situations"), { recursive: true });
writeFileSync(join(ROOT, "situations/index.html"), indexPage(), "utf8");
console.log("  situations/index.html");

for (const s of SITUATIONS) {
  const dir = join(ROOT, "situations", s.slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), situationPage(s), "utf8");
  console.log(`  situations/${s.slug}/index.html`);
}

/* Every route must resolve, or these pages are worse than not existing. */
let bad = 0;
for (const s of SITUATIONS) {
  for (const r of s.routes) {
    const p = r.href.replace(/^\//, "").split("#")[0];
    const ok = existsSync(join(ROOT, p)) || existsSync(join(ROOT, p, "index.html"));
    if (!ok) { console.error(`  BROKEN  ${s.slug} -> ${r.href}`); bad++; }
  }
}
console.log(`\n  ${SITUATIONS.length} situations, ${SITUATIONS.reduce((n, s) => n + s.routes.length, 0)} routes`);
if (bad) { console.error(`  ${bad} broken\n`); process.exit(1); }
console.log("  all routes resolve\n");
