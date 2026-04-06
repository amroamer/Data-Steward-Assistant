import { db } from "../../db";
import { systemPrompts } from "../../../shared/models/chat";
import { eq } from "drizzle-orm";

export interface PromptEntry {
  key: string;
  title: string;
  description: string;
  content: string;
}

// In-memory cache — populated at startup from DB (falling back to defaults)
const cache = new Map<string, string>();
// Keeps the original defaults for the reset endpoint
const defaults = new Map<string, string>();
// Ordered list of metadata for the API
const registry: Array<{ key: string; title: string; description: string }> = [];

export async function initPrompts(entries: PromptEntry[]): Promise<void> {
  for (const entry of entries) {
    defaults.set(entry.key, entry.content);
    registry.push({ key: entry.key, title: entry.title, description: entry.description });

    const rows = await db
      .select()
      .from(systemPrompts)
      .where(eq(systemPrompts.key, entry.key));

    if (rows.length === 0) {
      await db.insert(systemPrompts).values({
        key: entry.key,
        title: entry.title,
        content: entry.content,
      });
      cache.set(entry.key, entry.content);
    } else {
      // Preserve user-edited content — only update title metadata
      await db
        .update(systemPrompts)
        .set({ title: entry.title })
        .where(eq(systemPrompts.key, entry.key));
      cache.set(entry.key, rows[0].content);
    }
  }
}

export function getPrompt(key: string): string {
  return cache.get(key) ?? defaults.get(key) ?? "";
}

export function getDefaultPrompt(key: string): string {
  return defaults.get(key) ?? "";
}

export function getAllPrompts(): Array<{ key: string; title: string; description: string; content: string; isModified: boolean }> {
  return registry.map((m) => ({
    ...m,
    content: cache.get(m.key) ?? "",
    isModified: cache.get(m.key) !== defaults.get(m.key),
  }));
}

export async function updatePrompt(key: string, content: string): Promise<void> {
  await db
    .update(systemPrompts)
    .set({ content, updatedAt: new Date() })
    .where(eq(systemPrompts.key, key));
  cache.set(key, content);
}

export async function resetPromptToDefault(key: string): Promise<void> {
  const def = defaults.get(key);
  if (def === undefined) throw new Error(`Unknown prompt key: ${key}`);
  await db
    .update(systemPrompts)
    .set({ content: def, updatedAt: new Date() })
    .where(eq(systemPrompts.key, key));
  cache.set(key, def);
}
