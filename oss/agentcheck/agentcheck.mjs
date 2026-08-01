#!/usr/bin/env node
/**
 * agentcheck — produce an evidence pack for an agent deployment.
 *
 *   node agentcheck.mjs init                 write a config template
 *   node agentcheck.mjs check                score the config, run nothing
 *   node agentcheck.mjs check --run          also execute the read-only checks
 *   node agentcheck.mjs check --md out.md    write a Markdown report
 *
 * Zero dependencies. Node 18+. Everything it executes is read-only.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS, AND WHAT IT REFUSES TO DO
 *
 * Most agent "governance" tooling produces a score out of ten and a green tick.
 * That number is worse than nothing, because almost every control here can only
 * be attested by a human, and a tool that quietly converts an attestation into
 * a measurement launders an opinion into evidence.
 *
 * So this separates two things and never merges them:
 *
 *   VERIFIED   a read-only command ran and its output is attached.
 *   DECLARED   a human asserted it and signed their name to the assertion.
 *
 * The summary reports both counts and never adds them together. A pack that is
 * 2 verified and 8 declared says exactly that. If you want a single number to
 * put on a slide, this is the wrong tool, and that is deliberate.
 *
 * Controls come from the published dataset at hellouchit.com/dataset/dataset.json
 * (CC BY 4.0). A copy is bundled so this works offline and so a network blip
 * cannot change what you are being assessed against.
 * ---------------------------------------------------------------------------
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const VERSION = "0.1.0";
const SOURCE = "https://hellouchit.com/agents/";

/* Bundled from dataset.json. Regenerate with: npm run sync (see README). */
const CONTROLS = [
  { id: "agent-identity", wave: 1,
    title: "Agent runs under its own workload identity",
    asks: "A distinct principal per agent, no human credentials in any agent execution path, and a revocation test showing tool calls fail within one polling interval.",
    check: { platform: "AWS", run: "aws sts get-caller-identity --query Arn --output text",
             expect: "An assumed-role ARN for the agent itself — not a human's, and not shared with other agents." } },

  { id: "agent-autonomy-level", wave: 1,
    title: "Declared autonomy level per action class",
    asks: "A register of action classes with the autonomy level assigned to each and who approved it, plus per-run records of the level in force at execution time." },

  { id: "agent-trajectory-trace", wave: 1,
    title: "Full replayable trajectory",
    asks: "One run exported end to end: assembled context, retrieved document IDs, every tool call with arguments and result, model and prompt version, tokens, cost, latency. The test is whether you can replay from step N.",
    check: { platform: "OpenTelemetry", run: null,
             expect: "A span per tool call. Zero means the trajectory is reconstructed from logs, not recorded." } },

  { id: "agent-prompt-injection", wave: 1,
    title: "Retrieved and tool-returned content treated as untrusted",
    asks: "Red-team results for INDIRECT injection through each retrieval and tool-result path, not only direct user input, plus structural separation between instructions and data." },

  { id: "agent-tool-authz", wave: 2,
    title: "Tool authorisation enforced outside the model",
    asks: "The tool manifest per role exported from config rather than described, and policy decision logs showing allow and deny with a reason per invocation.",
    needs: ["agent-identity"] },

  { id: "agent-human-oversight", wave: 2,
    title: "Named human approval for consequential actions",
    asks: "Approval records naming the individual, the proposed action, the reasoning shown to them, and the decision. Watch the approval rate — sustained near 100% means the gate is decorative.",
    needs: ["agent-autonomy-level"] },

  { id: "agent-blast-radius", wave: 2,
    title: "Bounded blast radius and a tested kill switch",
    asks: "Configured step, spend and rate ceilings, and a game-day record showing the kill switch stopping an agent MID-RUN with the time from decision to stop.",
    needs: ["agent-identity"],
    check: { platform: "Kubernetes", run: null,
             expect: "A quota on the agent's namespace. No quota means the ceiling is theoretical." } },

  { id: "agent-action-reversibility", wave: 2,
    title: "Irreversible actions staged, gated or delayed",
    asks: "An inventory of agent-invokable actions classified reversible or not, with the mechanism named for each, and an approval gate or delay window on the rest.",
    needs: ["agent-autonomy-level"] },

  { id: "agent-multi-agent-provenance", wave: 2,
    title: "Provenance across agents",
    asks: "For a given final output, the full upstream chain of agent runs that contributed to it, and a demonstration that a corrected upstream input marks the downstream outputs.",
    needs: ["agent-trajectory-trace"] },

  { id: "agent-cost-per-outcome", wave: 2,
    title: "Cost per resolved task, not per token",
    asks: "Cost per resolved task by agent and feature over time, alongside the cost of failed runs — the runs that fail and get retried are the ones that hurt.",
    needs: ["agent-trajectory-trace"] },
];

const DEFAULT_CONFIG = "agentcheck.config.json";
const args = process.argv.slice(2);
const cmd = args[0];
const flag = n => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i > -1 ? args[i + 1] : d; };

const C = { dim: "\x1b[2m", b: "\x1b[1m", g: "\x1b[32m", y: "\x1b[33m", r: "\x1b[31m", x: "\x1b[0m" };

/* ------------------------------------------------------------------- init */
function init() {
  const path = opt("--config", DEFAULT_CONFIG);
  if (existsSync(path) && !flag("--force")) {
    console.error(`\n  ${path} already exists. Pass --force to overwrite.\n`);
    process.exit(1);
  }
  const cfg = {
    $schema: `${SOURCE}#agentcheck-config`,
    agent: "name-of-your-agent",
    environment: "production",
    assessor: "your.name@example.com",
    controls: Object.fromEntries(CONTROLS.map(c => [c.id, {
      status: "unknown",              // met | not-met | not-applicable | unknown
      evidence: "",                   // where the artefact lives — a link or a path
      note: "",                       // why, if not-met or not-applicable
    }])),
  };
  writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n", "utf8");
  console.log(`\n  wrote ${path}`);
  console.log(`  ${C.dim}Fill in status + evidence for each control, then: node agentcheck.mjs check${C.x}\n`);
}

/* ------------------------------------------------------------------ check */
function runCommand(run) {
  try {
    const out = execSync(run, { stdio: "pipe", timeout: 60000, encoding: "utf8" });
    return { ran: true, ok: true, output: String(out).trim().slice(0, 4000) };
  } catch (e) {
    return {
      ran: true, ok: false,
      output: String(e.stdout || "").trim().slice(0, 2000),
      error: String(e.stderr || e.message || "").trim().split("\n")[0].slice(0, 400),
    };
  }
}

function check() {
  const path = opt("--config", DEFAULT_CONFIG);
  if (!existsSync(path)) {
    console.error(`\n  no ${path}. Run: node agentcheck.mjs init\n`);
    process.exit(1);
  }
  const cfg = JSON.parse(readFileSync(path, "utf8"));
  const doRun = flag("--run");

  const results = CONTROLS.map(c => {
    const d = cfg.controls?.[c.id] ?? {};
    const status = d.status ?? "unknown";
    const r = {
      id: c.id, wave: c.wave, title: c.title,
      declared: status,
      evidence: d.evidence || "",
      note: d.note || "",
      verified: null,
    };
    if (c.check?.run && doRun) {
      const out = runCommand(c.check.run);
      r.verified = { platform: c.check.platform, command: c.check.run, expect: c.check.expect, ...out };
    } else if (c.check) {
      r.verified = {
        platform: c.check.platform,
        command: c.check.run,
        expect: c.check.expect,
        ran: false,
        reason: c.check.run
          ? "not executed — pass --run"
          : "no portable command; this one is environment-specific by nature",
      };
    }
    return r;
  });

  /* Prerequisites: a control claimed met whose prerequisite is not met is the
     most common way one of these packs is quietly wrong. */
  const met = new Set(results.filter(r => r.declared === "met").map(r => r.id));
  for (const c of CONTROLS) {
    const r = results.find(x => x.id === c.id);
    const unmet = (c.needs ?? []).filter(n => !met.has(n));
    if (r.declared === "met" && unmet.length) r.prerequisiteGap = unmet;
  }

  const counts = {
    met: results.filter(r => r.declared === "met").length,
    notMet: results.filter(r => r.declared === "not-met").length,
    notApplicable: results.filter(r => r.declared === "not-applicable").length,
    unknown: results.filter(r => r.declared === "unknown").length,
    verifiedByCommand: results.filter(r => r.verified?.ran && r.verified.ok).length,
    gaps: results.filter(r => r.prerequisiteGap).length,
    missingEvidence: results.filter(r => r.declared === "met" && !r.evidence).length,
  };

  const pack = {
    tool: "agentcheck", version: VERSION,
    generated: new Date().toISOString(),
    agent: cfg.agent, environment: cfg.environment, assessor: cfg.assessor,
    controls_source: SOURCE, controls_license: "CC BY 4.0",
    honesty:
      "DECLARED counts are human assertions, not measurements. VERIFIED counts are read-only commands that ran with output attached. They are reported separately and must not be summed.",
    counts, results,
  };

  const jsonOut = opt("--json", null);
  if (jsonOut) writeFileSync(jsonOut, JSON.stringify(pack, null, 2) + "\n", "utf8");
  const mdOut = opt("--md", null);
  if (mdOut) writeFileSync(mdOut, markdown(pack), "utf8");

  print(pack, { jsonOut, mdOut, doRun });

  /* Non-zero when the pack is not defensible: something claimed met with no
     evidence, or resting on a prerequisite that is not met. Unknowns do not
     fail — an honest unknown is the correct starting state. */
  process.exit(counts.missingEvidence || counts.gaps ? 1 : 0);
}

function print(p, o) {
  const { counts: n } = p;
  console.log(`\n  ${C.b}agentcheck${C.x} ${C.dim}v${VERSION}${C.x}   ${p.agent} ${C.dim}·${C.x} ${p.environment}\n`);

  for (const w of [1, 2]) {
    console.log(`  ${C.dim}wave ${w}${C.x}`);
    for (const r of p.results.filter(x => x.wave === w)) {
      const mark = { met: `${C.g}met${C.x}`, "not-met": `${C.r}not met${C.x}`,
                     "not-applicable": `${C.dim}n/a${C.x}`, unknown: `${C.y}unknown${C.x}` }[r.declared] ?? r.declared;
      const v = r.verified?.ran
        ? (r.verified.ok ? ` ${C.g}[verified]${C.x}` : ` ${C.r}[check failed]${C.x}`)
        : "";
      console.log(`    ${r.title.padEnd(48).slice(0, 48)} ${mark}${v}`);
      if (r.prerequisiteGap) console.log(`      ${C.r}↳ claimed met but needs: ${r.prerequisiteGap.join(", ")}${C.x}`);
      if (r.declared === "met" && !r.evidence) console.log(`      ${C.r}↳ claimed met with no evidence recorded${C.x}`);
    }
    console.log("");
  }

  console.log(`  ${C.b}DECLARED${C.x}  ${n.met} met · ${n.notMet} not met · ${n.notApplicable} n/a · ${n.unknown} unknown`);
  console.log(`  ${C.b}VERIFIED${C.x}  ${n.verifiedByCommand} by a command that ran${o.doRun ? "" : `  ${C.dim}(pass --run to execute)${C.x}`}`);
  console.log(`\n  ${C.dim}These are not added together. A declaration is not a measurement.${C.x}`);

  if (n.missingEvidence) console.log(`\n  ${C.r}${n.missingEvidence} control(s) claimed met with no evidence recorded.${C.x}`);
  if (n.gaps) console.log(`  ${C.r}${n.gaps} control(s) claimed met while a prerequisite is not.${C.x}`);
  if (o.jsonOut) console.log(`\n  ${C.dim}evidence pack → ${o.jsonOut}${C.x}`);
  if (o.mdOut) console.log(`  ${C.dim}report        → ${o.mdOut}${C.x}`);
  console.log("");
}

function markdown(p) {
  const L = [];
  L.push(`# Agent evidence pack — ${p.agent}`, "");
  L.push(`- **Environment:** ${p.environment}`);
  L.push(`- **Assessor:** ${p.assessor}`);
  L.push(`- **Generated:** ${p.generated}`);
  L.push(`- **Controls:** [${p.controls_source}](${p.controls_source}) (CC BY 4.0)`, "");
  L.push(`> ${p.honesty}`, "");
  L.push(`**Declared:** ${p.counts.met} met · ${p.counts.notMet} not met · ${p.counts.notApplicable} n/a · ${p.counts.unknown} unknown  `);
  L.push(`**Verified by a command that ran:** ${p.counts.verifiedByCommand}`, "");
  for (const w of [1, 2]) {
    L.push(`## Wave ${w}`, "");
    for (const r of p.results.filter(x => x.wave === w)) {
      L.push(`### ${r.title}`, "");
      L.push(`- **Declared:** \`${r.declared}\`${r.evidence ? ` — evidence: ${r.evidence}` : " — _no evidence recorded_"}`);
      if (r.note) L.push(`- **Note:** ${r.note}`);
      if (r.prerequisiteGap) L.push(`- **⚠ Prerequisite gap:** claimed met but depends on ${r.prerequisiteGap.join(", ")}`);
      if (r.verified?.ran) {
        L.push(`- **Verified:** \`${r.verified.command}\``);
        L.push("", "```", (r.verified.output || r.verified.error || "").slice(0, 1200), "```");
      } else if (r.verified) {
        L.push(`- **Not verified:** ${r.verified.reason}`);
      }
      L.push("");
    }
  }
  return L.join("\n") + "\n";
}

/* ------------------------------------------------------------------- main */
if (cmd === "init") init();
else if (cmd === "check") check();
else {
  console.log(`
  ${C.b}agentcheck${C.x} ${C.dim}v${VERSION}${C.x} — evidence pack for an agent deployment

    node agentcheck.mjs init                write a config template
    node agentcheck.mjs check               score it, execute nothing
    node agentcheck.mjs check --run         also run the read-only checks
    node agentcheck.mjs check --json p.json write the evidence pack
    node agentcheck.mjs check --md r.md     write a Markdown report

  Declared and verified are counted separately and never summed.
  Controls: ${SOURCE} (CC BY 4.0)
`);
  process.exit(cmd ? 1 : 0);
}
