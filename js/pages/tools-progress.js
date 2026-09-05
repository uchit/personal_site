/* tools-progress.js — "your scorecard" strip on /tools/, reading results
 * DiagStorage saved locally when a visitor completes a diagnostic. Renders
 * nothing if nothing's been run yet — an empty state here would be clutter,
 * not information. */
(function () {
  "use strict";
  const mount = document.getElementById("diag-progress");
  if (!mount || !window.DiagStorage) return;

  const DIAGS = [
    { slug: "agent-readiness", name: "Agent Readiness", url: "/tools/agent-readiness.html" },
    { slug: "genai-readiness", name: "GenAI Readiness", url: "/tools/genai-readiness.html" },
    { slug: "devsecops-maturity", name: "DevSecOps Maturity", url: "/tools/devsecops-maturity.html" },
    { slug: "cloud-cost", name: "Cloud Cost", url: "/tools/cloud-cost.html" },
    { slug: "platform-engineering", name: "Platform Engineering", url: "/tools/platform-engineering.html" },
    { slug: "ea-operating-model", name: "EA Operating Model", url: "/tools/ea-operating-model.html" },
    { slug: "sre-programme", name: "SRE Programme", url: "/tools/sre-programme.html" },
  ];

  const results = DiagStorage.all();
  const done = DIAGS.filter(d => results[d.slug]);
  if (!done.length) return; // nothing saved — no widget, no empty state

  const wrap = document.createElement("div");
  wrap.className = "diag-progress";

  const head = document.createElement("div");
  head.className = "dp-head";
  const count = document.createElement("span");
  count.textContent = `Your scorecard — ${done.length} of ${DIAGS.length} run`;
  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "dp-clear";
  clear.textContent = "Clear saved results";
  clear.addEventListener("click", () => {
    DiagStorage.clear();
    wrap.remove();
  });
  head.append(count, clear);
  wrap.appendChild(head);

  const row = document.createElement("div");
  row.className = "dp-row";
  DIAGS.forEach(d => {
    const r = results[d.slug];
    const a = document.createElement("a");
    a.className = "dp-pill" + (r ? " is-done" : "");
    a.href = r ? `${d.url}#${r.hash}` : d.url;
    const name = document.createElement("span");
    name.className = "dp-name";
    name.textContent = d.name;
    a.appendChild(name);
    if (r) {
      const lvl = document.createElement("span");
      lvl.className = "dp-level";
      lvl.textContent = r.levelName;
      a.appendChild(lvl);
    }
    row.appendChild(a);
  });
  wrap.appendChild(row);

  mount.replaceChildren(wrap);
})();
