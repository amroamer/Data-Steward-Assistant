import { db } from "../../db";
import { users, userEntities, entities, type User } from "../../../shared/models/chat";
import { eq, and } from "drizzle-orm";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// ── Password Hashing ──────────────────────────────────────────────────────────

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${buf.toString("hex")}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(buf, Buffer.from(key, "hex"));
}

// ── User CRUD ─────────────────────────────────────────────────────────────────

export type UserWithEntities = User & { entityIds: number[]; entityNames: string[] };

export async function getUsers(): Promise<UserWithEntities[]> {
  const allUsers = await db.select().from(users).orderBy(users.name);
  const allAssignments = await db.select().from(userEntities);
  const allEntities = await db.select().from(entities);
  const entityMap = new Map(allEntities.map((e) => [e.id, e.name]));

  return allUsers.map((u) => {
    const assignments = allAssignments.filter((a) => a.userId === u.id);
    return {
      ...u,
      entityIds: assignments.map((a) => a.entityId),
      entityNames: assignments.map((a) => entityMap.get(a.entityId) || ""),
    };
  });
}

export async function getUser(id: number): Promise<UserWithEntities | undefined> {
  const rows = await db.select().from(users).where(eq(users.id, id));
  if (rows.length === 0) return undefined;
  const u = rows[0];
  const assignments = await db.select().from(userEntities).where(eq(userEntities.userId, id));
  const allEntities = await db.select().from(entities);
  const entityMap = new Map(allEntities.map((e) => [e.id, e.name]));
  return {
    ...u,
    entityIds: assignments.map((a) => a.entityId),
    entityNames: assignments.map((a) => entityMap.get(a.entityId) || ""),
  };
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
  return rows[0];
}

export async function createUser(
  name: string,
  email: string,
  password: string,
  entityIds: number[] = [],
): Promise<UserWithEntities> {
  const passwordHash = await hashPassword(password);
  const [row] = await db
    .insert(users)
    .values({ name, email: email.toLowerCase(), passwordHash })
    .returning();

  if (entityIds.length > 0) {
    await db.insert(userEntities).values(
      entityIds.map((entityId) => ({ userId: row.id, entityId })),
    );
  }

  return { ...row, entityIds, entityNames: [] };
}

export async function updateUser(
  id: number,
  data: { name?: string; email?: string; isActive?: boolean; password?: string },
): Promise<User> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (data.name !== undefined) updates.name = data.name;
  if (data.email !== undefined) updates.email = data.email.toLowerCase();
  if (data.isActive !== undefined) updates.isActive = data.isActive;
  if (data.password) updates.passwordHash = await hashPassword(data.password);

  const [row] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, id))
    .returning();
  return row;
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id));
}

// ── Entity Assignments ────────────────────────────────────────────────────────

export async function setUserEntities(userId: number, entityIds: number[]): Promise<void> {
  await db.delete(userEntities).where(eq(userEntities.userId, userId));
  if (entityIds.length > 0) {
    await db.insert(userEntities).values(
      entityIds.map((entityId) => ({ userId, entityId })),
    );
  }
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function authenticateUser(
  email: string,
  password: string,
): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user || !user.isActive) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  return valid ? user : null;
}

// ── Seeding ───────────────────────────────────────────────────────────────────

export async function seedAdminUser(): Promise<void> {
  const existing = await db.select().from(users);
  if (existing.length > 0) return;

  await createUser("Admin", "admin@admin.com", "admin123", []);
  // Assign admin to all entities
  const allEntities = await db.select().from(entities);
  const admin = await getUserByEmail("admin@admin.com");
  if (admin && allEntities.length > 0) {
    await setUserEntities(admin.id, allEntities.map((e) => e.id));
  }
}
