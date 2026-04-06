import type { Express, Request, Response } from "express";
import { type Server } from "http";
import { registerChatRoutes } from "./replit_integrations/chat";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await registerChatRoutes(app);

  // ── Debug config endpoint ─────────────────────────────────────────────────
  // Available when NODE_ENV !== "production" OR when DEBUG_MODE=true is set.
  app.get("/api/debug/config", (_req: Request, res: Response) => {
    const allowed =
      process.env.NODE_ENV !== "production" ||
      process.env.DEBUG_MODE === "true";
    if (!allowed) {
      return res
        .status(403)
        .json({ error: "Debug endpoint disabled in production. Set DEBUG_MODE=true to enable." });
    }

    const anthropicKey =
      process.env.ANTHROPIC_API_KEY ||
      process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ||
      "";
    const ragflowKey = process.env.RAGFLOW_API_KEY || "";

    return res.json({
      ai_provider: process.env.AI_PROVIDER || "claude",
      ragflow_base_url: process.env.RAGFLOW_BASE_URL || "http://localhost:8000",
      ragflow_api_key_set: !!ragflowKey,
      ragflow_api_key_prefix: ragflowKey ? ragflowKey.slice(0, 7) : null,
      anthropic_key_set: !!anthropicKey,
      node_env: process.env.NODE_ENV || "development",
    });
  });

  return httpServer;
}
