
// Discount rates (compute, class average) as of 2026-05.
// Format: { 1y_NU, 1y_AU, 3y_NU, 3y_AU } in percent off on-demand
const RATES = {
  aws:   { y1nu: 0.22, y1au: 0.28, y3nu: 0.46, y3au: 0.54 },   // AWS Compute Savings Plans
  azure: { y1nu: 0.18, y1au: 0.21, y3nu: 0.42, y3au: 0.48 },   // Azure Reservations
  gcp:   { y1nu: 0.20, y1au: 0.20, y3nu: 0.55, y3au: 0.55 }    // GCP CUDs (no upfront option, but spend-based)
};

const $ = s => document.querySelector(s);
const state = { provider:"aws", spend:200000, steady:75, cov:80, y1:60, au:20, grow:20 };

function fmtMoney(n) {
  if (n >= 1e6) return "$" + (n/1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + Math.round(n/1e3).toLocaleString() + "k";
  return "$" + Math.round(n).toLocaleString();
}

function compute() {
  const r = RATES[state.provider];
  const monthly = state.spend;
  const steadyPortion = monthly * (state.steady/100);
  const committed = steadyPortion * (state.cov/100);
  const onDemandRemaining = monthly - committed;

  // Blended discount across 1y/3y and NU/AU
  const y1Share = state.y1/100, y3Share = 1 - y1Share;
  const auShare = state.au/100, nuShare = 1 - auShare;
  const blended =
    y1Share * (nuShare * r.y1nu + auShare * r.y1au) +
    y3Share * (nuShare * r.y3nu + auShare * r.y3au);

  // Cost with vs without commitments
  const costWith = onDemandRemaining + committed * (1 - blended);
  const costWithout = monthly;
  const monthlySave = costWithout - costWith;
  const annual = monthlySave * 12;
  const savePct = costWithout > 0 ? (monthlySave / costWithout) * 100 : 0;

  // Cash flow impact (first month) - All-Upfront pays full term upfront
  // 1y AU portion: pays 12 months × that share upfront. 3y AU: 36 months × share.
  const y1auMonthly = committed * y1Share * auShare * (1 - r.y1au);
  const y3auMonthly = committed * y3Share * auShare * (1 - r.y3au);
  const cashUpfront = y1auMonthly * 12 + y3auMonthly * 36; // approx prepay

  // Lock-in risk: function of coverage, 3y share, growth
  // Higher coverage + higher 3y + negative growth = more risk
  let lockScore = 0;
  lockScore += Math.max(0, state.cov - 70) * 1.0;
  lockScore += y3Share * 100 * 0.6;
  lockScore += Math.max(0, -state.grow) * 1.5;
  lockScore = Math.min(100, lockScore);
  let lockLabel, lockColor;
  if (lockScore < 30) { lockLabel = "Low"; lockColor = "var(--signal)"; }
  else if (lockScore < 60) { lockLabel = "Moderate"; lockColor = "var(--accent)"; }
  else { lockLabel = "High"; lockColor = "#e5736b"; }

  // Display
  const provLabel = state.provider === "aws" ? "AWS Savings Plans" : state.provider === "azure" ? "Azure Reservations" : "GCP CUDs";
  $("#vSpend").textContent = fmtMoney(state.spend);
  $("#vSteady").textContent = state.steady + "%";
  $("#vCov").textContent = state.cov + "%";
  $("#vY1").textContent = state.y1 + "%";
  $("#vAu").textContent = state.au + "%";
  $("#vGrow").textContent = (state.grow > 0 ? "+" : "") + state.grow + "%";

  $("#save").textContent = fmtMoney(monthlySave) + " / month";
  $("#saveSub").textContent = "Effective " + savePct.toFixed(1) + "% off on-demand for the covered compute slice.";

  const barPct = Math.min(100, savePct / 30 * 100);
  $("#saveBar").style.width = barPct + "%";
  $("#saveBar").style.background = savePct < 10 ? "#e5736b" : savePct < 20 ? "var(--accent)" : "var(--signal)";

  $("#annual").textContent = fmtMoney(annual);
  $("#blend").textContent = (blended*100).toFixed(1) + "%";

  $("#lock").textContent = lockLabel;
  $("#lock").style.color = lockColor;
  let lockText = "";
  if (state.cov > 90 && y3Share > 0.5) lockText = "Coverage >90% with majority 3-year locks you into the current spend shape. Acceptable if architecture is stable; risky if planning re-platforming or divestiture in 24 months.";
  else if (state.cov < 50) lockText = "Coverage <50% leaves significant savings on the table for predictable workloads. The FinOps Foundation 70%+ target exists for a reason.";
  else lockText = "Coverage within the 70-90% sweet spot. Growth assumption +" + state.grow + "% is the key sensitivity.";
  $("#lockSub").textContent = lockText;

  $("#cash").textContent = fmtMoney(cashUpfront);

  // Insights
  const ins = $("#insights"); ins.innerHTML = "";
  function add(kind, html) { const el = document.createElement("div"); el.className = "v-insight " + kind; el.innerHTML = '<span class="pip"></span><span>' + html + '</span>'; ins.appendChild(el); }
  if (state.cov < 50 && state.steady > 60) add("warn", "Steady-state &gt;60% with coverage &lt;50% leaves the highest-value lever unpulled. Most FinOps programmes see this on first audit.");
  if (state.grow > 30 && y3Share > 0.5) add("warn", "Heavy growth + heavy 3-year is over-commit risk. If actual growth lags forecast, you&rsquo;re paying for unused commitment.");
  if (state.grow < 0 && state.cov > 70) add("warn", "Shrinking spend + high coverage = paying for capacity you don&rsquo;t use. Rebalance to shorter terms.");
  if (state.provider === "aws" && state.au > 60) add("warn", "All-Upfront on AWS only buys ~5 pts more than No-Upfront. Rarely worth the cash-flow trade in 2026 unless you have idle cash and weak treasury yield.");
  if (state.provider === "gcp" && state.au > 0) add("good", "GCP CUDs don&rsquo;t have an All-Upfront option; the upfront slider doesn&rsquo;t affect GCP discount in this model.");
  if (savePct >= 15 && state.cov >= 70 && state.cov <= 90) add("good", "Strong shape. Effective discount &gt;15% with coverage in the FinOps sweet spot. Next lever: family flexibility on AWS, or instance-flex on Azure.");
  if (savePct > 25) add("good", "Top-quartile efficiency. Now look at instance rightsizing &mdash; commitments amplify good rightsizing.");
  if (ins.children.length === 0) add("good", "Balanced configuration. Rebalance quarterly; let the commitment portfolio breathe with growth.");

  const h = `p=${state.provider}&s=${state.spend}&st=${state.steady}&c=${state.cov}&y1=${state.y1}&au=${state.au}&g=${state.grow}`;
  history.replaceState(null, "", "#" + h);
}

function fromHash() {
  const h = location.hash.replace(/^#/, ""); if (!h) return;
  h.split("&").forEach(kv => { const [k,v] = kv.split("=");
    if (k === "p" && RATES[v]) state.provider = v;
    if (k === "s") state.spend = parseInt(v);
    if (k === "st") state.steady = parseInt(v);
    if (k === "c") state.cov = parseInt(v);
    if (k === "y1") state.y1 = parseInt(v);
    if (k === "au") state.au = parseInt(v);
    if (k === "g") state.grow = parseInt(v);
  });
  $("#spend").value = state.spend; $("#steady").value = state.steady;
  $("#cov").value = state.cov; $("#y1").value = state.y1;
  $("#au").value = state.au; $("#grow").value = state.grow;
  document.querySelectorAll("#provider button").forEach(b => b.classList.toggle("on", b.dataset.p === state.provider));
}

$("#spend").addEventListener("input", e => { state.spend = parseInt(e.target.value); compute(); });
$("#steady").addEventListener("input", e => { state.steady = parseInt(e.target.value); compute(); });
$("#cov").addEventListener("input", e => { state.cov = parseInt(e.target.value); compute(); });
$("#y1").addEventListener("input", e => { state.y1 = parseInt(e.target.value); compute(); });
$("#au").addEventListener("input", e => { state.au = parseInt(e.target.value); compute(); });
$("#grow").addEventListener("input", e => { state.grow = parseInt(e.target.value); compute(); });
document.querySelectorAll("#provider button").forEach(b => b.addEventListener("click", () => {
  state.provider = b.dataset.p;
  document.querySelectorAll("#provider button").forEach(x => x.classList.remove("on"));
  b.classList.add("on"); compute();
}));
$("#share").addEventListener("click", e => {
  e.preventDefault();
  if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(() => {
    e.target.textContent = "link copied ✓"; setTimeout(() => e.target.textContent = "copy shareable link", 1800);
  });
});

fromHash(); compute();
