/* Header behaviour.
   - "scrolled": once the page leaves the top, the bar gets its glass background.
   - "hidden": the bar slides away while scrolling down and returns on any
     scroll up, so it never sits over content the reader is looking at.
   - Mobile menu toggle. */
(function () {
  var head = document.querySelector(".site-head");
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  var lastY = window.scrollY;

  if (head) {
    var onScroll = function () {
      var y = window.scrollY;
      head.classList.toggle("scrolled", y > 8);
      var menuOpen = nav && nav.classList.contains("open");
      if (!menuOpen) head.classList.toggle("hidden", y > 120 && y > lastY + 2);
      if (y < lastY - 2) head.classList.remove("hidden");
      lastY = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    head.addEventListener("focusin", function () { head.classList.remove("hidden"); });
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.textContent = open ? "Close" : "Menu";
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        nav.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Menu";
      }
    });
  }
})();
