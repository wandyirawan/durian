import { Elysia } from "elysia";
import { bearer } from "@elysiajs/bearer";
import { jwtVerify, createRemoteJWKSet } from "jose";

const JWKS = createRemoteJWKSet(
  new URL(
    process.env.JWKS_URL ||
      "http://localhost:3000/api/auth/.well-known/jwks.json",
  ),
);

// Type untuk user
type User = { id: string; username: string; role: string };

// Derive user dari JWT (bisa null jika ga ada token) - use with @elysiajs/jwt
export const authContext = new Elysia({ name: "auth-context" })
  .use(bearer())
  .derive({ as: "scoped" }, async ({ bearer }) => {
    if (!bearer) return { user: null as User | null };
    try {
      const { payload } = await jwtVerify(bearer, JWKS, {
        issuer: process.env.ISSUER,
        algorithms: ["RS256"],
      });
      if (payload.type !== "access") return { user: null as User | null };
      return {
        user: {
          id: payload.sub as string,
          username: payload.username as string,
          role: payload.role as string,
        } as User,
      };
    } catch {
      return { user: null as User | null };
    }
  });

// Guard yang require auth - error 401 kalau ga ada user, then narrow type to non-null
export const authGuard = new Elysia({ name: "auth-guard" })
  .use(authContext)
  .derive({ as: "scoped" }, ({ user }) => {
    // This will only run if user exists (after onBeforeHandle check)
    // But we need to narrow the type
    return { user: user! };
  })
  .onBeforeHandle(({ user, set }) => {
    if (!user) {
      set.status = 401;
      return { message: "Unauthorized" };
    }
  });

export type AuthContext = {
  user: User;
};
