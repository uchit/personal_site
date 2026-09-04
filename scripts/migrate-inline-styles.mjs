#!/usr/bin/env node
/* migrate-inline-styles.mjs — replaces the most common repeated inline
 * style="..." values with utility classes (defined in css/site.css), so
 * style-src can eventually drop 'unsafe-inline'.
 *
 *   node scripts/migrate-inline-styles.mjs
 *
 * Only touches exact-match values in UTILITY_MAP below — the long tail of
 * one-off decorative styles is left alone. Idempotent: a file with no
 * matching style="..." left is unchanged.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export const UTILITY_MAP = {
  "opacity:.5": "u-op-50",
  "color:var(--muted)": "u-muted",
  "opacity:.6": "u-op-60",
  "color:var(--accent)": "u-accent",
  "color:var(--accent);font-weight:500": "u-accent-med",
  "color:var(--ink)": "u-ink",
  "display:flex;gap:8px;font-family:'IBM Plex Mono',monospace;font-size:11.5px;letter-spacing:.12em;color:var(--faint);margin-bottom:20px": "u-eyebrow",
  "color:var(--accent);border-bottom:1px dotted var(--accent)": "u-link-dotted-accent",
  "color:var(--accent);border-bottom:1px solid var(--accent)": "u-link-solid-accent",
  "position:relative;padding-left:28px;margin-bottom:12px;color:var(--muted);font-size:15.5px;line-height:1.65": "u-bullet-item",
  "position:absolute;left:4px;top:11px;width:13px;height:1px;background:var(--accent)": "u-bullet-dash",
  "margin-top:8px": "u-mt-8",
  "display:flex;flex-wrap:wrap;gap:10px": "u-flex-wrap-10",
  "color:var(--ink);border-bottom:1px solid var(--accent)": "u-link-ink-accent",
  "font-style:italic;color:var(--accent)": "u-italic-accent",
  "display:flex;flex-wrap:wrap;gap:14px 22px;align-items:center": "u-flex-wrap-14-22",
  "color:var(--faint)": "u-faint",
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = execSync("find . -name '*.html' -not -path './oss-projects/*'", { cwd: ROOT })
    .toString().trim().split("\n").filter(Boolean).map(f => f.replace(/^\.\//, ""));

  let filesChanged = 0, attrsChanged = 0;

  for (const file of files) {
    const full = join(ROOT, file);
    let src = readFileSync(full, "utf8");
    let fileTouched = false;

    // Walk every tag; for each, check its style="..." (if any) against the map.
    src = src.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z_:][-a-zA-Z0-9_:.]*(?:="[^"]*")?)*)\s*(\/?)>/g, (whole, tag, attrsStr, selfClose) => {
      const styleMatch = attrsStr.match(/\sstyle="([^"]*)"/);
      if (!styleMatch) return whole;
      const value = styleMatch[1];
      const utilClass = UTILITY_MAP[value];
      if (!utilClass) return whole;

      // Remove the style attribute.
      let newAttrs = attrsStr.slice(0, styleMatch.index) + attrsStr.slice(styleMatch.index + styleMatch[0].length);

      // Merge into existing class="..." or add one.
      const classMatch = newAttrs.match(/\sclass="([^"]*)"/);
      if (classMatch) {
        const newClassVal = `${classMatch[1]} ${utilClass}`.trim();
        newAttrs = newAttrs.slice(0, classMatch.index) +
          ` class="${newClassVal}"` +
          newAttrs.slice(classMatch.index + classMatch[0].length);
      } else {
        newAttrs = ` class="${utilClass}"` + newAttrs;
      }

      fileTouched = true;
      attrsChanged++;
      return `<${tag}${newAttrs}${selfClose ? " /" : ""}>`;
    });

    if (fileTouched) {
      writeFileSync(full, src);
      filesChanged++;
    }
  }

  console.log(`${attrsChanged} style attribute(s) converted across ${filesChanged} file(s)`);
}
