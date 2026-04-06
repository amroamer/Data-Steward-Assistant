import Anthropic from "@anthropic-ai/sdk";

export interface CompletionParams {
  system: string;
  messages: Anthropic.MessageParam[];
  max_tokens: number;
  temperature: number;
  /** Per-request override. "local" routes to the RAGFlow gateway. */
  provider?: "claude" | "local";
  /**
   * Per-request RAGFlow agent override.
   * When provider="local", this takes precedence over the RAGFLOW_AGENT env var.
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

// ── RAGFlow ────────────────────────────────────────────────────────────────────
// Calls POST /agent/run on the local RAGFlow gateway.
// The gateway is synchronous JSON — no streaming. The full answer is emitted
// as a single chunk when used from aiStream().
//
// Set RAGFLOW_AGENT to one of the gateway's agent names:
//   ndmo-classification | pii-detection | business-definitions |
//   report-tester | dq-rules-generator

const RAGFLOW_BASE_URL = (process.env.RAGFLOW_BASE_URL || "http://localhost:8000").replace(/\/$/, "");
const RAGFLOW_API_KEY = process.env.RAGFLOW_API_KEY || "";
const RAGFLOW_AGENT = process.env.RAGFLOW_AGENT || process.env.RAGFLOW_MODEL || "dq-rules-generator";

function ragflowHeaders(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (RAGFLOW_API_KEY) h["X-API-Key"] = RAGFLOW_API_KEY;
  return h;
}

/**
 * Build the full input string for the RAGFlow agent.
 * Mirrors exactly what Claude receives: system prompt + full conversation history.
 * Image content blocks are stripped to text-only.
 */
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

interface AgentRunResponse {
  request_id: string;
  agent: string;
  agent_title: string;
  session_id: string;
  answer: string;
  output_format: string;
}

async function ragflowComplete(params: CompletionParams): Promise<string> {
  const url = `${RAGFLOW_BASE_URL}/agent/run`;
  const agent = params.ragflowAgent || RAGFLOW_AGENT;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: ragflowHeaders(),
      body: JSON.stringify({
        agent,
        input: buildInput(params),
      }),
    });
    if (!resp.ok) {
      const body = await resp.text();
      aiLog("ERROR", `ragflow error ${resp.status} | body=${body}`);
      throw new Error(`RAGFlow error ${resp.status}: ${body}`);
    }
    const data = (await resp.json()) as AgentRunResponse;
    return data.answer ?? "";
  } catch (err: any) {
    aiLog("ERROR", `ragflow exception | ${err.message}`);
    if (err.stack) aiLog("ERROR", err.stack);
    throw err;
  }
}

async function* ragflowStream(params: CompletionParams): AsyncGenerator<string> {
  // /agent/run is synchronous. Emit the answer in small chunks so the client's
  // SSE reader and UI rendering behave identically to Claude streaming.
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
