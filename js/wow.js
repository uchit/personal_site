/* wow.js — the one or two set pieces on each page.
 *
 * Every piece is opt-in by a data-wow attribute, works from real content on
 * the page, and degrades to a static layout: without JS, or with reduced
 * motion, the reader sees the final state and loses nothing.
 */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /* Pinned, scroll-driven stages only run on wide screens. On phones a
     section that holds the screen for several swipes reads as stuck, and
     its progress dots look like a carousel that will not swipe. There the
     content simply stacks, in its finished state. */
  var phone = window.matchMedia("(max-width: 760px)").matches;
  var pinned = !reduce && !phone;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

  /* Scroll progress (0..1) through a tall "stage" section. */
  function progressOf(el) {
    var r = el.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    return span > 0 ? clamp(-r.top / span, 0, 1) : (r.top < 0 ? 1 : 0);
  }

  var onFrame = [];
  var ticking = false;
  function schedule() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { ticking = false; onFrame.forEach(function (f) { f(); }); });
  }
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  function onceVisible(el, fn, threshold) {
    if (!("IntersectionObserver" in window)) { fn(); return; }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { io.disconnect(); fn(); } });
    }, { threshold: threshold || 0.35 });
    io.observe(el);
  }

  /* ---- Stage: slides that take over the screen one at a time ---------- */
  document.querySelectorAll('[data-wow="stage"]').forEach(function (stage) {
    if (!pinned) return;
    var slides = [].slice.call(stage.querySelectorAll(".slide"));
    var dots = [].slice.call(stage.querySelectorAll(".stage-dots span"));
    stage.classList.add("is-live");
    stage.style.setProperty("--n", slides.length);
    var current = -1;
    onFrame.push(function () {
      var p = progressOf(stage);
      var i = Math.min(slides.length - 1, Math.floor(p * slides.length));
      var local = p * slides.length - i;
      if (i !== current) {
        slides.forEach(function (s, k) {
          s.classList.toggle("is-on", k === i);
          s.classList.toggle("is-past", k < i);
          if (k === i) s.removeAttribute("inert"); else s.setAttribute("inert", "");
        });
        dots.forEach(function (d, k) { d.classList.toggle("on", k === i); });
        current = i;
      }
      var mega = slides[i].querySelector(".mega");
      if (mega) mega.style.transform = "scale(" + (0.94 + 0.06 * ease(clamp(local * 1.6, 0, 1))) + ")";
    });
    schedule();
  });

  /* ---- Silos: 1,000 scattered archives pull into one platform ---------- */
  document.querySelectorAll('[data-wow="silos"]').forEach(function (stage) {
    var canvas = stage.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var count = stage.querySelector(".silo-count b");
    var N = 1000, COLS = 50, ROWS = 20;
    var seed = 7;
    var rand = function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    var tints = ["#8e8e93"];
    var pts = [];
    for (var k = 0; k < N; k++) pts.push({ x: rand(), y: rand(), c: tints[Math.floor(rand() * tints.length)], d: rand() * .35 });
    var W = 0, H = 0, dpr = 1;
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = canvas.clientWidth; H = canvas.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function draw(p) {
      if (!W) size();
      ctx.clearRect(0, 0, W, H);
      var cell = Math.min((W * .82) / COLS, (H * .5) / ROWS);
      var bw = cell * COLS, bh = cell * ROWS;
      var bx = (W - bw) / 2, by = (H - bh) / 2;
      var s0 = Math.max(4, Math.min(W, H) / 80);
      for (var k = 0; k < N; k++) {
        var pt = pts[k];
        var t = ease(clamp((p - pt.d) / .55, 0, 1));
        var sx = 16 + pt.x * (W - 32), sy = 16 + pt.y * (H - 32);
        var tx = bx + (k % COLS) * cell, ty = by + Math.floor(k / COLS) * cell;
        var x = sx + (tx - sx) * t, y = sy + (ty - sy) * t;
        var sz = s0 + (cell - s0) * t;
        ctx.fillStyle = p > .9 ? "#2997ff" : pt.c;
        ctx.globalAlpha = .55 + .45 * t;
        ctx.fillRect(x, y, Math.max(1, sz - (p > .9 ? 0 : 1)), Math.max(1, sz - (p > .9 ? 0 : 1)));
      }
      ctx.globalAlpha = 1;
      if (count) {
        var n = Math.max(1, Math.round(1000 - 999 * ease(clamp((p - .12) / .7, 0, 1))));
        count.textContent = n.toLocaleString("en-AU") + (n === 1 ? " archive" : " separate archives");
      }
    }
    if (!pinned) { stage.classList.add("is-static"); size(); draw(1); return; }
    stage.classList.add("is-live");
    window.addEventListener("resize", function () { W = 0; });
    onFrame.push(function () { draw(progressOf(stage)); });
    schedule();
  });

  /* ---- Clock: a loan application runs against the five-minute line ----- */
  document.querySelectorAll('[data-wow="clock"]').forEach(function (el) {
    var steps = [].slice.call(el.querySelectorAll(".clock-step"));
    var fill = el.querySelector(".clock-fill");
    var end = parseFloat(el.getAttribute("data-end") || ".9");
    function finish() {
      fill.style.width = (end * 100) + "%";
      steps.forEach(function (s) { s.classList.add("done"); });
      el.classList.add("finished");
    }
    if (reduce) { finish(); return; }
    onceVisible(el, function () {
      var start = null, dur = 5200;
      function tick(ts) {
        if (start === null) start = ts;
        var t = clamp((ts - start) / dur, 0, 1);
        var w = end * t;
        fill.style.width = (w * 100) + "%";
        steps.forEach(function (s) { if (parseFloat(s.getAttribute("data-at")) <= w + .001) s.classList.add("done"); });
        if (t < 1) requestAnimationFrame(tick); else el.classList.add("finished");
      }
      requestAnimationFrame(tick);
    }, .5);
  });

  /* ---- Redact: the chat dissolves into the one record that leaves ------- */
  document.querySelectorAll('[data-wow="redact"]').forEach(function (stage) {
    var chat = stage.querySelector(".redact-chat");
    var rec = stage.querySelector(".redact-record");
    var cap1 = stage.querySelector(".redact-cap1");
    var cap2 = stage.querySelector(".redact-cap2");
    if (reduce) { stage.classList.add("is-static"); return; }
    if (phone) {
      /* No pinning on phones: play the dissolve once, on its own, when the
         chat is in view, so the before and after both get seen. */
      stage.classList.add("is-play");
      onceVisible(chat, function () {
        setTimeout(function () { stage.classList.add("played"); }, 1400);
      }, .6);
      return;
    }
    stage.classList.add("is-live");
    onFrame.push(function () {
      var p = progressOf(stage);
      var a = clamp((p - .15) / .4, 0, 1);
      var b = clamp((p - .55) / .25, 0, 1);
      chat.style.filter = "blur(" + (a * 14).toFixed(1) + "px)";
      chat.style.opacity = String(1 - a * .85);
      chat.style.transform = "scale(" + (1 - a * .06) + ")";
      rec.style.opacity = String(b);
      rec.style.transform = "translateY(" + ((1 - b) * 24) + "px)";
      cap1.style.opacity = String(1 - clamp(a * 1.6, 0, 1));
      cap2.style.opacity = String(b);
    });
    schedule();
  });

  /* ---- Graph: the ten controls and what each one needs first ---------- */
  document.querySelectorAll('[data-wow="graph"]').forEach(function (g) {
    var svg = g.querySelector("svg");
    var nodes = {};
    g.querySelectorAll("[data-node]").forEach(function (n) { nodes[n.getAttribute("data-node")] = n; });
    var edges = [];
    g.querySelectorAll("[data-needs]").forEach(function (n) {
      n.getAttribute("data-needs").split(" ").filter(Boolean).forEach(function (from) {
        if (nodes[from]) edges.push([from, n.getAttribute("data-node")]);
      });
    });
    var NS = "http://www.w3.org/2000/svg";
    function layout() {
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var box = g.getBoundingClientRect();
      svg.setAttribute("viewBox", "0 0 " + box.width + " " + box.height);
      edges.forEach(function (e) {
        var a = nodes[e[0]].getBoundingClientRect(), b = nodes[e[1]].getBoundingClientRect();
        var x1 = a.right - box.left, y1 = a.top + a.height / 2 - box.top;
        var x2 = b.left - box.left, y2 = b.top + b.height / 2 - box.top;
        var mx = (x1 + x2) / 2;
        var path = document.createElementNS(NS, "path");
        path.setAttribute("d", "M" + x1 + "," + y1 + " C" + mx + "," + y1 + " " + mx + "," + y2 + " " + x2 + "," + y2);
        path.setAttribute("data-from", e[0]); path.setAttribute("data-to", e[1]);
        svg.appendChild(path);
        var len = path.getTotalLength();
        path.style.strokeDasharray = len; path.style.strokeDashoffset = g.classList.contains("drawn") || reduce ? 0 : len;
      });
    }
    function highlight(id) {
      g.classList.toggle("focus", !!id);
      Object.keys(nodes).forEach(function (k) { nodes[k].classList.remove("hot"); });
      svg.querySelectorAll("path").forEach(function (p) {
        var on = id && (p.getAttribute("data-from") === id || p.getAttribute("data-to") === id);
        p.classList.toggle("hot", !!on);
        if (on) { nodes[p.getAttribute("data-from")].classList.add("hot"); nodes[p.getAttribute("data-to")].classList.add("hot"); }
      });
      if (id) nodes[id].classList.add("hot");
    }
    Object.keys(nodes).forEach(function (k) {
      nodes[k].addEventListener("mouseenter", function () { highlight(k); });
      nodes[k].addEventListener("focus", function () { highlight(k); });
      nodes[k].addEventListener("mouseleave", function () { highlight(null); });
      nodes[k].addEventListener("blur", function () { highlight(null); });
    });
    var mq = window.matchMedia("(min-width: 761px)");
    function go() { if (mq.matches) layout(); else while (svg.firstChild) svg.removeChild(svg.firstChild); }
    go();
    window.addEventListener("resize", go);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    onceVisible(g, function () {
      g.classList.add("drawn");
      svg.querySelectorAll("path").forEach(function (p, i) {
        p.style.transition = "stroke-dashoffset 1.1s cubic-bezier(.22,.61,.36,1) " + (i * 90) + "ms";
        p.style.strokeDashoffset = 0;
      });
    }, .3);
  });

  /* ---- Journey: the line between cities draws itself ------------------- */
  document.querySelectorAll('[data-wow="journey"]').forEach(function (el) {
    if (reduce) { el.classList.add("drawn"); return; }
    onceVisible(el, function () { el.classList.add("drawn"); }, .4);
  });

  /* ---- Mini check: one real question from the readiness check ---------- */
  document.querySelectorAll('[data-wow="mini-check"]').forEach(function (el) {
    var out = el.querySelector(".mini-out");
    el.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        el.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        out.innerHTML = b.getAttribute("data-say");
        out.classList.remove("pop"); void out.offsetWidth; out.classList.add("pop");
      });
    });
  });
})();
