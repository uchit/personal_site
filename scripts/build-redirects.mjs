#!/usr/bin/env node
/* build-redirects.mjs — turns retired pages into small redirect pages.
 *
 *   node scripts/build-redirects.mjs
 *
 * The site is served by GitHub Pages, which can't send real 301s. So each
 * retired URL keeps a tiny HTML file that forwards to the closest live page,
 * which keeps old links in LinkedIn posts, slides and search results working.
 * The original content of every retired page is in git history on main.
 *
 * To retire another page: add it to RETIRED and run this script.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const AGENTS = "/agents/";
const HOME = "/";
const RETIRED = {
  "case-studies/payment-platform.html": "/case-studies/#payment-platform",
  "case-studies/ea-governance.html": "/case-studies/#ea-governance",
  "case-studies/retail-modernisation.html": "/case-studies/#retail-modernisation",
  "case-studies/calibrated-assessment-agentic.html": "/case-studies/#calibrated-assessment-agentic",

  "talks/index.html": "/about/#talks",
  "press/index.html": "/about/",
  "how-i-work/index.html": "/about/",
  "4-discipline-stack/index.html": "/about/",
  "ai/index.html": "/about/",

  "tools/genai-readiness.html": "/tools/agent-readiness.html",
  "tools/index.html": "/tools/agent-readiness.html",
  "playbooks/vault-theatre-to-workload-identity.html": AGENTS,
  "playbooks/eu-ai-act-12-weeks.html": AGENTS,
  "reference-architectures/agentic-systems-regulated.html": AGENTS,
  "reference-architectures/regulated-genai-platform.html": AGENTS,
  "decisions/ai-gateway.html": AGENTS,
  "decisions/llm-integration-pattern.html": AGENTS,
  "decisions/policy-engine.html": AGENTS,
  "anti-patterns/index.html": AGENTS,
  "dataset/index.html": AGENTS,
  "dataset/graph/index.html": AGENTS,
  "for/index.html": AGENTS,
  "for/banks/index.html": AGENTS,
  "for/government/index.html": AGENTS,
  "for/healthcare/index.html": AGENTS,
  "for/critical-infrastructure/index.html": AGENTS,
  "situations/ai-pilot-stuck/index.html": AGENTS,
  "writing/genai-9-controls.html": AGENTS,
  "writing/forward-deployed-engineering-regulated.html": AGENTS,
  "writing/au-ai-safety-decoded.html": AGENTS,
};
for (const p of [
  "ask/index.html", "benchmark/index.html", "dashboard/index.html", "search/index.html",
  "decisions/index.html", "decisions/compute-platform.html", "decisions/service-communication.html",
  "decisions/service-decomposition.html", "decisions/tenancy-model.html",
  "frontier/index.html", "letters/index.html", "glossary/index.html", "observability/index.html",
  "oss/index.html", "reading/index.html", "security/index.html", "state-of-2026/index.html",
  "maturity/index.html", "maturity/cloud-cost-aware.html", "maturity/devsecops-repeatable.html",
  "maturity/ea-consultative.html", "maturity/genai-piloting.html", "maturity/platform-eng-emerging.html",
  "maturity/sre-operational.html",
  "playbooks/index.html", "playbooks/cisa-attestation-90-days.html", "playbooks/cloud-cost-aware-to-controlled.html",
  "reference-architectures/index.html", "reference-architectures/devsecops-paved-path.html",
  "reference-architectures/modern-data-platform.html", "reference-architectures/platform-engineering-idp.html",
  "situations/index.html", "situations/cloud-bill-out-of-control/index.html",
  "situations/deadline-no-architecture/index.html", "situations/platform-nobody-uses/index.html",
  "teardowns/index.html", "teardowns/claude-ai.html", "teardowns/linear.html", "teardowns/notion.html", "teardowns/vercel.html",
  "tools/cloud-cost.html", "tools/devsecops-maturity.html", "tools/ea-operating-model.html",
  "tools/platform-engineering.html", "tools/sre-programme.html",
  "tools/calculators/commitment-optimiser.html", "tools/calculators/error-budget.html", "tools/calculators/genai-cost.html",
  "writing/index.html", "writing/4-discipline-stack-essay.html", "writing/devsecops-is-supply-chain.html",
  "writing/encoded-enterprise-architect.html", "writing/platform-engineering-ai-moat.html",
]) RETIRED[p] ??= HOME;

const stub = to => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Moved | Uchit Vyas</title>
<!-- noindex: intentional. Retired page; see scripts/build-redirects.mjs. -->
<meta name="robots" content="noindex" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="canonical" href="https://hellouchit.com${to}" />
<meta http-equiv="refresh" content="0; url=${to}" />
<link rel="stylesheet" href="/css/main.css" />
</head>
<body>
<main class="section moved"><div class="wrap">
<h1 class="h2">This page has moved.</h1>
<p class="lede"><a href="${to}">Continue to the new page</a>.</p>
</div></main>
</body>
</html>
`;

for (const [path, to] of Object.entries(RETIRED)) {
  const out = join(ROOT, path);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, stub(to));
}
console.log(`  ${Object.keys(RETIRED).length} redirect page(s) written`);
