import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import type { Static } from "elysia";
import { UserModel } from "./model";

type CreateBody = Static<typeof UserModel.createBody>;
type UpdateBody = Static<typeof UserModel.updateBody>;

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

    return user;
  },

  async findById(id: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) throw new Error("User not found");
    return user;
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
    return user;
  },

  async deactivate(id: string) {
    const [user] = await db
      .update(users)
      .set({ isActive: false })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  },
  async getAll() {
    return await db.select().from(users).where(eq(users.isActive, true));
  },
  async delete(id: string) {
    // Hard delete atau soft delete? Kalau hard delete:
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
};
