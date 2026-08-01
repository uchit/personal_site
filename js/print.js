/* print.js — "Download as PDF" for diagnostics, decision trees and calculators.
 *
 * There is no PDF generation here and deliberately so: the browser's own
 * print-to-PDF already renders text as selectable text with working links,
 * gets pagination right, and needs no library. A JS PDF builder would ship
 * ~200KB to produce a worse artefact. This file does the two things the
 * browser cannot infer:
 *
 *   1. Stamps the page with what it is, when it was run, and the URL that
 *      reproduces it — so the printed sheet points back at the live tool.
 *   2. Gives the result view a print affordance, since "Ctrl+P" is not a
 *      discoverable feature.
 *
 * Pairs with css/print.css, which is where all the layout lives.
 */
(function () {
  "use strict";

  /* Where the stamp goes, per page type. */
  function host() {
    return document.querySelector("#result") ||
           document.querySelector("#d-stage") ||
           document.querySelector(".calc") ||
           document.querySelector("main");
  }

  function title() {
    var h = document.querySelector(".tool-hero h1, .calc-hero h1, .d-hero h1");
    /* innerText, not textContent: these headings break across <br> and <em>
       ("GenAI Readiness<br><em>Diagnostic</em>"), and textContent concatenates
       with no separator — "GenAI ReadinessDiagnostic". */
    var t = h ? (h.innerText || h.textContent) : document.title.split("—")[0];
    return (t || "").replace(/\s+/g, " ").trim().replace(/\.$/, "");
  }

  /* The hash carries the answers, so location.href IS the result. Anything
     that regenerates the page must keep it — hence reading it at print time
     rather than caching it at load. */
  function stamp() {
    var el = document.querySelector(".print-stamp");
    if (!el) {
      el = document.createElement("div");
      el.className = "print-stamp";
      var h = host();
      if (!h) return;
      h.appendChild(el);
    }

    var now = new Date();
    var date = now.toLocaleDateString("en-AU", {
      year: "numeric", month: "long", day: "numeric"
    });

    el.replaceChildren();

    var line1 = document.createElement("div");
    var b = document.createElement("b");
    b.textContent = title();
    line1.append(b, document.createTextNode(" · run " + date));
    el.appendChild(line1);

    var line2 = document.createElement("div");
    line2.className = "u";
    line2.textContent = "Reproduce this result: " + location.href;
    el.appendChild(line2);

    /* The caveat differs by artefact: a diagnostic score gets mistaken for an
       audit result, a decision record gets mistaken for a recommendation
       specific to the reader's estate. Name the right one. */
    var caveat = document.querySelector("#result")
      ? "self-assessment, not an audit or a certification."
      : document.querySelector("#d-stage")
        ? "a decision aid — the trade-offs still need testing against your estate."
        : "an estimate — model it against your own billing data before committing.";

    var line3 = document.createElement("div");
    line3.textContent = "Uchit Vyas · hellouchit.com · " + caveat;
    el.appendChild(line3);
  }

  /* Rebuild the stamp immediately before the browser paints the print view,
     so the URL reflects the current answers even if the reader went back and
     changed one. Covers Ctrl+P as well as the button. */
  window.addEventListener("beforeprint", stamp);

  function addButton() {
    var actions = document.querySelector(".result-actions") ||
                  document.querySelector(".d-leaf .actions") ||
                  document.querySelector(".calc .actions");
    if (!actions || actions.querySelector(".print-btn")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost print-btn";
    btn.textContent = "Download as PDF";
    btn.addEventListener("click", function () {
      stamp();
      window.print();
    });

    /* Sits after the primary action but before the navigational links. */
    var share = actions.querySelector("#rshare");
    if (share && share.nextSibling) actions.insertBefore(btn, share.nextSibling);
    else actions.appendChild(btn);
  }

  /* The result view is rendered by diagnostic.js / decision.js after the user
     answers, so the button cannot be wired at DOMContentLoaded. Watch for it
     instead of guessing at a delay. */
  function watch() {
    addButton();
    var target = document.querySelector("#result") ||
                 document.querySelector("#d-stage") ||
                 document.querySelector(".calc");
    if (!target) return;
    new MutationObserver(addButton).observe(target, {
      childList: true, subtree: true, attributes: true, attributeFilter: ["class"]
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", watch);
  } else {
    watch();
  }
})();
