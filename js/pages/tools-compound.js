
/* ============ Compound synthesizer ============ */
/* Each diagnostic's question schema is described as substrate-capability mappings.
   Each cap maps a question index (0-based) to a substrate dimension.
   Substrate dimensions: identity, observability, policy, ownership, data. */

const DIAG = {
  devsecops: {
    n: 10,
    name: "DevSecOps Maturity",
    url: "/tools/devsecops-maturity.html",
    // question idx -> substrate dim
    map: { 1:"identity", 6:"identity", 8:"observability", 9:"observability", 4:"ownership", 5:"policy", 2:"policy" }
  },
  genai: {
    n: 12,
    name: "GenAI Readiness",
    url: "/tools/genai-readiness.html",
    map: { 1:"data", 7:"observability", 9:"ownership", 10:"ownership", 6:"policy", 5:"policy", 4:"policy" }
  },
  cloud: {
    n: 8,
    name: "Cloud Cost",
    url: "/tools/cloud-cost.html",
    map: { 5:"observability", 6:"ownership", 7:"policy" }
  },
  platform: {
    n: 10,
    name: "Platform Engineering",
    url: "/tools/platform-engineering.html",
    map: { 3:"observability", 6:"ownership", 7:"policy" }
  },
  ea: {
    n: 8,
    name: "EA Operating Model",
    url: "/tools/ea-operating-model.html",
    map: { 4:"policy", 5:"ownership", 6:"ownership" }
  },
  sre: {
    n: 10,
    name: "SRE Programme",
    url: "/tools/sre-programme.html",
    map: { 9:"observability", 4:"ownership", 0:"observability" }
  }
};

const SUBSTRATE_NAMES = {
  identity: "Identity (workload + human)",
  observability: "Observability + audit evidence",
  policy: "Policy enforcement (encoded)",
  ownership: "Ownership + accountability",
  data: "Data lineage + governance"
};

const $ = s => document.querySelector(s);

function parseHash(url, expected_n) {
  try {
    const u = new URL(url, location.origin);
    const m = u.hash.match(/^#a=([1-5]+)/);
    if (!m) return null;
    if (m[1].length !== expected_n) return null;
    return m[1].split("").map(Number);
  } catch { return null; }
}

function validateInputs() {
  let count = 0;
  Object.entries(DIAG).forEach(([k, d]) => {
    const el = $("#i-" + k);
    const v = el.value.trim();
    const old = el.nextElementSibling;
    if (old && old.classList.contains("ok") || old && old.classList.contains("bad")) old.remove();
    if (!v) return;
    const parsed = parseHash(v, d.n);
    const tag = document.createElement("span");
    if (parsed) { tag.className = "ok"; tag.textContent = "OK"; count++; }
    else { tag.className = "bad"; tag.textContent = "invalid"; }
    el.insertAdjacentElement('afterend', tag);
  });
  $("#count").textContent = count + " / 6 diagnostics";
  return count;
}

function compound() {
  const results = {};   // diagnostic -> answers
  Object.entries(DIAG).forEach(([k, d]) => {
    const v = $("#i-" + k).value.trim();
    if (!v) return;
    const parsed = parseHash(v, d.n);
    if (parsed) results[k] = parsed;
  });

  if (Object.keys(results).length === 0) {
    alert("Paste at least one diagnostic result URL.");
    return;
  }

  // Aggregate substrate dimensions across all diagnostics that ran
  const substrateAgg = { identity:[], observability:[], policy:[], ownership:[], data:[] };
  Object.entries(results).forEach(([k, ans]) => {
    const map = DIAG[k].map;
    Object.entries(map).forEach(([qIdx, dim]) => {
      const v = ans[parseInt(qIdx,10)];
      if (v && substrateAgg[dim]) substrateAgg[dim].push(v);
    });
  });

  // Compute averages
  const substrateAvg = {};
  Object.entries(substrateAgg).forEach(([dim, arr]) => {
    if (arr.length) substrateAvg[dim] = arr.reduce((a,b)=>a+b,0) / arr.length;
  });

  // Overall compound score = average of all answers we have
  let total = 0, count = 0;
  Object.values(results).forEach(arr => {
    arr.forEach(v => { total += v; count++; });
  });
  const compoundPct = count ? (total / (count*5)) : 0;

  // Compound tier interpretation
  let tier, thesis;
  if (compoundPct < 0.25) {
    tier = "Tier 1 · Siloed";
    thesis = "<b>Four projects.</b> The substrate doesn't yet exist as a shared capability. Each function delivers in isolation; almost no compound is visible across them.";
  } else if (compoundPct < 0.45) {
    tier = "Tier 2 · Coordinated";
    thesis = "<b>Shared backlog.</b> The four functions are talking, but the substrate is patchwork. Cycle times are long because every cross-cutting decision needs to be re-negotiated.";
  } else if (compoundPct < 0.65) {
    tier = "Tier 3 · Federated";
    thesis = "<b>Encoded principles.</b> Some substrate is enforced by policy and platform defaults. Federated decisions hold. The next jump is from <em>some</em> capabilities encoded to <em>most</em> capabilities inherited.";
  } else if (compoundPct < 0.85) {
    tier = "Tier 4 · Composed";
    thesis = "<b>Substrate-first.</b> Identity, observability, policy and audit are shared primitives. New use-cases inherit them by default. The four disciplines are visibly compounding.";
  } else {
    tier = "Tier 5 · Property";
    thesis = "<b>Invisible compound.</b> Substrate is a property of how you build, not a workstream. Squads consume it without thinking. You're in reference-customer territory; the work now is regression discipline.";
  }
  $("#rHeadline").innerHTML = "Compound &mdash; <em>" + tier + "</em>";
  $("#rThesis").innerHTML = thesis;

  // Substrate rows
  const sub = $("#rSubstrate");
  sub.replaceChildren();
  const order = ["identity","observability","policy","ownership","data"];
  order.forEach(dim => {
    if (substrateAvg[dim] === undefined) return;
    const v = substrateAvg[dim];
    const row = document.createElement("div");
    row.className = "cp-sub-row";
    row.innerHTML =
      `<div class="name">${SUBSTRATE_NAMES[dim]}</div>` +
      `<div class="bar"><i></i></div>` +
      `<div class="score">L${v.toFixed(1)} · ${substrateAgg[dim].length} signal${substrateAgg[dim].length===1?"":"s"}</div>`;
    sub.appendChild(row);
    const bar = row.querySelector(".bar i");
    requestAnimationFrame(() => {
      bar.style.width = (v/5*100) + "%";
      bar.style.background = v < 2.5 ? "#e5736b" : v < 3.5 ? "var(--accent)" : "var(--signal)";
    });
  });

  // Matrix per-discipline averages by substrate dim
  const matrix = $("#rMatrix");
  matrix.replaceChildren();
  Object.entries(results).forEach(([k, ans]) => {
    const map = DIAG[k].map;
    const row = document.createElement("tr");
    const dims = ["identity","observability","policy","ownership"];
    let html = `<td>${DIAG[k].name}</td>`;
    dims.forEach(dim => {
      const vals = Object.entries(map).filter(([_, d]) => d === dim).map(([i]) => ans[parseInt(i,10)]).filter(v => v);
      if (vals.length) {
        const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
        const c = Math.round(avg);
        html += `<td class="lvl${c}">L${avg.toFixed(1)}</td>`;
      } else html += `<td style="color:var(--faint)">—</td>`;
    });
    const total = ans.reduce((a,b)=>a+b,0);
    const overall = total / (ans.length * 5);
    const lc = Math.min(5, Math.max(1, Math.round(overall * 5)));
    html += `<td class="lvl${lc}">${(overall*100).toFixed(0)}%</td>`;
    row.innerHTML = html;
    matrix.appendChild(row);
  });

  // Recommendations — based on weakest substrate dim
  const recs = $("#rRecs");
  recs.replaceChildren();
  const sortedSubs = Object.entries(substrateAvg).sort((a,b) => a[1]-b[1]);
  const weakest = sortedSubs.slice(0, Math.min(3, sortedSubs.length));
  const fixes = {
    identity: "Workload identity (OIDC / SPIFFE) as the universal authn primitive. Eliminate static credentials across services, data pipelines and AI gateways. One pipeline migration becomes the template the rest inherit. See the <a href='/anti-patterns/#vault-theatre'>Vault Theatre</a> anti-pattern.",
    observability: "OpenTelemetry as the universal instrumentation, inherited by every new service. Per-decision audit evidence generated at decision time. The shared substrate that makes regulator-grade audit possible across all four disciplines.",
    policy: "Policy-as-code (OPA / Kyverno) enforced at deploy. Encode your top 3 architecture principles as machine checks; subtract the rest. See the <a href='/anti-patterns/#pdf-principles'>PDF Principles</a> anti-pattern.",
    ownership: "Per-service ownership made explicit and visible. Cost regressions, CVE alerts and audit evidence routed to named owners — not to a central inbox. Backstage scorecards or equivalent make this concrete.",
    data: "Catalogue + lineage + contracts as the shared substrate beneath BI, ML and AI. The data layer that AI consumes; without it, every GenAI use-case re-invents the data wiring."
  };
  weakest.forEach(([dim]) => {
    const li = document.createElement("li");
    li.innerHTML = "<b>" + SUBSTRATE_NAMES[dim] + ":</b> " + fixes[dim];
    recs.appendChild(li);
  });

  // Where to go next — routed by weakest substrate dimension rather than by
  // level. The compound view's whole argument is that the binding constraint
  // sits in the shared substrate, so the onward path has to address the layer
  // underneath rather than whichever discipline happened to score lowest.
  const SUBSTRATE_ROUTES = {
    identity: [
      { kind: "Playbook", title: "Vault theatre → workload identity",
        body: "The migration off long-lived secrets, in the order that keeps services up.",
        href: "/playbooks/vault-theatre-to-workload-identity.html" },
      { kind: "Reference architecture", title: "The DevSecOps paved path",
        body: "Where workload identity becomes the default every new service inherits.",
        href: "/reference-architectures/devsecops-paved-path.html" }
    ],
    observability: [
      { kind: "Reference", title: "Observability",
        body: "OpenTelemetry as the universal instrumentation, and what per-decision audit evidence requires.",
        href: "/observability/" },
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "Instrumentation inherited from the paved path rather than added per team.",
        href: "/reference-architectures/platform-engineering-idp.html" }
    ],
    policy: [
      { kind: "Decision tree", title: "OPA vs Kyverno vs Cedar",
        body: "Pick the enforcement engine deliberately before encoding principles into it.",
        href: "/decisions/policy-engine.html" },
      { kind: "Anti-pattern", title: "PDF principles",
        body: "Why architecture principles that live in documents do not survive contact with delivery.",
        href: "/anti-patterns/" }
    ],
    ownership: [
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "Scorecards and named owners — routing cost, CVE and audit signals to people rather than inboxes.",
        href: "/reference-architectures/platform-engineering-idp.html" },
      { kind: "Diagnostic", title: "EA operating model",
        body: "Ownership gaps are usually an operating-model problem before they are a tooling one.",
        href: "/tools/ea-operating-model.html" }
    ],
    data: [
      { kind: "Reference architecture", title: "Modern data platform",
        body: "Catalogue, lineage and contracts — the layer AI consumes and most estates skip.",
        href: "/reference-architectures/modern-data-platform.html" },
      { kind: "Reference architecture", title: "Regulated GenAI platform",
        body: "What sits on top once the data substrate is trustworthy.",
        href: "/reference-architectures/regulated-genai-platform.html" }
    ]
  };

  const routesEl = $("#rroutes");
  routesEl.replaceChildren();
  const seen = new Set();
  weakest.forEach(([dim]) => {
    (SUBSTRATE_ROUTES[dim] || []).forEach(r => {
      if (seen.has(r.href)) return;   // two weak dims often share a fix
      seen.add(r.href);
      const card = document.createElement("a");
      card.className = "route-card";
      card.href = r.href;
      const kind = document.createElement("div"); kind.className = "kind"; kind.textContent = r.kind;
      const name = document.createElement("div"); name.className = "name"; name.textContent = r.title;
      const desc = document.createElement("div"); desc.className = "desc"; desc.textContent = r.body;
      const go = document.createElement("span"); go.className = "go"; go.textContent = "Open →";
      card.append(kind, name, desc, go);
      routesEl.appendChild(card);
    });
  });
  $("#routes-section").toggleAttribute("hidden", routesEl.childElementCount === 0);

  // Show results
  $("#results").classList.add("show");
  $("#empty-state").style.display = "none";

  // Shareable URL
  const params = new URLSearchParams();
  Object.entries(DIAG).forEach(([k, d]) => {
    const v = $("#i-" + k).value.trim();
    if (v) {
      const parsed = parseHash(v, d.n);
      if (parsed) params.set(k, parsed.join(""));
    }
  });
  history.replaceState(null, "", "#" + params.toString());

  // Scroll results just below the sticky nav (not under it).
  requestAnimationFrame(() => {
    const r = $("#results");
    if (!r) return;
    const navH = (document.querySelector("header.nav")?.offsetHeight) || 64;
    const top = r.getBoundingClientRect().top + window.scrollY - navH - 16;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  });
}

function fromHash() {
  const h = location.hash.replace(/^#/, "");
  if (!h) return;
  const p = new URLSearchParams(h);
  let any = false;
  Object.entries(DIAG).forEach(([k, d]) => {
    const val = p.get(k);
    if (val && val.length === d.n) {
      $("#i-" + k).value = "https://hellouchit.com" + d.url + "#a=" + val;
      any = true;
    }
  });
  if (any) {
    validateInputs();
    compound();
  }
}

/* If the visitor has run diagnostics before and let this browser remember
   them (DiagStorage, opt-out via "Clear saved results" on /tools/), prefill
   any input fromHash() didn't already set — a hash in the URL is an explicit
   share link and wins. */
const STORAGE_SLUG = {
  devsecops: "devsecops-maturity",
  genai: "genai-readiness",
  cloud: "cloud-cost",
  platform: "platform-engineering",
  ea: "ea-operating-model",
  sre: "sre-programme",
};
function fromStorage() {
  if (!window.DiagStorage) return;
  const saved = DiagStorage.all();
  let any = false;
  Object.entries(DIAG).forEach(([k, d]) => {
    const input = $("#i-" + k);
    if (input.value) return; // already set, e.g. by fromHash()
    const r = saved[STORAGE_SLUG[k]];
    if (r && r.hash) {
      input.value = "https://hellouchit.com" + d.url + "#" + r.hash;
      any = true;
    }
  });
  if (any) { validateInputs(); compound(); }
}

document.querySelectorAll('input[type="text"]').forEach(el => el.addEventListener("input", validateInputs));
$("#run").addEventListener("click", compound);
$("#clear").addEventListener("click", () => {
  document.querySelectorAll('input[type="text"]').forEach(el => { el.value = ""; });
  $("#results").classList.remove("show");
  $("#empty-state").style.display = "";
  history.replaceState(null, "", "#");
  validateInputs();
});
$("#rCopy").addEventListener("click", e => {
  e.preventDefault();
  if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(() => {
    e.target.textContent = "link copied ✓";
    setTimeout(() => e.target.textContent = "Copy shareable link", 1800);
  });
});

fromHash();
fromStorage();
validateInputs();
