/**
 * Seed script — populates the database with all initial data:
 * - Entities (ZATCA, KPMG) with branding
 * - Users (Admin, Amro Alfaris) with entity assignments
 *
 * Run: npx tsx script/seed-data.ts
 * Note: Requires DATABASE_URL env var. Safe to run multiple times (idempotent).
 */

import { db } from "../server/db";
import { entities, users, userEntities } from "../shared/models/chat";
import { eq } from "drizzle-orm";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

const KPMG_LOGO_BASE64 = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA1MjAgMjAwIj4KICA8ZGVmcz4KICAgIDxzdHlsZT4KICAgICAgLmtwbWctYmx1ZSB7IGZpbGw6ICMwMDMzOEQ7IH0KICAgIDwvc3R5bGU+CiAgPC9kZWZzPgogIDwhLS0gRm91ciBzcXVhcmVzIC0tPgogIDxyZWN0IGNsYXNzPSJrcG1nLWJsdWUiIHg9IjE0OCIgeT0iOCIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiByeD0iMiIvPgogIDxyZWN0IGNsYXNzPSJrcG1nLWJsdWUiIHg9IjE4NCIgeT0iOCIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiByeD0iMiIvPgogIDxyZWN0IGNsYXNzPSJrcG1nLWJsdWUiIHg9IjIyMCIgeT0iOCIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiByeD0iMiIvPgogIDxyZWN0IGNsYXNzPSJrcG1nLWJsdWUiIHg9IjI1NiIgeT0iOCIgd2lkdGg9IjI4IiBoZWlnaHQ9IjI4IiByeD0iMiIvPgogIDwhLS0gSyAtLT4KICA8cGF0aCBjbGFzcz0ia3BtZy1ibHVlIiBkPSJNMzAgNTZoMzJ2NTJsNDQtNTJoNDBsLTUwIDU2IDU0IDY4aC00MmwtMzgtNTAtOCA5djQxSDMwVjU2eiIvPgogIDwhLS0gUCAtLT4KICA8cGF0aCBjbGFzcz0ia3BtZy1ibHVlIiBkPSJNMTUyIDU2aDU2YzMyIDAgNTAgMTYgNTAgNDBzLTE4IDQwLTUwIDQwaC0yNHY0NGgtMzJWNTZ6bTMyIDU2aDIwYzE0IDAgMjItNyAyMi0xNnMtOC0xNi0yMi0xNmgtMjB2MzJ6Ii8+CiAgPCEtLSBNIC0tPgogIDxwYXRoIGNsYXNzPSJrcG1nLWJsdWUiIGQ9Ik0yNjQgNTZoMzhsMjQgNzZoMWwyNC03NmgzOHYxMjRoLTI4VjkyaC0xbC0yNiA4OGgtMTZsLTI2LTg4aC0xdjg4aC0yN1Y1NnoiLz4KICA8IS0tIEcgLS0+CiAgPHBhdGggY2xhc3M9ImtwbWctYmx1ZSIgZD0iTTQ5MiAxMDB2LTZjMC0xNC0xMC0yMi0yNi0yMi0xOCAwLTI4IDEyLTI4IDM2IDAgMjYgMTAgMzggMzAgMzggOCAwIDE2LTIgMjQtNnYtMzBoLTI2di0yMmg1NHY2NmMtMTIgMTAtMzAgMTgtNTIgMTgtNDAgMC02Mi0yNC02Mi02NHMyMi02NCA2Mi02NGMzMiAwIDUyIDE0IDU0IDQwaC0zMmwyIDE2eiIvPgo8L3N2Zz4K";

async function seed() {
  console.log("Starting seed...\n");

  // ── 1. Entities ──────────────────────────────────────────────────────────
  console.log("1. Seeding entities...");
  const existingEntities = await db.select().from(entities);

  let zatcaId: number;
  let kpmgId: number;

  const zatca = existingEntities.find((e) => e.slug === "zatca");
  const kpmg = existingEntities.find((e) => e.slug === "kpmg");

  if (!zatca) {
    const [row] = await db.insert(entities).values({ slug: "zatca", name: "ZATCA" }).returning();
    zatcaId = row.id;
    console.log("   Created ZATCA entity");
  } else {
    zatcaId = zatca.id;
    console.log("   ZATCA entity already exists (id=" + zatcaId + ")");
  }

  if (!kpmg) {
    const [row] = await db.insert(entities).values({
      slug: "kpmg",
      name: "KPMG",
      appTitle: "KPMG Data Owner Agent",
      colorSidebar: "#00338D",
      colorPrimary: "#005EB8",
      colorSecondary: "#00338D",
      colorAccent: "#0091DA",
      logoBase64: KPMG_LOGO_BASE64,
      logoInvert: false,
    }).returning();
    kpmgId = row.id;
    console.log("   Created KPMG entity with branding");
  } else {
    kpmgId = kpmg.id;
    // Update branding if not set
    if (!kpmg.colorSidebar) {
      await db.update(entities).set({
        appTitle: "KPMG Data Owner Agent",
        colorSidebar: "#00338D",
        colorPrimary: "#005EB8",
        colorSecondary: "#00338D",
        colorAccent: "#0091DA",
        logoBase64: KPMG_LOGO_BASE64,
        logoInvert: false,
        updatedAt: new Date(),
      }).where(eq(entities.id, kpmgId));
      console.log("   Updated KPMG branding");
    } else {
      console.log("   KPMG entity already exists (id=" + kpmgId + ")");
    }
  }

  // ── 2. Users ─────────────────────────────────────────────────────────────
  console.log("\n2. Seeding users...");

  const seedUsers = [
    { name: "Admin", email: "admin@admin.com", password: "admin123" },
    { name: "Amro Alfaris", email: "amroalfaris@kpmg.com", password: "Amroamer1" },
  ];

  for (const u of seedUsers) {
    const existing = await db.select().from(users).where(eq(users.email, u.email));
    if (existing.length > 0) {
      console.log(`   User "${u.name}" already exists (id=${existing[0].id})`);
      continue;
    }
    const hash = await hashPassword(u.password);
    const [row] = await db.insert(users).values({
      name: u.name,
      email: u.email,
      passwordHash: hash,
    }).returning();
    console.log(`   Created user "${u.name}" (id=${row.id})`);

    // Assign to all entities
    await db.insert(userEntities).values([
      { userId: row.id, entityId: zatcaId },
      { userId: row.id, entityId: kpmgId },
    ]);
    console.log(`   Assigned to ZATCA + KPMG`);
  }

  console.log("\nSeed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
