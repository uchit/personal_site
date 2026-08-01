/* routes.js — what a diagnostic result should send you to next.
 *
 * Every diagnostic used to dead-end at a score and three recommendations. The
 * playbooks, paved paths and tier deep-dives that answer "so what do I do about
 * it" already existed; nothing linked them. This is that mapping.
 *
 * Keyed by diagnostic slug (the filename, less .html) then by level NAME —
 * names, not indexes, so re-banding the score thresholds cannot silently
 * repoint a level at the wrong destination.
 *
 * Ordering within a level is deliberate: the first card is the single next
 * thing to do, later cards are supporting depth. Two or three per level — a
 * wall of options is the same dead end wearing a different hat.
 *
 * Every href here is checked by scripts/check-routes.mjs.
 */
window.DIAG_ROUTES = {
  /* -------------------------------------------------------- Agent readiness
     Improvised → Contained → Supervised → Evidenced → Engineered */
  "agent-readiness": {
    "Improvised": [
      { kind: "Control set", title: "The ten agent controls",
        body: "Each control with the evidence it has to produce, what it needs built first, and the named way it fails. Start at wave 1.",
        href: "/agents/" },
      { kind: "Anti-pattern", title: "Vault theatre",
        body: "Why a secrets manager in front of a static credential is not workload identity — the failure this level almost always contains.",
        href: "/anti-patterns/#vault-theatre" },
      { kind: "Tool", title: "agentcheck",
        body: "Produce an evidence pack for the agent you just scored. Read-only, zero dependencies, and it refuses to give you a number out of ten.",
        href: "/oss/agentcheck/README.md" }
    ],
    "Contained": [
      { kind: "Control set", title: "Tool authorisation outside the model",
        body: "The tool registry is the security boundary and the system prompt is a suggestion. What that looks like in practice.",
        href: "/agents/#agent-tool-authz" },
      { kind: "Anti-pattern", title: "The inline prompt pattern",
        body: "Instructions doing security work — why guardrails written into the prompt fail against content that arrives after them.",
        href: "/anti-patterns/#inline-prompt-pattern" },
      { kind: "Reference architecture", title: "Regulated GenAI platform",
        body: "The substrate these controls attach to, drawn out end to end.",
        href: "/reference-architectures/regulated-genai-platform.html" }
    ],
    "Supervised": [
      { kind: "Control set", title: "Oversight, reversibility, blast radius",
        body: "The three that separate enforcement from evidence — including why a kill switch untested mid-run is not a kill switch.",
        href: "/agents/#agent-human-oversight" },
      { kind: "Anti-pattern", title: "Architect as reviewer",
        body: "The approval queue nobody can realistically dissent in. Watch the approval rate.",
        href: "/anti-patterns/#architect-as-reviewer" },
      { kind: "Playbook", title: "EU AI Act in 12 weeks",
        body: "A sequenced route to the Art. 12 and Art. 14 evidence an assessment will ask for.",
        href: "/playbooks/eu-ai-act-12-weeks.html" }
    ],
    "Evidenced": [
      { kind: "Control set", title: "Provenance and cost per outcome",
        body: "What changes when one agent consumes another's output, and why cost per token is the wrong unit.",
        href: "/agents/#agent-multi-agent-provenance" },
      { kind: "Tool", title: "agentcheck in CI",
        body: "Turn the review into a gate. Exits non-zero when a control is claimed met with no evidence, or rests on a prerequisite that is not.",
        href: "/oss/agentcheck/README.md" },
      { kind: "Dataset", title: "The full control map",
        body: "These ten sit inside 66 controls across 28 regulations, each with the read-only command that produces its evidence.",
        href: "/dataset/" }
    ],
    "Engineered": [
      { kind: "Benchmark", title: "Where teams actually stand",
        body: "Add your result to the open distribution. Counts, not records — and withheld until the sample is worth publishing.",
        href: "/benchmark/" },
      { kind: "Dataset", title: "The full control map",
        body: "Fork it, argue with it, extend it. CC BY 4.0, JSON and CSV.",
        href: "/dataset/" },
      { kind: "Essay", title: "Platform engineering is the AI moat",
        body: "Why the paved path — not the model — is what compounds.",
        href: "/writing/platform-engineering-ai-moat.html" }
    ]
  },


  /* ---------------------------------------------------------------- DevSecOps
     Reactive → Repeatable → Defined → Managed → Optimising */
  "devsecops-maturity": {
    "Reactive": [
      { kind: "Maturity tier", title: "DevSecOps — Repeatable",
        body: "The tier immediately above you: what changes, in what order, and what it costs to get there.",
        href: "/maturity/devsecops-repeatable.html" },
      { kind: "Reference architecture", title: "The DevSecOps paved path",
        body: "An opinionated pipeline to copy rather than design from scratch — signing, scanning and policy already wired in.",
        href: "/reference-architectures/devsecops-paved-path.html" },
      { kind: "Essay", title: "DevSecOps is supply chain",
        body: "Why the highest-leverage security work is provenance and identity, not more scanners.",
        href: "/writing/devsecops-is-supply-chain.html" }
    ],
    "Repeatable": [
      { kind: "Reference architecture", title: "The DevSecOps paved path",
        body: "Make the secure route the default route, so teams stop choosing between speed and compliance.",
        href: "/reference-architectures/devsecops-paved-path.html" },
      { kind: "Playbook", title: "Vault theatre → workload identity",
        body: "Long-lived secrets are the most common thing holding a Repeatable score back. This is the migration.",
        href: "/playbooks/vault-theatre-to-workload-identity.html" },
      { kind: "Maturity tier", title: "DevSecOps — Repeatable",
        body: "The tier you just scored, written out in full — including how it typically fails.",
        href: "/maturity/devsecops-repeatable.html" }
    ],
    "Defined": [
      { kind: "Playbook", title: "CISA attestation in 90 days",
        body: "You have the controls; this turns them into evidence a regulator or customer will accept.",
        href: "/playbooks/cisa-attestation-90-days.html" },
      { kind: "Decision tree", title: "OPA vs Kyverno vs Cedar",
        body: "Defined is where policy stops being documents and becomes code. Pick the engine deliberately.",
        href: "/decisions/policy-engine.html" },
      { kind: "Playbook", title: "Vault theatre → workload identity",
        body: "The remaining long-lived credentials are what will fail your next audit.",
        href: "/playbooks/vault-theatre-to-workload-identity.html" }
    ],
    "Managed": [
      { kind: "Playbook", title: "CISA attestation in 90 days",
        body: "At this tier attestation is an evidence-gathering exercise, not a programme.",
        href: "/playbooks/cisa-attestation-90-days.html" },
      { kind: "Dataset", title: "Regulation × control × tooling",
        body: "56 controls against 28 regulations. Use it to find the obligations your pipeline does not yet cover.",
        href: "/dataset/" },
      { kind: "Decision tree", title: "OPA vs Kyverno vs Cedar",
        body: "Consolidating three policy engines into one is the usual Managed-tier cleanup.",
        href: "/decisions/policy-engine.html" }
    ],
    "Optimising": [
      { kind: "Essay", title: "Platform engineering is the AI delivery moat",
        body: "A pipeline this good is the substrate for shipping AI safely. This is what to do with the lead.",
        href: "/writing/platform-engineering-ai-moat.html" },
      { kind: "Reference architecture", title: "Regulated GenAI platform",
        body: "Where the supply-chain controls you already run get extended to models and prompts.",
        href: "/reference-architectures/regulated-genai-platform.html" }
    ]
  },

  /* ------------------------------------------------------------------- GenAI
     Experimenting → Piloting → Operating → Industrialising → Platforming */
  "genai-readiness": {
    "Experimenting": [
      { kind: "Essay", title: "The nine controls that make GenAI defensible",
        body: "The gap between a demo and something a customer — and a regulator — can use.",
        href: "/writing/genai-9-controls.html" },
      { kind: "Maturity tier", title: "GenAI — Piloting",
        body: "The tier above you, and the four things that actually separate it from a demo.",
        href: "/maturity/genai-piloting.html" },
      { kind: "Decision tree", title: "RAG vs fine-tune vs prompt",
        body: "Most Experimenting scores come from picking the wrong integration pattern first.",
        href: "/decisions/llm-integration-pattern.html" }
    ],
    "Piloting": [
      { kind: "Essay", title: "The nine controls that make GenAI defensible",
        body: "Evals, guardrails and traceability — the controls that turn a pilot into something shippable.",
        href: "/writing/genai-9-controls.html" },
      { kind: "Reference architecture", title: "Regulated GenAI platform",
        body: "The target-state to build toward, with the audit surface designed in rather than retrofitted.",
        href: "/reference-architectures/regulated-genai-platform.html" },
      { kind: "Decision tree", title: "Build or buy an AI gateway",
        body: "The decision that gets made by accident at exactly this stage.",
        href: "/decisions/ai-gateway.html" }
    ],
    "Operating": [
      { kind: "Reference architecture", title: "Regulated GenAI platform",
        body: "You are running it as a service; this is what it looks like when the platform enforces the controls.",
        href: "/reference-architectures/regulated-genai-platform.html" },
      { kind: "Playbook", title: "EU AI Act high-risk readiness in 12 weeks",
        body: "High-risk obligations bind from August 2026. Week-by-week, with named gates.",
        href: "/playbooks/eu-ai-act-12-weeks.html" },
      { kind: "Calculator", title: "GenAI cost model",
        body: "Cost-per-outcome is the metric Operating teams are usually still missing.",
        href: "/tools/calculators/genai-cost.html" }
    ],
    "Industrialising": [
      { kind: "Playbook", title: "EU AI Act high-risk readiness in 12 weeks",
        body: "At this tier conformity assessment is a documentation exercise. This is the documentation.",
        href: "/playbooks/eu-ai-act-12-weeks.html" },
      { kind: "Essay", title: "Australia's AI Safety Standard, decoded",
        body: "Ten guardrails translated into what the engineer being asked actually does this quarter.",
        href: "/writing/au-ai-safety-decoded.html" },
      { kind: "Dataset", title: "Regulation × control × tooling",
        body: "Map your existing controls against 28 regulations to find what is genuinely missing.",
        href: "/dataset/" }
    ],
    "Platforming": [
      { kind: "Essay", title: "Platform engineering is the AI delivery moat",
        body: "What the lead is worth, and how organisations lose it.",
        href: "/writing/platform-engineering-ai-moat.html" },
      { kind: "Dataset", title: "Regulation × control × tooling",
        body: "The obligations arriving next, so the platform absorbs them instead of reacting.",
        href: "/dataset/" }
    ]
  },

  /* --------------------------------------------------------------------- SRE
     Heroic → Operational → Disciplined → Engineered → Property */
  "sre-programme": {
    "Heroic": [
      { kind: "Maturity tier", title: "SRE — Operational",
        body: "Getting off heroics: the smallest set of changes that stops the pager running the team.",
        href: "/maturity/sre-operational.html" },
      { kind: "Calculator", title: "Error budget",
        body: "Turn an availability target into a number of minutes the team is allowed to spend.",
        href: "/tools/calculators/error-budget.html" },
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "Most heroics are a platform problem wearing an on-call rota.",
        href: "/reference-architectures/platform-engineering-idp.html" }
    ],
    "Operational": [
      { kind: "Calculator", title: "Error budget",
        body: "The instrument that converts an SLO into a decision about whether to ship.",
        href: "/tools/calculators/error-budget.html" },
      { kind: "Maturity tier", title: "SRE — Operational",
        body: "The tier you scored, written out — including the trap of measuring without enforcing.",
        href: "/maturity/sre-operational.html" },
      { kind: "Decision tree", title: "K8s vs PaaS vs FaaS",
        body: "Operational teams often carry reliability burden that belongs to the compute choice.",
        href: "/decisions/compute-platform.html" }
    ],
    "Disciplined": [
      { kind: "Decision tree", title: "Sync vs async vs event-driven",
        body: "At this tier the remaining reliability wins are architectural, not procedural.",
        href: "/decisions/service-communication.html" },
      { kind: "Calculator", title: "Error budget",
        body: "Tune the policy: what an exhausted budget should actually stop.",
        href: "/tools/calculators/error-budget.html" },
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "Encode the practices into the paved path so new services inherit them.",
        href: "/reference-architectures/platform-engineering-idp.html" }
    ],
    "Engineered": [
      { kind: "Decision tree", title: "Monolith vs modular monolith vs microservices",
        body: "Blast radius is a decomposition decision before it is an operational one.",
        href: "/decisions/service-decomposition.html" },
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "Make reliability a property of the platform rather than of each team's diligence.",
        href: "/reference-architectures/platform-engineering-idp.html" }
    ],
    "Property": [
      { kind: "Essay", title: "Platform engineering is the AI delivery moat",
        body: "Reliability as a platform property is the same substrate AI delivery needs.",
        href: "/writing/platform-engineering-ai-moat.html" },
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "The paved path that keeps this true as the estate grows.",
        href: "/reference-architectures/platform-engineering-idp.html" }
    ]
  },

  /* -------------------------------------------------------------- Cloud cost
     Unmanaged → Aware → Controlled → Optimised → Engineered */
  "cloud-cost": {
    "Unmanaged": [
      { kind: "Maturity tier", title: "Cloud cost — Aware",
        body: "The first tier up: visibility and ownership, before any optimisation is worth attempting.",
        href: "/maturity/cloud-cost-aware.html" },
      { kind: "Playbook", title: "Cloud cost: Aware → Controlled in a quarter",
        body: "Where to start when nobody currently owns the bill.",
        href: "/playbooks/cloud-cost-aware-to-controlled.html" },
      { kind: "Calculator", title: "Commitment optimiser",
        body: "Size reservations and savings plans against real usage rather than vendor advice.",
        href: "/tools/calculators/commitment-optimiser.html" }
    ],
    "Aware": [
      { kind: "Playbook", title: "Cloud cost: Aware → Controlled in a quarter",
        body: "Written for exactly this score. Week-by-week, with named gates.",
        href: "/playbooks/cloud-cost-aware-to-controlled.html" },
      { kind: "Calculator", title: "Commitment optimiser",
        body: "The largest single lever available at this tier.",
        href: "/tools/calculators/commitment-optimiser.html" },
      { kind: "Maturity tier", title: "Cloud cost — Aware",
        body: "The tier you scored, and why dashboards alone never move it.",
        href: "/maturity/cloud-cost-aware.html" }
    ],
    "Controlled": [
      { kind: "Calculator", title: "Commitment optimiser",
        body: "With spend controlled, commitment coverage is where the remaining money is.",
        href: "/tools/calculators/commitment-optimiser.html" },
      { kind: "Decision tree", title: "K8s vs PaaS vs FaaS",
        body: "Past this tier, unit cost is set by the compute model, not by housekeeping.",
        href: "/decisions/compute-platform.html" },
      { kind: "Playbook", title: "Cloud cost: Aware → Controlled in a quarter",
        body: "Check which gates you actually cleared before moving on.",
        href: "/playbooks/cloud-cost-aware-to-controlled.html" }
    ],
    "Optimised": [
      { kind: "Decision tree", title: "K8s vs PaaS vs FaaS",
        body: "The structural lever left once the tactical ones are exhausted.",
        href: "/decisions/compute-platform.html" },
      { kind: "Calculator", title: "GenAI cost model",
        body: "AI workloads are where optimised estates quietly regress. Model them before they land.",
        href: "/tools/calculators/genai-cost.html" }
    ],
    "Engineered": [
      { kind: "Calculator", title: "GenAI cost model",
        body: "Token spend is the fastest-growing line item in an otherwise engineered estate.",
        href: "/tools/calculators/genai-cost.html" },
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "Keep cost discipline a property of the paved path rather than a quarterly campaign.",
        href: "/reference-architectures/platform-engineering-idp.html" }
    ]
  },

  /* ----------------------------------------------------- Platform engineering
     Tooling → Emerging → Established → Productised → Property */
  "platform-engineering": {
    "Tooling": [
      { kind: "Maturity tier", title: "Platform engineering — Emerging",
        body: "The tier above: what separates a toolchain from a platform.",
        href: "/maturity/platform-eng-emerging.html" },
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "A target-state to build toward, with the adoption path made explicit.",
        href: "/reference-architectures/platform-engineering-idp.html" },
      { kind: "Essay", title: "Platform engineering is the AI delivery moat",
        body: "Why this work compounds, and what it is worth arguing for.",
        href: "/writing/platform-engineering-ai-moat.html" }
    ],
    "Emerging": [
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "Golden paths over golden cages — the shape that gets adopted rather than routed around.",
        href: "/reference-architectures/platform-engineering-idp.html" },
      { kind: "Maturity tier", title: "Platform engineering — Emerging",
        body: "The tier you scored, including the adoption trap most teams hit here.",
        href: "/maturity/platform-eng-emerging.html" },
      { kind: "Reference architecture", title: "The DevSecOps paved path",
        body: "The security half of the paved path, which Emerging platforms usually leave for later.",
        href: "/reference-architectures/devsecops-paved-path.html" }
    ],
    "Established": [
      { kind: "Decision tree", title: "Shared / cell-based / single-tenant",
        body: "Established platforms hit tenancy limits before they hit technical ones.",
        href: "/decisions/tenancy-model.html" },
      { kind: "Reference architecture", title: "The DevSecOps paved path",
        body: "Fold policy and provenance into the path so compliance stops being a separate queue.",
        href: "/reference-architectures/devsecops-paved-path.html" },
      { kind: "Decision tree", title: "OPA vs Kyverno vs Cedar",
        body: "Policy-as-code is what turns platform conventions into guarantees.",
        href: "/decisions/policy-engine.html" }
    ],
    "Productised": [
      { kind: "Essay", title: "Platform engineering is the AI delivery moat",
        body: "A productised platform is the precondition for shipping AI features safely.",
        href: "/writing/platform-engineering-ai-moat.html" },
      { kind: "Reference architecture", title: "Regulated GenAI platform",
        body: "The next surface to absorb into the paved path.",
        href: "/reference-architectures/regulated-genai-platform.html" }
    ],
    "Property": [
      { kind: "Reference architecture", title: "Regulated GenAI platform",
        body: "Extend the platform's guarantees to models, prompts and evals.",
        href: "/reference-architectures/regulated-genai-platform.html" },
      { kind: "Essay", title: "The 4-Discipline Stack",
        body: "How platform, EA, data and AI compound — and why they usually do not.",
        href: "/writing/4-discipline-stack-essay.html" }
    ]
  },

  /* ------------------------------------------------------ EA operating model
     Bureaucratic → Consultative → Governed → Enabling → Property */
  "ea-operating-model": {
    "Bureaucratic": [
      { kind: "Essay", title: "The encoded enterprise architect",
        body: "Why principles that are not encoded in platform defaults do not exist.",
        href: "/writing/encoded-enterprise-architect.html" },
      { kind: "Maturity tier", title: "EA — Consultative",
        body: "The first move away from a review board teams route around.",
        href: "/maturity/ea-consultative.html" },
      { kind: "Framework", title: "The 4-Discipline Stack",
        body: "The operating model this site argues for, in full.",
        href: "/4-discipline-stack/" }
    ],
    "Consultative": [
      { kind: "Essay", title: "The encoded enterprise architect",
        body: "Advice does not survive contact with delivery. Encoding does.",
        href: "/writing/encoded-enterprise-architect.html" },
      { kind: "Maturity tier", title: "EA — Consultative",
        body: "The tier you scored, and the ceiling it runs into.",
        href: "/maturity/ea-consultative.html" },
      { kind: "Decision trees", title: "Seven recurring architecture decisions",
        body: "Reusable decision records — the artefact a consultative function can actually leave behind.",
        href: "/decisions/" }
    ],
    "Governed": [
      { kind: "Decision trees", title: "Seven recurring architecture decisions",
        body: "Stop re-litigating the same choices; capture them once with the trade-offs attached.",
        href: "/decisions/" },
      { kind: "Reference architectures", title: "Four opinionated paved paths",
        body: "Governance lands faster as a default than as a document.",
        href: "/reference-architectures/" },
      { kind: "Essay", title: "The encoded enterprise architect",
        body: "Moving from approving designs to shaping the defaults teams start from.",
        href: "/writing/encoded-enterprise-architect.html" }
    ],
    "Enabling": [
      { kind: "Essay", title: "The 4-Discipline Stack",
        body: "Four functions, four budgets, no compound — and the substrate that fixes it.",
        href: "/writing/4-discipline-stack-essay.html" },
      { kind: "Reference architecture", title: "Platform engineering IDP",
        body: "The vehicle an enabling EA function uses to make decisions stick.",
        href: "/reference-architectures/platform-engineering-idp.html" }
    ],
    "Property": [
      { kind: "Essay", title: "The 4-Discipline Stack",
        body: "Where the four disciplines start multiplying instead of competing.",
        href: "/writing/4-discipline-stack-essay.html" },
      { kind: "Dataset", title: "Regulation × control × tooling",
        body: "The obligations arriving next, mapped to the controls that answer them.",
        href: "/dataset/" }
    ]
  }
};
