import { db } from "../../db";
import {
  entities,
  entityPrompts,
  entityPageVisibility,
  systemPrompts,
  type Entity,
  type EntityPrompt,
} from "../../../shared/models/chat";
import { eq, and, sql } from "drizzle-orm";
import { getPrompt, getAllPrompts } from "./prompts";

// ── Entity CRUD ───────────────────────────────────────────────────────────────

export async function getEntities(): Promise<Entity[]> {
  return db.select().from(entities).orderBy(entities.name);
}

export async function getEntity(id: number): Promise<Entity | undefined> {
  const rows = await db.select().from(entities).where(eq(entities.id, id));
  return rows[0];
}

export async function getEntityBySlug(slug: string): Promise<Entity | undefined> {
  const rows = await db.select().from(entities).where(eq(entities.slug, slug));
  return rows[0];
}

export async function createEntity(slug: string, name: string): Promise<Entity> {
  const [row] = await db.insert(entities).values({ slug, name }).returning();
  return row;
}

export async function updateEntity(
  id: number,
  data: {
    name?: string;
    isActive?: boolean;
    logoBase64?: string | null;
    appTitle?: string | null;
    colorSidebar?: string | null;
    colorPrimary?: string | null;
    colorSecondary?: string | null;
    colorAccent?: string | null;
    logoInvert?: boolean | null;
  },
): Promise<Entity> {
  const [row] = await db
    .update(entities)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(entities.id, id))
    .returning();
  return row;
}

export async function deleteEntity(id: number): Promise<void> {
  await db.delete(entities).where(eq(entities.id, id));
}

// ── Entity Prompts ────────────────────────────────────────────────────────────

export async function getEntityPromptOverrides(entityId: number): Promise<EntityPrompt[]> {
  return db
    .select()
    .from(entityPrompts)
    .where(eq(entityPrompts.entityId, entityId));
}

/**
 * Get a single prompt for an entity. Falls back to global default if no override.
 */
export async function getPromptForEntity(entityId: number, key: string): Promise<string> {
  const rows = await db
    .select()
    .from(entityPrompts)
    .where(and(eq(entityPrompts.entityId, entityId), eq(entityPrompts.promptKey, key)));

  if (rows.length > 0) return rows[0].content;
  return getPrompt(key); // global default
}

/**
 * Get all prompts for an entity — merged view with override status.
 */
export async function getAllPromptsForEntity(
  entityId: number,
): Promise<Array<{ key: string; title: string; description: string; content: string; isOverridden: boolean }>> {
  const globalPrompts = getAllPrompts();
  const overrides = await getEntityPromptOverrides(entityId);
  const overrideMap = new Map(overrides.map((o) => [o.promptKey, o.content]));

  return globalPrompts.map((p) => ({
    key: p.key,
    title: p.title,
    description: p.description,
    content: overrideMap.has(p.key) ? overrideMap.get(p.key)! : p.content,
    isOverridden: overrideMap.has(p.key),
  }));
}

/**
 * Set or update a prompt override for an entity.
 */
export async function updateEntityPrompt(
  entityId: number,
  promptKey: string,
  content: string,
): Promise<void> {
  const existing = await db
    .select()
    .from(entityPrompts)
    .where(and(eq(entityPrompts.entityId, entityId), eq(entityPrompts.promptKey, promptKey)));

  if (existing.length > 0) {
    await db
      .update(entityPrompts)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(entityPrompts.entityId, entityId), eq(entityPrompts.promptKey, promptKey)));
  } else {
    await db.insert(entityPrompts).values({ entityId, promptKey, content });
  }
}

/**
 * Remove an entity's override for a prompt key (reverts to global default).
 */
export async function resetEntityPrompt(entityId: number, promptKey: string): Promise<void> {
  await db
    .delete(entityPrompts)
    .where(and(eq(entityPrompts.entityId, entityId), eq(entityPrompts.promptKey, promptKey)));
}

// ── Page Visibility ───────────────────────────────────────────────────────────

const DEFAULT_PAGES = [
  "data-classification",
  "business-definitions",
  "dq-rules",
  "pii-detection",
  "informatica",
  "data-model",
  "insights",
  "nudge",
  "bi",
];

export async function getEntityPageVisibility(
  entityId: number,
): Promise<Record<string, boolean>> {
  const rows = await db
    .select()
    .from(entityPageVisibility)
    .where(eq(entityPageVisibility.entityId, entityId));

  // Start with all visible by default
  const result: Record<string, boolean> = {};
  for (const page of DEFAULT_PAGES) {
    result[page] = true;
  }
  // Apply DB overrides
  for (const row of rows) {
    result[row.pageKey] = row.isVisible;
  }
  return result;
}

export async function setEntityPageVisibility(
  entityId: number,
  pageKey: string,
  visible: boolean,
): Promise<void> {
  const existing = await db
    .select()
    .from(entityPageVisibility)
    .where(
      and(eq(entityPageVisibility.entityId, entityId), eq(entityPageVisibility.pageKey, pageKey)),
    );

  if (existing.length > 0) {
    await db
      .update(entityPageVisibility)
      .set({ isVisible: visible })
      .where(
        and(eq(entityPageVisibility.entityId, entityId), eq(entityPageVisibility.pageKey, pageKey)),
      );
  } else {
    await db.insert(entityPageVisibility).values({ entityId, pageKey, isVisible: visible });
  }
}

export async function bulkSetEntityPageVisibility(
  entityId: number,
  pages: Record<string, boolean>,
): Promise<void> {
  for (const [pageKey, visible] of Object.entries(pages)) {
    await setEntityPageVisibility(entityId, pageKey, visible);
  }
}

// ── Import / Export ───────────────────────────────────────────────────────────

export interface PromptExport {
  entity_slug: string;
  entity_name: string;
  exported_at: string;
  prompts: Record<string, { title: string; content: string }>;
  page_visibility: Record<string, boolean>;
  branding?: {
    logo_base64: string | null;
    app_title: string | null;
    color_sidebar: string | null;
    color_primary: string | null;
    color_secondary: string | null;
    color_accent: string | null;
    logo_invert: boolean | null;
  };
}

export async function exportEntityData(entityId: number): Promise<PromptExport> {
  const entity = await getEntity(entityId);
  if (!entity) throw new Error("Entity not found");

  const allPrompts = await getAllPromptsForEntity(entityId);
  const visibility = await getEntityPageVisibility(entityId);

  const prompts: Record<string, { title: string; content: string }> = {};
  for (const p of allPrompts) {
    prompts[p.key] = { title: p.title, content: p.content };
  }

  return {
    entity_slug: entity.slug,
    entity_name: entity.name,
    exported_at: new Date().toISOString(),
    prompts,
    page_visibility: visibility,
    branding: {
      logo_base64: entity.logoBase64,
      app_title: entity.appTitle,
      color_sidebar: entity.colorSidebar,
      color_primary: entity.colorPrimary,
      color_secondary: entity.colorSecondary,
      color_accent: entity.colorAccent,
      logo_invert: entity.logoInvert,
    },
  };
}

export async function importEntityData(
  entityId: number,
  data: PromptExport,
): Promise<{ promptsImported: number; visibilityImported: number; brandingImported: boolean }> {
  let promptsImported = 0;
  let visibilityImported = 0;
  let brandingImported = false;

  if (data.prompts) {
    for (const [key, { content }] of Object.entries(data.prompts)) {
      await updateEntityPrompt(entityId, key, content);
      promptsImported++;
    }
  }

  if (data.page_visibility) {
    await bulkSetEntityPageVisibility(entityId, data.page_visibility);
    visibilityImported = Object.keys(data.page_visibility).length;
  }

  if (data.branding) {
    await updateEntity(entityId, {
      logoBase64: data.branding.logo_base64,
      appTitle: data.branding.app_title,
      colorSidebar: data.branding.color_sidebar,
      colorPrimary: data.branding.color_primary,
      colorSecondary: data.branding.color_secondary,
      colorAccent: data.branding.color_accent,
      logoInvert: data.branding.logo_invert,
    });
    brandingImported = true;
  }

  return { promptsImported, visibilityImported, brandingImported };
}

// ── Seeding ───────────────────────────────────────────────────────────────────

export async function seedEntities(): Promise<void> {
  const existing = await db.select().from(entities);
  if (existing.length > 0) return;

  await db.insert(entities).values([
    { slug: "zatca", name: "ZATCA" },
    {
      slug: "kpmg",
      name: "KPMG",
      appTitle: "KPMG Data Owner Agent",
      colorSidebar: "#00338D",
      colorPrimary: "#005EB8",
      colorSecondary: "#00338D",
      colorAccent: "#0091DA",
    },
  ]);
}
