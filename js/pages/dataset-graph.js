/* dataset-graph.js — force-directed graph of the 66-control prerequisite
 * network (dataset.json's depends_on edges). Vanilla JS, no charting library:
 * a small O(n^2) force simulation run to convergence once at load, then
 * rendered as static SVG. n=66 makes the O(n^2) repulsion pass trivial
 * (~4,300 pair checks per iteration, a few hundred iterations, sub-100ms).
 *
 * Color carries no category encoding on purpose — 16 control categories and
 * ~20 regulations both fail the "categorical palette" test (nobody reliably
 * tells 16 hues apart). Identity here is text (label, tooltip, detail panel);
 * color is reserved for one binary state (filter match) and node radius
 * carries the one magnitude worth showing (how many controls depend on this
 * one — the prerequisite bottlenecks).
 */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";

  const svg = $("#graph-svg");
  const tooltip = $("#graph-tooltip");
  const detail = $("#graph-detail");
  const emptyEl = $("#graph-empty");
  const listEl = $("#graph-list");
  if (!svg) return;

  // Taller/narrower canvas on small screens so 66 nodes get room to spread
  // vertically instead of squashing into a wide, short strip.
  const narrow = window.innerWidth < 640;
  const W = narrow ? 560 : 860, H = narrow ? 680 : 520;

  const state = { reg: new Set(), sector: new Set() };
  let selectedId = null;

  fetch("/dataset/dataset.json")
    .then(r => r.json())
    .then(init)
    .catch(() => {
      emptyEl.hidden = false;
      emptyEl.textContent = "Couldn't load the dataset — try reloading.";
    });

  function init(data) {
    const regLabels = data.regulations || {};
    const rows = data.rows || [];
    const byId = new Map(rows.map(r => [r.id, r]));

    const nodes = rows.map(r => ({
      id: r.id,
      ctrl: r.ctrl,
      cat: r.cat,
      reg: r.reg || [],
      sectors: r.sectors || [],
      x: W / 2 + (Math.random() - 0.5) * 40,
      y: H / 2 + (Math.random() - 0.5) * 40,
      vx: 0, vy: 0,
      inCount: 0, // how many controls depend on this one
    }));

    const edges = [];
    rows.forEach(r => {
      (r.depends_on || []).forEach(depId => {
        if (byId.has(depId)) edges.push({ source: depId, target: r.id });
      });
    });
    edges.forEach(e => {
      const t = nodes.find(n => n.id === e.source);
      if (t) t.inCount++;
    });

    layout(nodes, edges);
    render(nodes, edges, regLabels);
    buildFilters(nodes, regLabels);
    buildList(nodes, byId);
  }

  /* Force simulation: repulsion between all pairs, spring attraction along
     edges, mild centering pull. Run for a fixed iteration count rather than
     to a convergence threshold — simpler, and 66 nodes settles well within
     the budget regardless of starting positions. */
  function layout(nodes, edges) {
    const REPULSION = 1900, SPRING = 0.025, IDEAL = 52, CENTER = 0.012, DAMPING = 0.85;
    const ITER = 350;

    for (let iter = 0; iter < ITER; iter++) {
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          let dx = a.x - b.x, dy = a.y - b.y;
          let d2 = dx * dx + dy * dy || 0.01;
          const f = REPULSION / d2;
          const d = Math.sqrt(d2);
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx += fx; a.vy += fy;
          b.vx -= fx; b.vy -= fy;
        }
      }
      edges.forEach(e => {
        const a = nodes.find(n => n.id === e.source);
        const b = nodes.find(n => n.id === e.target);
        if (!a || !b) return;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const f = (d - IDEAL) * SPRING;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      });
      nodes.forEach(n => {
        n.vx += (W / 2 - n.x) * CENTER;
        n.vy += (H / 2 - n.y) * CENTER;
        n.vx *= DAMPING; n.vy *= DAMPING;
        n.x += n.vx; n.y += n.vy;
        n.x = Math.max(24, Math.min(W - 24, n.x));
        n.y = Math.max(24, Math.min(H - 24, n.y));
      });
    }
  }

  function radiusFor(n) { return 5 + Math.min(n.inCount, 8) * 1.6; }

  function render(nodes, edges, regLabels) {
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";

    const defs = document.createElementNS(NS, "defs");
    defs.innerHTML = `<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
        markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="var(--line-strong)"></path>
    </marker>`;
    svg.appendChild(defs);

    const edgeGroup = document.createElementNS(NS, "g");
    edgeGroup.setAttribute("class", "graph-edges");
    edges.forEach(e => {
      const a = nodes.find(n => n.id === e.source);
      const b = nodes.find(n => n.id === e.target);
      if (!a || !b) return;
      const line = document.createElementNS(NS, "line");
      line.setAttribute("x1", a.x); line.setAttribute("y1", a.y);
      line.setAttribute("x2", b.x); line.setAttribute("y2", b.y);
      line.setAttribute("class", "graph-edge");
      line.setAttribute("data-source", a.id);
      line.setAttribute("data-target", b.id);
      line.setAttribute("marker-end", "url(#arrow)");
      edgeGroup.appendChild(line);
    });
    svg.appendChild(edgeGroup);

    const nodeGroup = document.createElementNS(NS, "g");
    nodeGroup.setAttribute("class", "graph-nodes");
    nodes.forEach(n => {
      const g = document.createElementNS(NS, "g");
      g.setAttribute("class", "graph-node");
      g.setAttribute("data-id", n.id);
      g.setAttribute("data-reg", n.reg.join(" "));
      g.setAttribute("data-sectors", n.sectors.join(" "));
      g.setAttribute("tabindex", "0");
      g.setAttribute("role", "button");
      g.setAttribute("aria-label", n.ctrl);

      const ring = document.createElementNS(NS, "circle");
      ring.setAttribute("cx", n.x); ring.setAttribute("cy", n.y);
      ring.setAttribute("r", radiusFor(n) + 2);
      ring.setAttribute("class", "graph-node-ring");
      g.appendChild(ring);

      const dot = document.createElementNS(NS, "circle");
      dot.setAttribute("cx", n.x); dot.setAttribute("cy", n.y);
      dot.setAttribute("r", radiusFor(n));
      dot.setAttribute("class", "graph-node-dot");
      g.appendChild(dot);

      // Transparent, larger hit target — per interaction spec, bigger than the mark.
      const hit = document.createElementNS(NS, "circle");
      hit.setAttribute("cx", n.x); hit.setAttribute("cy", n.y);
      hit.setAttribute("r", Math.max(radiusFor(n), 12));
      hit.setAttribute("class", "graph-node-hit");
      g.appendChild(hit);

      g.addEventListener("pointerenter", () => { showTooltip(n, g); setHighlight(n.id); });
      g.addEventListener("pointerleave", () => { hideTooltip(); setHighlight(selectedId); });
      g.addEventListener("focus", () => { showTooltip(n, g); setHighlight(n.id); });
      g.addEventListener("blur", () => { hideTooltip(); setHighlight(selectedId); });
      g.addEventListener("click", () => {
        selectedId = n.id;
        setHighlight(n.id);
        showDetail(n, edges, nodes, regLabels);
      });
      g.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectedId = n.id;
          setHighlight(n.id);
          showDetail(n, edges, nodes, regLabels);
        }
      });

      nodeGroup.appendChild(g);
    });
    svg.appendChild(nodeGroup);
  }

  /* The one deliberate interaction: hovering (or tapping, or focusing) a node
     dims every edge except the ones touching it. Nothing is highlighted at
     full strength until the reader asks for it — that's what keeps the
     resting state calm instead of a lit-up mesh. */
  function setHighlight(id) {
    svg.classList.toggle("is-hovering", !!id);
    $$(".graph-edge").forEach(e => {
      e.classList.toggle("is-connected", !!id && (e.dataset.source === id || e.dataset.target === id));
    });
  }

  function showTooltip(n, g) {
    if (!tooltip) return;
    tooltip.querySelector(".t-name").textContent = n.ctrl;
    tooltip.querySelector(".t-cat").textContent = n.cat;
    const rect = g.getBoundingClientRect();
    const host = svg.getBoundingClientRect();
    tooltip.style.left = (rect.left - host.left + rect.width / 2) + "px";
    tooltip.style.top = (rect.top - host.top) + "px";
    tooltip.hidden = false;
  }
  function hideTooltip() { if (tooltip) tooltip.hidden = true; }

  function showDetail(n, edges, nodes, regLabels) {
    if (!detail) return;
    const prereqs = edges.filter(e => e.target === n.id).map(e => nodes.find(x => x.id === e.source)).filter(Boolean);
    const dependents = edges.filter(e => e.source === n.id).map(e => nodes.find(x => x.id === e.target)).filter(Boolean);
    const regList = n.reg.map(r => (regLabels[r] && regLabels[r].label) || r).join(", ");

    detail.replaceChildren();
    const h = document.createElement("h3"); h.textContent = n.ctrl; detail.appendChild(h);
    const cat = document.createElement("p"); cat.className = "u-muted"; cat.textContent = n.cat; detail.appendChild(cat);
    const regs = document.createElement("p"); regs.textContent = "Maps to: " + (regList || "—"); detail.appendChild(regs);

    if (prereqs.length) {
      const lab = document.createElement("div"); lab.className = "graph-detail-lab"; lab.textContent = "Requires first";
      detail.appendChild(lab);
      const ul = document.createElement("ul");
      prereqs.forEach(p => { const li = document.createElement("li"); li.textContent = p.ctrl; ul.appendChild(li); });
      detail.appendChild(ul);
    }
    if (dependents.length) {
      const lab = document.createElement("div"); lab.className = "graph-detail-lab"; lab.textContent = "Unlocks";
      detail.appendChild(lab);
      const ul = document.createElement("ul");
      dependents.forEach(p => { const li = document.createElement("li"); li.textContent = p.ctrl; ul.appendChild(li); });
      detail.appendChild(ul);
    }
    const link = document.createElement("a");
    link.href = "/dataset/#" + n.id;
    link.className = "u-link-solid-accent";
    link.textContent = "Open in the dataset →";
    detail.appendChild(link);

    detail.hidden = false;
  }

  function applyFilters() {
    const groups = $$(".graph-node");
    groups.forEach(g => {
      const regs = (g.dataset.reg || "").split(" ");
      const sectors = (g.dataset.sectors || "").split(" ");
      let match = true;
      if (state.reg.size && !regs.some(r => state.reg.has(r))) match = false;
      if (state.sector.size && !sectors.some(s => state.sector.has(s))) match = false;
      g.classList.toggle("is-dim", !match);
    });
    $$(".graph-edge").forEach(line => {
      const s = line.dataset.source, t = line.dataset.target;
      const sNode = groups.find(g => g.dataset.id === s);
      const tNode = groups.find(g => g.dataset.id === t);
      const dim = (sNode && sNode.classList.contains("is-dim")) || (tNode && tNode.classList.contains("is-dim"));
      line.classList.toggle("is-dim", !!dim);
    });
  }

  function buildFilters(nodes, regLabels) {
    const regWrap = $("#graph-reg-chips");
    const secWrap = $("#graph-sector-chips");
    if (regWrap) {
      const regCounts = new Map();
      nodes.forEach(n => n.reg.forEach(r => regCounts.set(r, (regCounts.get(r) || 0) + 1)));
      [...regCounts.entries()].sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
        const label = (regLabels[code] && regLabels[code].label) || code;
        const chip = document.createElement("button");
        chip.type = "button"; chip.className = "ds-chip"; chip.dataset.value = code;
        chip.innerHTML = `${escapeHtml(label)} <span class="count">${count}</span>`;
        chip.addEventListener("click", () => {
          if (state.reg.has(code)) state.reg.delete(code); else state.reg.add(code);
          chip.classList.toggle("active", state.reg.has(code));
          applyFilters();
        });
        regWrap.appendChild(chip);
      });
    }
    if (secWrap) {
      const sectors = ["banks", "government", "healthcare", "critical-infrastructure", "all"];
      sectors.forEach(s => {
        const chip = document.createElement("button");
        chip.type = "button"; chip.className = "ds-chip"; chip.dataset.value = s;
        chip.textContent = s;
        chip.addEventListener("click", () => {
          if (state.sector.has(s)) state.sector.delete(s); else state.sector.add(s);
          chip.classList.toggle("active", state.sector.has(s));
          applyFilters();
        });
        secWrap.appendChild(chip);
      });
    }
    const clear = $("#graph-clear");
    if (clear) clear.addEventListener("click", () => {
      state.reg.clear(); state.sector.clear();
      $$(".ds-chip", regWrap).forEach(c => c.classList.remove("active"));
      if (secWrap) $$(".ds-chip", secWrap).forEach(c => c.classList.remove("active"));
      applyFilters();
    });
  }

  /* Accessible fallback: the same prerequisite relationships as a plain list,
     for anyone who can't or doesn't want to use the graph (screen reader,
     no-JS-motion preference, or just prefers text). */
  function buildList(nodes, byId) {
    if (!listEl) return;
    const withDeps = nodes.filter(n => byId.get(n.id).depends_on && byId.get(n.id).depends_on.length);
    listEl.replaceChildren();
    withDeps.forEach(n => {
      const li = document.createElement("li");
      const deps = byId.get(n.id).depends_on.map(id => (byId.get(id) || {}).ctrl || id).join(", ");
      li.textContent = `${n.ctrl} — requires: ${deps}`;
      listEl.appendChild(li);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
})();
