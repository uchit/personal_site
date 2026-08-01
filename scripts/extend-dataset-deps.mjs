#!/usr/bin/env node
/* extend-dataset-deps.mjs — records which controls are prerequisites for which.
 *
 *   node scripts/extend-dataset-deps.mjs
 *
 * The dataset answers "what". The question an architect actually arrives with
 * is "which of these do I do first, and what depends on what" — and that is
 * the part no spreadsheet gives you.
 *
 * ONE RULE for an edge: A depends on B only when doing A without B is
 * technically incoherent, not when B is merely a good idea first.
 *
 *   Kept:    drift detection depends on infrastructure-as-code. There is
 *            nothing to detect drift against until a source of truth exists.
 *   Kept:    verified signatures at admission depends on signed provenance.
 *            You cannot verify a signature nobody produced.
 *   Dropped: MFA "before" secret scanning. Both are sensible early. Neither
 *            blocks the other, and asserting an order there would be my
 *            preference wearing the costume of a dependency.
 *
 * That rule is what makes the derived sequence defensible rather than an
 * opinionated roadmap. Where genuine judgement about ordering exists, it
 * belongs in prose where it can be argued with — not encoded as structure.
 *
 * Idempotent.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = join(ROOT, "dataset/dataset.json");

/* id → [prerequisite ids], each with the reason the edge is structural. */
const DEPS = {
  /* Identity is the substrate: you scope, review and attest identities that
     already exist, and mTLS needs a workload identity to present. */
  r002: { on: ["r001"], why: "Scoping a permission set presupposes the identity holding it." },
  r003: { on: ["r004"], why: "A breakglass account without MFA is the weakest credential in the estate." },
  r035: { on: ["r001"], why: "Mutual TLS authenticates workload identities; without them there is nothing to present." },
  r051: { on: ["r001", "r004"], why: "Zero-trust access decisions are made against a verified identity and a second factor." },
  r037: { on: ["r002"], why: "An access review reviews granted permissions; ungoverned wildcards make the review meaningless." },

  /* Supply chain: each link verifies the one before it. */
  r007: { on: ["r005"], why: "Admission cannot verify a signature that was never produced." },
  r008: { on: ["r009"], why: "A build cannot be reproducible while its dependencies float." },
  r025: { on: ["r006"], why: "A patching SLA needs the inventory that says which services contain the CVE." },
  r046: { on: ["r005", "r009"], why: "Model supply-chain integrity reuses the provenance and pinning the software chain established." },

  /* Change management: you need a declared desired state before drift, and
     signals before you can judge a canary. */
  r042: { on: ["r041"], why: "Drift is measured against a source of truth; without IaC there is nothing to compare to." },
  r030: { on: ["r032"], why: "Progressive rollout decides promote-or-roll-back on signals; without them it is a slower deploy." },
  r022: { on: ["r020", "r032"], why: "Failure injection before recovery targets and observability produces an outage, not a test." },

  /* Logging is the substrate for detection, and detection for reporting. */
  r033: { on: ["r026"], why: "Detection-as-code runs over centralised logs; without them there is nothing to detect on." },
  r023: { on: ["r026", "r033"], why: "A 72-hour reporting obligation needs the evidence trail and the detection that starts the clock." },
  r016: { on: ["r026"], why: "A per-decision evidence pack is written to, and retrieved from, the audit substrate." },

  /* Data: classification is what makes every downstream data control
     enforceable, and lineage is what makes traceability provable. */
  r011: { on: ["r012"], why: "A deletion request cannot be fulfilled across stores whose contents are unclassified." },
  r013: { on: ["r012"], why: "Residency rules are applied per classification; unclassified data has no rule to apply." },
  r050: { on: ["r012"], why: "Consent is captured against a purpose, which is a property of the classification." },
  r047: { on: ["r010"], why: "Risk-data traceability is column-level lineage under another name." },
  r048: { on: ["r013"], why: "A sovereign region is the implementation of a residency decision already made." },

  /* AI: classification gates oversight; documentation gates surveillance. */
  r017: { on: ["r045"], why: "“High-risk” is an output of the risk classification, not an intuition." },
  r019: { on: ["r045"], why: "A model card records the risk classification, among other things." },
  r018: { on: ["r015"], why: "Injection defence is a guardrail; it needs the guardrail layer to live in." },
  r040: { on: ["r019"], why: "Post-market surveillance tracks the claims the model card made." },

  /* Operational risk: CPS 230 starts at the critical-operation register —
     recovery targets and vendor concentration are both derived from it. */
  r020: { on: ["r038"], why: "Recovery targets are set per critical operation; the register defines what those are." },
  r021: { on: ["r038"], why: "Concentration risk is measured against the operations a vendor supports." },
  r056: { on: ["r038"], why: "Board reporting on technology risk reports against the critical-operation register." },

  /* Crypto inventory precedes crypto migration. */
  r044: { on: ["r027", "r028"], why: "A PQC transition plan needs the inventory of what is currently negotiated and which keys are yours." },

  /* Agents: identity first, then what it may do, then how far it may go. */
  "agent-tool-authz": { on: ["agent-identity"], why: "The tool registry authorises an identity; without one there is nobody to authorise." },
  "agent-blast-radius": { on: ["agent-identity"], why: "Step, spend and rate ceilings attach to an identity to be enforceable." },
  "agent-human-oversight": { on: ["agent-autonomy-level"], why: "Approval is required for action classes the declared autonomy level does not cover." },
  "agent-action-reversibility": { on: ["agent-autonomy-level"], why: "Which actions are staged or delayed is decided by their declared autonomy class." },
  "agent-multi-agent-provenance": { on: ["agent-trajectory-trace"], why: "Cross-agent provenance is the join across per-agent trajectories." },
  "agent-cost-per-outcome": { on: ["agent-trajectory-trace", "r043"], why: "Cost per resolved task needs the trajectory that bounds the task and the attribution that prices it." },
};

const data = JSON.parse(readFileSync(PATH, "utf8"));
const ids = new Set(data.rows.map(r => r.id));

const bad = [];
for (const [id, d] of Object.entries(DEPS)) {
  if (!ids.has(id)) bad.push(`unknown control: ${id}`);
  for (const p of d.on) if (!ids.has(p)) bad.push(`${id} depends on unknown control: ${p}`);
  if (d.on.includes(id)) bad.push(`${id} depends on itself`);
}
if (bad.length) {
  console.error("\n  ERROR:\n" + bad.map(b => `    ${b}`).join("\n") + "\n");
  process.exit(1);
}

let edges = 0;
for (const row of data.rows) {
  const d = DEPS[row.id];
  if (d) { row.depends_on = d.on; row.depends_why = d.why; edges += d.on.length; }
  else { delete row.depends_on; delete row.depends_why; }
}

writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

const withDeps = data.rows.filter(r => r.depends_on).length;
console.log(`\n  ${edges} prerequisite edges across ${withDeps} controls`);
console.log(`  ${data.rows.length - withDeps} controls have no prerequisite — they can start immediately\n`);
