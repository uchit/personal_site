/* benchmark-view.js — renders the published aggregate on /benchmark/.
 *
 * The empty state matters as much as the populated one. Until there is enough
 * data the page must say so plainly rather than showing an encouraging-looking
 * chart over six responses — the whole credibility of the dataset rests on
 * withholding it when it is thin.
 */
(function () {
  "use strict";

  var LABELS = {
    "devsecops-maturity": ["DevSecOps maturity", ["Reactive","Repeatable","Defined","Managed","Optimising"]],
    "genai-readiness":    ["GenAI readiness",    ["Experimenting","Piloting","Operating","Industrialising","Platforming"]],
    "sre-programme":      ["SRE programme",      ["Heroic","Operational","Disciplined","Engineered","Property"]],
    "cloud-cost":         ["Cloud cost",         ["Unmanaged","Aware","Controlled","Optimised","Engineered"]],
    "platform-engineering":["Platform engineering",["Tooling","Emerging","Established","Productised","Property"]],
    "ea-operating-model": ["EA operating model", ["Bureaucratic","Consultative","Governed","Enabling","Property"]],
    "agent-readiness":     ["Agent readiness",    ["Improvised","Contained","Supervised","Evidenced","Engineered"]],
  };

  var out = document.getElementById("bk-out");
  var meta = document.getElementById("bk-meta");
  if (!out) return;

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function bars(bandCounts, names, runs) {
    var html = '<div class="bk-bars">';
    for (var lvl = 1; lvl <= 5; lvl++) {
      var n = bandCounts[String(lvl)] || 0;
      var pct = runs ? Math.round((n / runs) * 100) : 0;
      html +=
        '<div class="bk-bar">' +
        '<span class="lv">' + esc(names[lvl - 1]) + "</span>" +
        '<span class="track"><span class="fill" style="width:' + pct + '%"></span></span>' +
        '<span class="pc">' + pct + "%</span>" +
        "</div>";
    }
    return html + "</div>";
  }

  fetch("/v1/stats", { headers: { Accept: "application/json" } })
    .then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then(function (data) {
      var ds = data.diagnostics || {};
      var published = Object.keys(ds).filter(function (k) { return ds[k].published; });
      var totalRuns = Object.keys(ds).reduce(function (a, k) { return a + (ds[k].runs || 0); }, 0);

      if (!published.length) {
        out.innerHTML =
          "<p><b>Not enough data to publish yet.</b></p>" +
          "<p style='margin-top:10px'>" + totalRuns +
          " run" + (totalRuns === 1 ? "" : "s") +
          " contributed so far. Nothing is published for a diagnostic until it has " +
          esc(data.minimum_n || 25) +
          ", because a distribution over a handful of responses is noise wearing the costume of evidence.</p>" +
          "<p style='margin-top:10px'>The counter is live and this page updates itself as the data arrives.</p>";
      } else {
        var html = '<div class="bk-grid">';
        published.forEach(function (k) {
          var d = ds[k];
          var label = (LABELS[k] || [k, ["1","2","3","4","5"]]);
          html +=
            '<div class="bk-card">' +
            '<div class="t">Distribution</div>' +
            '<div class="h">' + esc(label[0]) + "</div>" +
            '<div class="n">n = ' + d.runs + "</div>" +
            bars(d.band || {}, label[1], d.runs) +
            "</div>";
        });
        out.innerHTML = html + "</div>";
        out.className = "";
      }

      var bits = [
        "<span>Total runs <b>" + totalRuns + "</b></span>",
        "<span>Published above <b>n=" + esc(data.minimum_n || 25) + "</b></span>",
        "<span>Licence <b>" + esc(data.license || "CC BY 4.0") + "</b></span>",
        '<span><a href="/v1/stats">Raw JSON</a></span>',
      ];
      if (meta) meta.innerHTML = bits.join("");
    })
    .catch(function () {
      /* If the endpoint isn't reachable, say so honestly rather than showing
         a hopeful empty state that implies zero contributions. */
      out.innerHTML =
        "<p><b>The benchmark endpoint isn&rsquo;t responding.</b></p>" +
        "<p style='margin-top:10px'>The distribution can&rsquo;t be shown right now. " +
        "This is a problem at my end, not yours &mdash; the diagnostics themselves are unaffected " +
        "and run entirely in your browser.</p>";
    });
})();
