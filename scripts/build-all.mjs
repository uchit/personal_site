#!/usr/bin/env node
/* build-all.mjs — runs every generator and check in the one order that works.
 *
 *   node scripts/build-all.mjs
 *
 * The dataset pipeline has a real ordering dependency and it is not obvious
 * from the filenames: the verify blocks must exist before their syntax can be
 * checked, the checks must have stamped their results before the page renders
 * them, and coverage must be counted before the chips claim a tier. Run out of
 * order everything still "succeeds" and the page ships stale badges — the
 * quietest possible failure.
 *
 * So the order lives here rather than in someone's memory or a README.
 *
 * Any step exiting non-zero stops the run.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

const STEPS = [
  ["extend-dataset-verify.mjs", "attach verify commands to the controls that have one"],
  ["check-evidence.mjs",        "syntax-check every command, stamp the result"],
  ["extend-dataset-antipatterns.mjs", "link controls to failure modes, validate anchors"],
  ["extend-dataset-deps.mjs",   "attach prerequisite edges"],
  ["build-sequence.mjs",        "derive per-regulation order of work"],
  ["build-coverage.mjs",        "count per-regulation depth"],
  ["build-dataset-views.mjs",   "render dataset CSV + rows + chips"],
  ["build-agents.mjs",          "generate /agents/ from the agent controls"],
  ["build-json-exports.mjs",    "emit the JSON exports"],
  ["build-situations.mjs",      "regenerate /situations/"],
  ["build-step-nav.mjs",        "stamp Method step markers"],
  ["build-llms-full.mjs",       "rebuild the corpus"],
  ["check-routes.mjs",          "validate diagnostic routes"],
  ["check-drafts.mjs",          "fail on indexable drafts"],
];

let failed = null;
for (const [script, why] of STEPS) {
  process.stdout.write(`\n\x1b[2m── ${script}\x1b[0m  ${why}\n`);
  const r = spawnSync(process.execPath, [join(HERE, script)], { stdio: "inherit" });
  if (r.status !== 0) { failed = script; break; }
}

if (failed) {
  console.error(`\n\x1b[31m  BUILD FAILED at ${failed}\x1b[0m\n`);
  process.exit(1);
}
console.log("\n\x1b[32m  all steps green\x1b[0m\n");
