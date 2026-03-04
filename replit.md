# ZATCA Data Owner Agent

## Overview

The ZATCA Data Owner Agent is an AI-powered assistant designed for data governance professionals. Its primary purpose is to streamline data management tasks by offering capabilities such as data classification according to Saudi SDAIA NDMO standards, generation of business definitions for data fields, suggestion of data quality rules, and design of analytical data models with interactive diagrams and DDL generation. The agent aims to simplify complex data governance processes through an intuitive chat interface, allowing users to input data via prompts or Excel file uploads and receive structured, actionable analysis. This project seeks to enhance data compliance, improve data quality, and accelerate data model development within organizations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript, using Vite for bundling.
- **UI/UX**: `shadcn/ui` components based on Radix UI and styled with Tailwind CSS, ensuring a consistent and modern aesthetic.
- **State Management**: Utilizes TanStack React Query for server state and React's built-in hooks for local UI state.
- **Data Visualization**: `DataModelDiagram` component renders interactive SVG star schema diagrams with export functionalities.
- **Internationalization**: Supports English (LTR) and Arabic (RTL) with dynamic UI adjustments and translated static strings.
- **Responsiveness**: Adaptive design for mobile devices, including a collapsible sidebar and camera capture feature for touch devices.
- **Core Features**:
    - **Cumulative Result Handling**: Processes and merges AI analysis results across multiple interactions into an in-memory structure, generating a `result.xlsx` with separate, deduplicated sheets for classifications, definitions, and quality rules.
    - **4-Layer DQ Rules**: Claude returns structured JSON with `field_rules[]` (Technical/Logical/Business per field), `cross_field_rules[]`, and `business_logic_warnings[]`. Detected by `detectDqAnalysisJSON()`, rendered as a 6-tile scorecard in chat (Total Rules, Technical, Logical, Business, Cross-Field, Warnings), and exported to 3 Excel sheets (`dq_rules_by_field`, `cross_field_rules`, `business_warnings`) via `appendDqSheets()`.
    - **Standalone Insights Report**: Generates comprehensive, styled Excel reports with executive summaries, key insights, column profiles, recommendations, and data quality flags when prompted with data-rich files.
    - **Chat Interface**: Displays conversation summaries with downloadable results, features collapsible message threads, and supports multi-analysis requests within a single AI response. When Claude returns multiple analyses (e.g., classification + PII + DQ) in one response, all are detected and a combined summary is shown.
    - **Feature Cards**: Auto-attach the uploaded file when clicked, sending both the prompt and file to Claude.
- **ZATCA Branding**: Primary palette — green `#067647`, teal `#51BAB4`, blue `#0094D3`, purple `#774896`, dark blue `#1A4B8C`, gray `#575756`. Download buttons use `#2E7D32`.

### Backend
- **Framework**: Express.js with TypeScript, providing REST endpoints for conversations and messages.
- **File Processing**: Handles various file types:
    - **Excel (.xlsx, .xls)**: Parsed for structured data.
    - **PDF (.pdf)**: Extracts text and attempts table detection.
    - **Word (.docx, .doc)**: Extracts text, then applies PDF table detection logic.
    - **Images (.png, .jpg, .jpeg, .gif, .webp)**: Utilizes Claude's vision API for data extraction. Images over 4.5MB are automatically compressed/resized using `sharp` (max 2048px, JPEG 80% → 1600px/60% → 1200px/40%) to stay within Claude's 5MB limit.
- **AI Integration**: Communicates with Anthropic's Claude API for AI processing, leveraging server-sent events (SSE) for streaming responses.

### Data Layer
- **Database**: PostgreSQL, hosted on Neon (serverless).
- **ORM**: Drizzle ORM, managing `conversations` and `messages` tables.
- **Schema**: Defined in `shared/models/chat.ts` and validated with `drizzle-zod`.

## External Dependencies

- **Anthropic API**: For AI model interactions (Claude).
- **PostgreSQL (Neon)**: Database service for persistent storage.
- **`xlsx` (SheetJS)**: Client-side Excel file generation and parsing.
- **`multer`**: Backend middleware for handling file uploads.
- **`pdf-parse`**: For extracting text from PDF documents.
- **`mammoth`**: For extracting text from Word documents.
- **`sharp`**: Server-side image compression/resizing for large uploads.
- **`react-markdown`**: For rendering Markdown content in the frontend.
- **`react-resizable-panels`**: For resizable UI components.