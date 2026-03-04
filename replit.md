# Data Owner Agent

## Overview

This is an AI-powered data governance assistant called the **Data Owner Agent**. It helps data owners, data stewards, and data governance professionals with:

- **Data Classification** — Classify data fields per Saudi SDAIA NDMO standards (Top Secret, Secret, Confidential, Restricted, Public)
- **Business Definitions** — Generate clear definitions for data fields/elements
- **Data Quality Rules** — Suggest quality rules across dimensions (completeness, accuracy, consistency, etc.)
- **Analytical Data Model** — Design star schema / dimensional models with interactive SVG diagram, PNG export, and DDL generation

Users interact through a chat interface. They can type prompts or upload Excel files containing data fields, and the AI returns structured, formatted analysis.

### Chat Display Rules
- The chat panel is for conversation summaries only, not data output
- When the AI completes any analysis, the chat bubble shows a short 2-3 line summary (e.g. "✅ Business definitions generated for 28 fields. Results saved to result.xlsx — Sheet: business_definitions")
- All actual results (tables, field lists, definitions, classifications, rules) go exclusively into result.xlsx as properly formatted sheets
- Chat bubbles never render markdown tables, long lists, or raw data output for analysis results
- Non-analysis conversational responses render normally with markdown
- A KPMG green (#00A3A1) "Download result.xlsx" button appears below each summary message
- summaryOverrides state tracks which message IDs should show summaries vs full content
- When switching conversations, existing messages are re-scanned to populate summaryOverrides
- User messages strip Excel file content via `stripExcelContent()` — only the user's prompt text and a file attachment indicator are shown; raw parsed Excel data is never displayed in the UI
- Multi-analysis requests are supported: system prompt instructs Claude to output all requested tables in one response; frontend parser extracts all tables independently

### Collapsible Thread Blocks
- Messages are grouped into user+assistant pairs ("threads") via `groupMessagesIntoThreads()`
- Each thread has a styled header bar with: KPMG dark blue (#00338D) left border, light grey background, chevron icon, 60-char message preview, timestamp, and analysis type badge
- Threads are expanded by default; clicking the header toggles collapse (conditional rendering)
- `collapsedThreads` state (Set of indices) tracks collapsed threads
- Global "Collapse All" / "Expand All" buttons appear in the header when there are 2+ threads
- Analysis type detected from keywords: "business definition" → Business Definitions, "classification" → Data Classification, "quality" → Data Quality Rules, "data model"/"star schema" → Data Model
- Streaming thread is always expanded and shows a loading indicator

### Sidebar Session Management
- Sidebar and chat pane are resizable using `react-resizable-panels` (PanelGroup with horizontal direction, autoSaveId="chat-layout")
- Sidebar can be collapsed/expanded via PanelLeftClose/PanelLeftOpen toggle buttons; when collapsed, the sidebar Panel and resize handle are conditionally unmounted
- Each conversation shows a trash icon on hover; clicking shows inline "Delete this session?" confirmation with "Yes, Delete" / "Cancel"
- `deletingConvId` state tracks which conversation is showing confirmation; `fadingOutConvId` triggers 150ms fade-out animation before deletion
- "Clear All Sessions" button at sidebar bottom (muted red) with inline confirmation ("This will delete all sessions. Are you sure?")
- `DELETE /api/conversations/all` endpoint deletes all messages then all conversations
- If the active conversation is deleted, auto-navigates to new empty session
- Both delete mutations use `onSettled` to always reset UI state on success or failure

### Cumulative result.xlsx Feature
- Maintains an in-memory cumulative data structure (`ResultRow[]`) keyed by `field_name` across multiple AI analyses
- After each AI response, `detectAndExtractAllAnalyses()` scans all markdown tables for analysis-specific headers and extracts field data
- Supports multiple analysis types in a single response (each table detected independently)
- Data Quality rules support multi-row per field (multiple DQ dimensions/rules per field preserved)
- Generates separate sheets per analysis type: business_definitions, data_classification, data_quality_rules
- Non-DQ sheets (business_definitions, data_classification) are deduplicated by field_name in `generateResultExcel()` to prevent duplicate rows caused by DQ multi-row merging
- Result banner appears above the input area when results exist, with KPMG green download button
- Header bar also shows a compact download button when results exist
- Analytical Data Model: when Claude returns a JSON block with fact_tables/dimension_tables/relationships, it's detected by `detectDataModelJSON()`, stored in `dataModel` state, and rendered as an interactive SVG diagram via `DataModelDiagram` component. Adds 3 sheets to result.xlsx: data_model_fields, data_model_relationships, data_model_ddl
- `dataModelMessageIds` (Set) tracks which assistant messages contain data models so the diagram renders on re-visit
- File-reset confirmation dialog (AlertDialog) appears when uploading a new file while results already exist
- Session state (results, field names, file name, summaryOverrides) resets on: new chat, conversation switch, conversation delete, or confirmed file reset
- Server sends `fieldNames` SSE event when an Excel file is uploaded, allowing the frontend to track session fields
- System prompt instructs Claude to always include structured summary tables with exact column headers per analysis type

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (React + Vite)
- **Framework**: React 18 with TypeScript, bundled by Vite
- **Routing**: Wouter — single route at `/` renders the `ChatPage`
- **State & Data Fetching**: TanStack React Query for server state; React `useState`/`useRef` for local UI state
- **UI Components**: shadcn/ui built on Radix UI primitives, styled with Tailwind CSS
- **Markdown Rendering**: `react-markdown` for non-analysis responses only
- **Table Utilities**: `client/src/lib/table-utils.ts` — parses markdown tables for data extraction
- **Excel Export**: `xlsx` (SheetJS) library for client-side `.xlsx` file generation
- **Font**: Open Sans (primary), Fira Code (mono)

### Backend (Express + Node.js)
- **Framework**: Express.js with TypeScript, run via `tsx` in development
- **Entry**: `server/index.ts` creates an HTTP server and registers routes
- **Routes**: `server/routes.ts` delegates to `server/replit_integrations/chat/routes.ts`
- **File Uploads**: `multer` handles Excel file uploads (in-memory, max 10MB), parsed with `xlsx`

### Chat System (`server/replit_integrations/chat/`)
- **`routes.ts`**: REST endpoints for conversations and messages. Parses uploaded Excel files. Uses Anthropic streaming API (SSE).
- **`storage.ts`**: Database abstraction (`IChatStorage`) using Drizzle ORM
- **`index.ts`**: Re-exports routes and storage

### Data Layer
- **Database**: PostgreSQL via Neon (serverless)
- **ORM**: Drizzle ORM — tables: `conversations`, `messages`
- **Schema**: `shared/models/chat.ts`, re-exported from `shared/schema.ts`
- **Validation**: `drizzle-zod` for Zod schema generation

### Key Files
| File | Purpose |
|---|---|
| `client/src/pages/chat.tsx` | Main chat page with sidebar, messages, input area, summary display |
| `client/src/lib/result-store.ts` | Cumulative result.xlsx logic: detection, extraction, merge, Excel generation, summary generation |
| `client/src/components/DataModelDiagram.tsx` | Interactive SVG star schema diagram with draggable tables, PNG export, DDL download |
| `client/src/lib/table-utils.ts` | Markdown table parsing utilities |
| `server/replit_integrations/chat/routes.ts` | Chat API with file upload and Claude streaming |
| `shared/models/chat.ts` | Database schema for conversations and messages |

### Required Environment Variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key (auto-configured) |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic API base URL (auto-configured) |
