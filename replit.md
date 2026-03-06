# ZATCA Data Owner Agent

## Overview

The ZATCA Data Owner Agent is an AI-powered assistant designed for data governance professionals. Its primary purpose is to streamline data management tasks by offering capabilities such as data classification according to Saudi SDAIA NDMO standards, generation of business definitions for data fields, suggestion of data quality rules, and design of analytical data models with interactive diagrams and DDL generation. The agent aims to simplify complex data governance processes through a professional "AI Agent Command Center" interface, allowing users to input data via prompts or Excel file uploads and receive structured, actionable analysis. This project seeks to enhance data compliance, improve data quality, and accelerate data model development within organizations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend — 3-Panel Command Center Layout
- **Framework**: React 18 with TypeScript, using Vite for bundling.
- **UI Layout**: Three-panel "AI Agent Command Center":
  - **Left Sidebar** (240px fixed, dark navy `#0D2E5C`): ZATCA branding, agent status pill (Idle/Thinking/Executing/Done), session list with rename (pencil) + delete (trash) icons (opacity-40, full opacity on hover), inline title editing on pencil click, "New Session" button.
  - **Center Panel** (flex-grow, `#F4F6F9` dot grid bg): Activity cards for user commands and agent responses, capabilities dashboard on first load, command console at bottom.
  - **Right Panel** (300px fixed, white bg): Live outputs section (result.xlsx download), sheet tracker (color-coded tags), activity timeline.
- **UI/UX**: `shadcn/ui` components based on Radix UI and styled with Tailwind CSS. Custom CSS animations: `slide-up`, `pop-in`, `pulse-status`, `ripple-button`. Inter as primary font, Courier New for command console.
- **State Management**: Utilizes TanStack React Query for server state and React's built-in hooks for local UI state. New states: `agentStatus` (idle/thinking/executing/done), `activityLog[]`, `thinkingSteps[]`, `mobileOutputsOpen`.
- **Data Visualization**: `DataModelDiagram` component renders interactive SVG star schema diagrams. `DqDonutChart` uses recharts PieChart for DQ rule distribution.
- **Internationalization**: Supports English (LTR) and Arabic (RTL) with dynamic UI adjustments and translated static strings. RTL flips the 3-panel layout.
- **Responsiveness**: Adaptive design for mobile — sidebar and outputs panel become slide-in drawers. Camera capture feature for touch devices.
- **Core Features**:
    - **Cumulative Result Handling**: Processes and merges AI analysis results across multiple interactions into an in-memory structure, generating a `result.xlsx` with separate, deduplicated sheets for classifications, definitions, and quality rules.
    - **4-Layer DQ Rules (2-Call Split)**: DQ analysis is split into 2 sequential Claude API calls to avoid token limits. Call 1 (`DQ_DIMENSIONS_SYSTEM_PROMPT`) generates Layer 1 Technical + Layer 2 Logical rules. Call 2 (`DQ_BUSINESS_LOGIC_SYSTEM_PROMPT`) generates Layer 3 Business rules, cross-field rules, and Layer 4 Business Logic warnings. Results are merged via `mergeDqResults()` and streamed as one JSON block. Field names are auto-injected from conversation history when no file is uploaded. Rendered as a donut chart + legend in AgentResponseCard, exported to 3 Excel sheets.
    - **Standalone Insights Report**: Generates comprehensive, styled Excel reports with executive summaries, key insights, column profiles, recommendations, and data quality flags.
    - **Agent Activity Cards**: Replace chat bubbles — `UserCommandCard` (blue left border, command label, timestamp), `AgentResponseCard` (green border when done, status badge, summary, metrics, download buttons, expand/collapse), `ThinkingProgressCard` (multi-step progress tracker during streaming).
    - **Capabilities Dashboard**: First-load view with 2x3 feature card grid, "Start" buttons that pre-fill the command console, and a drag-and-drop upload zone.
    - **Command Console**: Dark navy (`#0D2E5C`) input bar with monospace font, Execute button (`#2E7D32`), file upload (paperclip), text paste toggle (Type icon), language toggle, User Guide download (BookOpen icon). Quick action pills above when in active conversation, filtered by active agent mode.
    - **3-Agent Navigation Bar**: Below top header — tabs for "Data Management" (Database icon), "Analytical Model" (Layers icon), "Insights Agent" (Brain icon). Active tab = navy bg, white text. Controls which feature cards and pills are shown.
    - **Collapse Outputs Panel**: Header button (PanelRightClose/PanelRightOpen) toggles the right outputs panel. Panel disappears and center expands.
    - **Text Paste Mode**: Type icon in command console reveals a textarea for pasting raw field names or CSV data, appended to message as `--- Pasted Data ---` block.
    - **File Preview (ExcelPreview)**: Eye icon next to uploaded file name opens a full-screen modal with SheetJS-rendered table (first 200 rows, sheet tabs, sticky headers, alternating row colors).
    - **Activity Tracker Fix**: `resetResultState()` no longer clears `activityLog`. Only conversation-switch and new-chat clear activity.
    - **Rename Conversations**: PATCH `/api/conversations/:id` endpoint; pencil icon in sidebar triggers inline input; Enter/blur saves, Escape cancels.
    - **Feature Cards**: Clicking pre-fills command console textarea and focuses it (no longer auto-sends).
- **ZATCA Branding**: Primary palette — green `#067647`, teal `#51BAB4`, blue `#0094D3`, purple `#774896`, dark blue `#1A4B8C`, gray `#575756`. Download buttons `#2E7D32`. Command center navy `#0D2E5C`. ZATCA blue accents `#2563EB`.

### Key Components (all in `client/src/pages/chat.tsx`)
- `SidebarContent` — Dark navy sidebar with agent status, session list
- `OutputsPanel` — Right panel: live outputs, sheet tracker, activity timeline
- `UserCommandCard` — User command display card
- `AgentResponseCard` — Agent response with summary, metrics, data model, DQ chart
- `ThinkingProgressCard` — Multi-step progress tracker during streaming
- `DqDonutChart` — Recharts PieChart donut for DQ rule distribution

### Backend
- **Framework**: Express.js with TypeScript, providing REST endpoints for conversations and messages.
- **File Processing**: Handles various file types:
    - **Excel (.xlsx, .xls)**: Parsed for structured data.
    - **PDF (.pdf)**: Extracts text and attempts table detection.
    - **Word (.docx, .doc)**: Extracts text, then applies PDF table detection logic.
    - **Images (.png, .jpg, .jpeg, .gif, .webp)**: Utilizes Claude's vision API for data extraction. Images over 4.5MB are automatically compressed/resized using `sharp`.
- **AI Integration**: Communicates with Anthropic's Claude API for AI processing, leveraging server-sent events (SSE) for streaming responses.

### Data Layer
- **Database**: PostgreSQL, hosted on Neon (serverless).
- **ORM**: Drizzle ORM, managing `conversations` and `messages` tables.
- **Schema**: Defined in `shared/models/chat.ts` and validated with `drizzle-zod`.

## External Dependencies

- **Anthropic API**: For AI model interactions (Claude).
- **PostgreSQL (Neon)**: Database service for persistent storage.
- **`xlsx` (SheetJS)**: Client-side Excel file generation and parsing.
- **`recharts`**: Donut charts for DQ rule distribution visualization.
- **`multer`**: Backend middleware for handling file uploads.
- **`pdf-parse`**: For extracting text from PDF documents.
- **`mammoth`**: For extracting text from Word documents.
- **`sharp`**: Server-side image compression/resizing for large uploads.
- **`react-markdown`**: For rendering Markdown content in the frontend.
- **`react-resizable-panels`**: For resizable UI components.
