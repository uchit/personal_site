/* decision-storage.js — localStorage layer for decision-tree results, same
 * posture as diag-storage.js: one key, client-side only, nothing sent
 * anywhere. window.DecisionStorage is the whole surface: save(), all(), clear().
 */
(function () {
  "use strict";
  const KEY = "hu:decision:results";

  function all() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      return {};
    }
  }

  function save(treeId, result) {
    try {
      const results = all();
      results[treeId] = { ...result, ts: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(results));
    } catch {
      /* Storage disabled — the tree still works, it just won't be remembered. */
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch { /* see above */ }
  }

  window.DecisionStorage = { save, all, clear };
})();
