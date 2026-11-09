/* readiness-score.js — the one scoring function for the agent readiness check.
 *
 * Used by the page (js/diagnostic.js) and copied verbatim into the Cloudflare
 * Worker's MCP endpoint by scripts/build-mcp-data.mjs, so a person and an AI
 * agent answering the same questions always get the same score and level.
 *
 * answers: array of option numbers, 1 to 5, one per question.
 * levels:  [{ name, minPct, maxPct, ... }] from the readiness config.
 */
(function (root) {
  function score(levels, answers, questionCount) {
    var n = questionCount || answers.length;
    var total = 0;
    for (var i = 0; i < n; i++) total += answers[i] || 0;
    var max = n * 5;
    var pct = max ? total / max : 0;
    var level = null;
    for (var k = 0; k < levels.length; k++) {
      if (pct >= levels[k].minPct && pct <= levels[k].maxPct) { level = levels[k]; break; }
    }
    return { score: total, max: max, pct: pct, level: level || levels[0] };
  }
  root.ReadinessScore = { score: score };
})(typeof window !== "undefined" ? window : globalThis);
