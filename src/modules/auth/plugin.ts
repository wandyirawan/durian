import { Elysia } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL(
    process.env.JWKS_URL ||
      "http://localhost:3000/api/auth/.well-known/jwks.json",
  ),
);

export const authGuard = new Elysia({ name: "auth-guard" })
  .use(bearer())
  .derive({ as: "scoped" }, async ({ bearer }) => {
    if (!bearer) return { user: null };
    try {
      const { payload } = await jwtVerify(bearer, JWKS, {
        issuer: process.env.ISSUER,
        algorithms: ["RS256"],
      });
      if (payload.type !== "access") return { user: null };
      return {
        user: {
          id: payload.sub as string,
          username: payload.username as string,
          role: payload.role as string,
        },
      };
    } catch {
      return { user: null };
    }
  })
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { message: "Unauthorized" };
    }
  });

export type AuthContext = {
  user: { id: string; username: string; role: string };
};
