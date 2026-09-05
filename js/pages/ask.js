(function () {
  "use strict";
  var ENDPOINT = "/v2/chat";
  var MAX_HISTORY = 8;

  var thread = document.getElementById("ask-thread");
  var form = document.getElementById("ask-form");
  var input = document.getElementById("ask-input");
  var sendBtn = document.getElementById("ask-send");
  var suggestions = document.querySelectorAll(".ask-suggestion");
  if (!thread || !form || !input) return;

  var messages = []; // {role, content}
  var busy = false;

  function addBubble(role, text) {
    var wrap = document.createElement("div");
    wrap.className = "ask-msg " + role;
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    wrap.appendChild(bubble);
    thread.appendChild(wrap);
    wrap.scrollIntoView({ behavior: "smooth", block: "end" });
    return wrap;
  }

  function addSources(wrap, sources) {
    if (!sources || !sources.length) return;
    var row = document.createElement("div");
    row.className = "ask-sources";
    sources.forEach(function (s) {
      var a = document.createElement("a");
      a.href = s.url;
      a.textContent = s.title;
      row.appendChild(a);
    });
    wrap.appendChild(row);
  }

  function setBusy(v) {
    busy = v;
    sendBtn.disabled = v;
    input.disabled = v;
  }

  function ask(question) {
    if (busy || !question.trim()) return;
    addBubble("user", question);
    messages.push({ role: "user", content: question });
    if (messages.length > MAX_HISTORY) messages = messages.slice(-MAX_HISTORY);

    var loading = addBubble("assistant", "Thinking…");
    loading.classList.add("is-loading");
    setBusy(true);

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: messages }),
    })
      .then(function (r) {
        if (r.status === 429) throw { limited: true };
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(function (data) {
        loading.classList.remove("is-loading");
        loading.querySelector(".bubble").textContent = data.answer || "No answer came back — try rephrasing.";
        addSources(loading, data.sources);
        messages.push({ role: "assistant", content: data.answer || "" });
      })
      .catch(function (err) {
        loading.classList.remove("is-loading");
        loading.classList.add("is-error");
        loading.querySelector(".bubble").textContent = err && err.limited
          ? "That's the daily limit for this — try again tomorrow."
          : "Couldn't reach the assistant just now. Try again in a moment.";
        messages.pop(); // don't carry a failed turn forward
      })
      .finally(function () { setBusy(false); input.focus(); });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var q = input.value;
    input.value = "";
    input.style.height = "auto";
    ask(q);
  });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener("input", function () {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
  });

  suggestions.forEach(function (btn) {
    btn.addEventListener("click", function () { ask(btn.textContent); });
  });
})();
