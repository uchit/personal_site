#!/usr/bin/env node
/* build-llms-full.mjs — regenerates /llms-full.txt from the site's prose pages.
 *
 *   node scripts/build-llms-full.mjs
 *
 * Why this exists: llms.txt advertises a concatenated full-text corpus for AI
 * ingestion. Hand-maintaining it guarantees drift, so it is generated.
 *
 * Scope note: the diagnostics (/tools/), decision trees (/decisions/) and the
 * dataset hold their content in JS config objects and JSON, not in HTML prose.
 * Extracting their markup would yield empty shells, so they are represented
 * here by a pointer to their machine-readable JSON instead. Prose lives here;
 * structured tooling lives in the .json files.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://hellouchit.com";

/* Ordered corpus. Each entry: [section heading, [page paths…]].
   Paths are repo-relative; the public URL is derived from them. */
const CORPUS = [
  ["Entity record", ["ai/index.html"]],
  ["The framework", ["4-discipline-stack/index.html"]],
  ["Agentic systems in regulated environments", ["agents/index.html"]],
  ["Frontier log", ["frontier/index.html"]],
  ["Cornerstone essays", [
    "writing/encoded-enterprise-architect.html",
    "writing/genai-9-controls.html",
    "writing/devsecops-is-supply-chain.html",
    "writing/platform-engineering-ai-moat.html",
    "writing/4-discipline-stack-essay.html",
    "writing/au-ai-safety-decoded.html",
  ]],
  ["Case studies", [
    "case-studies/payment-platform.html",
    "case-studies/ea-governance.html",
    "case-studies/digital-lending.html",
    "case-studies/retail-modernisation.html",
    "case-studies/data-archival.html",
  ]],
  ["90-day playbooks", [
    "playbooks/eu-ai-act-12-weeks.html",
    "playbooks/cisa-attestation-90-days.html",
    "playbooks/cloud-cost-aware-to-controlled.html",
    "playbooks/vault-theatre-to-workload-identity.html",
  ]],
  ["Reference architectures", [
    "reference-architectures/regulated-genai-platform.html",
    "reference-architectures/devsecops-paved-path.html",
    "reference-architectures/platform-engineering-idp.html",
    "reference-architectures/modern-data-platform.html",
  ]],
  ["Architecture teardowns", [
    "teardowns/claude-ai.html",
    "teardowns/linear.html",
    "teardowns/notion.html",
    "teardowns/vercel.html",
  ]],
  ["Maturity tiers", [
    "maturity/ea-consultative.html",
    "maturity/devsecops-repeatable.html",
    "maturity/genai-piloting.html",
    "maturity/platform-eng-emerging.html",
    "maturity/sre-operational.html",
    "maturity/cloud-cost-aware.html",
  ]],
  ["Sector views", [
    "for/banks/index.html",
    "for/government/index.html",
    "for/healthcare/index.html",
    "for/critical-infrastructure/index.html",
  ]],
  ["Reference", [
    "anti-patterns/index.html",
    "glossary/index.html",
    "reading/index.html",
  ]],
  ["Annual report", ["state-of-2026/index.html"]],
];

/* Chrome shared by every page — nav, footer, discoverability strip. Stripping
   it keeps the corpus signal-dense instead of repeating the same 40 words 40×. */
const CHROME = [
  /<header\b[^>]*class="[^"]*\bnav\b[^"]*"[\s\S]*?<\/header>/gi,
  /<footer\b[\s\S]*?<\/footer>/gi,
  /<section\b[^>]*class="[^"]*\balso-strip\b[^"]*"[\s\S]*?<\/section>/gi,
  /<a\b[^>]*class="[^"]*\bskip-link\b[^"]*"[\s\S]*?<\/a>/gi,
  /<nav\b[^>]*class="[^"]*\bcrumb\b[^"]*"[\s\S]*?<\/nav>/gi,
];

const ENTITIES = [
  [/&mdash;/g, "—"], [/&ndash;/g, "–"], [/&nbsp;|&#160;/g, " "],
  [/&#8209;/g, "-"], [/&rsquo;/g, "’"], [/&lsquo;/g, "‘"],
  [/&ldquo;/g, "“"], [/&rdquo;/g, "”"], [/&amp;/g, "&"],
  [/&lt;/g, "<"], [/&gt;/g, ">"], [/&times;/g, "×"],
  [/&middot;/g, "·"], [/&rarr;/g, "→"], [/&larr;/g, "←"],
  [/&equiv;/g, "≡"], [/&copy;/g, "©"], [/&quot;/g, '"'],
  [/&hellip;/g, "…"], [/&deg;/g, "°"], [/&#39;/g, "'"],
];

function urlFor(path) {
  return SITE + "/" + path.replace(/index\.html$/, "").replace(/\.html$/, "");
}

function titleOf(html, fallback) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  if (!m) return fallback;
  return decode(m[1]).split("—")[0].trim() || fallback;
}

function decode(s) {
  for (const [re, ch] of ENTITIES) s = s.replace(re, ch);
  return s.replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
}

function extract(html) {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, "");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, "");
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  for (const re of CHROME) s = s.replace(re, "");

  const main = s.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  s = main ? main[1] : s.replace(/[\s\S]*?<body\b[^>]*>/i, "");

  // Elements that should force a line break so prose doesn't run together.
  s = s.replace(/<\/(h[1-6]|p|li|tr|div|section|article|dt|dd|blockquote|figcaption)>/gi, "\n");
  s = s.replace(/<(br|hr)\s*\/?>/gi, "\n");
  // Headings get markdown hashes so structure survives the flattening.
  s = s.replace(/<h([1-6])\b[^>]*>/gi, (_, n) => "\n" + "#".repeat(Math.min(+n + 1, 6)) + " ");
  s = s.replace(/<li\b[^>]*>/gi, "- ");
  s = s.replace(/<[^>]+>/g, " ");

  s = decode(s);
  s = s.replace(/[ \t ]+/g, " ");
  s = s.split("\n").map(l => l.trim()).join("\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  // Drop stray bullets and hash-only lines left by emptied containers.
  s = s.split("\n").filter(l => l !== "-" && !/^#+$/.test(l)).join("\n");

  // Source HTML is hard-wrapped at ~70 cols; that wrapping is an artefact of
  // the file, not of the prose. Re-flow each paragraph onto a single line so
  // the text reads as sentences. Headings and list blocks keep their lines.
  s = s.split(/\n{2,}/).map(block => {
    const lines = block.split("\n");
    if (lines.some(l => /^(#{2,6} |- )/.test(l))) return lines.join("\n");
    return lines.join(" ").replace(/ {2,}/g, " ");
  }).join("\n\n");

  // Tag removal leaves a space before punctuation that had closed a tag
  // ("the home page ; this page…"). Pull it back onto the word.
  s = s.replace(/ +([.,;:!?%)\]’”])/g, "$1");
  s = s.replace(/([(\[‘“]) +/g, "$1");

  return s.trim();
}

const stamp = new Date().toISOString().slice(0, 10);
const out = [];
const missing = [];

out.push("# Uchit Vyas — full text corpus");
out.push("");
out.push(`> Concatenated prose from hellouchit.com, generated ${stamp} for AI ingestion.`);
out.push("> Companion to https://hellouchit.com/llms.txt (the structured manifest).");
out.push("> Licence: essays and prose © Uchit Vyas. The regulation × control × tooling");
out.push("> dataset is CC BY 4.0. Cite as: Uchit Vyas, hellouchit.com.");
out.push("");
out.push("> Interactive tooling — the six diagnostics, seven decision trees and the");
out.push("> dataset — is not prose and is published separately in machine-readable form:");
out.push(`> ${SITE}/tools/diagnostics.json`);
out.push(`> ${SITE}/decisions/decisions.json`);
out.push(`> ${SITE}/dataset/dataset.json`);
out.push("");

for (const [section, paths] of CORPUS) {
  out.push("");
  out.push(`${"=".repeat(72)}`);
  out.push(`SECTION: ${section}`);
  out.push(`${"=".repeat(72)}`);
  for (const p of paths) {
    const abs = join(ROOT, p);
    if (!existsSync(abs)) { missing.push(p); continue; }
    const html = readFileSync(abs, "utf8");
    const body = extract(html);
    if (!body) { missing.push(p + " (no body text)"); continue; }
    out.push("");
    out.push(`## ${titleOf(html, p)}`);
    out.push(`Source: ${urlFor(p)}`);
    out.push("");
    out.push(body);
    out.push("");
  }
}

const text = out.join("\n").replace(/\n{4,}/g, "\n\n\n") + "\n";
writeFileSync(join(ROOT, "llms-full.txt"), text, "utf8");

const words = text.split(/\s+/).filter(Boolean).length;
console.log(`llms-full.txt written — ${text.length.toLocaleString()} bytes, ~${words.toLocaleString()} words`);
if (missing.length) {
  console.warn(`\nSkipped ${missing.length} page(s):`);
  for (const m of missing) console.warn("  - " + m);
  process.exitCode = 1;
}
