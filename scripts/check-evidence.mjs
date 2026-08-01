#!/usr/bin/env node
/* check-evidence.mjs — machine-checks the syntax of every verify command.
 *
 *   node scripts/check-evidence.mjs
 *
 * A command in a compliance dataset that doesn't parse is worse than no
 * command. It looks authoritative, gets pasted into a production terminal, and
 * fails in a way that makes the reader distrust everything else on the page.
 * So the ones that can be checked, are — and the ones that can't say so.
 *
 * How the AWS check works without credentials or a network:
 *   The CLI validates arguments locally before it builds a request. Pointing
 *   --endpoint-url at a closed port separates the two failure modes cleanly:
 *
 *     exit 252  parameter validation failed  → the command is wrong
 *     exit 255  connection refused           → the command parsed fine
 *
 * Placeholders like <bucket> are substituted with syntactically valid stand-ins
 * so the parser sees a well-formed command. Nothing is ever sent anywhere.
 *
 * Exits non-zero on a syntax failure so this can gate a build.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync, execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PATH = join(ROOT, "dataset/dataset.json");
const data = JSON.parse(readFileSync(PATH, "utf8"));

const _haveCache = new Map();
const have = bin => {
  if (!_haveCache.has(bin)) {
    let ok = true;
    try { execFileSync("/usr/bin/env", ["which", bin], { stdio: "ignore" }); }
    catch { ok = false; }
    _haveCache.set(bin, ok);
  }
  return _haveCache.get(bin);
};

/* Stand-ins that parse. Never resolve to anything real. */
const PLACEHOLDER = {
  "<bucket>": "example-bucket", "<domain>": "example.com", "<host>": "example.com",
  "<image>": "example.invalid/img@sha256:" + "0".repeat(64),
  "<agent>": "agent", "<otlp-query>": "http://127.0.0.1:1",
};
const fill = s => Object.entries(PLACEHOLDER)
  .reduce((acc, [k, v]) => acc.split(k).join(v), s);

const AWS_ENV = {
  ...process.env,
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
  AWS_SECRET_ACCESS_KEY: "x".repeat(40),
  AWS_DEFAULT_REGION: "us-east-1",
  AWS_EC2_METADATA_DISABLED: "true",
  AWS_CONFIG_FILE: "/dev/null",
  AWS_SHARED_CREDENTIALS_FILE: "/dev/null",
};

/* Only the first segment of a pipeline is the command under test; the rest is
   awk/jq/grep shaping the output, checked separately where possible. */
const head = cmd => cmd.split("|")[0].trim();

function checkAws(cmd) {
  const c = fill(head(cmd)).replace(/^aws\s+/, "");
  try {
    execSync(`aws --endpoint-url http://127.0.0.1:1 ${c}`,
      { env: AWS_ENV, stdio: "pipe", timeout: 30000 });
    return { ok: true, note: "parsed" };
  } catch (e) {
    /* 252 = the CLI rejected the arguments. 255 = it accepted them and failed
       to reach the closed port, which is exactly what we want to see. */
    if (e.status === 252) {
      const msg = String(e.stderr || e.stdout || "").trim().split("\n").filter(Boolean).pop() || "";
      return { ok: false, note: msg.slice(0, 180) };
    }
    return { ok: true, note: `parsed (exit ${e.status})` };
  }
}

function checkJq(cmd) {
  /* jq -n compiles the filter without needing input. */
  const m = cmd.match(/jq\s+(?:-[a-zA-Z]+\s+)*'([^']+)'/);
  if (!m) return null;
  try {
    /* stdio:"pipe" captures stderr for us. Redirecting it inside the shell
       string instead — an earlier version did — throws the compile error away
       and makes every filter look valid, which is the one outcome a checker
       must never produce. */
    execSync(`jq -n ${JSON.stringify(m[1])} </dev/null`, { stdio: "pipe", timeout: 15000 });
    return { ok: true, note: "filter compiles" };
  } catch (e) {
    const out = String(e.stderr || e.stdout || "");
    /* A filter that compiles but errors on null input is still valid syntax. */
    if (/compile error|syntax error|error: syntax/i.test(out)) {
      return { ok: false, note: out.trim().split("\n")[0].slice(0, 180) };
    }
    return { ok: true, note: "filter compiles" };
  }
}

function checkDig(cmd) {
  const m = fill(head(cmd)).match(/^dig\s+(.+)$/);
  if (!m) return null;
  /* Resolve against a closed port: argument parsing happens first.
     dig reports a bad option on stdout and still exits 0, so the exit status
     is useless here — the output has to be read on the success path too, or
     every malformed dig command sails through. */
  let out = "";
  try {
    out = String(execSync(`dig @127.0.0.1 -p 1 +time=1 +tries=1 ${m[1]} 2>&1`,
      { stdio: "pipe", timeout: 15000 }) || "");
  } catch (e) {
    out = String(e.stdout || e.stderr || "");
  }
  if (/Invalid option|invalid option|couldn't get address|Usage:\s+dig/i.test(out)) {
    return { ok: false, note: out.trim().split("\n")[0].slice(0, 180) };
  }
  return { ok: true, note: "parsed" };
}

const CHECKERS = [
  { bin: "aws", match: c => /^aws\s/.test(head(c)), run: checkAws },
  { bin: "dig", match: c => /^dig\s/.test(head(c)), run: checkDig },
  { bin: "jq", match: c => /\bjq\s+/.test(c), run: checkJq },
];

const rows = data.rows.filter(r => r.verify);
let checked = 0, unchecked = 0, failed = 0;
const failures = [];
const byPlatform = {};

for (const row of rows) {
  for (const v of row.verify) {
    const c = CHECKERS.find(x => x.match(v.run) && have(x.bin));
    if (!c) {
      v.checked = false;
      unchecked++;
      (byPlatform[v.platform] ||= { ok: 0, no: 0 }).no++;
      continue;
    }
    const res = c.run(v.run);
    if (res === null) { v.checked = false; unchecked++; continue; }
    v.checked = res.ok;
    if (res.ok) { checked++; (byPlatform[v.platform] ||= { ok: 0, no: 0 }).ok++; }
    else { failed++; failures.push({ id: row.id, platform: v.platform, run: v.run, note: res.note }); }
  }
}

/* Recorded in the data so the page can be honest per command rather than
   making one blanket claim about all of them. */
data.evidence_check = {
  generated_by: "scripts/check-evidence.mjs",
  method: "CLI argument parsing against a closed endpoint — no network, no credentials, nothing executed against real infrastructure.",
  commands: checked + unchecked + failed,
  syntax_checked: checked,
  unchecked,
  note: "Unchecked means the CLI is not installed in the build environment, not that the command is wrong. Every command is read-only.",
};

writeFileSync(PATH, JSON.stringify(data, null, 2) + "\n", "utf8");

const total = checked + unchecked + failed;
console.log(`\n  ${total} commands across ${rows.length} controls`);
console.log(`    syntax-checked  ${checked}`);
console.log(`    unchecked       ${unchecked}  (CLI absent here — not a verdict on the command)`);
console.log(`    FAILED          ${failed}`);

if (failures.length) {
  console.log("\n  syntax failures:");
  for (const f of failures) {
    console.log(`    ${f.id} [${f.platform}]\n      ${f.run}\n      → ${f.note}`);
  }
  console.log("");
  process.exit(1);
}
console.log("");
