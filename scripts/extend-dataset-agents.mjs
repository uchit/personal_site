#!/usr/bin/env node
/* extend-dataset-agents.mjs — adds agent-specific controls to dataset.json.
 *
 *   node scripts/extend-dataset-agents.mjs
 *
 * Why a script rather than hand-editing the JSON: the dataset is also published
 * as CSV, embedded in the MCP server, and quoted by count in several places on
 * the site. Generating the addition keeps the row shape identical to the 56
 * existing rows and makes the diff reviewable.
 *
 * Scope note: these are controls for systems where a model *takes actions* —
 * tool calls, writes, multi-step execution. The existing "AI evals & guardrails"
 * rows already cover single-call GenAI (evals, prompt injection, output
 * filtering) and are not duplicated here.
 *
 * Every control is one I have had to implement or argue for. The evidence column
 * describes what an auditor actually accepts, which is the part usually missing
 * from published control catalogues.
 *
 * Idempotent: re-running replaces the agent rows rather than appending.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const CAT = "Agentic systems";

const AGENT_ROWS = [
  {
    id: "agent-identity",
    reg: ["eu_ai_act", "iso42001", "cps234", "sp80053", "e8"],
    ctrl: "Agent runs under its own workload identity, never a human's or a shared account",
    cat: CAT,
    surface: "Agent runtime · IAM",
    tools: [
      ["SPIFFE / SPIRE", "oss", "CNCF"],
      ["AWS IAM Roles for Service Accounts / IRSA", "managed", "AWS"],
      ["GCP Workload Identity Federation", "managed", "GCP"],
      ["Azure Federated Credentials (OIDC)", "managed", "Azure"],
      ["HashiCorp Vault workload identity", "managed", "HashiCorp"],
    ],
    evidence:
      "IAM export showing a distinct principal per agent, with no human user credentials in any agent execution path. Trust policy showing federated identity rather than a static key. An access-revocation test: disable the agent principal and show its tool calls fail within one polling interval.",
    anti_pattern: "vault-theatre",
    sectors: ["banks", "government", "healthcare", "critical-infrastructure"],
    notes:
      "The most common finding in a first agent review is an agent acting as the engineer who deployed it, which makes attribution impossible and revocation a personnel action. This is not a new control — it is workload identity applied to a new kind of workload, and organisations that already solved it for services have most of the work done.",
  },
  {
    id: "agent-tool-authz",
    reg: ["eu_ai_act", "iso42001", "ai_rmf", "owasp_llm", "sp80053"],
    ctrl: "Tool authorisation enforced outside the model — the tool registry is the security boundary",
    cat: CAT,
    surface: "Agent runtime · Policy engine",
    tools: [
      ["Open Policy Agent (OPA)", "oss", "CNCF"],
      ["Cedar", "oss", "AWS"],
      ["Kyverno", "oss", "CNCF"],
      ["MCP server scoping / allow-lists", "oss", "Anthropic"],
    ],
    evidence:
      "The tool manifest available to the agent per role, exported from config rather than described. Policy decision logs showing allow and deny with a reason for each tool invocation. A negative test: an agent asked to call a tool outside its scope, and the denial recorded.",
    anti_pattern: "pdf-principles",
    sectors: ["banks", "government", "healthcare", "critical-infrastructure"],
    notes:
      "An agent can only do what its tools permit, so the tool list is the control and the system prompt is a suggestion. Instructions telling a model what it must not do are not a security boundary — they are a request, and retrieved content will eventually contain instructions that contradict them.",
  },
  {
    id: "agent-autonomy-level",
    reg: ["eu_ai_act", "iso42001", "ai_rmf", "ai_safety_au", "cps230"],
    ctrl: "Declared autonomy level per action class, enforced at execution and recorded per run",
    cat: CAT,
    surface: "Agent runtime · Governance",
    tools: [
      ["In-house policy layer", "build", "—"],
      ["Open Policy Agent (OPA)", "oss", "CNCF"],
      ["Workflow engines with approval steps (Temporal, Inngest)", "managed", "various"],
    ],
    evidence:
      "A register of action classes with the autonomy level assigned to each and who approved it. Per-run records showing the level in force at execution time. Evidence that a level change requires review — a config diff with an approver, not a deploy.",
    anti_pattern: "ai-coe-trap",
    sectors: ["banks", "government", "healthcare", "critical-infrastructure"],
    notes:
      "Autonomy is not a property of the agent; it is a property of each action it can take. Recording the level in force at the time is what lets you answer what it was allowed to do then, rather than what it is allowed to do now — the question an investigation actually asks.",
  },
  {
    id: "agent-human-oversight",
    reg: ["eu_ai_act", "ai_rmf", "ai_safety_au", "fda_samd", "gdpr"],
    ctrl: "Named human approval for consequential actions, with enough context to make review real",
    cat: CAT,
    surface: "Agent runtime · Review queue",
    tools: [
      ["In-house approval queue", "build", "—"],
      ["Workflow engine approval steps", "managed", "Temporal / Inngest"],
      ["Case management (ServiceNow, Jira)", "managed", "various"],
    ],
    evidence:
      "Approval records naming the individual, the proposed action, the reasoning and evidence shown to them, and the decision. Approval-rate statistics over time. Rejection records, which are the proof that oversight is doing work.",
    anti_pattern: "architect-as-reviewer",
    sectors: ["banks", "government", "healthcare"],
    notes:
      "EU AI Act Art.14 and NIST AI RMF GOVERN-1.3 both require meaningful human oversight, and an approve/reject button with no reasoning attached does not meet it. Watch the approval rate: sustained above roughly 95% and you have automation with a liability sponge attached, which an auditor will name.",
  },
  {
    id: "agent-trajectory-trace",
    reg: ["eu_ai_act", "iso42001", "ai_rmf", "cps230", "hipaa"],
    ctrl: "Full replayable trajectory — every tool call, argument, result and the exact context the model saw",
    cat: CAT,
    surface: "Agent runtime · Observability",
    tools: [
      ["OpenTelemetry GenAI semantic conventions", "oss", "CNCF"],
      ["Langfuse", "oss", "Langfuse"],
      ["LangSmith", "managed", "LangChain"],
      ["Braintrust", "managed", "Braintrust"],
      ["Arize Phoenix", "oss", "Arize"],
    ],
    evidence:
      "A single run exported end to end: assembled context, retrieved document IDs, each tool call with arguments and result, model and prompt version, tokens, cost and latency. A replay of that run from an intermediate step, demonstrating the trace is sufficient to reconstruct rather than merely describe.",
    anti_pattern: "inline-prompt-pattern",
    sectors: ["banks", "government", "healthcare", "critical-infrastructure"],
    notes:
      "Logging the final output is enough to debug a demo and nothing else. The test of a trajectory record is whether you can replay from step N; if you cannot, you have a description of what happened rather than evidence of it. The same rows serve the audit pack and the eval set.",
  },
  {
    id: "agent-blast-radius",
    reg: ["cps230", "iso42001", "sp80053", "nis2", "soci"],
    ctrl: "Bounded blast radius — step, spend and rate ceilings, plus a tested kill switch",
    cat: CAT,
    surface: "Agent runtime · Platform",
    tools: [
      ["API gateway rate limiting", "managed", "various"],
      ["LiteLLM budget controls", "oss", "BerriAI"],
      ["Feature flags (LaunchDarkly, Unleash)", "managed", "various"],
      ["Cloud budget alerts and hard caps", "managed", "AWS / GCP / Azure"],
    ],
    evidence:
      "Configured ceilings per agent for steps, spend and tool-call rate. An incident or game-day record showing the kill switch stopping an agent mid-run, with the time from decision to halt. Evidence that a halted run leaves consistent state.",
    anti_pattern: "kpi-cargo-cult",
    sectors: ["all"],
    notes:
      "A loop without a ceiling is a billing incident with a countdown. The kill switch matters more than the ceiling and is almost never tested mid-run — stopping an agent between steps is easy, stopping one that is halfway through a multi-call action is the case that matters.",
  },
  {
    id: "agent-action-reversibility",
    reg: ["cps230", "iso42001", "eu_ai_act", "dora"],
    ctrl: "Irreversible actions staged, gated or delayed so a wrong action can be withdrawn",
    cat: CAT,
    surface: "Agent runtime · Integration layer",
    tools: [
      ["Outbox with cancellation window", "build", "—"],
      ["Plan/apply split (Terraform, Pulumi)", "oss", "HashiCorp / Pulumi"],
      ["Soft delete and versioned stores", "build", "—"],
      ["Pull-request gated change", "managed", "GitHub / GitLab"],
    ],
    evidence:
      "An inventory of agent-invokable actions classified reversible or not, with the mechanism named for each. For irreversible ones, either an approval gate or a documented acceptance. A test showing an action withdrawn inside the window.",
    anti_pattern: "pdf-principles",
    sectors: ["all"],
    notes:
      "Reversibility is a property of the system, not of the agent: the same delete is reversible against a versioned store and not against a live one. Most irreversible actions can be made reversible with an outbox, a soft delete or a plan/apply split, and that work is worth doing whether or not an agent is ever involved.",
  },
  {
    id: "agent-prompt-injection",
    reg: ["owasp_llm", "atlas", "eu_ai_act", "iso42001"],
    ctrl: "Retrieved and tool-returned content treated as untrusted data, never as instructions",
    cat: CAT,
    surface: "Agent runtime · Retrieval",
    tools: [
      ["Lakera Guard", "managed", "Lakera"],
      ["NVIDIA NeMo Guardrails", "oss", "NVIDIA"],
      ["Azure AI Content Safety prompt shields", "managed", "Microsoft"],
      ["Structural separation of instruction and data", "build", "—"],
    ],
    evidence:
      "Red-team results for indirect prompt injection through each retrieval and tool-result path, not only through direct user input. Evidence of structural separation between instruction and retrieved content. Records showing an injected instruction was not acted upon.",
    anti_pattern: "inline-prompt-pattern",
    sectors: ["all"],
    notes:
      "Direct prompt injection is widely tested; indirect injection through a retrieved document, a web page or a tool result is where agents actually get compromised, because the payload arrives after the guardrail. Any content an agent retrieves is attacker-influenceable if an attacker can influence the source.",
  },
  {
    id: "agent-multi-agent-provenance",
    reg: ["eu_ai_act", "iso42001", "ai_rmf", "bcbs239"],
    ctrl: "Provenance across agents — every output traceable to the upstream runs that produced its inputs",
    cat: CAT,
    surface: "Agent orchestration",
    tools: [
      ["OpenTelemetry trace context propagation", "oss", "CNCF"],
      ["Upstream run-ID references in the run record", "build", "—"],
      ["Workflow engine correlation IDs", "managed", "Temporal / Inngest"],
    ],
    evidence:
      "For a given final output, the full upstream chain of agent runs that contributed to it, retrieved sources included. A demonstration that a corrected upstream input marks downstream outputs stale.",
    anti_pattern: "capability-model-theatre",
    sectors: ["banks", "government", "healthcare"],
    notes:
      "As soon as one agent consumes another's output, a single-run trace stops being sufficient — the question becomes which chain of reasoning produced this, and BCBS 239-style lineage expectations apply to agent outputs exactly as they do to reported figures.",
  },
  {
    id: "agent-cost-per-outcome",
    reg: ["cps230", "iso42001"],
    ctrl: "Cost measured per resolved task, not per token, with attribution to the consuming feature",
    cat: CAT,
    surface: "Agent runtime · FinOps",
    tools: [
      ["Helicone", "oss", "Helicone"],
      ["Langfuse cost tracking", "oss", "Langfuse"],
      ["LiteLLM spend logs", "oss", "BerriAI"],
      ["Cloud cost allocation tags", "managed", "AWS / GCP / Azure"],
    ],
    evidence:
      "Cost per resolved task by agent and feature over time, alongside the failed-run cost. Evidence that spend is attributable to a product decision rather than to a shared pool.",
    anti_pattern: "kpi-cargo-cult",
    sectors: ["all"],
    notes:
      "Agent cost is nonlinear in a way single-call GenAI is not: retries, fan-out and growing context mean a task can cost ten times the estimate. Cost per token is the wrong unit — the runs that fail and get retried are the ones that make the difference between a viable feature and an unviable one.",
  },
];

/* -------------------------------------------------------------------------- */
const path = join(ROOT, "dataset/dataset.json");
const data = JSON.parse(readFileSync(path, "utf8"));

const before = data.rows.length;
data.rows = data.rows.filter(r => r.cat !== CAT);
const removed = before - data.rows.length;

data.rows.push(...AGENT_ROWS);
data.version = new Date().toISOString().slice(0, 10);

/* Every regulation key referenced must already exist, or the filter UI will
   offer a facet that matches nothing. */
const known = new Set(Object.keys(data.regulations));
const bad = [...new Set(AGENT_ROWS.flatMap(r => r.reg))].filter(k => !known.has(k));
if (bad.length) {
  console.error(`\n  Unknown regulation keys: ${bad.join(", ")}\n`);
  process.exit(1);
}

writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf8");

const regs = new Set(data.rows.flatMap(r => r.reg));
const tools = new Set(data.rows.flatMap(r => r.tools.map(t => t[0])));
console.log(`\n  ${removed ? `replaced ${removed} existing` : "added"} ${AGENT_ROWS.length} agent rows`);
console.log(`  dataset now: ${data.rows.length} controls × ${regs.size} regulations × ${tools.size} tools`);
console.log(`  version: ${data.version}\n`);
