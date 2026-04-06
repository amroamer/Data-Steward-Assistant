# ZATCA Data & Analytics Agent — Claude Code Guide

## Project Overview

An AI-powered data governance assistant for ZATCA (Saudi Arabia's Zakat, Tax and Customs Authority). Provides structured, exportable outputs (Excel) for data governance tasks via a conversational interface:

- **Data Classification** — SDAIA NDMO compliance (Top Secret / Secret / Confidential / Public)
- **Business Definitions** — bilingual (EN + AR) data dictionaries
- **Data Quality Rules** — 4-layer analysis (Technical, Logical, Business, Warnings)
- **Analytical Data Modelling** — star schema / dimensional model with DDL
- **PII Detection** — Saudi PDPL compliance scanning
- **Data Insights** — three-tier analysis (Descriptive, Diagnostic, Analytical) with Excel export
- **Nudge Agent** — behavioral economics tool for ZATCA tax compliance strategy

Supports English (LTR) and Arabic (RTL) natively.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI | shadcn/ui (Radix UI + Tailwind CSS 3.4) |
| Routing | Wouter 3.3 |
| Server state | TanStack React Query v5 |
| Backend | Express.js 5, TypeScript |
| Database | PostgreSQL 16 + Drizzle ORM 0.39 |
| AI (primary) | Anthropic Claude Sonnet 4.6 |
| AI (fallback) | RAGFlow gateway (`POST /agent/run`) |
| File processing | SheetJS, pdf-parse, Mammoth, Sharp |
| Containerisation | Docker + Docker Compose |

---

## Key Commands

```bash
npm run dev          # Development server (Express + Vite HMR) on port 5000
npm run build        # Compile backend TS → CommonJS in dist/, bundle frontend
npm start            # Run production server (requires npm run build first)
npm run check        # TypeScript type-check only
npm run db:push      # Apply Drizzle schema to PostgreSQL (dev/CI)

docker-compose up    # Full stack: migrate → app → db (recommended for prod)
docker-compose up --build   # Rebuild images before starting
```

---

## Project Structure

```
client/src/
  App.tsx                      # Wouter router + React Query provider
  pages/
    chat.tsx                   # Main page — 4000+ lines, three-panel layout
    use-cases.tsx              # 18 use-case cards
    user-guide.tsx             # In-app documentation
    sharing-eligibility.tsx    # Role-based access control
    system-prompts.tsx         # View/edit system prompts via UI
  components/
    DataModelDiagram.tsx       # Star schema SVG renderer
    ExcelPreview.tsx           # Sheet preview + download
    markdown-table.tsx         # Markdown table parser/renderer
    ui/                        # shadcn/ui primitives

server/
  index.ts                     # Express server, middleware, error handler
  routes.ts                    # Delegates to replit_integrations/chat
  db.ts                        # PostgreSQL pool + Drizzle instance
  ai-provider.ts               # Claude / RAGFlow abstraction (aiComplete, aiStream)
  replit_integrations/chat/
    routes.ts                  # All API endpoints; initPrompts called at top
    prompts.ts                 # DB-backed prompt cache (in-memory Map + DB)
    storage.ts                 # Conversation + message persistence

shared/models/chat.ts          # Drizzle table definitions (single source of truth)

Dockerfile                     # Multi-stage: builder (full deps) → runner (prod deps)
docker-compose.yml             # Services: migrate, app, db
.env.example                   # All required environment variables
drizzle.config.ts              # Points drizzle-kit at shared/models/chat.ts
```

---

## Architecture

### Server startup
`server/index.ts` is the entry point. It awaits `registerRoutes()`, which awaits `registerChatRoutes()`. Inside `registerChatRoutes`, `await initPrompts([...])` seeds the `system_prompts` table and fills the in-memory cache **before any routes are registered**. The server only starts listening after all of this completes.

### Database connection
```typescript
// server/db.ts
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool });
```
Tables are defined in `shared/models/chat.ts` as Drizzle schema. `npm run db:push` / Docker `migrate` service applies them.

### AI provider abstraction
`server/ai-provider.ts` exports two functions:
- `aiComplete(params)` → `Promise<string>` — synchronous full response
- `aiStream(params)` → `AsyncGenerator<string>` — SSE streaming

The global provider is set by `AI_PROVIDER` env var. Per-request override: include `provider: "claude" | "local"` in `CompletionParams`. Local routes to RAGFlow; `"claude"` always uses Anthropic.

### System prompt pipeline
1. `ZATCA_SYSTEM_PROMPT` in `routes.ts` — global role, tone, scope, Saudi context (always injected)
2. Feature-specific prompt — passed to `buildSystemPrompt(featurePrompt)` which appends to base
3. The combined string becomes the `system` param in every `aiComplete` / `aiStream` call
4. Prompts are DB-backed; edit them at `/system-prompts` or via `PUT /api/system-prompts/:key`

### SSE streaming
The main chat endpoint streams via SSE:
```
res.setHeader("Content-Type", "text/event-stream")
for await (const chunk of aiStream(params)) {
  res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
}
res.write("data: [DONE]\n\n")
```
Client reads with `ReadableStream` / `EventSource`.

---

## Environment Variables

```bash
# Database
DATABASE_URL=postgres://zatca:zatca@localhost:5432/zatca
# Docker: postgres://zatca:zatca@db:5432/zatca

# Server
PORT=5000
NODE_ENV=production   # or development

# AI provider — "claude" (default) or "ragflow"
AI_PROVIDER=claude

# Claude (when AI_PROVIDER=claude)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-sonnet-4-6        # optional, this is the default
ANTHROPIC_BASE_URL=                   # optional, blank = Anthropic default

# RAGFlow (when AI_PROVIDER=ragflow)
RAGFLOW_BASE_URL=http://localhost:8000
RAGFLOW_API_KEY=                      # sent as X-API-Key header
RAGFLOW_AGENT=dq-rules-generator      # ndmo-classification | pii-detection |
                                      # business-definitions | report-tester |
                                      # dq-rules-generator
```

---

## Database

### Tables (`shared/models/chat.ts`)

| Table | Purpose |
|---|---|
| `conversations` | Sessions, scoped by `agentMode` |
| `messages` | Chat history; FK to conversations (cascade delete) |
| `system_prompts` | System prompt templates; editable at runtime |

### Drizzle conventions
- TypeScript: `camelCase` field names → SQL: `snake_case` (Drizzle auto-converts)
- Use `createInsertSchema` from `drizzle-zod` for input validation
- All schema changes go in `shared/models/chat.ts` only; `db:push` propagates them

---

## Conventions

### AI output format — critical
Structured features (classification, DQ rules, business definitions, data models, PII detection, insights) must return **raw valid JSON only**:
- No markdown code fences
- No backticks
- No explanatory prose before or after
- Client parses directly with `JSON.parse()` — a single extra character breaks it
- System prompt explicitly forbids everything else; never weaken this rule

Conversational follow-ups return plain prose (3–5 sentences, no bullet points unless asked).

### Adding a new AI-powered feature
1. Define JSON output schema in the feature's system prompt
2. Add a prompt entry in `initPrompts([...])` inside `registerChatRoutes`
3. Use `getPrompt("your_key")` to retrieve it; pass to `buildSystemPrompt()`
4. Call `aiStream()` or `aiComplete()` — never instantiate Anthropic client directly

### File upload pipeline
Multer → parse (SheetJS / pdf-parse / Mammoth / Sharp) → extract text/columns/sample rows → inject as context into the Claude system or user message.
- Max file size: 10 MB (Multer limit)
- Images compressed to <4.5 MB via Sharp before sending to Claude Vision

### Error handling
- Express error middleware at bottom of `server/index.ts` catches all thrown errors → `{ message }` JSON
- Client shows errors in yellow warning card (out-of-scope AI responses) or red toast (network errors)
- Never throw inside SSE stream after headers are sent; write an error event instead

### Naming
- API routes: `/api/kebab-case`
- DB tables: `snake_case`
- TypeScript/React: `camelCase` variables, `PascalCase` components
- Prompt keys: `snake_case` strings (e.g. `"zatca_base"`, `"dq_dimensions"`)

---

## Branding / Inline Style Constants

These values appear as inline styles throughout `chat.tsx` (not Tailwind classes):

| Token | Value | Usage |
|---|---|---|
| Sidebar navy | `#0D2E5C` | Left sidebar background |
| ZATCA blue | `#2563EB` | Primary action buttons |
| Link blue | `#1A4B8C` | Secondary buttons |
| Download green | `#2E7D32` | Export button |
| Border gray | `#E5E7EB` | Panel borders |
| Text dark | `#1A1A2E` | Primary text |

---

## Docker Notes

- `.env.example` is loaded directly via `env_file` in docker-compose — no separate `.env` needed
- `environment:` block in docker-compose only overrides Docker-specific values (`DATABASE_URL`, `RAGFLOW_BASE_URL`, `PORT`, `NODE_ENV`)
- `extra_hosts: host.docker.internal:host-gateway` allows the container to reach a RAGFlow instance running on the host machine
- The `migrate` service uses the `builder` Docker stage (has devDeps including `drizzle-kit`) so `db:push` works
