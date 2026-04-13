import { t } from "elysia";

export const AuthModel = {
  signInBody: t.Object({
    username: t.String(),
    password: t.String(),
  }),

  tokenResponse: t.Object({
    accessToken: t.String(),
    refreshToken: t.String(),
    expiresIn: t.Number(),
    tokenType: t.Literal("Bearer"),
  }),

  refreshBody: t.Object({
    refreshToken: t.String(),
  }),

  introspectBody: t.Object({
    token: t.String(),
  }),

  introspectResponse: t.Object({
    active: t.Boolean(),
    sub: t.Optional(t.String()),
    username: t.Optional(t.String()),
    role: t.Optional(t.String()),
    exp: t.Optional(t.Number()),
  }),
} satisfies Record<string, TSchema>;

export type JWTPayload = {
  sub: string;
  username: string;
  email: string;
  role: string;
  type: "access" | "refresh";
};
