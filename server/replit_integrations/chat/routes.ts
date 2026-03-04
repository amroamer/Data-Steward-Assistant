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

## OUTPUT RESTRICTIONS — Keep responses focused and clean:
- For **Data Classification**: Output ONLY the field-level classification table. Do NOT include Classification Distribution Summary tables, governance recommendations, regulation references, per-field narrative breakdowns, or emoji-decorated section headers. Just a brief intro and the table.
- For **Business Definitions**: Output ONLY the field-level definitions table. Do NOT include per-field narrative breakdowns. Just a brief intro and the table.
- For **Data Quality Rules**: Output ONLY the field-level DQ rules table. Just a brief intro and the table.
- In general: keep responses concise and table-focused. The user wants structured data they can download, not lengthy prose.

Always be thorough, practical, and align your recommendations with international data governance best practices and Saudi NDMO regulations.`;

function parseExcelBuffer(buffer: Buffer, filename: string): { text: string; fieldNames: string[] } {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    let result = `**Uploaded File: ${filename}**\n\n`;
    let allFieldNames: string[] = [];

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) continue;

      const headers = jsonData[0].map((h: any) => String(h || ""));
      allFieldNames = [...allFieldNames, ...headers.filter((h: string) => h.trim())];

      result += `**Sheet: ${sheetName}**\n`;
      result += `**Fields/Columns:** ${headers.join(", ")}\n\n`;

      if (jsonData.length > 1) {
        result += `**Sample Data (first ${Math.min(5, jsonData.length - 1)} rows):**\n`;
        result += "| " + headers.join(" | ") + " |\n";
        result += "| " + headers.map(() => "---").join(" | ") + " |\n";
        for (let i = 1; i < Math.min(6, jsonData.length); i++) {
          result += "| " + headers.map((_: any, j: number) => jsonData[i]?.[j] ?? "").join(" | ") + " |\n";
        }
        result += `\n**Total rows:** ${jsonData.length - 1}\n`;
      }
      result += "\n";
    }

    return { text: result, fieldNames: allFieldNames };
  } catch (error) {
    return {
      text: `**Error parsing file ${filename}:** ${error instanceof Error ? error.message : "Unknown error"}`,
      fieldNames: [],
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
