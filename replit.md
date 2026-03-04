# Data Owner Agent — KPMG Data Governance

## Overview

This is an AI-powered data governance assistant called the **Data Owner Agent**, built for KPMG. It helps data owners, data stewards, and data governance professionals with:

- **Data Classification** — Classify data fields per Saudi SDAIA NDMO standards (Top Secret, Secret, Confidential, Restricted, Public)
- **Business Definitions** — Generate clear definitions for data fields/elements
- **Data Quality Rules** — Suggest quality rules across dimensions (completeness, accuracy, consistency, etc.)
- **Nudge & Sludge Analysis** — Behavioral analysis to identify positive interventions or friction points

Users interact through a chat interface. They can type prompts or upload Excel files containing data fields, and the AI returns structured, formatted analysis.

### Table Export Feature
- AI responses containing markdown tables are rendered with styled, scrollable table components
- Each table has an individual "Download Excel" button to export that single table
- Messages with multiple tables show a "Download All Tables as Excel" button that creates a multi-sheet workbook
- Table parsing handles both standard (`| col |`) and flexible markdown table formats
- Client-side Excel generation using the `xlsx` (SheetJS) library with auto-sized columns

### Cumulative result.xlsx Feature
- Maintains an in-memory cumulative data structure (`ResultRow[]`) keyed by `field_name` across multiple AI analyses
- After each AI response, `detectAndExtractAllAnalyses()` scans all markdown tables for analysis-specific headers and extracts field data
- Supports multiple analysis types in a single response (each table detected independently)
- Data Quality rules support multi-row per field (multiple DQ dimensions/rules per field preserved)
- Column ordering in result.xlsx: Field Name → Business Definitions cols → Data Classification cols → DQ cols → Nudge & Sludge cols (only groups with data included)
- Result banner appears above the input area when results exist, with a "Download result.xlsx" button
- Header bar also shows a compact download button when results exist
- File-reset confirmation dialog (AlertDialog) appears when uploading a new file while results already exist
- Session state (results, field names, file name) resets on: new chat, conversation switch, conversation delete, or confirmed file reset
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
- **Markdown Rendering**: `react-markdown` with custom table components (`DownloadableTable`, `TableHead`, `TableBody`, `TableRow`, `TableHeader`, `TableCell`)
- **Table Utilities**: `client/src/lib/table-utils.ts` — parses markdown tables, generates Excel downloads
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

### Batch Processing (`server/replit_integrations/batch/`)
- Utility for concurrent Anthropic API calls with rate-limit handling and retries

### Data Layer
- **Database**: PostgreSQL via Neon (serverless)
- **ORM**: Drizzle ORM — tables: `conversations`, `messages`
- **Schema**: `shared/models/chat.ts`, re-exported from `shared/schema.ts`
- **Validation**: `drizzle-zod` for Zod schema generation

### Key Files
| File | Purpose |
|---|---|
| `client/src/pages/chat.tsx` | Main chat page with sidebar, messages, input area |
| `client/src/components/markdown-table.tsx` | Custom table renderer with per-table download buttons |
| `client/src/lib/table-utils.ts` | Markdown table parsing and Excel export utilities |
| `client/src/lib/result-store.ts` | Cumulative result.xlsx logic: detection, extraction, merge, Excel generation |
| `server/replit_integrations/chat/routes.ts` | Chat API with file upload and Claude streaming |
| `shared/models/chat.ts` | Database schema for conversations and messages |

### Required Environment Variables
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key (auto-configured) |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic API base URL (auto-configured) |
