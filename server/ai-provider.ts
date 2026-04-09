import Anthropic from "@anthropic-ai/sdk";

export interface CompletionParams {
  system: string;
  messages: Anthropic.MessageParam[];
  max_tokens: number;
  temperature: number;
  /** Per-request override. "local" routes to RAGFlow. */
  provider?: "claude" | "local";
  /**
   * Per-request RAGFlow agent override (short name).
   * Maps to RAGFlow agent display names internally.
   * Available: ndmo-classification | pii-detection | business-definitions |
   *            report-tester | dq-rules-generator
   */
  ragflowAgent?: string;
}

type ProviderName = "claude" | "ragflow";
const PROVIDER: ProviderName = (process.env.AI_PROVIDER as ProviderName) || "claude";

function resolveProvider(override?: "claude" | "local"): ProviderName {
  if (override === "local") return "ragflow";
  if (override === "claude") return "claude";
  return PROVIDER;
}

// ── Debug logging ───────────────────────────────────────────────────────────────

function aiLog(level: "INFO" | "ERROR" | "DEBUG", message: string): void {
  if (level === "ERROR") {
    console.error(`[AI-CLIENT] ${new Date().toISOString()} | ERROR | ${message}`);
  }
}

// ── Claude ─────────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.ANTHROPIC_BASE_URL || process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || "claude-sonnet-4-6";

async function claudeComplete(params: CompletionParams): Promise<string> {
  try {
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      system: params.system,
      messages: params.messages,
    });
    return response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
  } catch (err: any) {
    aiLog("ERROR", `claude exception | ${err.message}`);
    if (err.stack) aiLog("ERROR", err.stack);
    throw err;
  }
}

async function* claudeStream(params: CompletionParams): AsyncGenerator<string> {
  try {
    const stream = anthropic.messages.stream({
      model: CLAUDE_MODEL,
      max_tokens: params.max_tokens,
      temperature: params.temperature,
      system: params.system,
      messages: params.messages,
    });
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        if (event.delta.text) { yield event.delta.text; }
      }
    }
  } catch (err: any) {
    aiLog("ERROR", `claude stream exception | ${err.message}`);
    if (err.stack) aiLog("ERROR", err.stack);
    throw err;
  }
}

// ── RAGFlow (Native API v1) ───────────────────────────────────────────────────

const RAGFLOW_BASE_URL = (process.env.RAGFLOW_BASE_URL || "http://localhost:80").replace(/\/$/, "");
const RAGFLOW_API_KEY = process.env.RAGFLOW_API_KEY || "";
const RAGFLOW_AGENT = process.env.RAGFLOW_AGENT || "DNA-Agent-SuperVisor";

// Short name (used in routes.ts) -> RAGFlow agent display name
const AGENT_NAME_MAP: Record<string, string> = {
  "dq-rules-generator":  "DQ-Rules-Generator",
  "ndmo-classification":  "NDMO-Data-Classification",
  "pii-detection":        "PII-Detection",
  "business-definitions": "Business-Definitions",
  "report-tester":        "Report-Tester",
};

function ragflowHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${RAGFLOW_API_KEY}`,
  };
}

// ── Agent ID resolution (cached) ──────────────────────────────────────────────

let agentIdCache: Map<string, string> | null = null;

async function fetchAgentIds(): Promise<Map<string, string>> {
  if (agentIdCache) return agentIdCache;

  const url = `${RAGFLOW_BASE_URL}/api/v1/agents`;
  const resp = await fetch(url, { method: "GET", headers: ragflowHeaders() });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to fetch RAGFlow agents: ${resp.status} ${body}`);
  }
  const data = await resp.json();
  const agents: Array<{ id: string; title: string; name?: string }> = data.data || [];

  agentIdCache = new Map();
  for (const a of agents) {
    const displayName = a.title || a.name || "";
    agentIdCache.set(displayName, a.id);
    // Also store lowercase for case-insensitive fallback
    agentIdCache.set(displayName.toLowerCase(), a.id);
  }
  return agentIdCache;
}

async function resolveAgentId(shortName?: string): Promise<string> {
  const cache = await fetchAgentIds();
  const displayName = shortName
    ? (AGENT_NAME_MAP[shortName] || shortName)
    : RAGFLOW_AGENT;

  const id = cache.get(displayName) || cache.get(displayName.toLowerCase());
  if (!id) {
    throw new Error(`RAGFlow agent not found: "${displayName}" (from "${shortName || "default"}")`);
  }
  return id;
}

// ── Session management ────────────────────────────────────────────────────────

const sessionCache = new Map<string, string>();

async function getOrCreateSession(agentId: string): Promise<string> {
  if (sessionCache.has(agentId)) return sessionCache.get(agentId)!;

  const url = `${RAGFLOW_BASE_URL}/api/v1/agents/${agentId}/sessions`;
  const resp = await fetch(url, {
    method: "POST",
    headers: ragflowHeaders(),
    body: JSON.stringify({}),
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Failed to create RAGFlow session: ${resp.status} ${body}`);
  }
  const data = await resp.json();
  const sessionId: string = data.data?.id;
  if (!sessionId) throw new Error("No session ID returned from RAGFlow");

  sessionCache.set(agentId, sessionId);
  return sessionId;
}

// ── Build input ───────────────────────────────────────────────────────────────

function buildInput(params: CompletionParams): string {
  const parts: string[] = [];

  if (params.system) {
    parts.push(`<instructions>\n${params.system}\n</instructions>`);
  }

  for (const m of params.messages) {
    const content =
      typeof m.content === "string"
        ? m.content
        : (m.content as Anthropic.ContentBlockParam[])
            .filter((b): b is Anthropic.TextBlockParam => b.type === "text")
            .map((b) => b.text)
            .join("");
    if (content) parts.push(`<${m.role}>\n${content}\n</${m.role}>`);
  }

  return parts.join("\n\n");
}

// ── RAGFlow completions ───────────────────────────────────────────────────────

async function ragflowComplete(params: CompletionParams, _retried = false): Promise<string> {
  const agentId = await resolveAgentId(params.ragflowAgent);
  const sessionId = await getOrCreateSession(agentId);
  const question = buildInput(params);

  const url = `${RAGFLOW_BASE_URL}/api/v1/agents/${agentId}/completions`;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: ragflowHeaders(),
      body: JSON.stringify({
        session_id: sessionId,
        question,
        stream: false,
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      // Session may be stale — clear and retry once
      if (!_retried && (resp.status === 400 || resp.status === 404)) {
        sessionCache.delete(agentId);
        aiLog("ERROR", `ragflow session may be stale (${resp.status}), retrying`);
        return ragflowComplete(params, true);
      }
      aiLog("ERROR", `ragflow error ${resp.status} | body=${body}`);
      throw new Error(`RAGFlow error ${resp.status}: ${body}`);
    }
    const data = await resp.json();
    return data.data?.answer ?? data.answer ?? "";
  } catch (err: any) {
    aiLog("ERROR", `ragflow exception | ${err.message}`);
    throw err;
  }
}

async function* ragflowStream(params: CompletionParams): AsyncGenerator<string> {
  // Use non-streaming call + fake chunking for reliability.
  // Can upgrade to stream: true + SSE parsing once verified.
  const answer = await ragflowComplete(params);
  const CHUNK = 16;
  for (let i = 0; i < answer.length; i += CHUNK) {
    yield answer.slice(i, i + CHUNK);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export async function aiComplete(params: CompletionParams): Promise<string> {
  if (resolveProvider(params.provider) === "ragflow") {
    const result = await ragflowComplete(params);
    if (result && result.trim().length > 0) return result;
    aiLog("ERROR", "ragflow returned empty — falling back to Claude");
    return claudeComplete(params);
  }
  return claudeComplete(params);
}

export async function* aiStream(params: CompletionParams): AsyncGenerator<string> {
  if (resolveProvider(params.provider) === "ragflow") {
    const answer = await ragflowComplete(params);
    if (answer && answer.trim().length > 0) {
      const CHUNK = 16;
      for (let i = 0; i < answer.length; i += CHUNK) {
        yield answer.slice(i, i + CHUNK);
      }
    } else {
      aiLog("ERROR", "ragflow returned empty — falling back to Claude stream");
      yield* claudeStream(params);
    }
  } else {
    yield* claudeStream(params);
  }
}
