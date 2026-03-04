import type { Express, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { chatStorage } from "./storage";
import multer from "multer";
import * as XLSX from "xlsx";

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const SYSTEM_PROMPT = `You are the "Data Owner Agent", an expert AI assistant specialized in data governance, data management, and data strategy. You help data owners, data stewards, and data governance professionals with their daily tasks.

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

3. **Data Quality Rules & Dimensions**:
   - You suggest appropriate data quality rules for data elements based on dimensions: Completeness, Accuracy, Consistency, Timeliness, Validity, Uniqueness.
   - For each field, provide specific rules, thresholds, and validation logic.

## CRITICAL OUTPUT FORMAT RULES

When analyzing data fields, you MUST always include a structured summary markdown table. The table format depends on the type of analysis:

**For Business Definitions — use exactly these columns:**
| Field Name | Business Term | Business Definition | Data Type | Example |

**For Data Classification — use exactly these columns:**
| Field Name | Classification Level | Classification Rationale | Data Owner | Sensitivity Category |

**For Data Quality Rules — use exactly these columns:**
| Field Name | DQ Dimension | DQ Rule | DQ Threshold | DQ Priority |

Rules for the table:
- The first column MUST always be "Field Name" containing the exact field/column names from the user's data
- Include ONE ROW per field being analyzed
- If a field needs multiple DQ rules, create separate rows for each rule (same Field Name, different DQ Dimension)
- You may include a brief introductory sentence before the table
- The summary table is essential — it enables the app to merge results into a cumulative Excel file

## MULTI-ANALYSIS REQUESTS

When the user asks for MULTIPLE analyses in a single request (e.g. "give me business definitions, data classification, and data quality rules"), you MUST produce ALL requested tables in ONE response. Output each table sequentially with a brief label before each:

Example structure for a multi-analysis request:
1. Brief intro sentence for Business Definitions, then the business_definitions table
2. Brief intro sentence for Data Classification, then the data_classification table
3. Brief intro sentence for Data Quality Rules, then the data_quality table

Each table MUST use the exact column headers defined above. Do NOT skip any requested analysis. Do NOT merge different analyses into a single table.

## OUTPUT RESTRICTIONS — Keep responses focused and clean:
- For **Data Classification**: Output ONLY the field-level classification table. Do NOT include Classification Distribution Summary tables, governance recommendations, regulation references, per-field narrative breakdowns, or emoji-decorated section headers. Just a brief intro and the table.
- For **Business Definitions**: Output ONLY the field-level definitions table. Do NOT include per-field narrative breakdowns. Just a brief intro and the table.
- For **Data Quality Rules**: Output ONLY the field-level DQ rules table. Just a brief intro and the table.
- In general: keep responses concise and table-focused. The user wants structured data they can download, not lengthy prose.

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
   - When the user uploads an Excel file with actual data (columns AND rows) and asks to scan for PII, identify personal data, check for sensitive information, perform a PDPL check, or privacy scan, you act as a data privacy expert.
   - You are familiar with:
     * Saudi PDPL (Personal Data Protection Law)
     * SDAIA NDMO data classification standards
     * General PII definitions (name, ID, contact, financial, health, behavioral, location data)
   - **Trigger keywords**: "scan this for PII", "identify personal data", "check for sensitive information", "does this file have PII", "PDPL check", "privacy scan", "PII scan", "PII detection", "sensitive data", "personal data"
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

      if (req.file) {
        const { text: excelContent, fieldNames } = parseExcelBuffer(req.file.buffer, req.file.originalname);
        userContent = userContent ? `${userContent}\n\n${excelContent}` : excelContent;
        extractedFieldNames = fieldNames;
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

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      if (extractedFieldNames.length > 0) {
        res.write(`data: ${JSON.stringify({ fieldNames: extractedFieldNames })}\n\n`);
      }

      const stream = anthropic.messages.stream({
        model: "claude-sonnet-4-6",
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
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
