#!/usr/bin/env node
/* check-drafts.mjs — stops a draft page shipping half-written.
 *
 * Convention, not heuristics: a placeholder is an element carrying class="todo"
 * (an author prompt) or class="ph" (inline placeholder text). An earlier version
 * guessed at [Bracketed] text and flagged "[X, Y, Z]" in an essay and "[A-Za-z]"
 * in a regex — so the marker is now explicit and there is nothing to guess.
 *
 * The rule: a page containing placeholders MUST carry noindex. The failure this
 * exists to prevent is publishing with "[Refusal one]" still on the page.
 */
import { readFileSync, globSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = globSync("**/*.html", { cwd: ROOT }).filter(f => !f.startsWith("node_modules"));

let problems = 0, drafts = 0;
for (const f of files) {
  const s = readFileSync(join(ROOT, f), "utf8");
  const noindex = /<meta name="robots" content="[^"]*noindex/i.test(s);
  const todos = (s.match(/class="todo"/g) || []).length;
  const phs   = (s.match(/class="ph"/g) || []).length;
  const has   = todos + phs;

  if (has && !noindex) {
    console.error(`  WOULD PUBLISH PLACEHOLDERS  ${f} — ${todos} prompt(s), ${phs} placeholder(s), no noindex`);
    problems++;
  } else if (has) {
    console.log(`  draft                       ${f} — ${todos} prompt(s), ${phs} placeholder(s)`);
    drafts++;
  } else if (noindex && !/noindex: intentional/.test(s)) {
    /* Some pages are noindex on purpose and forever (confirmation pages,
       thank-you pages). They opt out with a "noindex: intentional" comment so
       this check does not nag about publishing them. */
    console.warn(`  ready                       ${f} — no placeholders left; remove noindex, add to sitemap, link it`);
  }
}
if (problems) { console.error(`\n  ${problems} page(s) would publish with placeholder text\n`); process.exit(1); }
console.log(`\n  ${drafts} draft(s), 0 leaking\n`);
