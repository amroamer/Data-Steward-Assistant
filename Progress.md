# Progress Tracker — ZATCA Data Owner Agent

Track all feature development, fixes, and backlog items. Updated as work progresses.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Completed and deployed |
| 🔄 | In progress |
| 📋 | Backlog — planned but not started |
| 🐛 | Bug fix |
| ❌ | Cancelled / deprioritized |

---

## Completed Features ✅

### Core UI & Layout
- ✅ 3-panel AI Command Center layout (sidebar | center | outputs)
- ✅ Dark navy sidebar (`#0D2E5C`) with ZATCA branding and logo
- ✅ Dot-grid center panel background (`#F4F6F9`)
- ✅ Right outputs panel (300px, collapsible)
- ✅ Sidebar drag-resize handle (min 160px, default 240px, max 420px)
- ✅ Sidebar collapse/expand via in-flow toggle button strip
- ✅ Outputs panel collapse/expand via in-flow toggle button strip
- ✅ Mobile-responsive layout (sidebar and outputs become slide-in drawers)
- ✅ RTL layout flip for Arabic language

### 3-Agent Navigation
- ✅ Agent mode tabs below header: Data Management / Analytical Model / Insights Agent
- ✅ Active tab highlighted (navy bg, white text)
- ✅ Feature cards and quick-action pills filtered by active agent mode
- ✅ Switching agent mode clears active conversation and resets result state
- ✅ Dynamic "New Session" button label per agent mode:
  - Data Management → "New Data Management Agent"
  - Analytical Model → "New Analytical Data Model Agent"
  - Insights Agent → "New Insight Report Agent"

### Session Management
- ✅ Per-agent-mode isolated session lists (DB-backed `agent_mode` column)
- ✅ Existing sessions assigned to `data-management` by default (migration applied)
- ✅ Create new session tagged with current agent mode
- ✅ Delete individual session with animated fade-out
- ✅ Clear all sessions scoped to current agent mode only
- ✅ Rename session: inline pencil-icon edit, Enter/blur saves, Escape cancels
- ✅ Rename/delete buttons always visible at 50% opacity, full opacity on hover, on LEFT side of row

### AI Analysis — Data Management
- ✅ Data Classification (SDAIA NDMO 5-level framework) — markdown table output
- ✅ Business Definitions — markdown table output (Field Name, Business Term, Definition, Data Type, Example)
- ✅ 4-Layer DQ Rules — 2-call split architecture (Layer 1+2 first call, Layer 3+4 second call)
- ✅ DQ rules merged via `mergeDqResults()` and streamed as unified JSON block
- ✅ Field names auto-injected from conversation history when no file uploaded
- ✅ PII Detection (PDPL) — scan for personal/sensitive data with risk levels and legal basis

### AI Analysis — Analytical Model
- ✅ Star schema design: fact tables, dimension tables, grain definition
- ✅ Interactive SVG star schema diagram (`DataModelDiagram` component)
- ✅ DDL SQL script generation
- ✅ Export analytical model to Excel

### AI Analysis — Insights Agent
- ✅ Standalone Insights Report from Excel upload
- ✅ Column-level profiling (statistics, null rates, cardinality, min/max)
- ✅ Executive summary, key insights, anomalies, trends, recommendations
- ✅ Styled Excel export with multiple sheets

### Outputs & Export
- ✅ Cumulative `result.xlsx` with deduplicated sheets across multiple interactions:
  - Classifications sheet
  - Business Definitions sheet
  - DQ Rules sheets (Technical, Logical, Business)
  - PII Scan sheet
  - Analytical Model sheet
- ✅ Live download button in outputs panel (green `#2E7D32`)
- ✅ Sheet tracker with color-coded tags per analysis type
- ✅ Activity timeline in right panel
- ✅ Outputs panel sections individually collapsible (Live Outputs / Sheet Tracker / Activity Timeline)

### UI Components
- ✅ `UserCommandCard` — blue left border, command label, timestamp
- ✅ `AgentResponseCard` — green border when done, status badge, summary, metrics, download buttons, expand/collapse
- ✅ `ThinkingProgressCard` — multi-step progress tracker during AI streaming
- ✅ `DqDonutChart` — Recharts PieChart donut for DQ rule distribution by dimension
- ✅ `DataModelDiagram` — interactive SVG star schema visualization
- ✅ `ExcelPreview` — full-screen modal, first 200 rows, sheet tabs, sticky headers, alternating row colors

### Command Console
- ✅ Dark navy input bar with Courier New monospace font
- ✅ Execute button (`#2E7D32`)
- ✅ File upload via paperclip icon (Excel, PDF, Word, images)
- ✅ Camera capture on touch/mobile devices
- ✅ Text paste mode toggle (textarea for raw field names / CSV data)
- ✅ Language toggle (EN / AR)
- ✅ User Guide download (BookOpen icon)
- ✅ Quick-action pills above console in active conversations, filtered by agent mode

### Streaming & Status
- ✅ Server-sent events (SSE) streaming from Claude API
- ✅ Agent status pill: Idle → Thinking → Executing → Done
- ✅ `agentStatus` state drives UI color and animation changes
- ✅ Custom CSS animations: `slide-up`, `pop-in`, `pulse-status`, `ripple-button`

### Internationalization
- ✅ English (LTR) full translation
- ✅ Arabic (RTL) full translation including all new agent mode labels
- ✅ Dynamic `dir` attribute on root element for RTL flip

### File Processing (Backend)
- ✅ Excel (.xlsx, .xls) — SheetJS column profiling + sample rows
- ✅ PDF (.pdf) — text extraction + table detection
- ✅ Word (.docx, .doc) — Mammoth text extraction
- ✅ Images (.png, .jpg, .jpeg, .gif, .webp) — Claude Vision API
- ✅ Auto-compression of images >4.5MB using Sharp

### Database & API
- ✅ PostgreSQL on Neon (serverless) via Drizzle ORM
- ✅ `conversations` table with `id`, `title`, `agent_mode`, `created_at`
- ✅ `messages` table with `id`, `conversation_id`, `role`, `content`, `created_at`
- ✅ `GET /api/conversations?agentMode=` — filtered by agent mode
- ✅ `POST /api/conversations` — creates with agent mode
- ✅ `PATCH /api/conversations/:id` — rename
- ✅ `DELETE /api/conversations/:id` — delete single
- ✅ `DELETE /api/conversations/all?agentMode=` — clear by mode
- ✅ `GET /api/conversations/:id` — load with messages
- ✅ `POST /api/chat` — SSE streaming chat endpoint

### Bug Fixes
- 🐛 ✅ Fixed `agentMode is not defined` crash in `SidebarContent` (missing prop pass-through)
- 🐛 ✅ Fixed panel collapse buttons being intercepted by overlapping elements (replaced absolute tabs with in-flow flex strip buttons)
- 🐛 ✅ Fixed DQ analysis breaking on large datasets (2-call split architecture)
- 🐛 ✅ Fixed `hasResultXlsx` declared after use in `OutputsPanel`
- 🐛 ✅ Fixed cache invalidation using bare `/api/conversations` key instead of mode-scoped key

---

## Backlog 📋

### Product Features
- 📋 User authentication (login / registration) and multi-tenant session isolation
- 📋 Organization-level workspaces (team accounts)
- 📋 Saved analysis templates (reusable prompts per data domain)
- 📋 Bulk upload — process multiple files in one session
- 📋 Scheduled analysis — run DQ scans on a recurring schedule via API/webhook
- 📋 Data dictionary builder — accumulate definitions across multiple sessions into a persistent catalog
- 📋 Custom classification taxonomy (allow organizations to define their own sensitivity levels on top of NDMO)
- 📋 Approval workflow — data steward reviews and approves AI-generated definitions before publishing
- 📋 Version history for data classifications and definitions

### Insights Agent Enhancements
- 📋 Chart visualizations inside the app (bar, line, scatter) for insights reports
- 📋 Comparison reports — compare two datasets or two time periods
- 📋 Anomaly alerts — flag statistical outliers in real time

### Analytical Model Enhancements
- 📋 Export diagram as PNG/SVG image
- 📋 Support for snowflake schema in addition to star schema
- 📋 Auto-detect existing table relationships from uploaded schema files

### Export & Integration
- 📋 PDF export of all reports (in addition to Excel)
- 📋 SharePoint / OneDrive integration for direct export
- 📋 REST API for programmatic access (for system integrators and enterprise clients)
- 📋 Webhook support for triggering analyses from external systems

### Monetization Infrastructure
- 📋 Subscription billing system (Stripe integration)
- 📋 Usage tracking per organization (analyses run, exports generated)
- 📋 Freemium tier with monthly analysis limits and upgrade prompts
- 📋 Admin dashboard for subscription management
- 📋 White-label configuration panel (custom logo, colors, domain)

### Performance & Reliability
- 📋 Redis caching for repeated file analysis on same dataset
- 📋 Background job queue for large file processing (avoid SSE timeouts)
- 📋 Rate limiting per user/organization
- 📋 Error reporting and monitoring (Sentry or equivalent)

### Compliance & Security
- 📋 Data residency controls (ensure data stays within Saudi cloud regions)
- 📋 Audit log of all analyses performed (who ran what, when)
- 📋 Automatic PII redaction before sending data to Claude API (for highly sensitive datasets)
- 📋 PDPL compliance documentation for the platform itself

### Mobile & Accessibility
- 📋 Native mobile app (React Native) for field data capture
- 📋 Accessibility audit (WCAG 2.1 AA compliance)
- 📋 Keyboard navigation improvements for power users

---

## Recently Completed (Last Session)

| Date | Change |
|---|---|
| 2026-03-06 | Per-agent-mode isolated session lists (DB migration + full-stack wiring) |
| 2026-03-06 | Dynamic "New Session" button label per agent mode (EN + AR) |
| 2026-03-06 | Fixed `agentMode is not defined` crash in `SidebarContent` |
| 2026-03-06 | Created `README.md` and `Progress.md` documentation files |
| 2026-03-06 | **Informatica Output** — backend system prompt, trigger detection, frontend detection/state/streaming, Informatica mini-table in ThreadCard, `informatica_output` Excel sheet, EN+AR translations, orange tag, Informatica feature card |
