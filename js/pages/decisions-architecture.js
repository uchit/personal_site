/* decisions-architecture.js — composite view over saved decision-tree
 * results (DecisionStorage). Renders a fixed-order stack of layer cards —
 * one per decision tree, in a rough bottom-up architecture order — showing
 * the recommendation picked for each, or an "undecided" placeholder linking
 * to the tree if it hasn't been run yet.
 */
(function () {
  "use strict";
  const mount = document.getElementById("arch-stack");
  if (!mount || !window.DecisionStorage) return;

  const LAYERS = [
    { id: "compute-platform", name: "Compute platform", url: "/decisions/compute-platform.html" },
    { id: "tenancy-model", name: "Tenancy model", url: "/decisions/tenancy-model.html" },
    { id: "service-decomposition", name: "Service decomposition", url: "/decisions/service-decomposition.html" },
    { id: "service-communication", name: "Service communication", url: "/decisions/service-communication.html" },
    { id: "policy-engine", name: "Policy engine", url: "/decisions/policy-engine.html" },
    { id: "ai-gateway", name: "AI gateway", url: "/decisions/ai-gateway.html" },
    { id: "llm-integration-pattern", name: "LLM integration pattern", url: "/decisions/llm-integration-pattern.html" },
  ];

  const results = DecisionStorage.all();
  const done = LAYERS.filter(l => results[l.id]);

  const countEl = document.getElementById("arch-count");
  if (countEl) countEl.textContent = `${done.length} of ${LAYERS.length} decided`;

  const clearBtn = document.getElementById("arch-clear");
  if (clearBtn) {
    clearBtn.hidden = !done.length;
    clearBtn.addEventListener("click", () => {
      DecisionStorage.clear();
      location.reload();
    });
  }

  mount.replaceChildren();
  LAYERS.forEach((layer, i) => {
    const r = results[layer.id];
    const card = document.createElement(r ? "a" : "a");
    card.className = "arch-card" + (r ? " is-decided" : "");
    card.href = r ? `${layer.url}#${r.hash}` : layer.url;

    const name = document.createElement("span");
    name.className = "arch-name";
    name.textContent = layer.name;
    card.appendChild(name);

    const pick = document.createElement("span");
    pick.className = "arch-pick";
    pick.textContent = r ? r.title : "Not decided yet — open this tree";
    card.appendChild(pick);

    mount.appendChild(card);
    if (i < LAYERS.length - 1) {
      const connector = document.createElement("div");
      connector.className = "arch-connector";
      mount.appendChild(connector);
    }
  });
})();
