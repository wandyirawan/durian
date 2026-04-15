import { t } from "elysia";
import type { TSchema } from "@sinclair/typebox";

export const UserModel = {
  createBody: t.Object({
    username: t.String({ minLength: 3 }),
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8 }),
  }),

  // Regular user self-update
  updateBody: t.Object({
    username: t.Optional(t.String({ minLength: 3 })),
    email: t.Optional(t.String({ format: "email" })),
  }),

  // Admin update any user (includes role)
  adminUpdateBody: t.Object({
    username: t.Optional(t.String({ minLength: 3 })),
    email: t.Optional(t.String({ format: "email" })),
    role: t.Optional(t.Union([t.Literal("user"), t.Literal("admin")])),
  }),

  // Role update specifically
  roleUpdateBody: t.Object({
    role: t.Union([t.Literal("user"), t.Literal("admin")]),
  }),

  response: t.Object({
    id: t.String(),
    username: t.String(),
    email: t.String(),
    role: t.String(),
    isActive: t.Boolean(),
    createdAt: t.String(),
  }),

  // Session response for audit
  sessionResponse: t.Object({
    id: t.String(),
    userId: t.String(),
    device: t.Union([t.String(), t.Null()]),
    ipAddress: t.Union([t.String(), t.Null()]),
    createdAt: t.String(),
    expiresAt: t.String(),
    revokedAt: t.Optional(t.String()),
  }),
} satisfies Record<string, TSchema>;
