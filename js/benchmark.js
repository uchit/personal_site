/* benchmark.js — opt-in contribution of a diagnostic result to the public
 * benchmark.
 *
 * Every diagnostic run is currently discarded. Aggregated, those runs are the
 * only primary data this site can have: a distribution of where teams actually
 * stand, which no vendor survey covers.
 *
 * Rules this file holds to:
 *   - Off by default. The checkbox is unchecked; doing nothing sends nothing.
 *   - One request, fire and forget. It never blocks or alters the result view.
 *   - Sends a vector of levels and a sector. No name, email, free text, URL,
 *     referrer or identifier — there is nothing here to identify anyone with.
 *   - Silent on failure. A benchmark that cannot reach its endpoint is not the
 *     reader's problem and must never look like their result failed.
 *   - Sends at most once per result, so a double click or a re-render cannot
 *     double-count.
 */
(function () {
  "use strict";

  var ENDPOINT = "/v1/submit";

  function slug() {
    return location.pathname
      .replace(/\/index\.html$/, "/")
      .replace(/^.*\/([^/]+?)(?:\.html)?\/?$/, "$1");
  }

  function mount() {
    var actions = document.querySelector(".result-actions");
    if (!actions || document.getElementById("bm-optin")) return;
    if (!window.Diag || !Diag.cfg) return;

    var wrap = document.createElement("div");
    wrap.className = "bm-optin";
    wrap.id = "bm-optin";
    wrap.innerHTML =
      '<label class="bm-row">' +
      '<input type="checkbox" id="bm-consent" />' +
      '<span><b>Add this result to the public benchmark.</b> ' +
      'Your capability levels and sector only &mdash; no name, no email, nothing that identifies you or your employer. ' +
      'Stored as counts, not records. <a href="/benchmark/">See what gets published</a>.</span>' +
      "</label>" +
      '<div class="bm-state" id="bm-state" role="status" aria-live="polite"></div>';

    actions.parentNode.insertBefore(wrap, actions);

    document.getElementById("bm-consent").addEventListener("change", function (e) {
      if (e.target.checked) send();
    });
  }

  var sent = false;

  function send() {
    if (sent) return;
    var state = document.getElementById("bm-state");

    var levels = (Diag.state && Diag.state.answers) || [];
    if (!levels.length || levels.some(function (v) { return !v; })) return;

    sent = true;
    if (state) state.textContent = "Adding…";

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        diagnostic: slug(),
        sector: Diag.state.sector,
        levels: levels.map(Number),
      }),
    })
      .then(function (r) {
        if (!r.ok) throw new Error(String(r.status));
        if (state) state.textContent = "Added — thank you. It's in the next published cut.";
      })
      .catch(function () {
        /* Deliberately quiet. Restore the checkbox so a retry is possible, but
           do not present this as an error the reader has to care about. */
        sent = false;
        var cb = document.getElementById("bm-consent");
        if (cb) cb.checked = false;
        if (state) state.textContent = "";
      });
  }

  /* The result view is rendered by diagnostic.js only after the last answer,
     so watch for it rather than guessing at a delay. */
  function watch() {
    mount();
    var target = document.querySelector("#result");
    if (!target) return;
    new MutationObserver(mount).observe(target, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["class"],
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
})();
