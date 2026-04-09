import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { registerChatRoutes } from "./replit_integrations/chat";

const BASE_PATH = "/dataowner";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Strip /dataowner prefix from API requests so routes work behind
  // a reverse proxy that only forwards the base path.
  // e.g. /dataowner/api/entities → /api/entities
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.path.startsWith(`${BASE_PATH}/api`)) {
      req.url = req.url.replace(BASE_PATH, "");
    }
    next();
  });

  // Register all chat/entity/user API routes directly on the app
  await registerChatRoutes(app);

  // ── Debug config endpoint ─────────────────────────────────────────────────
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
      ragflow_base_url: process.env.RAGFLOW_BASE_URL || "http://localhost:3000",
      ragflow_api_key_set: !!ragflowKey,
      ragflow_api_key_prefix: ragflowKey ? ragflowKey.slice(0, 7) : null,
      anthropic_key_set: !!anthropicKey,
      node_env: process.env.NODE_ENV || "development",
    });
  });

  return httpServer;
}
