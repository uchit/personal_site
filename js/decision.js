/* decision.js — shared engine for /decisions/ interactive trees.
   Each page exposes a global TREE = { id, title, start, nodes: {id: Node} }
   Node shape:
     { q, qhelp?, opts: [ { tag, label, body, next | leaf } ] }
   Leaf shape:
     { tag, title, verdict, when_to_pick: [...], when_not_to_pick: string,
       trade_offs: { pros: [...], cons: [...] }, watch_outs: [...],
       next_steps: [ { tag, title, body, href } ], anti_patterns?: [...] }

   URL hash captures the chosen path as base36 indexes: #ai-gateway:01
   This makes results bookmarkable and shareable.
*/
(function () {
  "use strict";
  if (!window.TREE) return;
  const T = window.TREE;
  const mount = document.getElementById("d-stage");
  const pathEl = document.getElementById("d-path");
  if (!mount || !pathEl) return;

  // ----- State -----
  let path = []; // array of option-indexes taken so far

  function nodeFor(history) {
    let nodeId = T.start;
    const visited = [nodeId];
    for (const idx of history) {
      const n = T.nodes[nodeId];
      if (!n || !n.opts || !n.opts[idx]) return { nodeId: null, visited };
      const choice = n.opts[idx];
      if (choice.leaf) return { leaf: choice.leaf, leafLabel: choice.label, visited };
      nodeId = choice.next;
      visited.push(nodeId);
    }
    return { nodeId, visited };
  }

  function el(tag, attrs = {}, ...children) {
    const e = document.createElement(tag);
    for (const k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "html") e.innerHTML = attrs[k];
      else if (k.startsWith("on") && typeof attrs[k] === "function") e.addEventListener(k.slice(2), attrs[k]);
      else e.setAttribute(k, attrs[k]);
    }
    for (const c of children) {
      if (c == null || c === false) continue;
      if (typeof c === "string") e.appendChild(document.createTextNode(c));
      else e.appendChild(c);
    }
    return e;
  }

  // ----- Render path breadcrumb -----
  function renderPath() {
    pathEl.replaceChildren();
    const wrap = el("div", { class: "wrap" });
    wrap.appendChild(el("span", { class: "step start" }, "Start"));
    let nodeId = T.start;
    for (let i = 0; i < path.length; i++) {
      const n = T.nodes[nodeId];
      if (!n) break;
      const choice = n.opts[path[i]];
      wrap.appendChild(el("span", { class: "sep" }, "/"));
      const stepBtn = el("button", {
        class: "step",
        title: "Jump back to this step",
        onclick: () => { path = path.slice(0, i); persist(); render(); }
      }, choice.tag || choice.label);
      stepBtn.style.cursor = "pointer";
      stepBtn.style.background = "transparent";
      stepBtn.style.font = "inherit";
      wrap.appendChild(stepBtn);
      if (choice.leaf) break;
      nodeId = choice.next;
    }
    if (path.length > 0) {
      const reset = el("button", {
        class: "reset",
        onclick: () => { path = []; persist(); render(); }
      }, "Start over");
      wrap.appendChild(reset);
    }
    pathEl.appendChild(wrap);
  }

  // ----- Render question -----
  function renderQuestion(node, depth) {
    const card = el("div", { class: "d-q" });
    card.appendChild(el("span", { class: "qnum" }, "Step " + (depth + 1)));
    const h = el("h2");
    h.innerHTML = node.q;
    card.appendChild(h);
    if (node.qhelp) {
      const p = el("p", { class: "qhelp" });
      p.innerHTML = node.qhelp;
      card.appendChild(p);
    }
    const opts = el("div", { class: "d-opts" });
    node.opts.forEach((opt, i) => {
      const btn = el("button", {
        class: "d-opt",
        onclick: () => { path = path.concat([i]); persist(); render(); scrollToStage(); }
      });
      const head = el("div", { class: "ohead" });
      if (opt.tag) head.appendChild(el("span", { class: "otag" }, opt.tag));
      const oh = el("h3"); oh.innerHTML = opt.label;
      head.appendChild(oh);
      btn.appendChild(head);
      const body = el("div", { class: "obody" });
      body.innerHTML = opt.body;
      btn.appendChild(body);
      btn.appendChild(el("span", { class: "oarr" }, opt.leaf ? "See recommendation →" : "Continue →"));
      opts.appendChild(btn);
    });
    card.appendChild(opts);
    mount.replaceChildren(card);
  }

  // ----- Render leaf -----
  function renderLeaf(leaf) {
    const wrap = el("div", { class: "d-leaf" });
    wrap.appendChild(el("span", { class: "ltag" }, leaf.tag || "Recommendation"));
    const h = el("h2"); h.innerHTML = leaf.title;
    wrap.appendChild(h);
    const verdict = el("p", { class: "verdict" });
    verdict.innerHTML = leaf.verdict;
    wrap.appendChild(verdict);

    if (leaf.when_to_pick && leaf.when_to_pick.length) {
      wrap.appendChild(el("h3", {}, "Pick this when"));
      const ul = el("ul");
      leaf.when_to_pick.forEach(s => { const li = el("li"); li.innerHTML = s; ul.appendChild(li); });
      wrap.appendChild(ul);
    }

    if (leaf.trade_offs) {
      wrap.appendChild(el("h3", {}, "Trade-offs"));
      const pc = el("div", { class: "pros-cons" });
      const pros = el("div", { class: "pc" });
      pros.appendChild(el("h4", {}, "Strengths"));
      const upros = el("ul");
      leaf.trade_offs.pros.forEach(s => { const li = el("li"); li.innerHTML = s; upros.appendChild(li); });
      pros.appendChild(upros);
      const cons = el("div", { class: "pc" });
      cons.appendChild(el("h4", {}, "Costs"));
      const ucons = el("ul");
      leaf.trade_offs.cons.forEach(s => { const li = el("li"); li.innerHTML = s; ucons.appendChild(li); });
      cons.appendChild(ucons);
      pc.appendChild(pros); pc.appendChild(cons);
      wrap.appendChild(pc);
    }

    if (leaf.watch_outs && leaf.watch_outs.length) {
      wrap.appendChild(el("h3", {}, "Watch-outs"));
      const ul = el("ul");
      leaf.watch_outs.forEach(s => { const li = el("li"); li.innerHTML = s; ul.appendChild(li); });
      wrap.appendChild(ul);
    }

    if (leaf.when_not_to_pick) {
      const wn = el("div", { class: "when-not" });
      const p = el("p");
      p.innerHTML = "<b>Don't pick this if:</b> " + leaf.when_not_to_pick;
      wn.appendChild(p);
      wrap.appendChild(wn);
    }

    if (leaf.next_steps && leaf.next_steps.length) {
      wrap.appendChild(el("h3", {}, "Next steps"));
      const nc = el("div", { class: "next-cards" });
      leaf.next_steps.forEach(s => {
        const a = el("a", { class: "nc", href: s.href });
        a.appendChild(el("span", { class: "nctag" }, s.tag || "Open"));
        const h4 = el("h4"); h4.innerHTML = s.title; a.appendChild(h4);
        const p = el("p"); p.innerHTML = s.body || ""; a.appendChild(p);
        a.appendChild(el("span", { class: "ncarr" }, "Open →"));
        nc.appendChild(a);
      });
      wrap.appendChild(nc);
    }

    // Actions
    const actions = el("div", { class: "actions" });
    actions.appendChild(el("button", {
      onclick: () => { path = []; persist(); render(); scrollToStage(); }
    }, "Run again"));
    actions.appendChild(el("a", { href: "/decisions/", class: "primary" }, "All decisions →"));
    const sh = el("button", {
      onclick: async (e) => {
        const url = location.href;
        try { await navigator.clipboard.writeText(url); sh.textContent = "Link copied ✓"; sh.classList.add("primary"); }
        catch { sh.textContent = url; }
      }
    }, "Copy share link");
    actions.appendChild(sh);
    const shared = el("span", { class: "shared" }, "#" + (location.hash || "").replace("#", ""));
    actions.appendChild(shared);
    wrap.appendChild(actions);

    mount.replaceChildren(wrap);
  }

  // Scroll the newly-rendered question/leaf card just below the sticky nav,
  // so the user can immediately read it without scrolling down themselves.
  function scrollToStage() {
    requestAnimationFrame(() => {
      const card = mount.querySelector(".d-q, .d-leaf");
      if (!card) return;
      const navH = (document.querySelector("header.nav")?.offsetHeight) || 64;
      const top = card.getBoundingClientRect().top + window.scrollY - navH - 16;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }

  // ----- Persist to URL hash -----
  function persist() {
    const enc = path.map(i => i.toString(36)).join("");
    history.replaceState(null, "", "#" + enc);
  }

  function restore() {
    const enc = (location.hash || "").replace("#", "");
    if (!enc) { path = []; return; }
    path = enc.split("").map(c => parseInt(c, 36)).filter(n => !isNaN(n));
  }

  // ----- Main render -----
  function render() {
    renderPath();
    const r = nodeFor(path);
    if (r.leaf) { renderLeaf(r.leaf); return; }
    const node = T.nodes[r.nodeId];
    if (!node) {
      // Invalid path → reset
      path = [];
      const start = T.nodes[T.start];
      renderQuestion(start, 0);
      return;
    }
    renderQuestion(node, path.length);
  }

  // Hash navigation (back/forward)
  window.addEventListener("hashchange", () => { restore(); render(); });

  restore();
  render();
})();
