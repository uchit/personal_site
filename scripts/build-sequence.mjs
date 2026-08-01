#!/usr/bin/env node
/* build-sequence.mjs — derives an order of work per regulation.
 *
 *   node scripts/build-sequence.mjs
 *
 * "Which of these 66 do I do first, given CPS 230 lands in nine months?" is
 * the question the dataset was not answering. It is answerable, because the
 * prerequisite edges are structural: topologically sort the controls that
 * regulation actually maps to, and the waves fall out.
 *
 * Two properties worth stating plainly, because a sequence implies more
 * authority than it has:
 *
 *   - Within a wave there is NO implied order. Everything in wave 1 has no
 *     unmet prerequisite and can be started in parallel. Numbering them 1..n
 *     would invent a priority the data does not contain.
 *
 *   - A prerequisite outside the regulation still counts. Doing CPS 234's
 *     mTLS control needs workload identity whether or not CPS 234 names it.
 *     Those are carried in and marked, rather than silently dropped to make
 *     the sequence look shorter.
 *
 * Cycles are a build failure. A cycle in a prerequisite graph means one of the
 * edges is an opinion about priority rather than a technical dependency, and
 * the fix is to remove that edge, not to break the tie arbitrarily.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = join(ROOT, "dataset/dataset.json");
const data = JSON.parse(readFileSync(PATH, "utf8"));

const byId = new Map(data.rows.map(r => [r.id, r]));
const deps = id => byId.get(id)?.depends_on ?? [];

/* ------------------------------------------------------------ cycle check */
{
  const WHITE = 0, GREY = 1, BLACK = 2;
  const colour = new Map([...byId.keys()].map(k => [k, WHITE]));
  const stack = [];
  let cycle = null;

  const visit = id => {
    if (cycle) return;
    colour.set(id, GREY);
    stack.push(id);
    for (const p of deps(id)) {
      if (colour.get(p) === GREY) { cycle = [...stack.slice(stack.indexOf(p)), p]; return; }
      if (colour.get(p) === WHITE) visit(p);
      if (cycle) return;
    }
    stack.pop();
    colour.set(id, BLACK);
  };
  for (const id of byId.keys()) if (colour.get(id) === WHITE) visit(id);

  if (cycle) {
    console.error(`\n  ERROR: prerequisite cycle — ${cycle.join(" → ")}`);
    console.error("  One of those edges is a priority opinion, not a dependency. Remove it.\n");
    process.exit(1);
  }
}

/* --------------------------------------------------------- per-regulation */
function sequenceFor(reg) {
  /* Controls the regulation maps to, plus any prerequisite they pull in. */
  const direct = new Set(data.rows.filter(r => r.reg.includes(reg)).map(r => r.id));
  const all = new Set(direct);
  const pull = [...direct];
  while (pull.length) {
    for (const p of deps(pull.pop())) if (!all.has(p)) { all.add(p); pull.push(p); }
  }

  /* Kahn's algorithm, but grouped: everything with no unmet prerequisite
     forms a wave, and waves are what a plan is actually made of. */
  const remaining = new Set(all);
  const waves = [];
  let guard = 0;
  while (remaining.size) {
    const ready = [...remaining].filter(id => deps(id).every(p => !remaining.has(p)));
    if (!ready.length || guard++ > 100) {
      console.error(`\n  ERROR: could not sequence ${reg} — unresolved: ${[...remaining].join(", ")}\n`);
      process.exit(1);
    }
    /* Stable ordering inside a wave, alphabetical by id, precisely so nobody
       reads the position as a priority. */
    ready.sort();
    waves.push(ready.map(id => ({ id, carried: !direct.has(id) })));
    for (const id of ready) remaining.delete(id);
  }
  return {
    controls: direct.size,
    carried: all.size - direct.size,
    waves,
  };
}

const sequence = {};
for (const reg of Object.keys(data.regulations)) {
  const s = sequenceFor(reg);
  if (s.controls) sequence[reg] = s;
}

data.sequence = {
  generated_by: "scripts/build-sequence.mjs",
  method: "Topological grouping of the prerequisite graph, restricted to the controls a regulation maps to plus any prerequisite those pull in.",
  note: "Within a wave there is no implied order — everything in it can start in parallel. Carried controls are prerequisites the regulation does not itself name.",
  by_regulation: sequence,
};

writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

const rows = Object.entries(sequence).sort((a, b) => b[1].controls - a[1].controls);
console.log(`\n  sequenced ${rows.length} regulations, no cycles\n`);
for (const [reg, s] of rows.slice(0, 6)) {
  console.log(`    ${(data.regulations[reg]?.label ?? reg).padEnd(22)} ${String(s.controls).padStart(2)} controls  ${s.waves.length} waves  first wave ${s.waves[0].length}${s.carried ? `  (+${s.carried} carried)` : ""}`);
}
console.log(`    …\n`);
