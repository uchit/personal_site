/* diag-storage.js — localStorage layer for diagnostic results.
 *
 * The diagnostics page states "nothing leaves your browser" — this keeps that
 * true by construction: everything here is a single localStorage key, read
 * and written only client-side, never sent anywhere. window.DiagStorage is
 * the whole surface: save(), all(), clear().
 */
(function () {
  "use strict";
  const KEY = "hu:diag:results";

  function all() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "{}");
    } catch {
      return {};
    }
  }

  function save(slug, result) {
    try {
      const results = all();
      results[slug] = { ...result, ts: Date.now() };
      localStorage.setItem(KEY, JSON.stringify(results));
    } catch {
      /* Storage disabled (private browsing, quota) — the diagnostic still
         works, it just won't be remembered. Not worth surfacing an error for. */
    }
  }

  function clear() {
    try { localStorage.removeItem(KEY); } catch { /* see above */ }
  }

  window.DiagStorage = { save, all, clear };
})();
