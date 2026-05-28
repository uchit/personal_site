/* diagnostic.js — shared engine for the practitioner diagnostics.
   Each page defines window.DIAG = { questions, levels } then calls Diag.run(). */
(function () {
  "use strict";
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  function fromHash(n) {
    const h = location.hash.replace(/^#/, "");
    const m = h.match(/^a=([1-5]+)$/);
    if (!m || m[1].length !== n) return null;
    return m[1].split("").map(Number);
  }

  const Diag = {
    state: { answers: [], i: 0 },
    cfg: null,

    run(cfg) {
      this.cfg = cfg;
      this.state.answers = new Array(cfg.questions.length).fill(null);
      this.state.i = 0;

      // wire back button
      $("#qback").addEventListener("click", () => {
        if (this.state.i > 0) { this.state.i--; this.renderQ(); }
      });

      const pre = fromHash(cfg.questions.length);
      if (pre) {
        this.state.answers = pre;
        this.finish();
      } else {
        this.renderQ();
      }
    },

    renderQ() {
      const i = this.state.i;
      const q = this.cfg.questions[i];
      const n = this.cfg.questions.length;
      $("#qnum").textContent = "Q." + String(i + 1).padStart(2, "0");
      $("#qcap").textContent = q.cap || "";
      $("#qtext").textContent = q.t;
      $("#qbar").style.width = (i / n * 100) + "%";
      $("#ptxt").textContent = "QUESTION " + (i + 1) + " / " + n;
      $("#qback").disabled = i === 0;

      const opts = $("#qopts");
      opts.replaceChildren();
      q.o.forEach((text, k) => {
        const b = document.createElement("button");
        b.className = "q-opt"; b.type = "button";
        const lvl = document.createElement("span");
        lvl.className = "lvl"; lvl.textContent = "L" + (k + 1);
        const body = document.createElement("span");
        body.className = "body"; body.textContent = text;
        b.append(lvl, body);
        b.addEventListener("click", () => {
          this.state.answers[i] = k + 1;
          if (i < n - 1) {
            this.state.i++; this.renderQ();
            window.scrollTo({ top: 0, behavior: "smooth" });
          } else {
            this.finish();
          }
        });
        opts.appendChild(b);
      });
    },

    finish() {
      const cfg = this.cfg;
      const score = this.state.answers.reduce((s, v) => s + (v || 0), 0);
      const max = cfg.questions.length * 5;
      const pct = score / max;
      const lvl = cfg.levels.find(L => pct >= L.minPct && pct <= L.maxPct) || cfg.levels[0];

      $("#rscore").textContent = String(score);
      $("#rmax").textContent = "/ " + max;
      $("#rlevel").innerHTML = "Level &mdash; <em>" + lvl.name + "</em>";
      $("#rbody").innerHTML = lvl.body;

      const recs = $("#rrecs"); recs.replaceChildren();
      lvl.recs.forEach(r => {
        const li = document.createElement("li");
        li.textContent = r; recs.appendChild(li);
      });

      // Capability breakdown
      const cb = $("#cbreakdown");
      if (cb) {
        cb.replaceChildren();
        cfg.questions.forEach((q, idx) => {
          const v = this.state.answers[idx] || 0;
          const row = document.createElement("div"); row.className = "cap-row";
          const name = document.createElement("div"); name.className = "cap-name"; name.textContent = q.cap || q.t;
          const bar = document.createElement("div"); bar.className = "cap-bar";
          const cf = document.createElement("div"); cf.className = "cf";
          bar.appendChild(cf);
          const sc = document.createElement("div"); sc.className = "cap-score"; sc.textContent = "L" + v;
          row.append(name, bar, sc);
          cb.appendChild(row);
          requestAnimationFrame(() => { cf.style.width = (v / 5 * 100) + "%"; });
        });
      }

      $("#quiz").classList.add("done");
      $("#result").classList.add("show");
      $("#qbar").style.width = "100%";
      $("#ptxt").textContent = "COMPLETE · " + score + " / " + max;
      requestAnimationFrame(() => { $("#rfill").style.width = (pct * 100) + "%"; });

      const hash = "a=" + this.state.answers.map(v => String(v || 1)).join("");
      history.replaceState(null, "", "#" + hash);

      const share = $("#rshare");
      if (share) share.addEventListener("click", (e) => {
        e.preventDefault();
        const url = location.href;
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => {
          share.textContent = "Link copied ✓";
          setTimeout(() => share.textContent = "Copy shareable link", 1800);
        });
        else prompt("Copy this URL:", url);
      });
    }
  };

  window.Diag = Diag;
})();
