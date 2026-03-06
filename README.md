# ZATCA Data & Analytics Agent

> AI-powered Data & Analytics Command Center for ZATCA professionals

---

## Purpose

The ZATCA Data & Analytics Agent is an intelligent assistant built specifically for data owners, data stewards, and data governance professionals at ZATCA (Zakat, Tax and Customs Authority) and affiliated Saudi organizations. It automates the most time-consuming data governance tasks — classification, quality rules, business definitions, PII detection, analytical modelling, and insights — through a conversational AI interface backed by Claude Sonnet.

---

## Mission

To eliminate the manual effort in data governance by giving every data owner an expert AI partner that speaks their language (literally — English and Arabic), understands Saudi regulatory frameworks (SDAIA NDMO, PDPL, ZATCA VAT/Zakat/e-invoicing), and delivers structured, exportable outputs in seconds instead of days.

---

## Goals

- Make Saudi data governance standards (SDAIA NDMO, PDPL) accessible to non-technical data owners
- Reduce time-to-classification from days to seconds
- Ensure data quality across ZATCA systems through automated, multi-layer DQ rule generation
- Provide a single command center for all daily data ownership tasks
- Support both English and Arabic workflows natively (RTL layout included)

---

## Key Features

### 1. Data Classification (SDAIA NDMO)
Classify data fields according to the Saudi National Data Management Office framework. Output includes classification level (Top Secret / Secret / Confidential / Restricted / Public), rationale, data owner, and sensitivity category — delivered as a structured markdown table and exported to Excel.

### 2. Business Definitions
Generate comprehensive business definitions for every data field: description, data type recommendation, expected format, valid values, business rules, and relationships to other fields. Output as a clean markdown table.

### 3. 4-Layer Data Quality Rules
Full DQ rule generation split across two AI calls to handle depth and scale:
- **Layer 1 — Technical**: Null checks, data type validation, format patterns, length constraints
- **Layer 2 — Logical**: Range boundaries, date ordering, uniqueness, referential integrity, precision rules
- **Layer 3 — Business & Cross-Field**: Conditional rules, ZATCA regulatory rules (VAT, Zakat, FATOORAH), SLA rules, status machines
- **Layer 4 — Business Logic Warnings**: Suspicious naming, missing constraints, ambiguous definitions, type conflicts

Output: interactive donut chart by DQ dimension + export to 3 Excel sheets.

### 4. Analytical Data Model (Star Schema)
Design star schema fact and dimension tables from uploaded data. Generates:
- Interactive SVG star schema diagram
- DDL SQL scripts
- Grain definition, fact table columns, dimension tables with attributes
- Exportable to Excel

### 5. PII Detection (PDPL)
Scan datasets for personal and sensitive information against Saudi PDPL categories and international PII patterns. Identifies PII columns with risk level, legal basis, PDPL article references, and recommended handling.

### 6. Data Insights Report
Upload any Excel dataset and receive a comprehensive insights report: executive summary, key insights, column-level statistics, anomalies, trends, and actionable recommendations — exported as a standalone styled Excel report.

### 7. Informatica Output
Generate Informatica-compatible metadata for each data field: field descriptions, data quality rules, Informatica Expression Language SQL statements, SDAIA data classifications (with rationale and handling rules), and format types. Results are exported to a dedicated `informatica_output` sheet in `result.xlsx`.

### 8. Use Cases Page (`/use-cases`)
A static, fully-browsable catalog of 14 real tasks the agent can perform. Accessible from the sidebar or at `/use-cases`. Features:
- Filter tabs: All | Data Management | Compliance & Privacy | Analytics | Insights
- Card grid with color-coded category badges and icons
- Modal per use case: user story, example input fields, styled HTML/CSS output preview
- "Launch Agent" CTA — navigates to chat with the prompt pre-filled and agent mode pre-selected via `?prompt=&mode=` URL params
- Full EN + AR translations with RTL layout toggle

---

## UI Architecture — AI Agent Command Center

A three-panel professional workspace:

| Panel | Description |
|---|---|
| **Left Sidebar** (dark navy `#0D2E5C`) | ZATCA branding, agent status pill (Idle / Thinking / Executing / Done), per-mode session list with rename and delete, drag-resize handle, collapsible |
| **Center Panel** (dot-grid `#F4F6F9`) | Capabilities dashboard on first load, activity cards for commands and AI responses, command console at bottom |
| **Right Outputs Panel** (white) | Live result download (result.xlsx), sheet tracker with color-coded tags, activity timeline — collapsible |

### 3 Agent Modes (isolated session lists)

| Mode | Icon | Purpose |
|---|---|---|
| **Data Management** | Database | Classification, business definitions, DQ rules, PII detection |
| **Analytical Model** | Layers | Star schema design, DDL generation |
| **Insights Agent** | Brain | Data analysis and insights reports |

---

## File Upload Support

| Format | Processing |
|---|---|
| Excel (.xlsx, .xls) | SheetJS parsing, column profiling, sample rows |
| PDF (.pdf) | Text extraction + table detection |
| Word (.docx, .doc) | Text extraction via Mammoth |
| Images (.png, .jpg, .jpeg, .webp, .gif) | Claude Vision API; auto-compressed if >4.5MB |
| Camera capture | Available on mobile/touch devices |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| UI Components | shadcn/ui (Radix UI + Tailwind CSS) |
| State / Data Fetching | TanStack React Query v5 |
| Routing | Wouter |
| Charts | Recharts (donut charts) |
| Excel | SheetJS (xlsx) |
| Backend | Express.js, TypeScript |
| AI | Anthropic Claude Sonnet (claude-sonnet-4-6, max 16,000 tokens) |
| Database | PostgreSQL on Neon (serverless) |
| ORM | Drizzle ORM + drizzle-zod |
| File Handling | Multer, pdf-parse, Mammoth, Sharp |
| Languages | English (LTR) + Arabic (RTL) |

---

## Monetization Strategy

### SaaS Subscription Model

**Target customers:** Data governance teams, data stewards, and data owners within Saudi government entities, semi-government organizations, and large enterprises operating under ZATCA regulatory scope.

**Pricing tiers:**

| Tier | Target | Features |
|---|---|---|
| **Starter** | Individual data owners | Limited analyses per month, core features (classification + definitions) |
| **Professional** | Data governance teams (5–20 users) | Unlimited analyses, all 6 feature modules, Excel exports, history |
| **Enterprise** | Large organizations | Unlimited users, custom branding, API access, on-premise option, SLA support |

**Additional revenue streams:**
- White-label licensing for ZATCA technology partners and system integrators
- Per-report pricing for standalone Insights and DQ audit reports
- Compliance audit packages (PDPL readiness assessments, NDMO classification audits)
- Training and onboarding services for data governance teams

**Competitive advantage:**
- Purpose-built for Saudi regulatory frameworks (SDAIA NDMO, PDPL, ZATCA VAT/Zakat/FATOORAH)
- Native Arabic support with RTL layout
- Structured, exportable outputs (not just chat answers)
- No data governance expertise required to operate

---

## Branding & Design

| Element | Value |
|---|---|
| Primary Green | `#067647` |
| Teal | `#51BAB4` |
| Blue | `#0094D3` |
| Purple | `#774896` |
| Navy (sidebar) | `#0D2E5C` |
| ZATCA Blue | `#2563EB` |
| Download Green | `#2E7D32` |
| Font | Inter (UI), Courier New (command console) |
| Favicon | Official ZATCA logo (`ZATCA-o.png`, 310×310 PNG) from zatca.gov.sa |
