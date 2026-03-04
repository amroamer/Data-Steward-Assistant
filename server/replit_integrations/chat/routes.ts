import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { chatStorage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import sharp from "sharp";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const SYSTEM_PROMPT = `You are the "ZATCA Data Owner Agent", an expert AI assistant specialized in data governance, data management, and data strategy for ZATCA (Zakat, Tax and Customs Authority). You help data owners, data stewards, and data governance professionals with their daily tasks.

You have deep expertise in:

1. **Data Classification (Saudi SDAIA NDMO Standards)**:
   - You classify data fields according to the Saudi Data & AI Authority (SDAIA) National Data Management Office (NDMO) data classification framework.
   - The classification levels are:
     * **Top Secret**: Data whose unauthorized disclosure could cause exceptionally grave damage to national security, public safety, or vital interests.
     * **Secret**: Data whose unauthorized disclosure could cause serious damage.
     * **Confidential**: Data whose unauthorized disclosure could cause damage to organizations or individuals. Examples: PII, financial records, health records, employee data, customer data.
     * **Restricted**: Data intended for internal use only whose disclosure could cause minor harm.
     * **Public**: Data that is openly available and whose disclosure causes no harm.
   - When classifying fields, consider: the nature of the data, potential impact of disclosure, regulatory requirements, and privacy implications.

2. **Business Definitions**:
   - You generate clear, comprehensive business definitions for data fields/elements.
   - Each definition should include: a clear description of what the field represents, its business context, data type recommendation, expected format, valid values or ranges, business rules, and relationships to other fields.

3. **Data Quality Rules — Full 4-Layer Analysis**:
   - You are a senior data quality architect with expertise in DAMA DMBOK, enterprise DQ frameworks, and business rule validation.
   - When the user asks for data quality rules, you generate a comprehensive 4-layer analysis:
     * **Layer 1 — Technical Rules**: Null/completeness checks, data type validation, format patterns (dates, emails, phones, IDs), length constraints, allowed values/enumeration checks.
     * **Layer 2 — Logical Rules**: Range boundaries (age 0-120, percentages 0-100, positive quantities, non-negative prices), date ordering (start before end, created before updated, birth before hire), uniqueness constraints, referential integrity, numerical precision (financial fields with 2 decimal places).
     * **Layer 3 — Business Rules & Cross-Field Rules**: Conditional rules (if payment_status=PAID then payment_date must exist), status transition rules (valid state machine logic), business classification rules, regulatory rules (ZATCA VAT, Zakat, customs, e-invoicing/FATOORAH), SLA rules, cross-field relationships and constraints.
     * **Layer 4 — Business Logic Warnings**: Suspicious field naming, missing mandatory constraints, ambiguous field definitions, fields needing reference/lookup tables, data type conflicts between name and values.

## CRITICAL OUTPUT FORMAT RULES

When analyzing data fields, the output format depends on the type of analysis:

**For Business Definitions — use a markdown table with exactly these columns:**
| Field Name | Business Term | Business Definition | Data Type | Example |

**For Data Classification — use a markdown table with exactly these columns:**
| Field Name | Classification Level | Classification Rationale | Data Owner | Sensitivity Category |

**For Data Quality Rules — return ONLY a JSON code block (wrapped in triple-backtick json fences) with this exact structure:**
\`\`\`json
{
  "analysis_summary": {
    "total_fields_analyzed": 0,
    "total_rules_generated": 0,
    "technical_rules_count": 0,
    "logical_rules_count": 0,
    "business_rules_count": 0,
    "cross_field_rules_count": 0,
    "warnings_count": 0,
    "fields_with_critical_rules": 0,
    "overall_complexity": "High | Medium | Low"
  },
  "field_rules": [
    {
      "field_name": "...",
      "inferred_data_type": "...",
      "business_context": "...",
      "rules": [
        {
          "rule_id": "DQ-001",
          "rule_name": "...",
          "rule_layer": "Technical | Logical | Business",
          "dq_dimension": "Completeness | Validity | Accuracy | Consistency | Uniqueness | Timeliness | Integrity",
          "rule_type": "Null Check | Format | Range | Pattern | Referential | Conditional | Cross-Field | Uniqueness | Timeliness",
          "rule_description": "...",
          "rule_expression": "...",
          "severity": "Critical | High | Medium | Low",
          "expected_behavior": "...",
          "failure_example": "...",
          "pass_example": "...",
          "remediation": "..."
        }
      ]
    }
  ],
  "cross_field_rules": [
    {
      "rule_id": "CF-001",
      "rule_name": "...",
      "involved_fields": ["..."],
      "rule_description": "...",
      "rule_expression": "...",
      "business_rationale": "...",
      "severity": "Critical | High | Medium | Low",
      "failure_example": "...",
      "remediation": "..."
    }
  ],
  "business_logic_warnings": [
    {
      "warning_id": "BW-001",
      "field_name": "...",
      "warning_type": "Suspicious Pattern | Missing Constraint | Ambiguous Definition | Potential Conflict | Risky Default",
      "description": "...",
      "recommendation": "..."
    }
  ]
}
\`\`\`
Do NOT include any prose or markdown outside the JSON code block for DQ analysis. Return ONLY the JSON.

Rules for markdown tables (Business Definitions & Data Classification):
- The first column MUST always be "Field Name" containing the exact field/column names from the user's data
- Include ONE ROW per field being analyzed
- You may include a brief introductory sentence before the table
- The summary table is essential — it enables the app to merge results into a cumulative Excel file

## MULTI-ANALYSIS REQUESTS

When the user asks for MULTIPLE analyses in a single request (e.g. "give me business definitions, data classification, and data quality rules"), you MUST produce ALL requested outputs in ONE response. Output each sequentially with a brief label before each:

Example structure for a multi-analysis request:
1. Brief intro sentence for Business Definitions, then the business_definitions table
2. Brief intro sentence for Data Classification, then the data_classification table
3. For Data Quality Rules, output ONLY the JSON code block (no table)

Each table MUST use the exact column headers defined above. Do NOT skip any requested analysis. Do NOT merge different analyses into a single table.

## OUTPUT RESTRICTIONS — Keep responses focused and clean:
- For **Data Classification**: Output ONLY the field-level classification table. Do NOT include Classification Distribution Summary tables, governance recommendations, regulation references, per-field narrative breakdowns, or emoji-decorated section headers. Just a brief intro and the table.
- For **Business Definitions**: Output ONLY the field-level definitions table. Do NOT include per-field narrative breakdowns. Just a brief intro and the table.
- For **Data Quality Rules**: Output ONLY the JSON code block. No prose, no tables, no explanations outside the JSON.
- In general: keep responses concise and structured. The user wants structured data they can download, not lengthy prose.

4. **Analytical Data Model (Star Schema / Dimensional Model)**:
   - When the user asks you to build a data model, create a star schema, design an analytical model, suggest a dimensional model, generate DDL, determine what tables should be created, or create an analytical model, you MUST:
     - Analyze the uploaded data fields and group them into Fact Tables and Dimension Tables based on their nature (measures vs. descriptive attributes)
     - Identify primary keys and foreign keys
     - Suggest the grain of each fact table (what one row represents)
     - Suggest relationships between tables (one-to-many, many-to-one, many-to-many)
     - Suggest aggregation type for each measure (SUM, COUNT, AVG, NONE)
   - **Trigger keywords**: "build a data model", "create a star schema", "design an analytical model", "suggest a dimensional model", "generate DDL", "what tables should I create", "analytical model"
   - When a data model is requested, return ONLY the JSON block below wrapped in triple-backtick json fences. Do NOT include any prose, explanation, or markdown outside the JSON code block.
   - The JSON schema you MUST return is:

\`\`\`json
{
  "model_name": "descriptive_model_name",
  "grain_statement": "One row represents...",
  "fact_tables": [
    {
      "table_name": "fact_table_name",
      "grain": "What one row represents in this fact table",
      "fields": [
        { "field_name": "field_name", "data_type": "VARCHAR(50)|INTEGER|DECIMAL(18,2)|DATE|TIMESTAMP|BOOLEAN", "role": "measure|fk|pk", "aggregation": "SUM|COUNT|AVG|MIN|MAX|NONE" }
      ]
    }
  ],
  "dimension_tables": [
    {
      "table_name": "dim_table_name",
      "fields": [
        { "field_name": "field_name", "data_type": "VARCHAR(50)|INTEGER|DECIMAL(18,2)|DATE|TIMESTAMP|BOOLEAN", "role": "pk|attribute" }
      ]
    }
  ],
  "relationships": [
    { "from_table": "fact_table_name", "from_field": "fk_field", "to_table": "dim_table_name", "to_field": "pk_field", "type": "many-to-one|one-to-many|many-to-many" }
  ]
}
\`\`\`

   - Rules for the data model JSON:
     - Every fact table MUST have at least one primary key field (role: "pk"), at least one measure (role: "measure"), and typically one or more foreign keys (role: "fk")
     - Every dimension table MUST have exactly one primary key field (role: "pk") and one or more attributes (role: "attribute")
     - Every foreign key in a fact table MUST have a corresponding relationship entry linking it to a dimension table's primary key
     - Use SQL-compatible data types: VARCHAR(n), INTEGER, BIGINT, DECIMAL(p,s), DATE, TIMESTAMP, BOOLEAN
     - Table names should follow the convention: fact_ prefix for fact tables, dim_ prefix for dimension tables
     - The model_name should be descriptive of the business domain
     - The grain_statement should clearly describe what one row in the primary fact table represents

5. **PII & Sensitive Data Detection**:
   - When the user has an uploaded file (columns with or without data rows) and asks anything related to PII, personal data, privacy, or sensitive data detection, you immediately act as a data privacy expert and perform the scan. Do NOT ask for clarification or additional data — column names alone are sufficient for a high-quality PII scan, exactly as you do for Data Classification.
   - You are familiar with:
     * Saudi PDPL (Personal Data Protection Law)
     * SDAIA NDMO data classification standards
     * General PII definitions (name, ID, contact, financial, health, behavioral, location data)
   - **Trigger keywords** (any of these or similar phrasing — be generous in matching intent): "give me the pii", "give me pii", "pii", "detect pii", "run pii", "pii scan", "pii analysis", "pii check", "pii report", "pii detection", "find pii", "show pii", "show me pii", "scan for pii", "scan this for pii", "identify personal data", "find personal data", "personal data", "check for sensitive information", "sensitive data", "does this file have pii", "pdpl check", "privacy scan", "privacy check", "pdpl compliance", "data privacy scan", "scan personal data"
   - **IMPORTANT**: If the file has no data rows (only column headers), perform the scan based on column name semantics — this is entirely valid and produces accurate results. Do NOT refuse, do NOT ask for more data, do NOT offer options. Just run the scan immediately.
   - **OVERRIDE RULE**: If the user message contains a [SYSTEM NOTE] block listing column names, you MUST immediately perform the PII scan on those columns regardless of anything said in prior conversation turns. Any previous response in this conversation saying "I need data rows" or "please upload a file" is now void — the system has re-injected the column context and you must proceed with the scan.
   - You will receive column names, inferred data types, and sample data (up to 5 rows per column). Never reveal or repeat the raw data in your response.
   - When PII detection is requested, return ONLY the JSON block below wrapped in triple-backtick json fences. Do NOT include any prose, explanation, or markdown outside the JSON code block.
   - The JSON schema you MUST return is:

\`\`\`json
{
  "scan_summary": {
    "total_columns_scanned": 0,
    "pii_columns_found": 0,
    "sensitive_columns_found": 0,
    "clean_columns": 0,
    "overall_risk_level": "High | Medium | Low"
  },
  "columns": [
    {
      "column_name": "...",
      "detected_data_type": "...",
      "is_pii": true,
      "is_sensitive": true,
      "pii_category": "Direct Identifier | Quasi Identifier | Sensitive | Financial | Health | Behavioral | Location | None",
      "pdpl_relevance": "Subject to PDPL | Conditionally Subject | Not Subject",
      "risk_level": "Critical | High | Medium | Low",
      "recommendation": "...",
      "suggested_control": "Mask | Encrypt | Tokenize | Restrict Access | Anonymize | No Action Required"
    }
  ]
}
\`\`\`

   - Rules for PII scan JSON:
     - Analyze EVERY column in the uploaded file, not just PII columns
     - Set is_pii and is_sensitive as boolean true/false based on the data content and column semantics
     - pii_category must be one of: "Direct Identifier", "Quasi Identifier", "Sensitive", "Financial", "Health", "Behavioral", "Location", "None"
     - pdpl_relevance must be one of: "Subject to PDPL", "Conditionally Subject", "Not Subject"
     - risk_level must be one of: "Critical", "High", "Medium", "Low"
     - suggested_control must be one of: "Mask", "Encrypt", "Tokenize", "Restrict Access", "Anonymize", "No Action Required"
     - scan_summary.overall_risk_level is "High" if any column is Critical or High, "Medium" if only Medium, "Low" if all Low
     - recommendation should be a brief actionable suggestion for handling that column

Always be thorough, practical, and align your recommendations with international data governance best practices and Saudi NDMO regulations.`;

const INSIGHTS_TRIGGER_KEYWORDS = [
  "give me insights",
  "analyze this data",
  "what does this data tell me",
  "generate insights report",
  "generate insights",
  "insights report",
  "data insights",
  "summarize this data",
  "key findings",
  "data report",
  "explore this dataset",
  "what are the key",
  "generate a data insights",
];

const PII_TRIGGER_KEYWORDS = [
  "give me the pii",
  "give me pii",
  "detect pii",
  "run pii",
  "pii scan",
  "pii analysis",
  "pii check",
  "pii report",
  "pii detection",
  "find pii",
  "show pii",
  "show me pii",
  "scan for pii",
  "scan this for pii",
  "identify personal data",
  "find personal data",
  "check for sensitive information",
  "pdpl check",
  "privacy scan",
  "privacy check",
  "pdpl compliance",
  "data privacy scan",
  "scan personal data",
  "scan for personal",
  "personal data scan",
];

const INSIGHTS_SYSTEM_PROMPT = `You are a senior data analyst. The user has uploaded a dataset and wants a comprehensive insights report. You will receive pre-computed column-level statistics and a sample of up to 10 rows.

Your task is to analyze the profiled statistics and sample data, then return ONLY a JSON object (wrapped in triple-backtick json fences) with the following schema. Do NOT include any prose, explanation, or markdown outside the JSON code block.

\`\`\`json
{
  "report_title": "A descriptive title for the insights report",
  "dataset_summary": {
    "total_rows": 0,
    "total_columns": 0,
    "numeric_columns": 0,
    "text_columns": 0,
    "date_columns": 0,
    "overall_completeness_pct": 0.0,
    "summary_text": "A 2-3 sentence high-level summary of the dataset."
  },
  "key_insights": [
    {
      "insight_no": 1,
      "category": "Distribution | Correlation | Anomaly | Trend | Quality | Pattern",
      "title": "Short insight title",
      "description": "1-2 sentence description of the insight",
      "affected_columns": ["col1", "col2"],
      "business_impact": "High | Medium | Low",
      "confidence": "High | Medium | Low"
    }
  ],
  "recommendations": [
    {
      "recommendation_no": 1,
      "title": "Short recommendation title",
      "description": "1-2 sentence recommendation",
      "priority": "High | Medium | Low",
      "effort": "High | Medium | Low",
      "affected_columns": ["col1"]
    }
  ]
}
\`\`\`

Rules:
- Provide at least 5 key_insights if the data supports it, up to 10
- Provide at least 3 recommendations, up to 8
- Keep each description concise (1-2 sentences max)
- Do NOT include column_profiles or data_quality_flags — those are handled separately
- Base your analysis on the profiled statistics provided, not assumptions
- confidence should reflect how certain you are given the stats and sample size
- Return ONLY the JSON block, no other text`;

interface ColumnProfile {
  column_name: string;
  data_type: string;
  null_count: number;
  null_pct: number;
  unique_values: number;
  min?: number | string | null;
  max?: number | string | null;
  mean?: number | null;
  median?: number | null;
  std_dev?: number | null;
  top_values?: { value: string; count: number }[] | null;
  earliest?: string | null;
  latest?: string | null;
  date_range_days?: number | null;
}

interface ProfiledData {
  total_rows: number;
  total_columns: number;
  columns: ColumnProfile[];
  sample_rows: any[][];
  headers: string[];
}

function profileExcelData(buffer: Buffer, filename: string): ProfiledData | null {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return null;
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    if (jsonData.length < 2) return null;

    const headers = jsonData[0].map((h: any) => String(h || ""));
    const dataRows = jsonData.slice(1);
    const totalRows = dataRows.length;
    const totalColumns = headers.length;

    const columns: ColumnProfile[] = headers.map((header, colIdx) => {
      const values = dataRows.map(row => row[colIdx]);
      const nonNullValues = values.filter(v => v != null && v !== "");
      const nullCount = totalRows - nonNullValues.length;
      const nullPct = totalRows > 0 ? Math.round((nullCount / totalRows) * 10000) / 100 : 0;
      const uniqueValues = new Set(nonNullValues.map(v => String(v))).size;
      const colType = inferColumnType(nonNullValues);

      const profile: ColumnProfile = {
        column_name: header,
        data_type: colType,
        null_count: nullCount,
        null_pct: nullPct,
        unique_values: uniqueValues,
      };

      if (colType === "Number") {
        const nums = nonNullValues.map(v => typeof v === "number" ? v : Number(v)).filter(n => !isNaN(n));
        if (nums.length > 0) {
          nums.sort((a, b) => a - b);
          profile.min = nums[0];
          profile.max = nums[nums.length - 1];
          const sum = nums.reduce((a, b) => a + b, 0);
          profile.mean = Math.round((sum / nums.length) * 100) / 100;
          const mid = Math.floor(nums.length / 2);
          profile.median = nums.length % 2 === 0 ? Math.round(((nums[mid - 1] + nums[mid]) / 2) * 100) / 100 : nums[mid];
          if (nums.length > 1) {
            const mean = sum / nums.length;
            const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / (nums.length - 1);
            profile.std_dev = Math.round(Math.sqrt(variance) * 100) / 100;
          } else {
            profile.std_dev = 0;
          }
        }
      } else if (colType === "String") {
        const freqMap = new Map<string, number>();
        nonNullValues.forEach(v => {
          const s = String(v);
          freqMap.set(s, (freqMap.get(s) || 0) + 1);
        });
        const sorted = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
        profile.top_values = sorted.map(([value, count]) => ({ value, count }));
      } else if (colType === "Date") {
        const dates = nonNullValues.map(v => {
          if (v instanceof Date) return v;
          const d = new Date(String(v));
          return isNaN(d.getTime()) ? null : d;
        }).filter((d): d is Date => d !== null);
        if (dates.length > 0) {
          dates.sort((a, b) => a.getTime() - b.getTime());
          profile.earliest = dates[0].toISOString().split("T")[0];
          profile.latest = dates[dates.length - 1].toISOString().split("T")[0];
          profile.date_range_days = Math.round((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      return profile;
    });

    const sampleRows = dataRows.slice(0, 10);

    return { total_rows: totalRows, total_columns: totalColumns, columns, sample_rows: sampleRows, headers };
  } catch (error) {
    console.error("Error profiling Excel data:", error);
    return null;
  }
}

function formatProfiledDataForPrompt(profile: ProfiledData, filename: string): string {
  let text = `## Dataset: ${filename}\n`;
  text += `- Total Rows: ${profile.total_rows}\n`;
  text += `- Total Columns: ${profile.total_columns}\n\n`;

  text += `## Column Statistics\n\n`;
  for (const col of profile.columns) {
    text += `### ${col.column_name} (${col.data_type})\n`;
    text += `- Nulls: ${col.null_count} (${col.null_pct}%)\n`;
    text += `- Unique values: ${col.unique_values}\n`;
    if (col.data_type === "Number") {
      text += `- Min: ${col.min}, Max: ${col.max}, Mean: ${col.mean}, Median: ${col.median}, StdDev: ${col.std_dev}\n`;
    }
    if (col.top_values) {
      text += `- Top values: ${col.top_values.map(tv => `"${tv.value}" (${tv.count})`).join(", ")}\n`;
    }
    if (col.earliest) {
      text += `- Earliest: ${col.earliest}, Latest: ${col.latest}, Range: ${col.date_range_days} days\n`;
    }
    text += "\n";
  }

  text += `## Sample Data (first ${profile.sample_rows.length} rows)\n\n`;
  text += "| " + profile.headers.join(" | ") + " |\n";
  text += "| " + profile.headers.map(() => "---").join(" | ") + " |\n";
  for (const row of profile.sample_rows) {
    text += "| " + profile.headers.map((_, j) => row[j] ?? "").join(" | ") + " |\n";
  }

  return text;
}

function isInsightsRequest(message: string): boolean {
  const lower = message.toLowerCase();
  return INSIGHTS_TRIGGER_KEYWORDS.some(keyword => lower.includes(keyword));
}

function isPiiRequest(message: string): boolean {
  const lower = message.toLowerCase();
  if (PII_TRIGGER_KEYWORDS.some(keyword => lower.includes(keyword))) return true;
  if (/\bpii\b/i.test(message)) return true;
  if (/\bpdpl\b/i.test(message)) return true;
  return false;
}

function extractFieldNamesFromHistory(messages: { role: string; content: string }[]): { fieldNames: string[]; fileInfo: string } {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role !== "user") continue;
    const content = msg.content;
    const fileMatch = content.match(/\*\*Uploaded File: ([^*]+)\*\*/);
    const filename = fileMatch ? fileMatch[1].trim() : null;
    const fieldsMatch = content.match(/\*\*Fields\/Columns:\*\*\s*([^\n]+)/);
    if (fieldsMatch) {
      const fieldNames = fieldsMatch[1].split(",").map(f => f.trim()).filter(f => f.length > 0);
      if (fieldNames.length > 0) {
        const fileInfo = filename ? `Previously uploaded file: ${filename}` : "Previously uploaded file";
        return { fieldNames, fileInfo };
      }
    }
  }
  return { fieldNames: [], fileInfo: "" };
}

function inferColumnType(values: any[]): string {
  let numCount = 0, dateCount = 0, boolCount = 0, strCount = 0;
  for (const v of values) {
    if (v == null || v === "") continue;
    if (typeof v === "boolean") { boolCount++; continue; }
    if (typeof v === "number") { numCount++; continue; }
    if (v instanceof Date) { dateCount++; continue; }
    const s = String(v).trim();
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(s) || /^\d{2}[-/]\d{2}[-/]\d{4}/.test(s)) { dateCount++; continue; }
    if (!isNaN(Number(s)) && s !== "") { numCount++; continue; }
    strCount++;
  }
  const total = numCount + dateCount + boolCount + strCount;
  if (total === 0) return "Unknown";
  if (dateCount / total > 0.5) return "Date";
  if (numCount / total > 0.5) return "Number";
  if (boolCount / total > 0.5) return "Boolean";
  return "String";
}

function parseExcelBuffer(buffer: Buffer, filename: string): { text: string; fieldNames: string[]; hasDataRows: boolean } {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    let result = `**Uploaded File: ${filename}**\n\n`;
    let allFieldNames: string[] = [];
    let hasDataRows = false;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) continue;

      const headers = jsonData[0].map((h: any) => String(h || ""));
      allFieldNames = [...allFieldNames, ...headers.filter((h: string) => h.trim())];

      result += `**Sheet: ${sheetName}**\n`;
      result += `**Fields/Columns:** ${headers.join(", ")}\n\n`;

      if (jsonData.length > 1) {
        hasDataRows = true;
        const scanRows = jsonData.slice(1, Math.min(101, jsonData.length));
        const columnTypes = headers.map((_: string, j: number) => {
          const colValues = scanRows.map(row => row[j]);
          return inferColumnType(colValues);
        });

        result += `**Column Data Types (inferred):** ${headers.map((h: string, i: number) => `${h} (${columnTypes[i]})`).join(", ")}\n\n`;

        const sampleCount = Math.min(5, jsonData.length - 1);
        result += `**Sample Data (first ${sampleCount} rows):**\n`;
        result += "| " + headers.join(" | ") + " |\n";
        result += "| " + headers.map(() => "---").join(" | ") + " |\n";
        for (let i = 1; i <= sampleCount; i++) {
          result += "| " + headers.map((_: any, j: number) => jsonData[i]?.[j] ?? "").join(" | ") + " |\n";
        }
        result += `\n**Total rows:** ${jsonData.length - 1}\n`;
      }
      result += "\n";
    }

    return { text: result, fieldNames: allFieldNames, hasDataRows };
  } catch (error) {
    return {
      text: `**Error parsing file ${filename}:** ${error instanceof Error ? error.message : "Unknown error"}`,
      fieldNames: [],
      hasDataRows: false,
    };
  }
}

function isPdf(filename: string, mimetype?: string): boolean {
  return /\.pdf$/i.test(filename) || mimetype === "application/pdf";
}

const SUPPORTED_IMAGE_MIMES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);

function isImage(filename: string, mimetype?: string): boolean {
  return /\.(png|jpe?g|gif|webp)$/i.test(filename) || (mimetype ? SUPPORTED_IMAGE_MIMES.has(mimetype) : false);
}

function isWord(filename: string, mimetype?: string): boolean {
  return /\.docx$/i.test(filename) ||
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

function getImageMediaType(mimetype: string): "image/png" | "image/jpeg" | "image/gif" | "image/webp" {
  if (mimetype === "image/png") return "image/png";
  if (mimetype === "image/gif") return "image/gif";
  if (mimetype === "image/webp") return "image/webp";
  return "image/jpeg";
}

const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;

async function compressImageBuffer(
  buffer: Buffer,
  mimetype: string
): Promise<{ buffer: Buffer; mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" }> {
  if (buffer.length <= MAX_IMAGE_BYTES) {
    return { buffer, mediaType: getImageMediaType(mimetype) };
  }

  console.log(`[image] Compressing image: ${(buffer.length / 1024 / 1024).toFixed(1)}MB → target <3.5MB (≈4.7MB base64)`);

  let compressed = await sharp(buffer)
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  if (compressed.length <= MAX_IMAGE_BYTES) {
    console.log(`[image] Pass 1 OK: ${(compressed.length / 1024 / 1024).toFixed(1)}MB`);
    return { buffer: compressed, mediaType: "image/jpeg" };
  }

  compressed = await sharp(buffer)
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 60 })
    .toBuffer();

  if (compressed.length <= MAX_IMAGE_BYTES) {
    console.log(`[image] Pass 2 OK: ${(compressed.length / 1024 / 1024).toFixed(1)}MB`);
    return { buffer: compressed, mediaType: "image/jpeg" };
  }

  compressed = await sharp(buffer)
    .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 40 })
    .toBuffer();

  console.log(`[image] Pass 3: ${(compressed.length / 1024 / 1024).toFixed(1)}MB`);
  return { buffer: compressed, mediaType: "image/jpeg" };
}

async function parseWordBuffer(buffer: Buffer, filename: string): Promise<{ text: string; fieldNames: string[]; hasDataRows: boolean }> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value || "";
    if (!rawText.trim()) {
      return {
        text: `**Uploaded File: ${filename}**\n\nThe Word document appears to be empty.`,
        fieldNames: [],
        hasDataRows: false,
      };
    }

    const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    let fieldNames: string[] = [];
    let hasDataRows = false;
    let parsedTable = false;
    let resultText = `**Uploaded File: ${filename}**\n\n`;

    const tsvLines = lines.filter(l => l.includes("\t") && l.split("\t").length >= 2);
    if (tsvLines.length >= 2) {
      const headers = tsvLines[0].split("\t").map(h => h.trim());
      fieldNames = headers.filter(h => h.length > 0);
      hasDataRows = tsvLines.length > 1;
      parsedTable = true;

      resultText += `**Detected Table (${tsvLines.length - 1} rows)**\n`;
      resultText += `**Fields/Columns:** ${headers.join(", ")}\n\n`;

      const dataRows = tsvLines.slice(1);
      const columnTypes = headers.map((_, j) => {
        const colValues = dataRows.slice(0, 100).map(row => row.split("\t")[j]?.trim());
        return inferColumnType(colValues);
      });
      resultText += `**Column Data Types (inferred):** ${headers.map((h, i) => `${h} (${columnTypes[i]})`).join(", ")}\n\n`;

      const sampleCount = Math.min(5, dataRows.length);
      resultText += `**Sample Data (first ${sampleCount} rows):**\n`;
      resultText += "| " + headers.join(" | ") + " |\n";
      resultText += "| " + headers.map(() => "---").join(" | ") + " |\n";
      for (let i = 0; i < sampleCount; i++) {
        const cells = dataRows[i].split("\t").map(c => c.trim());
        resultText += "| " + headers.map((_, j) => cells[j] ?? "").join(" | ") + " |\n";
      }
      resultText += `\n**Total rows:** ${dataRows.length}\n\n`;
    }

    if (!parsedTable) {
      const csvLikeLines = lines.filter(l => l.includes(",") && l.split(",").length >= 3);
      if (csvLikeLines.length >= 2) {
        const headers = csvLikeLines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const isLikelyHeader = headers.every(h => !/^\d+(\.\d+)?$/.test(h) && h.length < 80);
        if (isLikelyHeader) {
          fieldNames = headers.filter(h => h.length > 0);
          hasDataRows = csvLikeLines.length > 1;
          parsedTable = true;

          resultText += `**Detected Table (${csvLikeLines.length - 1} rows)**\n`;
          resultText += `**Fields/Columns:** ${headers.join(", ")}\n\n`;

          const dataRows = csvLikeLines.slice(1);
          const sampleCount = Math.min(5, dataRows.length);
          resultText += `**Sample Data (first ${sampleCount} rows):**\n`;
          resultText += "| " + headers.join(" | ") + " |\n";
          resultText += "| " + headers.map(() => "---").join(" | ") + " |\n";
          for (let i = 0; i < sampleCount; i++) {
            const cells = dataRows[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
            resultText += "| " + headers.map((_, j) => cells[j] ?? "").join(" | ") + " |\n";
          }
          resultText += `\n**Total rows:** ${dataRows.length}\n\n`;
        }
      }
    }

    if (!parsedTable) {
      for (const delim of ["|", ";"]) {
        const delimLines = lines.filter(l => l.includes(delim) && l.split(delim).length >= 3);
        if (delimLines.length >= 2) {
          const separatorLineIdx = delimLines.findIndex(l => /^[\s|;:-]+$/.test(l.replace(/[|;]/g, "").trim()));
          let headerLine = delimLines[0];
          let dataStart = 1;
          if (separatorLineIdx === 1) dataStart = 2;
          const headers = headerLine.split(delim).map(h => h.trim()).filter(h => h.length > 0);
          if (headers.length >= 2) {
            fieldNames = headers;
            const dataRows = delimLines.slice(dataStart).filter(l => !/^[\s|;:-]+$/.test(l.replace(/[|;]/g, "").trim()));
            hasDataRows = dataRows.length > 0;
            parsedTable = true;

            resultText += `**Detected Table (${dataRows.length} rows)**\n`;
            resultText += `**Fields/Columns:** ${headers.join(", ")}\n\n`;

            const sampleCount = Math.min(5, dataRows.length);
            resultText += `**Sample Data (first ${sampleCount} rows):**\n`;
            resultText += "| " + headers.join(" | ") + " |\n";
            resultText += "| " + headers.map(() => "---").join(" | ") + " |\n";
            for (let i = 0; i < sampleCount; i++) {
              const cells = dataRows[i].split(delim).map(c => c.trim()).filter(c => c.length > 0);
              resultText += "| " + headers.map((_, j) => cells[j] ?? "").join(" | ") + " |\n";
            }
            resultText += `\n**Total rows:** ${dataRows.length}\n\n`;
            break;
          }
        }
      }
    }

    if (!parsedTable) {
      const potentialHeaders: string[] = [];
      for (const line of lines.slice(0, 30)) {
        const colonMatch = line.match(/^([^:]+):\s*(.+)/);
        if (colonMatch) {
          potentialHeaders.push(colonMatch[1].trim());
        }
      }
      if (potentialHeaders.length >= 3) {
        fieldNames = potentialHeaders;
      }
    }

    const maxTextLen = 8000;
    const textForContext = rawText.length > maxTextLen ? rawText.slice(0, maxTextLen) + "\n\n[...text truncated...]" : rawText;
    resultText += `**Full Extracted Text:**\n\`\`\`\n${textForContext}\n\`\`\`\n`;

    return { text: resultText, fieldNames, hasDataRows };
  } catch (error) {
    return {
      text: `**Error parsing Word document ${filename}:** ${error instanceof Error ? error.message : "Unknown error"}`,
      fieldNames: [],
      hasDataRows: false,
    };
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  await parser.destroy();
  return result.text || "";
}

async function parsePdfBuffer(buffer: Buffer, filename: string): Promise<{ text: string; fieldNames: string[]; hasDataRows: boolean }> {
  try {
    const rawText = await extractPdfText(buffer);
    if (!rawText.trim()) {
      return {
        text: `**Uploaded File: ${filename}**\n\nThe PDF appears to be empty or contains only images/scanned content that cannot be extracted as text.`,
        fieldNames: [],
        hasDataRows: false,
      };
    }

    const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    let fieldNames: string[] = [];
    let hasDataRows = false;
    let parsedTable = false;
    let resultText = `**Uploaded File: ${filename}**\n\n`;

    const tsvLines = lines.filter(l => l.includes("\t") && l.split("\t").length >= 2);
    if (tsvLines.length >= 2) {
      const headers = tsvLines[0].split("\t").map(h => h.trim());
      fieldNames = headers.filter(h => h.length > 0);
      hasDataRows = tsvLines.length > 1;
      parsedTable = true;

      resultText += `**Detected Table (${tsvLines.length - 1} rows)**\n`;
      resultText += `**Fields/Columns:** ${headers.join(", ")}\n\n`;

      const dataRows = tsvLines.slice(1);
      const columnTypes = headers.map((_, j) => {
        const colValues = dataRows.slice(0, 100).map(row => row.split("\t")[j]?.trim());
        return inferColumnType(colValues);
      });
      resultText += `**Column Data Types (inferred):** ${headers.map((h, i) => `${h} (${columnTypes[i]})`).join(", ")}\n\n`;

      const sampleCount = Math.min(5, dataRows.length);
      resultText += `**Sample Data (first ${sampleCount} rows):**\n`;
      resultText += "| " + headers.join(" | ") + " |\n";
      resultText += "| " + headers.map(() => "---").join(" | ") + " |\n";
      for (let i = 0; i < sampleCount; i++) {
        const cells = dataRows[i].split("\t").map(c => c.trim());
        resultText += "| " + headers.map((_, j) => cells[j] ?? "").join(" | ") + " |\n";
      }
      resultText += `\n**Total rows:** ${dataRows.length}\n\n`;
    }

    if (!parsedTable) {
      const csvLikeLines = lines.filter(l => l.includes(",") && l.split(",").length >= 3);
      if (csvLikeLines.length >= 2) {
        const headers = csvLikeLines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
        const isLikelyHeader = headers.every(h => !/^\d+(\.\d+)?$/.test(h) && h.length < 80);
        if (isLikelyHeader) {
          fieldNames = headers.filter(h => h.length > 0);
          hasDataRows = csvLikeLines.length > 1;
          parsedTable = true;

          resultText += `**Detected Table (${csvLikeLines.length - 1} rows)**\n`;
          resultText += `**Fields/Columns:** ${headers.join(", ")}\n\n`;

          const dataRows = csvLikeLines.slice(1);
          const sampleCount = Math.min(5, dataRows.length);
          resultText += `**Sample Data (first ${sampleCount} rows):**\n`;
          resultText += "| " + headers.join(" | ") + " |\n";
          resultText += "| " + headers.map(() => "---").join(" | ") + " |\n";
          for (let i = 0; i < sampleCount; i++) {
            const cells = dataRows[i].split(",").map(c => c.trim().replace(/^"|"$/g, ""));
            resultText += "| " + headers.map((_, j) => cells[j] ?? "").join(" | ") + " |\n";
          }
          resultText += `\n**Total rows:** ${dataRows.length}\n\n`;
        }
      }
    }

    if (!parsedTable) {
      const repeatingDelimiters = ["|", ";"];
      for (const delim of repeatingDelimiters) {
        const delimLines = lines.filter(l => l.includes(delim) && l.split(delim).length >= 3);
        if (delimLines.length >= 2) {
          const separatorLineIdx = delimLines.findIndex(l => /^[\s|:-]+$/.test(l.replace(/\|/g, "").replace(/-/g, "").replace(/:/g, "").trim()) || l.replace(/[^|]/g, "").length > 2 && l.replace(/[^-]/g, "").length > 2);
          let headerLine = delimLines[0];
          let dataStart = 1;
          if (separatorLineIdx === 1) {
            dataStart = 2;
          }
          const headers = headerLine.split(delim).map(h => h.trim()).filter(h => h.length > 0);
          if (headers.length >= 2) {
            fieldNames = headers;
            const dataRows = delimLines.slice(dataStart).filter(l => !/^[\s|:-]+$/.test(l.replace(/\|/g, "").replace(/-/g, "").replace(/:/g, "").trim()));
            hasDataRows = dataRows.length > 0;
            parsedTable = true;

            resultText += `**Detected Table (${dataRows.length} rows)**\n`;
            resultText += `**Fields/Columns:** ${headers.join(", ")}\n\n`;

            const sampleCount = Math.min(5, dataRows.length);
            resultText += `**Sample Data (first ${sampleCount} rows):**\n`;
            resultText += "| " + headers.join(" | ") + " |\n";
            resultText += "| " + headers.map(() => "---").join(" | ") + " |\n";
            for (let i = 0; i < sampleCount; i++) {
              const cells = dataRows[i].split(delim).map(c => c.trim()).filter(c => c.length > 0);
              resultText += "| " + headers.map((_, j) => cells[j] ?? "").join(" | ") + " |\n";
            }
            resultText += `\n**Total rows:** ${dataRows.length}\n\n`;
            break;
          }
        }
      }
    }

    if (!parsedTable) {
      const potentialHeaders: string[] = [];
      for (const line of lines.slice(0, 30)) {
        const colonMatch = line.match(/^([^:]+):\s*(.+)/);
        if (colonMatch) {
          potentialHeaders.push(colonMatch[1].trim());
        }
      }
      if (potentialHeaders.length >= 3) {
        fieldNames = potentialHeaders;
      }
    }

    const maxTextLen = 8000;
    const textForContext = rawText.length > maxTextLen ? rawText.slice(0, maxTextLen) + "\n\n[...text truncated...]" : rawText;
    resultText += `**Full Extracted Text:**\n\`\`\`\n${textForContext}\n\`\`\`\n`;

    return { text: resultText, fieldNames, hasDataRows };
  } catch (error) {
    return {
      text: `**Error parsing PDF ${filename}:** ${error instanceof Error ? error.message : "Unknown error"}`,
      fieldNames: [],
      hasDataRows: false,
    };
  }
}

function profilePdfData(lines: string[]): ProfiledData | null {
  const tsvLines = lines.filter(l => l.includes("\t") && l.split("\t").length >= 2);
  if (tsvLines.length >= 2) {
    const headers = tsvLines[0].split("\t").map(h => h.trim());
    const dataRows = tsvLines.slice(1).map(r => r.split("\t").map(c => c.trim()));
    return buildProfileFromRows(headers, dataRows);
  }

  const csvLines = lines.filter(l => l.includes(",") && l.split(",").length >= 3);
  if (csvLines.length >= 2) {
    const headers = csvLines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    const isLikelyHeader = headers.every(h => !/^\d+(\.\d+)?$/.test(h) && h.length < 80);
    if (isLikelyHeader) {
      const dataRows = csvLines.slice(1).map(r => r.split(",").map(c => c.trim().replace(/^"|"$/g, "")));
      return buildProfileFromRows(headers, dataRows);
    }
  }

  for (const delim of ["|", ";"]) {
    const delimLines = lines.filter(l => l.includes(delim) && l.split(delim).length >= 3);
    if (delimLines.length >= 2) {
      const separatorLineIdx = delimLines.findIndex(l => /^[\s|;:-]+$/.test(l.replace(/[|;]/g, "").trim()));
      let headerLine = delimLines[0];
      let dataStart = 1;
      if (separatorLineIdx === 1) dataStart = 2;
      const headers = headerLine.split(delim).map(h => h.trim()).filter(h => h.length > 0);
      if (headers.length >= 2) {
        const dataRows = delimLines.slice(dataStart)
          .filter(l => !/^[\s|;:-]+$/.test(l.replace(/[|;]/g, "").trim()))
          .map(r => {
            const cells = r.split(delim).map(c => c.trim()).filter(c => c.length > 0);
            return headers.map((_, j) => cells[j] || "");
          });
        if (dataRows.length > 0) return buildProfileFromRows(headers, dataRows);
      }
    }
  }

  return null;
}

function buildProfileFromRows(headers: string[], dataRows: string[][]): ProfiledData | null {
  if (headers.length === 0 || dataRows.length === 0) return null;
  const totalRows = dataRows.length;
  const totalColumns = headers.length;

  const columns: ColumnProfile[] = headers.map((header, colIdx) => {
    const values = dataRows.map(row => row[colIdx]);
    const nonNullValues = values.filter(v => v != null && v !== "");
    const nullCount = totalRows - nonNullValues.length;
    const nullPct = totalRows > 0 ? Math.round((nullCount / totalRows) * 10000) / 100 : 0;
    const uniqueValues = new Set(nonNullValues.map(v => String(v))).size;
    const colType = inferColumnType(nonNullValues);

    const profile: ColumnProfile = {
      column_name: header,
      data_type: colType,
      null_count: nullCount,
      null_pct: nullPct,
      unique_values: uniqueValues,
    };

    if (colType === "Number") {
      const nums = nonNullValues.map(v => Number(v)).filter(n => !isNaN(n));
      if (nums.length > 0) {
        nums.sort((a, b) => a - b);
        profile.min = nums[0];
        profile.max = nums[nums.length - 1];
        const sum = nums.reduce((a, b) => a + b, 0);
        profile.mean = Math.round((sum / nums.length) * 100) / 100;
        const mid = Math.floor(nums.length / 2);
        profile.median = nums.length % 2 === 0 ? Math.round(((nums[mid - 1] + nums[mid]) / 2) * 100) / 100 : nums[mid];
        if (nums.length > 1) {
          const mean = sum / nums.length;
          const variance = nums.reduce((acc, n) => acc + (n - mean) ** 2, 0) / (nums.length - 1);
          profile.std_dev = Math.round(Math.sqrt(variance) * 100) / 100;
        }
      }
    } else if (colType === "String") {
      const freqMap = new Map<string, number>();
      nonNullValues.forEach(v => {
        const s = String(v);
        freqMap.set(s, (freqMap.get(s) || 0) + 1);
      });
      const sorted = Array.from(freqMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
      profile.top_values = sorted.map(([value, count]) => ({ value, count }));
    } else if (colType === "Date") {
      const dates = nonNullValues.map(v => new Date(String(v))).filter(d => !isNaN(d.getTime()));
      if (dates.length > 0) {
        dates.sort((a, b) => a.getTime() - b.getTime());
        profile.earliest = dates[0].toISOString().split("T")[0];
        profile.latest = dates[dates.length - 1].toISOString().split("T")[0];
        profile.date_range_days = Math.round((dates[dates.length - 1].getTime() - dates[0].getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return profile;
  });

  const sampleRows = dataRows.slice(0, 10);
  return { total_rows: totalRows, total_columns: totalColumns, columns, sample_rows: sampleRows, headers };
}

export function registerChatRoutes(app: Express): void {
  app.get("/api/conversations", async (_req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/all", async (_req: Request, res: Response) => {
    try {
      await chatStorage.deleteAllConversations();
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting all conversations:", error);
      res.status(500).json({ error: "Failed to delete all conversations" });
    }
  });

  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.post("/api/conversations/:id/messages", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      let userContent = req.body.content || "";
      let extractedFieldNames: string[] = [];
      let insightsMode = false;
      let profiledDataText = "";
      let profiledColumns: ColumnProfile[] = [];

      const originalUserMessage = userContent;

      let imageContent: { base64: string; mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" } | null = null;

      if (req.file) {
        if (isImage(req.file.originalname, req.file.mimetype)) {
          const compressed = await compressImageBuffer(req.file.buffer, req.file.mimetype);
          const base64Str = compressed.buffer.toString("base64");
          const base64SizeMB = (base64Str.length / (1024 * 1024)).toFixed(1);
          console.log(`[image] Final base64 size: ${base64SizeMB}MB`);
          if (base64Str.length > 5 * 1024 * 1024) {
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.write(`data: ${JSON.stringify({ type: "error", content: "The uploaded image is too large to process even after compression. Please upload a smaller or lower-resolution image (under 4 MB recommended)." })}\n\n`);
            res.write("data: [DONE]\n\n");
            return res.end();
          }
          imageContent = {
            base64: base64Str,
            mediaType: compressed.mediaType,
          };
          const imageDesc = `**Uploaded Image: ${req.file.originalname}**\n\n[Image uploaded for analysis — data will be extracted by AI vision]`;
          userContent = userContent ? `${userContent}\n\n${imageDesc}` : imageDesc;
        } else {
          let fileContent: { text: string; fieldNames: string[]; hasDataRows: boolean };

          if (isPdf(req.file.originalname, req.file.mimetype)) {
            fileContent = await parsePdfBuffer(req.file.buffer, req.file.originalname);
          } else if (isWord(req.file.originalname, req.file.mimetype)) {
            fileContent = await parseWordBuffer(req.file.buffer, req.file.originalname);
          } else {
            fileContent = parseExcelBuffer(req.file.buffer, req.file.originalname);
          }

          userContent = userContent ? `${userContent}\n\n${fileContent.text}` : fileContent.text;
          extractedFieldNames = fileContent.fieldNames;

          if (fileContent.hasDataRows && isInsightsRequest(originalUserMessage)) {
            insightsMode = true;
            if (isPdf(req.file.originalname, req.file.mimetype)) {
              const rawText = await extractPdfText(req.file.buffer);
              const pdfLines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);
              const profiledData = profilePdfData(pdfLines);
              if (profiledData) {
                profiledDataText = formatProfiledDataForPrompt(profiledData, req.file.originalname);
                profiledColumns = profiledData.columns;
              }
            } else if (isWord(req.file.originalname, req.file.mimetype)) {
              const wordResult = await mammoth.extractRawText({ buffer: req.file.buffer });
              const wordLines = (wordResult.value || "").split("\n").map(l => l.trim()).filter(l => l.length > 0);
              const profiledData = profilePdfData(wordLines);
              if (profiledData) {
                profiledDataText = formatProfiledDataForPrompt(profiledData, req.file.originalname);
                profiledColumns = profiledData.columns;
              }
            } else {
              const profiledData = profileExcelData(req.file.buffer, req.file.originalname);
              if (profiledData) {
                profiledDataText = formatProfiledDataForPrompt(profiledData, req.file.originalname);
                profiledColumns = profiledData.columns;
              }
            }
          }
        }
      }


      if (!userContent.trim()) {
        return res.status(400).json({ error: "Message content is required" });
      }

      await chatStorage.createMessage(conversationId, "user", userContent);

      const allMessages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = allMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      if (insightsMode && profiledDataText) {
        const lastMsg = chatMessages[chatMessages.length - 1];
        if (lastMsg) {
          lastMsg.content = `${originalUserMessage}\n\n${profiledDataText}`;
        }
      }

      if (!req.file && extractedFieldNames.length === 0 && isPiiRequest(originalUserMessage)) {
        const { fieldNames: historyFields, fileInfo } = extractFieldNamesFromHistory(
          chatMessages.slice(0, -1).map(m => ({ role: m.role, content: m.content }))
        );
        if (historyFields.length > 0) {
          const lastMsg = chatMessages[chatMessages.length - 1];
          if (lastMsg) {
            lastMsg.content = `${originalUserMessage}\n\n[SYSTEM NOTE: ${fileInfo}. The following columns are available for PII scanning — perform the scan immediately on these column names, do not ask for clarification or additional data: ${historyFields.join(", ")}]`;
          }
          extractedFieldNames = historyFields;
          console.log(`[pii] Injected ${historyFields.length} field names from conversation history for PII scan`);
        }
      }

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (insightsMode) {
        res.write(`data: ${JSON.stringify({ insightsMode: true })}\n\n`);
        if (profiledColumns.length > 0) {
          res.write(`data: ${JSON.stringify({ profiledColumns })}\n\n`);
        }
      }

      if (extractedFieldNames.length > 0) {
        res.write(`data: ${JSON.stringify({ fieldNames: extractedFieldNames })}\n\n`);
      }

      const systemPrompt = insightsMode ? INSIGHTS_SYSTEM_PROMPT : SYSTEM_PROMPT;

      if (imageContent) {
        const lastMsg = chatMessages[chatMessages.length - 1];
        if (lastMsg && lastMsg.role === "user") {
          (lastMsg as any).content = [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: imageContent.mediaType,
                data: imageContent.base64,
              },
            },
            {
              type: "text",
              text: originalUserMessage || "Please extract and analyze all data from this image. If it contains a table, extract the table data with headers and rows. Then apply data governance analysis as requested.",
            },
          ];
        }
      }

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: systemPrompt,
        messages: chatMessages,
      });

      let fullResponse = "";

      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const content = event.delta.text;
          if (content) {
            fullResponse += content;
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }
        }
      }

      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to process message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });
}
