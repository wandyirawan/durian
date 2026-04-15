import { db, users, sessions } from "@/db";
import { eq, and, isNull } from "drizzle-orm";
import type { Static } from "elysia";
import { UserModel } from "./model";
import type { User, Session } from "@/db/schema";

type CreateBody = Static<typeof UserModel.createBody>;
type UpdateBody = Static<typeof UserModel.updateBody>;
type AdminUpdateBody = Static<typeof UserModel.adminUpdateBody>;

// Helper: Map DB User to Response format (hide passwordHash, Date → string)
const toUserResponse = (user: User) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt.toISOString(),
});

// Helper: Map Session to Response format
const toSessionResponse = (session: Session) => ({
  id: session.id,
  userId: session.userId,
  device: session.device,
  ipAddress: session.ipAddress,
  createdAt: session.createdAt.toISOString(),
  expiresAt: session.expiresAt.toISOString(),
  revokedAt: session.revokedAt ? session.revokedAt.toISOString() : undefined,
});

export const UserService = {
  async create(data: CreateBody) {
    const exists = await db
      .select()
      .from(users)
      .where(eq(users.username, data.username))
      .limit(1);
    if (exists.length > 0) throw new Error("Username taken");

    const passwordHash = await Bun.password.hash(data.password);
    const [user] = await db
      .insert(users)
      .values({
        username: data.username,
        email: data.email,
        passwordHash,
      })
      .returning();

    return toUserResponse(user);
  },

  async findById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new Error("User not found");
    return toUserResponse(user);
  },

  async update(id: string, data: UpdateBody) {
    const updateData: Partial<typeof users.$inferInsert> = {};
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return toUserResponse(user);
  },

  // Admin: Update any user including role
  async adminUpdate(id: string, data: AdminUpdateBody) {
    const updateData: Partial<typeof users.$inferInsert> = {};
    if (data.username) updateData.username = data.username;
    if (data.email) updateData.email = data.email;
    if (data.role) updateData.role = data.role;

    const [user] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return toUserResponse(user);
  },

  // Admin: Update role specifically
  async updateRole(id: string, role: "user" | "admin") {
    const [user] = await db
      .update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return toUserResponse(user);
  },

  async deactivate(id: string) {
    const [user] = await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return toUserResponse(user);
  },

  // Admin: Reactivate user
  async reactivate(id: string) {
    const [user] = await db
      .update(users)
      .set({ isActive: true })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return toUserResponse(user);
  },

  async getAll() {
    const userList = await db.select().from(users).where(eq(users.isActive, true));
    return userList.map(toUserResponse);
  },

  // Admin: Get all users including inactive
  async getAllWithInactive() {
    const userList = await db.select().from(users);
    return userList.map(toUserResponse);
  },

  async delete(id: string) {
    await db.delete(users).where(eq(users.id, id));
    return { deleted: true };
  },

  async findByUsername(username: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user;
  },

  // Session management
  async getUserSessions(userId: string) {
    const sessionList = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(sessions.createdAt);
    return sessionList.map(toSessionResponse);
  },

  // Get active (non-revoked) sessions only
  async getActiveSessions(userId: string) {
    const sessionList = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt)
        )
      )
      .orderBy(sessions.createdAt);
    return sessionList.map(toSessionResponse);
  },

  // Revoke all sessions for a user (force logout everywhere)
  async revokeAllSessions(userId: string) {
    const now = new Date();
    
    // Revoke ALL active sessions
    await db
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt)
        )
      );

    return { revoked: true };
  },
};
