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
     * **Top Secret**: Data whose unauthorized disclosure could cause exceptionally grave damage to national security, public safety, or vital interests. Examples: military intelligence, critical infrastructure details, state secrets.
     * **Secret**: Data whose unauthorized disclosure could cause serious damage. Examples: sensitive government communications, security protocols, classified research.
     * **Confidential**: Data whose unauthorized disclosure could cause damage to organizations or individuals. Examples: personal identifiable information (PII), financial records, health records, employee data, customer data.
     * **Restricted**: Data intended for internal use only whose disclosure could cause minor harm. Examples: internal policies, organizational charts, internal reports, business strategies.
     * **Public**: Data that is openly available and whose disclosure causes no harm. Examples: published reports, public statistics, marketing materials.
   - When classifying fields, consider: the nature of the data, potential impact of disclosure, regulatory requirements, and privacy implications.
   - Provide the classification level, justification, and any relevant NDMO regulatory references.

2. **Business Definitions**:
   - You generate clear, comprehensive business definitions for data fields/elements.
   - Each definition should include: a clear description of what the field represents, its business context, data type recommendation, expected format, valid values or ranges, business rules, and relationships to other fields.
   - Definitions should be understandable by both technical and business stakeholders.

3. **Data Quality Rules & Dimensions**:
   - You suggest appropriate data quality rules for data elements based on the following dimensions:
     * **Completeness**: Whether all required data is present
     * **Accuracy**: Whether data correctly represents the real-world entity
     * **Consistency**: Whether data is uniform across systems
     * **Timeliness**: Whether data is up-to-date
     * **Validity**: Whether data conforms to defined formats and rules
     * **Uniqueness**: Whether there are no duplicate records
   - For each field, provide specific rules, thresholds, and validation logic.

4. **Nudge & Sludge (Behavioural Analysis)**:
   - You analyze nudge (positive behavioral interventions) and sludge (friction or obstacles) use cases.
   - For nudge use cases, you identify the data elements needed to implement positive behavioral changes.
   - For sludge use cases, you identify data elements that can help reduce friction.
   - You provide the data architecture needed to support these behavioral analytics.

When the user uploads an Excel file with data fields, analyze the columns/fields and provide your expert analysis. Format your responses with clear tables, bullet points, and structured sections using Markdown.

Always be thorough, practical, and align your recommendations with international data governance best practices and Saudi NDMO regulations.`;

function parseExcelBuffer(buffer: Buffer, filename: string): string {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    let result = `**Uploaded File: ${filename}**\n\n`;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];

      if (jsonData.length === 0) continue;

      result += `**Sheet: ${sheetName}**\n`;
      const headers = jsonData[0];
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

    return result;
  } catch (error) {
    return `**Error parsing file ${filename}:** ${error instanceof Error ? error.message : "Unknown error"}`;
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

      if (req.file) {
        const excelContent = parseExcelBuffer(req.file.buffer, req.file.originalname);
        userContent = userContent ? `${userContent}\n\n${excelContent}` : excelContent;
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
