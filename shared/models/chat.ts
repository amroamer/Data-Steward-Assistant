import { pgTable, serial, integer, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// ── Entities ──────────────────────────────────────────────────────────────────

export const entities = pgTable("entities", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  // Branding
  logoBase64: text("logo_base64"),
  appTitle: text("app_title"),
  colorSidebar: text("color_sidebar"),
  colorPrimary: text("color_primary"),
  colorSecondary: text("color_secondary"),
  colorAccent: text("color_accent"),
  logoInvert: boolean("logo_invert").default(true),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ── Entity Prompts (per-entity overrides of system_prompts) ───────────────────

export const entityPrompts = pgTable("entity_prompts", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  promptKey: text("prompt_key").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ── Entity Page Visibility ────────────────────────────────────────────────────

export const entityPageVisibility = pgTable("entity_page_visibility", {
  id: serial("id").primaryKey(),
  entityId: integer("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
  pageKey: text("page_key").notNull(),
  isVisible: boolean("is_visible").default(true).notNull(),
});

// ── System Prompts (global defaults) ──────────────────────────────────────────

export const systemPrompts = pgTable("system_prompts", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ── Conversations ─────────────────────────────────────────────────────────────

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  agentMode: text("agent_mode").default("data-management").notNull(),
  entityId: integer("entity_id").references(() => entities.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ── Messages ──────────────────────────────────────────────────────────────────

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ── Zod Schemas ───────────────────────────────────────────────────────────────

export const insertEntitySchema = createInsertSchema(entities).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEntityPromptSchema = createInsertSchema(entityPrompts).omit({
  id: true,
  updatedAt: true,
});

export const insertEntityPageVisibilitySchema = createInsertSchema(entityPageVisibility).omit({
  id: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

// ── User ↔ Entity Assignment (many-to-many) ──────────────────────────────────

export const userEntities = pgTable("user_entities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  entityId: integer("entity_id").notNull().references(() => entities.id, { onDelete: "cascade" }),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ── Types ─────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UserEntity = typeof userEntities.$inferSelect;
export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type EntityPrompt = typeof entityPrompts.$inferSelect;
export type InsertEntityPrompt = z.infer<typeof insertEntityPromptSchema>;
export type EntityPageVisibilityRow = typeof entityPageVisibility.$inferSelect;
export type InsertEntityPageVisibility = z.infer<typeof insertEntityPageVisibilitySchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
