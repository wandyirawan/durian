import { t } from "elysia";
import type { TSchema } from "@sinclair/typebox";

export const UserModel = {
  createBody: t.Object({
    username: t.String({ minLength: 3 }),
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8 }),
  }),

  updateBody: t.Object({
    username: t.Optional(t.String({ minLength: 3 })),
    email: t.Optional(t.String({ format: "email" })),
  }),

  response: t.Object({
    id: t.String(),
    username: t.String(),
    email: t.String(),
    role: t.String(),
    isActive: t.Boolean(),
    createdAt: t.String(),
  }),
} satisfies Record<string, TSchema>;
