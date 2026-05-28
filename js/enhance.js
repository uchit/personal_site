/* enhance.js — site-wide craft layer (⌘K command palette · security badge)
   No eval, no innerHTML with external data, same-origin only, progressive. */
(function () {
  "use strict";

  // Reliable scroll-to-hash on cross-page navigation
  if (location.hash && location.hash.length > 1) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) requestAnimationFrame(() => setTimeout(
      () => target.scrollIntoView({ behavior: "smooth", block: "start" }), 120
    ));
  }

  /* ---------------- Security badge ---------------- */
  const foot = document.querySelector("footer .foot-inner");
  if (foot) {
    const a = document.createElement("a");
    a.className = "secbadge";
    a.href = "https://observatory.mozilla.org/";
    a.target = "_blank"; a.rel = "noopener";
    a.title = "Security headers · CSP · HSTS";
    const d = document.createElement("span"); d.className = "sdot";
    a.append(d, document.createTextNode("A+ secured"));
    foot.appendChild(a);
  }

  /* ---------------- Command palette (⌘K / Ctrl+K) ---------------- */
  const PAGES = [
    { t: "Home",                          u: "/#home",       g: "Pages",     ic: "⌂" },
    { t: "About",                         u: "/#about",      g: "Pages",     ic: "✦" },
    { t: "The 4-Discipline Stack — framework", u: "/4-discipline-stack/", g: "Pages", ic: "◰" },
    { t: "Selected work · case studies",  u: "/#work",       g: "Pages",     ic: "▣" },
    { t: "Books & patent",                u: "/#books",      g: "Pages",     ic: "▥" },
    { t: "Speaking",                      u: "/#speaking",   g: "Pages",     ic: "◎" },
    { t: "Writing",                       u: "/writing/",    g: "Pages",     ic: "✎" },
    { t: "Glossary",                      u: "/glossary/",   g: "Reference", ic: "≡" },
    { t: "Get in touch",                  u: "/#contact",    g: "Pages",     ic: "✉" },
    { t: "All diagnostics",               u: "/tools/",      g: "Tools",     ic: "▤" },
    { t: "DevSecOps Maturity Diagnostic", u: "/tools/devsecops-maturity.html",  g: "Tools", ic: "◈" },
    { t: "GenAI Readiness Diagnostic",    u: "/tools/genai-readiness.html",     g: "Tools", ic: "◇" },
    { t: "Cloud Cost Diagnostic",         u: "/tools/cloud-cost.html",          g: "Tools", ic: "▲" },
    { t: "Platform Engineering Readiness", u: "/tools/platform-engineering.html", g: "Tools", ic: "▦" },
    { t: "EA Operating Model Diagnostic", u: "/tools/ea-operating-model.html",  g: "Tools", ic: "☑" },
    { t: "SRE Programme Diagnostic",      u: "/tools/sre-programme.html",       g: "Tools", ic: "◉" },
    { t: "GenAI Cost-Per-Outcome Calculator", u: "/tools/calculators/genai-cost.html", g: "Tools", ic: "$" },
    { t: "Error Budget Calculator",       u: "/tools/calculators/error-budget.html", g: "Tools", ic: "%" },
    { t: "Cloud Commitment Optimiser",    u: "/tools/calculators/commitment-optimiser.html", g: "Tools", ic: "☁" },
    { t: "Writing — encoded enterprise architect", u: "/writing/encoded-enterprise-architect.html", g: "Writing", ic: "✎" },
    { t: "Writing — GenAI nine controls", u: "/writing/genai-9-controls.html",     g: "Writing", ic: "✎" },
    { t: "Writing — DevSecOps is supply chain", u: "/writing/devsecops-is-supply-chain.html", g: "Writing", ic: "✎" },
    { t: "Writing — Platform engineering is the AI moat", u: "/writing/platform-engineering-ai-moat.html", g: "Writing", ic: "✎" },
    { t: "Writing — The 4-Discipline Stack", u: "/writing/4-discipline-stack-essay.html", g: "Writing", ic: "✎" },
    { t: "Writing — AU AI Safety Standard decoded", u: "/writing/au-ai-safety-decoded.html", g: "Writing", ic: "✎" },
    { t: "Book a 30-min call",            u: "https://calendly.com/uchit/30min", g: "Actions", ic: "⤓" },
    { t: "Email — hello@hellouchit.com",  u: "mailto:hello@hellouchit.com", g: "Actions", ic: "✉" },
    { t: "LinkedIn — /in/uchitvyas",      u: "https://www.linkedin.com/in/uchitvyas/", g: "Actions", ic: "in" },
    { t: "Download LinkedIn profile (PDF)", u: "/Profile_linkedin.pdf", g: "Actions", ic: "⤓" }
  ];

  // Build the floating trigger
  const trig = document.createElement("button");
  trig.className = "cmdk-trigger";
  trig.setAttribute("aria-label", "Open command palette");
  trig.innerHTML = 'Search <kbd>⌘K</kbd>';
  document.body.appendChild(trig);

  // Build the overlay
  const overlay = document.createElement("div");
  overlay.className = "cmdk";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Command menu");
  overlay.innerHTML =
    '<div class="cmdk-back" data-close></div>' +
    '<div class="cmdk-panel">' +
      '<div class="cmdk-in">' +
        '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>' +
        '<input type="text" placeholder="Search pages, tools, actions…" aria-label="Search" spellcheck="false" autocomplete="off">' +
        '<span class="esc">ESC</span>' +
      '</div>' +
      '<div class="cmdk-list" role="listbox"></div>' +
    '</div>';
  document.body.appendChild(overlay);

  const input  = overlay.querySelector("input");
  const list   = overlay.querySelector(".cmdk-list");
  let active = 0;
  let filtered = PAGES.slice();

  function render(q) {
    const term = (q || "").trim().toLowerCase();
    filtered = term
      ? PAGES.filter(p => p.t.toLowerCase().includes(term) || p.g.toLowerCase().includes(term))
      : PAGES.slice();
    active = 0;
    list.replaceChildren();
    if (!filtered.length) {
      const e = document.createElement("div");
      e.className = "cmdk-empty";
      e.textContent = "No matches.";
      list.appendChild(e);
      return;
    }
    let lastG = null;
    filtered.forEach((p, i) => {
      if (p.g !== lastG) {
        const h = document.createElement("div");
        h.className = "cmdk-group"; h.textContent = p.g;
        list.appendChild(h); lastG = p.g;
      }
      const row = document.createElement("div");
      row.className = "cmdk-item" + (i === active ? " active" : "");
      row.setAttribute("role", "option");
      row.dataset.idx = String(i);
      row.dataset.url = p.u;
      const ic = document.createElement("span"); ic.className = "ic"; ic.textContent = p.ic;
      const tt = document.createElement("span"); tt.textContent = p.t;
      const hint = document.createElement("span"); hint.className = "hint"; hint.textContent = "↵";
      row.append(ic, tt, hint);
      row.addEventListener("mouseenter", () => setActive(i));
      row.addEventListener("click", () => go(p.u));
      list.appendChild(row);
    });
  }
  function setActive(i) {
    const items = list.querySelectorAll(".cmdk-item");
    if (!items.length) return;
    active = Math.max(0, Math.min(items.length - 1, i));
    items.forEach((el, j) => el.classList.toggle("active", j === active));
    items[active]?.scrollIntoView({ block: "nearest" });
  }
  function go(u) {
    close();
    if (u.startsWith("http") || u.startsWith("mailto")) window.open(u, u.startsWith("mailto") ? "_self" : "_blank", "noopener");
    else window.location.href = u;
  }
  function open() {
    render("");
    overlay.classList.add("open");
    setTimeout(() => input.focus(), 30);
    trig.classList.add("hidden");
  }
  function close() {
    overlay.classList.remove("open");
    input.value = "";
    trig.classList.remove("hidden");
  }

  // Wiring
  trig.addEventListener("click", open);
  overlay.addEventListener("click", (e) => { if (e.target.matches("[data-close]")) close(); });
  input.addEventListener("input", e => render(e.target.value));
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const p = filtered[active]; if (p) go(p.u);
    } else if (e.key === "ArrowDown") { e.preventDefault(); setActive(active + 1); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setActive(active - 1); }
    else if (e.key === "Escape")    { close(); }
  });
  document.addEventListener("keydown", (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === "k" || e.key === "K")) { e.preventDefault(); overlay.classList.contains("open") ? close() : open(); }
    else if (e.key === "Escape" && overlay.classList.contains("open")) close();
  });
})();
