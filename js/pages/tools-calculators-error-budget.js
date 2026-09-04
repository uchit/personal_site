
const $ = s => document.querySelector(s);
const state = { slo:99.9, window:28, dep:5, cfr:12, mttr:25, base:3, bmttr:45 };

function compute() {
  // window minutes
  const winMin = state.window * 24 * 60;
  // budget in minutes
  const budget = winMin * (1 - state.slo/100);

  // expected downtime per window
  const winDays = state.window;
  const totalDeploys = state.dep * winDays;
  const failedDeploys = totalDeploys * (state.cfr/100);
  const changeDowntime = failedDeploys * state.mttr;
  const baselineDowntime = state.base * state.bmttr;
  const totalExpected = changeDowntime + baselineDowntime;

  // burn rate
  const burnFrac = budget > 0 ? totalExpected / budget : 0;
  const burnPct = burnFrac * 100;

  // multi-burn rate (vs sustainable = 1.0 over window)
  const bx = budget > 0 ? (totalExpected / winMin) / ((1 - state.slo/100)) : 0;

  // time-to-exhaustion at current rate
  let ttx;
  if (totalExpected <= 0) ttx = "&mdash; (no projected burn)";
  else if (burnFrac < 1) ttx = "Not exhausted this window (" + (burnFrac*100).toFixed(0) + "% used)";
  else {
    const daysToExhaust = budget / (totalExpected / winDays);
    if (daysToExhaust < 1) ttx = (daysToExhaust*24).toFixed(1) + " hours";
    else if (daysToExhaust < 14) ttx = daysToExhaust.toFixed(1) + " days";
    else ttx = (daysToExhaust/7).toFixed(1) + " weeks";
  }

  // Display
  $("#vSlo").textContent = state.slo + "%";
  $("#vDep").textContent = state.dep;
  $("#vCfr").textContent = state.cfr + "%";
  $("#vMttr").textContent = state.mttr;
  $("#vBase").textContent = state.base;
  $("#vBmttr").textContent = state.bmttr;

  let bDisp, bUnit;
  if (budget >= 60) { bDisp = (budget/60).toFixed(1); bUnit = "hours"; }
  else if (budget >= 1) { bDisp = budget.toFixed(1); bUnit = "min"; }
  else { bDisp = (budget*60).toFixed(0); bUnit = "sec"; }
  $("#budget").textContent = bDisp;
  $("#budgetUnit").textContent = bUnit;
  $("#budgetSub").textContent = "Over " + state.window + " days at " + state.slo + "% target.";

  $("#burnPct").textContent = burnPct.toFixed(0) + "%";
  let burnSub;
  if (burnPct < 50) burnSub = "Within budget. Feature work continues unconstrained.";
  else if (burnPct < 80) burnSub = "Healthy but watch. Trend toward 80%+ should trigger reliability prioritisation.";
  else if (burnPct <= 100) burnSub = "At or near budget exhaustion. Slow risky changes; reliability becomes the priority.";
  else burnSub = "Over budget. Per Google SRE Workbook policy, feature work pauses until burn-rate recovers.";
  $("#burnSub").textContent = burnSub;

  const barPct = Math.min(100, burnPct);
  $("#burnBar").style.width = barPct + "%";
  $("#burnBar").style.background = burnPct < 50 ? "var(--signal)" : burnPct < 100 ? "var(--accent)" : "#e5736b";

  $("#bx").innerHTML = bx.toFixed(2) + "&times;";
  $("#ttx").innerHTML = ttx;

  // Insights
  const ins = $("#insights"); ins.innerHTML = "";
  function add(kind, html) { const el = document.createElement("div"); el.className = "v-insight " + kind; el.innerHTML = '<span class="pip"></span><span>' + html + '</span>'; ins.appendChild(el); }
  if (burnFrac > 1.5) add("warn", "Burn rate &gt;150% &mdash; SLO will be missed materially. Either lower target, reduce change risk, or invest in faster MTTR.");
  if (state.cfr > 15 && state.dep > 1) add("warn", "Change-fail rate &gt;15% with daily deploys puts you in DORA Low/Medium. Pre-prod testing and feature flags pay back fast here.");
  if (state.mttr > 60) add("warn", "MTTR &gt;60min on a failed change. Auto-rollback + runbook tested in game-day reduces this by 50-70%.");
  if (state.slo >= 99.99 && state.window >= 28) add("warn", "Four-nines SLO is rarely the right target. Each extra nine costs ~3&times;. Confirm with product whether users perceive 99.95 vs 99.99.");
  if (burnPct < 30 && state.dep > 5) add("good", "Strong shape: high deploy cadence with low burn. You have room to take more change risk on new capabilities.");
  if (burnPct >= 30 && burnPct <= 70) add("good", "Healthy budget consumption. Track <a href='/tools/sre-programme.html'>error-budget policy</a> enforcement next.");
  if (ins.children.length === 0) add("good", "Configuration looks balanced. Make sure error-budget policy is encoded (auto-pause risky deploys when budget burnt).");

  const h = `s=${state.slo}&w=${state.window}&d=${state.dep}&c=${state.cfr}&m=${state.mttr}&b=${state.base}&t=${state.bmttr}`;
  history.replaceState(null, "", "#" + h);
}

function fromHash() {
  const h = location.hash.replace(/^#/, ""); if (!h) return;
  h.split("&").forEach(kv => { const [k,v] = kv.split("="); const n = parseFloat(v);
    if (k === "s") state.slo = n; if (k === "w") state.window = parseInt(v);
    if (k === "d") state.dep = n; if (k === "c") state.cfr = n;
    if (k === "m") state.mttr = n; if (k === "b") state.base = parseInt(v);
    if (k === "t") state.bmttr = n;
  });
  $("#slo").value = state.slo; $("#dep").value = state.dep; $("#cfr").value = state.cfr;
  $("#mttr").value = state.mttr; $("#base").value = state.base; $("#bmttr").value = state.bmttr;
  document.querySelectorAll("#window button").forEach(b => b.classList.toggle("on", parseInt(b.dataset.w) === state.window));
}

$("#slo").addEventListener("change", e => { state.slo = parseFloat(e.target.value); compute(); });
$("#dep").addEventListener("input", e => { state.dep = parseFloat(e.target.value); compute(); });
$("#cfr").addEventListener("input", e => { state.cfr = parseFloat(e.target.value); compute(); });
$("#mttr").addEventListener("input", e => { state.mttr = parseFloat(e.target.value); compute(); });
$("#base").addEventListener("input", e => { state.base = parseInt(e.target.value); compute(); });
$("#bmttr").addEventListener("input", e => { state.bmttr = parseFloat(e.target.value); compute(); });
document.querySelectorAll("#window button").forEach(b => b.addEventListener("click", () => {
  state.window = parseInt(b.dataset.w);
  document.querySelectorAll("#window button").forEach(x => x.classList.remove("on"));
  b.classList.add("on"); compute();
}));
$("#share").addEventListener("click", e => {
  e.preventDefault();
  if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(() => {
    e.target.textContent = "link copied ✓"; setTimeout(() => e.target.textContent = "copy shareable link", 1800);
  });
});

fromHash(); compute();
