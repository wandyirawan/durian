import { t } from "elysia";
import type { TSchema } from "@sinclair/typebox";

export const AuthModel = {
  // Register
  registerBody: t.Object({
    username: t.String({ minLength: 3 }),
    email: t.String({ format: "email" }),
    password: t.String({ minLength: 8 }),
    role: t.Optional(t.String()),
  }),

  // Login
  signInBody: t.Object({
    username: t.String(),
    password: t.String(),
  }),

  // Token response
  tokenResponse: t.Object({
    accessToken: t.String(),
    refreshToken: t.String(),
    expiresIn: t.Number(),
    tokenType: t.Literal("Bearer"),
  }),

  // Refresh
  refreshBody: t.Object({
    refreshToken: t.String(),
  }),

  // Introspect
  introspectBody: t.Object({
    token: t.String(),
  }),

  introspectResponse: t.Object({
    active: t.Boolean(),
    sub: t.Optional(t.String()),
    username: t.Optional(t.String()),
    role: t.Optional(t.String()),
    exp: t.Optional(t.Number()),
    type: t.Optional(t.String()),
  }),

  // Logout
  logoutBody: t.Object({
    refreshToken: t.Optional(t.String()),
  }),
} satisfies Record<string, TSchema>;

export type JWTPayload = {
  sub: string;
  username: string;
  email: string;
  role: string;
  type: "access" | "refresh";
};
