/* dataset.js — filter, search, expand rows. URL hash captures filter state. */
(function () {
  "use strict";
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const state = {
    reg: new Set(),
    cat: new Set(),
    sector: new Set(),
    q: "",
  };

  /* The coverage panel repeats the regulation chips grouped by how deeply each
     one is actually mapped. They are the same filter by another route, so they
     bind here too — otherwise they look clickable and do nothing. */
  const chips = $$(".ds-chip, .cov-chip");
  const search = $(".ds-search");
  const clear = $(".ds-clear");
  const rows = $$(".ds-row");
  const empty = $("#ds-empty");
  const countEl = $("#ds-count");

  function rowVisible(row) {
    if (state.reg.size) {
      const rs = (row.dataset.regs || "").split(" ");
      if (!rs.some(r => state.reg.has(r))) return false;
    }
    if (state.cat.size && !state.cat.has(row.dataset.cat)) return false;
    if (state.sector.size) {
      const ss = (row.dataset.sectors || "").split(" ");
      if (!ss.some(s => state.sector.has(s))) return false;
    }
    if (state.q) {
      const txt = row.dataset.text || "";
      if (!txt.includes(state.q)) return false;
    }
    return true;
  }

  function render() {
    let shown = 0;
    rows.forEach(row => {
      const visible = rowVisible(row);
      row.style.display = visible ? "" : "none";
      // also hide the detail row that immediately follows
      const detail = row.nextElementSibling;
      if (detail && detail.classList.contains("ds-detail")) {
        detail.style.display = visible ? "" : "none";
      }
      if (visible) shown++;
    });
    countEl.textContent = shown;
    empty.hidden = shown > 0;
    persist();
  }

  function persist() {
    const parts = [];
    if (state.reg.size) parts.push("reg=" + [...state.reg].join(","));
    if (state.cat.size) parts.push("cat=" + [...state.cat].map(encodeURIComponent).join(","));
    if (state.sector.size) parts.push("sector=" + [...state.sector].join(","));
    if (state.q) parts.push("q=" + encodeURIComponent(state.q));
    const hash = parts.join("&");
    history.replaceState(null, "", hash ? "#" + hash : window.location.pathname);
  }

  function restore() {
    const h = (location.hash || "").replace(/^#/, "");
    if (!h) return;
    h.split("&").forEach(pair => {
      const [k, v] = pair.split("=");
      if (!v) return;
      if (k === "reg") v.split(",").forEach(x => state.reg.add(x));
      else if (k === "cat") v.split(",").forEach(x => state.cat.add(decodeURIComponent(x)));
      else if (k === "sector") v.split(",").forEach(x => state.sector.add(x));
      else if (k === "q") { state.q = decodeURIComponent(v); search.value = state.q; }
    });
    syncChips();
  }

  /* A regulation now has two chips — one in the filter bar, one in the
     coverage panel. Drive both off state rather than toggling the clicked
     element, or they disagree the moment either is used. */
  function syncChips() {
    chips.forEach(c => {
      const f = c.dataset.filter;
      const v = c.dataset.value;
      c.classList.toggle("active", !!(state[f] && state[f].has(v)));
    });
  }

  // Chip clicks
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      const f = chip.dataset.filter;
      const v = chip.dataset.value;
      if (state[f].has(v)) state[f].delete(v);
      else state[f].add(v);
      syncChips();
      render();
      /* Coverage chips sit above the results inside a collapsed panel. Without
         this the filter applies somewhere the reader can't see. */
      if (chip.classList.contains("cov-chip")) {
        const panel = chip.closest("details.cov");
        if (panel) panel.open = false;
        const rowsTop = document.querySelector(".ds-row");
        if (rowsTop) rowsTop.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  // Search
  let qTimer;
  search.addEventListener("input", (e) => {
    clearTimeout(qTimer);
    qTimer = setTimeout(() => { state.q = e.target.value.trim().toLowerCase(); render(); }, 120);
  });

  // Clear all
  clear.addEventListener("click", () => {
    state.reg.clear(); state.cat.clear(); state.sector.clear(); state.q = "";
    syncChips();
    search.value = "";
    render();
  });

  // Row click → toggle expand
  rows.forEach(row => {
    row.addEventListener("click", () => {
      const wasOpen = row.classList.contains("expanded");
      // Optional: collapse others. We don't, so multiple can be open.
      row.classList.toggle("expanded");
    });
  });

  // Restore from URL hash, then initial render.
  restore();
  render();
})();
