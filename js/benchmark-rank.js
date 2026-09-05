/* benchmark-rank.js — "where you rank" callout on a diagnostic result,
 * computed from the live public benchmark (/v1/stats).
 *
 * #rbench already shows a hand-authored, source-cited qualitative note per
 * level (e.g. "roughly the bar the EU AI Act sets"). This is different: a
 * live number from actual contributors, shown only once there are enough of
 * them to mean anything — same 25-run publish threshold the API itself
 * enforces, so this never shows a percentile computed from a handful of
 * responses.
 *
 * Silent on failure/thin-data, same posture as benchmark.js: an unreachable
 * endpoint or an unpublished diagnostic just leaves the element hidden. This
 * is context, not something the reader is owed an error message about.
 */
(function () {
  "use strict";

  function slug() {
    return location.pathname
      .replace(/\/index\.html$/, "/")
      .replace(/^.*\/([^/]+?)(?:\.html)?\/?$/, "$1");
  }

  /* Mirrors worker/benchmark/src/index.js's band() exactly — the percentile
     is only meaningful if a visitor's own result is bucketed the same way
     the published distribution was. */
  function bandOf(levels) {
    var sum = levels.reduce(function (a, b) { return a + b; }, 0);
    var pct = sum / (levels.length * 5);
    if (pct <= 0.2) return "1";
    if (pct <= 0.4) return "2";
    if (pct <= 0.6) return "3";
    if (pct <= 0.8) return "4";
    return "5";
  }

  function render() {
    var out = document.getElementById("rrank");
    if (!out || !window.Diag || !Diag.state) return;
    var levels = (Diag.state.answers || []).map(Number);
    if (!levels.length || levels.some(function (v) { return !v; })) return;

    fetch("/v1/stats?diagnostic=" + encodeURIComponent(slug()), { headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
      .then(function (data) {
        var d = (data.diagnostics || {})[slug()];
        if (!d || !d.published) return; // stays hidden — not enough contributors yet

        var band = bandOf(levels);
        var total = 0, below = 0, same = 0;
        for (var b = 1; b <= 5; b++) {
          var n = d.band[String(b)] || 0;
          total += n;
          if (String(b) === band) same = n;
          else if (b < Number(band)) below += n;
        }
        if (!total) return;

        var pct = Math.round(((below + same / 2) / total) * 100);
        out.textContent = "Live benchmark: this result places at or above " + pct +
          "% of the " + total + " contributors who've run this diagnostic so far.";
        out.hidden = false;
      })
      .catch(function () { /* leave hidden */ });
  }

  var target = document.querySelector("#result");
  if (!target) return;
  render();
  new MutationObserver(render).observe(target, {
    childList: true, subtree: true, attributes: true, attributeFilter: ["class"],
  });
})();
