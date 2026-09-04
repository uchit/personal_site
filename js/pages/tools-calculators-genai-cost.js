
// Pricing per 1M tokens: [input, output, cached_input]. Cached typically 10% of input.
const PRICES = {
  "claude-opus-4-7":   [15.00, 75.00, 1.50],
  "gpt-5":             [10.00, 50.00, 1.25],
  "gemini-2-5-pro":    [ 7.00, 21.00, 0.70],
  "claude-sonnet-4-6": [ 3.00, 15.00, 0.30],
  "gpt-4-1":           [ 2.50, 10.00, 0.625],
  "gemini-2-5-flash":  [ 0.30,  2.50, 0.075],
  "claude-haiku-4-5":  [ 1.00,  5.00, 0.10],
  "gpt-4-1-mini":      [ 0.40,  1.60, 0.10],
  "llama-3-3-70b":     [ 0.72,  0.72, 0.10],
  "self-hosted":       [ 0.15,  0.15, 0.15]
};

const SECTORS = {
  tech:   "For tech, the question is gross margin. Sub-1¢ cost-per-outcome on a customer-facing feature is the difference between feature-driven growth and feature-driven margin compression. Cache hit rate is your most under-pulled lever.",
  fsi:    "In FSI, <a href='https://www.apra.gov.au/news-and-publications/apra-publishes-cps-230-operational-risk-management' target='_blank' rel='noopener'>APRA CPS 230</a> names cost concentration as material operational risk. Document model-provider dependency. Multi-provider routing isn't just for cost &mdash; it's for resilience.",
  gov:    "Government spend is publicly visible. Cost-per-outcome is the only metric a parliamentary committee will recognise &mdash; not cost-per-token. Pin model versions; expect FOI on prompt registry.",
  health: "Health workloads carry PHI premiums (residency, encrypted-at-rest specifics). Inference cost is often dwarfed by the data-handling envelope; watch storage & egress, not just inference.",
  retail: "Retail has peak-event spikes (Black Friday, EOFY). Provision for 5-10&times; your steady-state. Bedrock/Vertex provisioned-throughput vs on-demand is the right Q4 question."
};

const $ = s => document.querySelector(s);
const state = { model:"claude-sonnet-4-6", inTok:2400, outTok:350, cache:60, vol:500000, ok:78, sector:"tech" };

function fmtMoney(n) {
  if (n >= 1e6) return "$" + (n/1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + (n/1e3).toFixed(1) + "k";
  if (n >= 1)   return "$" + n.toFixed(2);
  if (n >= 0.01) return (n*100).toFixed(2) + "¢";
  return (n*100).toFixed(4) + "¢";
}
function fmtInt(n) { return n.toLocaleString(); }

function compute() {
  const p = PRICES[state.model];
  const inT = state.inTok, outT = state.outTok, hit = state.cache/100;
  // cost in dollars per call
  const inCost  = (inT * (1-hit) * p[0] / 1e6) + (inT * hit * p[2] / 1e6);
  const outCost = (outT * p[1] / 1e6);
  const perCall = inCost + outCost;
  const okPct = state.ok/100;
  const perOutcome = okPct > 0 ? perCall / okPct : perCall;
  const monthly = perCall * state.vol;
  const annual = monthly * 12;

  // Display
  $("#vModel").textContent = state.model;
  $("#vIn").textContent = fmtInt(state.inTok);
  $("#vOut").textContent = fmtInt(state.outTok);
  $("#vCache").textContent = state.cache + "%";
  $("#vVol").textContent = fmtInt(state.vol);
  $("#vOk").textContent = state.ok + "%";

  // Cost-per-resolved-task
  const cprCents = perOutcome * 100;
  let cprDisp, currDisp;
  if (cprCents >= 100) { cprDisp = "$" + (cprCents/100).toFixed(2); currDisp = ""; }
  else if (cprCents >= 1) { cprDisp = cprCents.toFixed(2); currDisp = "¢"; }
  else { cprDisp = cprCents.toFixed(3); currDisp = "¢"; }
  $("#cpr").textContent = cprDisp;
  $("#curr").textContent = currDisp;

  // Cost bar: log scale 0.01¢ → 100¢
  const v = Math.log10(Math.max(cprCents, 0.001));
  const pct = Math.min(100, Math.max(0, (v + 3) / 5 * 100));
  $("#cprBar").style.width = pct + "%";
  $("#cprBar").style.background = cprCents < 1 ? "var(--signal)" : cprCents < 5 ? "var(--accent)" : "#e5736b";

  // Sub
  let subTxt;
  if (cprCents < 0.1) subTxt = "Elite tier. Feature can scale to 10× volume without margin pressure.";
  else if (cprCents < 1) subTxt = "Healthy. Most consumer-facing GenAI features sustainable.";
  else if (cprCents < 5) subTxt = "Watch. Profitable only at high-value outcomes. Audit cache hit + model routing.";
  else if (cprCents < 20) subTxt = "Investigate. Likely over-modeled or under-cached. 30-60% reduction usually available.";
  else subTxt = "Critical. Re-architect before adding more volume.";
  $("#cprSub").textContent = subTxt;

  $("#monthly").textContent = fmtMoney(monthly);
  $("#annual").textContent = fmtMoney(annual);
  $("#lens").innerHTML = SECTORS[state.sector];

  // Insights
  const ins = $("#insights"); ins.innerHTML = "";
  function add(kind, html) {
    const el = document.createElement("div"); el.className = "v-insight " + kind;
    el.innerHTML = '<span class="pip"></span><span>' + html + '</span>';
    ins.appendChild(el);
  }
  if (state.cache < 30 && inT > 1000) add("warn", "Cache hit rate &lt; 30% with large input. Prompt caching could cut cost by 40-70%.");
  if (state.ok < 60) add("warn", "Success rate &lt; 60% &mdash; retries dominate cost-per-outcome. Eval gap or model choice issue.");
  if (state.model.includes("opus") || state.model === "gpt-5") add("warn", "Premium model on volume &gt;100k/mo. Route 60-80% to a workhorse model with eval-gated fallback.");
  if (state.outTok > 2000) add("warn", "High output token count. Most cost is generation, not retrieval. Check whether shorter structured output works.");
  if (cprCents < 0.5 && state.vol > 100000) add("good", "Strong cost shape. Lever now: track quality-per-dollar to defend feature against premium-model creep.");
  if (state.model === "self-hosted") add("good", "Self-hosted economics assume amortised GPU. Watch utilisation &mdash; below 40% sustained, hosted APIs usually win.");
  if (ins.children.length === 0) add("good", "Healthy configuration. Track <a href='/writing/genai-9-controls.html'>cost-per-outcome</a> as a primary KPI; let model routing tune.");

  // URL hash for sharing
  const h = `m=${state.model}&i=${state.inTok}&o=${state.outTok}&c=${state.cache}&v=${state.vol}&k=${state.ok}&s=${state.sector}`;
  history.replaceState(null, "", "#" + h);
}

function fromHash() {
  const h = location.hash.replace(/^#/, "");
  if (!h) return;
  h.split("&").forEach(kv => {
    const [k, v] = kv.split("=");
    if (k === "m" && PRICES[v]) state.model = v;
    if (k === "i") state.inTok = parseInt(v) || state.inTok;
    if (k === "o") state.outTok = parseInt(v) || state.outTok;
    if (k === "c") state.cache = parseInt(v) ?? state.cache;
    if (k === "v") state.vol = parseInt(v) || state.vol;
    if (k === "k") state.ok = parseInt(v) || state.ok;
    if (k === "s" && SECTORS[v]) state.sector = v;
  });
  $("#model").value = state.model;
  $("#inTok").value = state.inTok;
  $("#outTok").value = state.outTok;
  $("#cache").value = state.cache;
  $("#vol").value = state.vol;
  $("#ok").value = state.ok;
  document.querySelectorAll("#sector button").forEach(b => b.classList.toggle("on", b.dataset.s === state.sector));
}

// Wire
$("#model").addEventListener("change", e => { state.model = e.target.value; compute(); });
$("#inTok").addEventListener("input", e => { state.inTok = +e.target.value; compute(); });
$("#outTok").addEventListener("input", e => { state.outTok = +e.target.value; compute(); });
$("#cache").addEventListener("input", e => { state.cache = +e.target.value; compute(); });
$("#vol").addEventListener("input", e => { state.vol = +e.target.value; compute(); });
$("#ok").addEventListener("input", e => { state.ok = +e.target.value; compute(); });
document.querySelectorAll("#sector button").forEach(b => b.addEventListener("click", () => {
  state.sector = b.dataset.s;
  document.querySelectorAll("#sector button").forEach(x => x.classList.remove("on"));
  b.classList.add("on"); compute();
}));
$("#share").addEventListener("click", e => {
  e.preventDefault();
  const url = location.href;
  if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => {
    e.target.textContent = "link copied ✓";
    setTimeout(() => e.target.textContent = "copy shareable link", 1800);
  }); else prompt("Copy this URL:", url);
});

fromHash();
compute();
