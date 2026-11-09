#!/usr/bin/env node
/* check-mcp.mjs — exercises the Worker's /v1/mcp handler without deploying.
 *
 *   node scripts/check-mcp.mjs
 *
 * Runs the real handler (worker/site/src/mcp.js) with real Request objects:
 * the MCP handshake, every tool, resources, error handling, and a parity
 * check that the endpoint scores exactly like the web page for every
 * possible "all answers equal" vector plus 500 random ones.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { mcp } = await import(join(ROOT, "worker/site/src/mcp.js"));
const READINESS = JSON.parse(readFileSync(join(ROOT, "tools/agent-readiness.json"), "utf8"));

let failures = 0, id = 0;
const fail = m => { console.error("  FAIL " + m); failures++; };
const call = async (method, params, opts = {}) => {
  const res = await mcp(new Request("https://hellouchit.com/v1/mcp", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify(opts.notification ? { jsonrpc: "2.0", method, params } : { jsonrpc: "2.0", id: ++id, method, params }),
  }));
  return { status: res.status, body: res.status === 202 ? null : await res.json() };
};

const init = await call("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "check", version: "1" } });
if (init.body?.result?.protocolVersion !== "2025-06-18") fail("initialize did not echo a supported version");
if (!init.body?.result?.capabilities?.tools) fail("initialize missing tools capability");
if ((await call("notifications/initialized", {}, { notification: true })).status !== 202) fail("notification not 202");

const tools = (await call("tools/list")).body.result.tools.map(t => t.name).sort().join(",");
if (tools !== "get_agent_control,get_readiness_questions,list_agent_controls,score_agent_readiness") fail("tools/list: " + tools);

const list = (await call("tools/call", { name: "list_agent_controls", arguments: {} })).body.result;
if (list.structuredContent.controls.length !== 10) fail("list_agent_controls did not return 10");
const ctl = (await call("tools/call", { name: "get_agent_control", arguments: { id: "agent-identity" } })).body.result;
if (!/workload identity/i.test(ctl.content[0].text)) fail("get_agent_control text");
const bad = (await call("tools/call", { name: "get_agent_control", arguments: { id: "nope" } })).body.result;
if (!bad.isError) fail("unknown control should be a tool error");
const qs = (await call("tools/call", { name: "get_readiness_questions", arguments: {} })).body.result;
if (qs.structuredContent.questions.length !== 10) fail("get_readiness_questions count");

/* Parity: the page scores with js/readiness-score.js; so must the endpoint. */
const pageScore = (await import(join(ROOT, "js/readiness-score.js")), globalThis.ReadinessScore.score);
const vectors = [1, 2, 3, 4, 5].map(v => Array(10).fill(v));
for (let k = 0; k < 500; k++) vectors.push(Array.from({ length: 10 }, () => 1 + Math.floor(Math.random() * 5)));
for (const a of vectors) {
  const r = (await call("tools/call", { name: "score_agent_readiness", arguments: { answers: a, sector: "fsi" } })).body.result;
  const p = pageScore(READINESS.levels, a, 10);
  if (r.structuredContent.score !== p.score || r.structuredContent.level !== p.level.name) { fail(`parity ${a.join("")}`); break; }
}
const badScore = (await call("tools/call", { name: "score_agent_readiness", arguments: { answers: [1, 2, 3] } })).body.result;
if (!badScore.isError) fail("short answers should be a tool error");

const res = (await call("resources/list")).body.result.resources;
if (res.length !== 11) fail("resources/list count " + res.length);
const read = (await call("resources/read", { uri: res[0].uri })).body.result;
if (!read.contents?.[0]?.text) fail("resources/read");

if ((await call("does/not/exist")).body.error?.code !== -32601) fail("unknown method code");
const get = await mcp(new Request("https://hellouchit.com/v1/mcp", { method: "GET" }));
if (get.status !== 405) fail("GET should be 405");

if (failures) { console.error(`\n  ${failures} MCP check(s) failed\n`); process.exit(1); }
console.log(`  MCP endpoint: handshake, 4 tools, 11 resources, errors and ${vectors.length} parity checks pass`);
