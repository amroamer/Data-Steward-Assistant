# Progress Tracker — ZATCA Data & Analytics Agent

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

### 4-Agent Navigation
- ✅ Agent mode tabs below header: Data Management / Analytical Model / Insights Agent / **Nudge Agent**
- ✅ Active tab highlighted (navy bg, white text); Nudge Agent tab uses purple accent (#7C3AED)
- ✅ Feature cards and quick-action pills filtered by active agent mode
- ✅ Switching agent mode clears active conversation and resets result state
- ✅ Dynamic "New Session" button label per agent mode:
  - Data Management → "New Data Management Agent"
  - Analytical Model → "New Analytical Data Model Agent"
  - Insights Agent → "New Insight Report Agent"
  - Nudge Agent → "New Nudge Agent"

### Nudge Agent Integration (4th Mode)
- ✅ `agentMode` type extended to include `"nudge"` in `chat.tsx`
- ✅ Nudge Agent tab changed from `<Link href="/nudge">` to mode-switching `<button>` 
- ✅ Empty-state hero for Nudge mode: 4 scenario feature cards + example prompts (EN + AR)
- ✅ `sendMessage` nudge branch: POST to `/api/nudge`, animated loading steps, optimistic thread insertion
- ✅ `nudgeReports` state (`Record<number, NudgeReport>`) persists parsed results keyed by assistant message ID
- ✅ `NudgeResultCard` component inline in `chat.tsx`: Summary Banner, Diagnosis, Segments table, Levers, Intervention Plan
- ✅ Excel export per thread: "Download Nudge Report" → `nudge_report_[timestamp].xlsx` (5 sheets)
- ✅ Session persistence: nudge conversations saved to DB with `agentMode: "nudge"`, listed in sidebar
- ✅ `/nudge` route redirects to `/` via wouter `<Redirect>`; standalone nudge page removed from routing

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

### Global System Prompt & Scope Control
- ✅ `ZATCA_SYSTEM_PROMPT` constant defined in `server/replit_integrations/chat/routes.ts`
- ✅ `buildSystemPrompt(featurePrompt)` helper prepends global prompt to every feature system prompt
- ✅ All 5 Claude API call sites updated: DQ Part 1, DQ Part 2, streaming chat, Nudge follow-up, Nudge main analysis
- ✅ Out-of-scope detection: `isOutOfScope()` helper in `chat.tsx` checks for Claude's refusal phrase
- ✅ Yellow ⚠️ warning card rendered in ThreadCard when out-of-scope response detected (EN + AR translations)
- ✅ Existing feature-specific prompts (DQ, Insights, Informatica, Nudge) preserved — global prompt prepended, not replacing them
- ✅ User Guide updated with "Scope & Guardrails" section (EN + AR)

### Command Console
- ✅ Upload strip ("Upload a file to get started") moved from empty-state hero into the command console — always visible when no file is selected, hidden when file is attached or paste mode is active
- ✅ Dark navy input bar with Courier New monospace font
- ✅ Execute button (`#2E7D32`)
- ✅ File upload via paperclip icon (Excel, PDF, Word, images)
- ✅ Camera capture on touch/mobile devices
- ✅ Text paste mode toggle (textarea for raw field names / CSV data)
- ✅ Language toggle (EN / AR)
- ✅ Use Cases link in header bar (next to language toggle)
- ✅ User Guide link in header bar (next to Use Cases, replaces broken download button)
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

### AI Analysis — Nudge Agent
- ✅ Standalone `/nudge` page — behavioural economics + tax compliance tool
- ✅ First-load view: 3 info cards (Diagnose / Segment / Map Levers) + non-clickable example scenarios
- ✅ Animated 6-step loading checklist (Reading → Diagnosing → Segmenting → Mapping → Building → Generating)
- ✅ Summary banner: 5 stat tiles on ZATCA navy background
- ✅ Section A — Diagnosis Card: primary root cause (highlighted), intentional badge, secondary causes, emotional drivers, friction points, rationale
- ✅ Section B — Taxpayer Segments: styled table with color-coded Risk Level and Receptiveness
- ✅ Section C — Behavioral Levers: sub-cards per lever, yellow message box, priority badges
- ✅ Section D — Intervention Plan: numbered sequence, quick wins (green checks), KPIs, large Est. Lift
- ✅ Error handling: invalid JSON → "Something went wrong. Please try rephrasing your scenario."
- ✅ Excel export to `nudge_report_[timestamp].xlsx` (5 sheets: executive_summary, diagnosis, population_segments, behavioral_levers, intervention_plan); ZATCA blue headers, color-coded cells
- ✅ Follow-up Q&A: prose answers below results using previously generated JSON as context
- ✅ NEVER reads/writes `result.xlsx` — fully isolated
- ✅ EN + AR translations with RTL layout
- ✅ Sidebar link "Nudge Agent" / "وكيل التحفيز" in chat.tsx
- ✅ Backend `POST /api/nudge` route: main analysis + follow-up support
- ✅ 4 Nudge use case cards on `/use-cases` page with "Nudge Agent" filter tab; "Launch Nudge Agent" CTA navigates to `/nudge?scenario=<encoded>`

---

## Recently Completed (Last Session)

| Date | Change |
|---|---|
| 2026-03-06 | **Upload Strip Relocation** — moved drag-and-drop upload area from empty-state hero into command console bar; compact strip always visible above textarea when no file selected; User Guide updated |
| 2026-03-06 | **Global System Prompt** — `ZATCA_SYSTEM_PROMPT` + `buildSystemPrompt()` injected into all 5 Claude call sites; out-of-scope yellow warning card on frontend (EN+AR); User Guide "Scope & Guardrails" section added |
| 2026-03-06 | **User Guide Page** — new `/user-guide` page; 8 collapsible sections covering all agent features; EN+AR/RTL; header link next to Use Cases; replaced broken BookOpen download button |
| 2026-03-06 | **Header Navigation** — Use Cases and User Guide links moved to header bar (next to language toggle); Use Cases link removed from sidebar; BookOpen download anchor removed |
| 2026-03-06 | **Nudge Agent tab** — moved Nudge Agent link from sidebar to agent mode tabs bar (next to Insights Agent), with Target icon and purple color |
| 2026-03-06 | **Nudge Agent** — new `/nudge` page; `POST /api/nudge` backend; 4-section structured results; `nudge_report_[timestamp].xlsx` export; follow-up Q&A; error handling; EN+AR/RTL; sidebar link; 4 use case cards added to `/use-cases` |
| 2026-03-06 | **App Renaming** — changed app name from "Data Owner Agent" to "Data & Analytics Agent" across UI, metadata, and docs |
| 2026-03-06 | **Favicon** — replaced with official ZATCA logo (`ZATCA-o.png`, 310×310 PNG) downloaded directly from zatca.gov.sa; no HTML changes needed |
| 2026-03-06 | **Use Cases Page** — extended to 18 cards; added "Nudge Agent" filter tab; "Launch Nudge Agent" CTA for nudge cards navigates to `/nudge?scenario=<encoded>`; original 14 cards unchanged |
| 2026-03-06 | **Informatica Output** — backend system prompt, trigger detection, frontend detection/state/streaming, Informatica mini-table in ThreadCard, `informatica_output` Excel sheet, EN+AR translations, orange tag, Informatica feature card |
| 2026-03-06 | **Insights Agent expanded** — 3-level analysis (Descriptive / Diagnostic / Analytical) from a single Claude call; inline `InsightsReportCard` with collapsible sections and executive summary banner (navy, gold border); 6-sheet Excel export (executive_summary, descriptive_field_profiles, completeness_scorecard, diagnostic_correlations, diagnostic_findings, analytical_insights); invalid JSON shows red error card; never writes to result.xlsx; `insights-store.ts` fully rewritten with new types + detection + Excel builder |
