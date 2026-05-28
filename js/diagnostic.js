/* diagnostic.js — shared engine for practitioner diagnostics.
   Each page defines window.DIAG = { questions, levels, sectors, references } then calls Diag.run().

   Question schema:
     { cap: "Pipeline", t: "How does code reach production?",
       refs: [{name:"NIST SSDF PW.4.4", url:"https://csrc.nist.gov/..."}, ...],
       o: [string, string, string, string, string] }

   Level schema:
     { minPct, maxPct, name, body,
       benchmark: "Source-cited industry distribution string (HTML allowed)",
       recs: [{ what:"...", why:"...", tools:"Vendor X · OSS Y", constraint:"What's hard", refs:[{name,url}] }] }

   Sector schema (cfg.sectors):
     { fsi: {label:"Financial services", lens:"<p>HTML with cites…</p>"}, ... }

   References (cfg.references):
     [{ domain:"Framework", name:"...", desc:"...", url:"..." }, ...]
*/
(function () {
  "use strict";
  const $  = (s, r = document) => r.querySelector(s);

  function fromHash(n) {
    const h = location.hash.replace(/^#/, "");
    const m = h.match(/^a=([1-5]+)(?:&s=([a-z]+))?$/);
    if (!m || m[1].length !== n) return null;
    return { answers: m[1].split("").map(Number), sector: m[2] || null };
  }

  const Diag = {
    state: { answers: [], i: 0, sector: "tech" },
    cfg: null,

    run(cfg) {
      this.cfg = cfg;
      this.state.answers = new Array(cfg.questions.length).fill(null);
      this.state.i = 0;
      this.state.sector = (cfg.sectors && Object.keys(cfg.sectors)[0]) || "tech";

      // Wire sector selector
      this.renderSectors();

      $("#qback").addEventListener("click", () => {
        if (this.state.i > 0) { this.state.i--; this.renderQ(); }
      });

      const pre = fromHash(cfg.questions.length);
      if (pre) {
        this.state.answers = pre.answers;
        if (pre.sector && cfg.sectors[pre.sector]) this.state.sector = pre.sector;
        this.finish();
      } else {
        this.renderQ();
      }
    },

    renderSectors() {
      const wrap = $("#sectorsel"); if (!wrap || !this.cfg.sectors) return;
      const opts = document.createElement("div"); opts.className = "opts";
      Object.entries(this.cfg.sectors).forEach(([key, sec]) => {
        const b = document.createElement("button"); b.type = "button";
        b.textContent = sec.label;
        if (key === this.state.sector) b.classList.add("on");
        b.addEventListener("click", () => {
          this.state.sector = key;
          opts.querySelectorAll("button").forEach(x => x.classList.remove("on"));
          b.classList.add("on");
          // If result already shown, refresh the sector lens
          if ($("#result").classList.contains("show")) this.renderSectorLens();
        });
        opts.appendChild(b);
      });
      const lab = document.createElement("span"); lab.className = "lab"; lab.textContent = "Sector lens";
      wrap.replaceChildren(lab, opts);
    },

    renderQ() {
      const i = this.state.i, q = this.cfg.questions[i], n = this.cfg.questions.length;
      $("#qnum").textContent = "Q." + String(i + 1).padStart(2, "0");
      $("#qcap").textContent = q.cap || "";
      $("#qtext").textContent = q.t;
      $("#qbar").style.width = (i / n * 100) + "%";
      $("#ptxt").textContent = "QUESTION " + (i + 1) + " / " + n;
      $("#qback").disabled = i === 0;

      // Question refs
      const refsEl = $("#qrefs"); refsEl.replaceChildren();
      if (q.refs && q.refs.length) {
        const lab = document.createElement("span"); lab.className = "rlab"; lab.textContent = "Maps to:";
        refsEl.appendChild(lab);
        q.refs.forEach((r, idx) => {
          const a = document.createElement("a");
          a.href = r.url; a.target = "_blank"; a.rel = "noopener";
          a.textContent = r.name;
          refsEl.appendChild(a);
        });
      }

      const opts = $("#qopts"); opts.replaceChildren();
      q.o.forEach((text, k) => {
        const b = document.createElement("button");
        b.className = "q-opt"; b.type = "button";
        const lvl = document.createElement("span"); lvl.className = "lvl"; lvl.textContent = "L" + (k + 1);
        const body = document.createElement("span"); body.className = "body"; body.textContent = text;
        b.append(lvl, body);
        b.addEventListener("click", () => {
          this.state.answers[i] = k + 1;
          if (i < n - 1) { this.state.i++; this.renderQ(); }
          else {
            this.finish();
            requestAnimationFrame(() => {
              const r = document.getElementById("result");
              if (r) r.scrollIntoView({ behavior: "smooth", block: "start" });
            });
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
      $("#rbench").innerHTML = lvl.benchmark || "";

      // Mini recs (above fold)
      const mini = $("#rmini"); mini.replaceChildren();
      lvl.recs.slice(0, 3).forEach(r => {
        const li = document.createElement("li"); li.textContent = r.what;
        mini.appendChild(li);
      });

      this.renderSectorLens();

      // Below fold — capability breakdown
      const cb = $("#cbreakdown");
      if (cb) {
        cb.replaceChildren();
        cfg.questions.forEach((q, idx) => {
          const v = this.state.answers[idx] || 0;
          const row = document.createElement("div"); row.className = "cap-row";
          const name = document.createElement("div"); name.className = "cap-name"; name.textContent = q.cap || q.t;
          const bar = document.createElement("div"); bar.className = "cap-bar";
          const cf = document.createElement("div"); cf.className = "cf"; bar.appendChild(cf);
          const sc = document.createElement("div"); sc.className = "cap-score"; sc.textContent = "L" + v;
          row.append(name, bar, sc);
          cb.appendChild(row);
          requestAnimationFrame(() => { cf.style.width = (v / 5 * 100) + "%"; });
        });
      }

      // Below fold — detailed recs with citations
      const rd = $("#rdetail"); rd.replaceChildren();
      lvl.recs.forEach(r => {
        const li = document.createElement("li");
        const what = document.createElement("div"); what.className = "what"; what.textContent = r.what;
        li.appendChild(what);
        if (r.why) {
          const why = document.createElement("div"); why.className = "why";
          why.innerHTML = r.why;
          li.appendChild(why);
        }
        const meta = document.createElement("div"); meta.className = "meta";
        if (r.tools) {
          const t = document.createElement("span"); t.innerHTML = '<b>Tools</b> ' + r.tools;
          meta.appendChild(t);
        }
        if (r.constraint) {
          const c = document.createElement("span"); c.innerHTML = '<b>Constraint</b> ' + r.constraint;
          meta.appendChild(c);
        }
        if (r.refs && r.refs.length) {
          const re = document.createElement("span"); re.innerHTML = '<b>Refs</b> ';
          r.refs.forEach((ref, i) => {
            const a = document.createElement("a"); a.href = ref.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = ref.name;
            re.appendChild(a);
            if (i < r.refs.length - 1) re.appendChild(document.createTextNode(" · "));
          });
          meta.appendChild(re);
        }
        if (meta.childElementCount) li.appendChild(meta);
        rd.appendChild(li);
      });

      // Below fold — references library
      const refs = $("#refslib");
      if (refs && cfg.references) {
        refs.replaceChildren();
        cfg.references.forEach(r => {
          const card = document.createElement("a"); card.className = "ref-card";
          card.href = r.url; card.target = "_blank"; card.rel = "noopener";
          card.innerHTML =
            '<div class="domain">' + r.domain + '</div>' +
            '<div class="name">' + r.name + '</div>' +
            '<div class="desc">' + r.desc + '</div>' +
            '<span class="read">Open &rarr;</span>';
          refs.appendChild(card);
        });
      }

      $("#quiz").classList.add("done");
      $("#result").classList.add("show");
      $("#qbar").style.width = "100%";
      $("#ptxt").textContent = "COMPLETE · " + score + " / " + max;
      requestAnimationFrame(() => { $("#rfill").style.width = (pct * 100) + "%"; });

      const hash = "a=" + this.state.answers.map(v => String(v || 1)).join("") + "&s=" + this.state.sector;
      history.replaceState(null, "", "#" + hash);

      const share = $("#rshare");
      if (share) share.onclick = (e) => {
        e.preventDefault();
        const url = location.href;
        if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => {
          share.textContent = "Link copied ✓";
          setTimeout(() => share.textContent = "Copy shareable link", 1800);
        });
        else prompt("Copy this URL:", url);
      };
    },

    renderSectorLens() {
      const lens = $("#rsectorlens");
      if (!lens || !this.cfg.sectors) return;
      const sec = this.cfg.sectors[this.state.sector];
      if (!sec) { lens.innerHTML = ""; return; }
      lens.innerHTML =
        '<div class="lab">Sector lens · ' + sec.label + '</div>' +
        '<p>' + sec.lens + '</p>';
    }
  };

  window.Diag = Diag;
})();
