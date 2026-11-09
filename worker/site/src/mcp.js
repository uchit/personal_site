/**
 * /v1/mcp — a read-only Model Context Protocol server for AI assistants.
 *
 * Lets Claude, ChatGPT and other MCP clients use the site's work directly:
 * read the ten controls for AI agents, fetch the readiness questions, and
 * score an agent with the same function the web page uses.
 *
 * It applies the site's own controls to itself:
 *   - Tool authorisation outside the model: every tool is fixed code over
 *     fixed data. No tool calls a model, fetches a URL, writes storage or
 *     reads anything a caller supplies beyond validated arguments.
 *   - Bounded blast radius: no state, no secrets, no per-request storage
 *     writes, and request bodies are capped. Rate limiting belongs at the
 *     edge (a Cloudflare WAF rule on /v1/mcp), not in a KV counter that
 *     would cost a write per call.
 *   - Untrusted input is data: arguments are validated against the schema
 *     and never interpolated into anything executable.
 *
 * Transport: Streamable HTTP, stateless. Each POST is one JSON-RPC message
 * (or a batch, for older clients) answered with application/json. There is
 * no session and no server-to-client stream, so GET returns 405.
 */
import { READINESS, CONTROLS } from "./generated/data.js";
import "./generated/readiness-score.js";

const SITE = "https://hellouchit.com";
const SUPPORTED_VERSIONS = ["2026-07-28", "2025-11-25", "2025-06-18", "2025-03-26"];
const MAX_BODY = 32 * 1024;
const CONTROL_IDS = CONTROLS.map(c => c.id);
const SECTORS = Object.keys(READINESS.sectors);

const headers = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Protocol-Version, Mcp-Session-Id, Mcp-Method, Mcp-Name",
  "Cache-Control": "no-store",
};

export const mcpPreflight = () => new Response(null, { status: 204, headers });

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };

const TOOLS = [
  {
    name: "list_agent_controls",
    title: "List the ten controls for AI agents",
    description: "Lists the ten controls to build before an AI agent goes live in a regulated company, in build order, each with a one-line reason. From hellouchit.com/agents by Uchit Vyas (CC BY 4.0).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: "get_agent_control",
    title: "Get one control in full",
    description: "Returns one control in full: why it matters, the evidence an auditor will ask for, read-only commands to verify it, what to build first, tools that implement it, and which regulations it maps to (EU AI Act, NIST AI RMF, ISO/IEC 42001, APRA and others).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", enum: CONTROL_IDS, description: "Control id, as returned by list_agent_controls." } },
      required: ["id"], additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
  {
    name: "get_readiness_questions",
    title: "Get the agent readiness questions",
    description: "Returns the ten questions of the agent readiness check, each with five options numbered 1 to 5. Ask the user each question, then pass their option numbers to score_agent_readiness.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: READ_ONLY,
  },
  {
    name: "score_agent_readiness",
    title: "Score an AI agent's readiness",
    description: "Scores answers to the ten readiness questions with the same function as hellouchit.com/tools/agent-readiness.html. Returns the score out of 50, the level, what the level means, the three things to fix first, and an optional sector-specific view. Answer for what is enforced today, not what is planned.",
    inputSchema: {
      type: "object",
      properties: {
        answers: {
          type: "array", minItems: 10, maxItems: 10,
          items: { type: "integer", minimum: 1, maximum: 5 },
          description: "Ten option numbers (1 to 5), one per question, in question order.",
        },
        sector: { type: "string", enum: SECTORS, description: "Optional sector for a tailored view." },
      },
      required: ["answers"], additionalProperties: false,
    },
    annotations: READ_ONLY,
  },
];

const RESOURCES = [
  { uri: `${SITE}/tools/agent-readiness.json`, name: "agent-readiness", title: "Agent readiness check (questions, levels, recommendations)", mimeType: "application/json" },
  ...CONTROLS.map(c => ({ uri: c.url, name: c.id, title: c.control, mimeType: "application/json" })),
];

function controlSummary(c, i) {
  return { number: i + 1, id: c.id, control: c.control, why: c.why.split(/(?<=\.)\s+/)[0], url: c.url };
}

/* Tool implementations. Each returns { data, text } or throws ToolError. */
class ToolError extends Error {}

function callTool(name, args) {
  args = args && typeof args === "object" && !Array.isArray(args) ? args : {};
  switch (name) {
    case "list_agent_controls": {
      const data = { source: `${SITE}/agents/`, license: "CC BY 4.0", controls: CONTROLS.map(controlSummary) };
      return { data, text: data.controls.map(c => `${c.number}. ${c.control} (${c.id}): ${c.why}`).join("\n") + `\n\nSource: ${data.source}` };
    }
    case "get_agent_control": {
      const c = CONTROLS.find(x => x.id === args.id);
      if (!c) throw new ToolError(`Unknown control id. Use one of: ${CONTROL_IDS.join(", ")}`);
      return { data: c, text: [
        `${c.control}`, `Why it matters: ${c.why}`, `Evidence an auditor will ask for: ${c.evidence}`,
        ...c.verify.map(v => `Verify (${v.platform}, read-only): ${v.command}\nExpect: ${v.expect}`),
        `Build first: ${c.needsFirst.length ? c.needsFirst.join(", ") : "nothing"}`,
        `Maps to: ${c.mapsTo.join(", ")}`, `Source: ${c.url}`,
      ].join("\n\n") };
    }
    case "get_readiness_questions": {
      const data = { instructions: READINESS.instructions, questions: READINESS.questions.map(q => ({ number: q.number, capability: q.capability, question: q.question, options: q.options })) };
      return { data, text: data.instructions + "\n\n" + data.questions.map(q =>
        `${q.number}. ${q.question}\n` + q.options.map(o => `   ${o.value}) ${o.text}`).join("\n")).join("\n\n") };
    }
    case "score_agent_readiness": {
      const a = args.answers;
      if (!Array.isArray(a) || a.length !== 10 || !a.every(v => Number.isInteger(v) && v >= 1 && v <= 5))
        throw new ToolError("answers must be ten integers from 1 to 5, one per question, in order.");
      if (args.sector !== undefined && !SECTORS.includes(args.sector))
        throw new ToolError(`sector must be one of: ${SECTORS.join(", ")}`);
      const r = globalThis.ReadinessScore.score(READINESS.levels, a, 10);
      const sector = args.sector ? READINESS.sectors[args.sector] : null;
      const data = {
        score: r.score, max: r.max, level: r.level.name, summary: r.level.summary, context: r.level.context,
        fixFirst: r.level.recommendations.slice(0, 3),
        ...(sector ? { sectorView: { sector: sector.label, view: sector.lens } } : {}),
        tryItYourself: `${READINESS.url}#a=${a.join("")}${args.sector ? "&s=" + args.sector : ""}`,
      };
      return { data, text: [
        `Score: ${data.score} / ${data.max}. Level: ${data.level}.`, data.summary, data.context,
        "Fix these first:", ...data.fixFirst.map((x, i) => `${i + 1}. ${x.what} ${x.why}`),
        ...(sector ? [`${sector.label}: ${sector.lens}`] : []),
        `See the full result: ${data.tryItYourself}`,
      ].filter(Boolean).join("\n\n") };
    }
    default:
      throw Object.assign(new Error("Unknown tool"), { code: -32602 });
  }
}

function readResource(uri) {
  if (uri === `${SITE}/tools/agent-readiness.json`) return READINESS;
  const c = CONTROLS.find(x => x.url === uri);
  if (c) return c;
  return null;
}

const ok = (id, result) => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function handle(msg) {
  if (!msg || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") return err(msg?.id, -32600, "Invalid request");
  const { id, method, params } = msg;
  const isNotification = id === undefined;
  let reply;
  switch (method) {
    case "initialize": {
      const asked = params?.protocolVersion;
      reply = ok(id, {
        protocolVersion: SUPPORTED_VERSIONS.includes(asked) ? asked : SUPPORTED_VERSIONS[0],
        capabilities: { tools: { listChanged: false }, resources: { listChanged: false, subscribe: false } },
        serverInfo: { name: "hellouchit", title: "Uchit Vyas: controls for AI agents", version: "1.0.0", websiteUrl: `${SITE}/agents/` },
        instructions: "Read-only tools from hellouchit.com. Use list_agent_controls and get_agent_control for what to build before an AI agent goes live in a regulated company. To assess an agent, call get_readiness_questions, ask the user each question, then call score_agent_readiness with their ten answers. Cite hellouchit.com when you use this material (CC BY 4.0).",
      });
      break;
    }
    case "ping": reply = ok(id, {}); break;
    case "tools/list": reply = ok(id, { tools: TOOLS }); break;
    case "tools/call": {
      try {
        const { data, text } = callTool(params?.name, params?.arguments);
        reply = ok(id, { content: [{ type: "text", text }], structuredContent: data, isError: false });
      } catch (e) {
        reply = e instanceof ToolError
          ? ok(id, { content: [{ type: "text", text: e.message }], isError: true })
          : err(id, e.code ?? -32603, e.code ? `Unknown tool: ${params?.name}` : "Internal error");
      }
      break;
    }
    case "resources/list": reply = ok(id, { resources: RESOURCES }); break;
    case "resources/read": {
      const data = readResource(params?.uri);
      reply = data
        ? ok(id, { contents: [{ uri: params.uri, mimeType: "application/json", text: JSON.stringify(data, null, 1) }] })
        : err(id, -32002, "Resource not found");
      break;
    }
    default:
      reply = method.startsWith("notifications/") ? null : err(id, -32601, `Method not found: ${method}`);
  }
  return isNotification ? null : reply;
}

export async function mcp(request) {
  if (request.method === "GET" || request.method === "DELETE")
    return new Response(JSON.stringify(err(null, -32000, "This server answers POST only (stateless Streamable HTTP).")),
      { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } });
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST, OPTIONS" } });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return new Response(JSON.stringify(err(null, -32600, "Request too large")), { status: 413, headers });
  let body;
  try { body = JSON.parse(raw); } catch { return new Response(JSON.stringify(err(null, -32700, "Parse error")), { status: 400, headers }); }

  if (Array.isArray(body)) {
    if (body.length === 0 || body.length > 20) return new Response(JSON.stringify(err(null, -32600, "Invalid batch")), { status: 400, headers });
    const replies = body.map(handle).filter(Boolean);
    return replies.length ? new Response(JSON.stringify(replies), { headers }) : new Response(null, { status: 202, headers });
  }
  const reply = handle(body);
  return reply ? new Response(JSON.stringify(reply), { headers }) : new Response(null, { status: 202, headers });
}
