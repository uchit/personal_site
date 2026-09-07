/* dashboard.js — one page for everything saved on this device: the 7
 * diagnostics, the cross-diagnostic substrate-gap synthesis, and the 7
 * decision trees. Previously three separate destinations (/tools/compound/,
 * /decisions/architecture/, and a scorecard embedded on /tools/) computing
 * overlapping views of the same underlying idea — "what have you told this
 * site about your org." Consolidated into one, computed entirely from
 * DiagStorage + DecisionStorage; no manual URL-pasting UI needed now that
 * diagnostics save their raw per-question answers.
 */
(function () {
  "use strict";
  if (!window.DiagStorage || !window.DecisionStorage) return;

  const DIAGS = [
    { slug: "agent-readiness", name: "Agent Readiness", url: "/tools/agent-readiness.html" },
    { slug: "genai-readiness", name: "GenAI Readiness", url: "/tools/genai-readiness.html" },
    { slug: "devsecops-maturity", name: "DevSecOps Maturity", url: "/tools/devsecops-maturity.html" },
    { slug: "cloud-cost", name: "Cloud Cost", url: "/tools/cloud-cost.html" },
    { slug: "platform-engineering", name: "Platform Engineering", url: "/tools/platform-engineering.html" },
    { slug: "ea-operating-model", name: "EA Operating Model", url: "/tools/ea-operating-model.html" },
    { slug: "sre-programme", name: "SRE Programme", url: "/tools/sre-programme.html" },
  ];

  const LAYERS = [
    { id: "compute-platform", name: "Compute platform", url: "/decisions/compute-platform.html" },
    { id: "tenancy-model", name: "Tenancy model", url: "/decisions/tenancy-model.html" },
    { id: "service-decomposition", name: "Service decomposition", url: "/decisions/service-decomposition.html" },
    { id: "service-communication", name: "Service communication", url: "/decisions/service-communication.html" },
    { id: "policy-engine", name: "Policy engine", url: "/decisions/policy-engine.html" },
    { id: "ai-gateway", name: "AI gateway", url: "/decisions/ai-gateway.html" },
    { id: "llm-integration-pattern", name: "LLM integration pattern", url: "/decisions/llm-integration-pattern.html" },
  ];

  /* Substrate map: each diagnostic answers a different domain but probes the
     same five substrate capabilities. agent-readiness has no map (it wasn't
     part of the original compound tool's scope) — it still shows in the plain
     scorecard, just not in this synthesis. */
  const SUBSTRATE_DIAG = {
    "devsecops-maturity": { n: 10, map: { 1: "identity", 6: "identity", 8: "observability", 9: "observability", 4: "ownership", 5: "policy", 2: "policy" } },
    "genai-readiness": { n: 12, map: { 1: "data", 7: "observability", 9: "ownership", 10: "ownership", 6: "policy", 5: "policy", 4: "policy" } },
    "cloud-cost": { n: 8, map: { 5: "observability", 6: "ownership", 7: "policy" } },
    "platform-engineering": { n: 10, map: { 3: "observability", 6: "ownership", 7: "policy" } },
    "ea-operating-model": { n: 8, map: { 4: "policy", 5: "ownership", 6: "ownership" } },
    "sre-programme": { n: 10, map: { 9: "observability", 4: "ownership", 0: "observability" } },
  };
  const SUBSTRATE_NAMES = {
    identity: "Identity (workload + human)",
    observability: "Observability + audit evidence",
    policy: "Policy enforcement (encoded)",
    ownership: "Ownership + accountability",
    data: "Data lineage + governance",
  };

  const $ = s => document.querySelector(s);
  const diagResults = DiagStorage.all();
  const decisionResults = DecisionStorage.all();

  renderScorecard();
  renderSubstrate();
  renderArchitecture();
  wireClear();

  // ---------------- Diagnostics scorecard ----------------
  function renderScorecard() {
    const mount = $("#dash-diag");
    if (!mount) return;
    const done = DIAGS.filter(d => diagResults[d.slug]);
    if (!done.length) {
      mount.innerHTML = '<p class="dash-empty">No diagnostics run yet on this device. <a href="/tools/">Start with one →</a></p>';
      return;
    }
    const head = document.createElement("div");
    head.className = "dp-head";
    head.innerHTML = `<span>${done.length} of ${DIAGS.length} diagnostics run</span>`;
    mount.appendChild(head);

    const row = document.createElement("div");
    row.className = "dp-row";
    DIAGS.forEach(d => {
      const r = diagResults[d.slug];
      const a = document.createElement("a");
      a.className = "dp-pill" + (r ? " is-done" : "");
      a.href = r ? `${d.url}#${r.hash}` : d.url;
      a.innerHTML = `<span class="dp-name">${d.name}</span>` + (r ? `<span class="dp-level">${r.levelName}</span>` : "");
      row.appendChild(a);
    });
    mount.appendChild(row);
  }

  // ---------------- Substrate gap synthesis ----------------
  function renderSubstrate() {
    const section = $("#dash-substrate-section");
    const mount = $("#dash-substrate");
    if (!mount) return;

    const results = {};
    Object.entries(SUBSTRATE_DIAG).forEach(([slug, cfg]) => {
      const r = diagResults[slug];
      if (r && Array.isArray(r.answers) && r.answers.length === cfg.n) results[slug] = r.answers;
    });

    if (!Object.keys(results).length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;

    const substrateAgg = { identity: [], observability: [], policy: [], ownership: [], data: [] };
    Object.entries(results).forEach(([slug, ans]) => {
      Object.entries(SUBSTRATE_DIAG[slug].map).forEach(([qIdx, dim]) => {
        const v = ans[parseInt(qIdx, 10)];
        if (v && substrateAgg[dim]) substrateAgg[dim].push(v);
      });
    });
    const substrateAvg = {};
    Object.entries(substrateAgg).forEach(([dim, arr]) => {
      if (arr.length) substrateAvg[dim] = arr.reduce((a, b) => a + b, 0) / arr.length;
    });

    let total = 0, count = 0;
    Object.values(results).forEach(arr => arr.forEach(v => { total += v; count++; }));
    const compoundPct = count ? total / (count * 5) : 0;

    const TIERS = [
      [0.25, "Tier 1 · Siloed", "<b>Four projects.</b> The substrate doesn't yet exist as a shared capability. Each function delivers in isolation; almost no compound is visible across them."],
      [0.45, "Tier 2 · Coordinated", "<b>Shared backlog.</b> The four functions are talking, but the substrate is patchwork. Cycle times are long because every cross-cutting decision needs to be re-negotiated."],
      [0.65, "Tier 3 · Federated", "<b>Encoded principles.</b> Some substrate is enforced by policy and platform defaults. Federated decisions hold. The next jump is from <em>some</em> capabilities encoded to <em>most</em> capabilities inherited."],
      [0.85, "Tier 4 · Composed", "<b>Substrate-first.</b> Identity, observability, policy and audit are shared primitives. New use-cases inherit them by default. The four disciplines are visibly compounding."],
      [Infinity, "Tier 5 · Property", "<b>Invisible compound.</b> Substrate is a property of how you build, not a workstream. Squads consume it without thinking. You're in reference-customer territory; the work now is regression discipline."],
    ];
    const [, tier, thesis] = TIERS.find(t => compoundPct < t[0]);

    mount.innerHTML = "";
    const headline = document.createElement("div");
    headline.className = "cp-headline";
    headline.innerHTML = `<span class="lab">Compound tier</span><h2>Compound &mdash; <em>${tier}</em></h2><p>${thesis}</p>`;
    mount.appendChild(headline);

    const subSection = document.createElement("section");
    subSection.className = "cp-substrate";
    subSection.innerHTML = '<h3>Substrate signal — recurring across your diagnostics</h3><p class="help">Average maturity (1–5) across the substrate capabilities, derived from the matching questions in each diagnostic you ran. Lower = recurring gap.</p><div id="rSubstrate"></div>';
    mount.appendChild(subSection);
    const subEl = subSection.querySelector("#rSubstrate");
    const order = ["identity", "observability", "policy", "ownership", "data"];
    order.forEach(dim => {
      if (substrateAvg[dim] === undefined) return;
      const v = substrateAvg[dim];
      const row = document.createElement("div");
      row.className = "cp-sub-row";
      row.innerHTML = `<div class="name">${SUBSTRATE_NAMES[dim]}</div><div class="bar"><i></i></div><div class="score">L${v.toFixed(1)} · ${substrateAgg[dim].length} signal${substrateAgg[dim].length === 1 ? "" : "s"}</div>`;
      subEl.appendChild(row);
      const bar = row.querySelector(".bar i");
      requestAnimationFrame(() => {
        bar.style.width = (v / 5 * 100) + "%";
        bar.style.background = v < 2.5 ? "#e5736b" : v < 3.5 ? "var(--accent)" : "var(--signal)";
      });
    });

    const recSection = document.createElement("section");
    recSection.className = "cp-recs";
    recSection.innerHTML = "<h3>What this means — substrate moves</h3><ol></ol>";
    mount.appendChild(recSection);
    const FIXES = {
      identity: "Workload identity (OIDC / SPIFFE) as the universal authn primitive. Eliminate static credentials across services, data pipelines and AI gateways. See the <a href='/anti-patterns/#vault-theatre'>Vault Theatre</a> anti-pattern.",
      observability: "OpenTelemetry as the universal instrumentation, inherited by every new service. Per-decision audit evidence generated at decision time.",
      policy: "Policy-as-code (OPA / Kyverno) enforced at deploy. Encode your top 3 architecture principles as machine checks; subtract the rest. See the <a href='/anti-patterns/#pdf-principles'>PDF Principles</a> anti-pattern.",
      ownership: "Per-service ownership made explicit and visible. Cost regressions, CVE alerts and audit evidence routed to named owners — not to a central inbox.",
      data: "Catalogue + lineage + contracts as the shared substrate beneath BI, ML and AI.",
    };
    const weakest = Object.entries(substrateAvg).sort((a, b) => a[1] - b[1]).slice(0, 3);
    const ol = recSection.querySelector("ol");
    weakest.forEach(([dim]) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>${SUBSTRATE_NAMES[dim]}:</b> ${FIXES[dim]}`;
      ol.appendChild(li);
    });
  }

  // ---------------- Composite architecture ----------------
  function renderArchitecture() {
    const mount = $("#dash-arch");
    if (!mount) return;
    const done = LAYERS.filter(l => decisionResults[l.id]);
    const head = document.createElement("div");
    head.className = "arch-head";
    head.innerHTML = `<span>${done.length} of ${LAYERS.length} decisions made</span>`;
    mount.appendChild(head);

    const stack = document.createElement("div");
    stack.className = "arch-stack";
    LAYERS.forEach((layer, i) => {
      const r = decisionResults[layer.id];
      const card = document.createElement("a");
      card.className = "arch-card" + (r ? " is-decided" : "");
      card.href = r ? `${layer.url}#${r.hash}` : layer.url;
      card.innerHTML = `<span class="arch-name">${layer.name}</span><span class="arch-pick">${r ? r.title : "Not decided yet — open this tree"}</span>`;
      stack.appendChild(card);
      if (i < LAYERS.length - 1) {
        const connector = document.createElement("div");
        connector.className = "arch-connector";
        stack.appendChild(connector);
      }
    });
    mount.appendChild(stack);
  }

  // ---------------- Clear everything ----------------
  function wireClear() {
    const btn = $("#dash-clear");
    if (!btn) return;
    const hasAny = Object.keys(diagResults).length || Object.keys(decisionResults).length;
    btn.hidden = !hasAny;
    btn.addEventListener("click", () => {
      DiagStorage.clear();
      DecisionStorage.clear();
      location.reload();
    });
  }
})();
