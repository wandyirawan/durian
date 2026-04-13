import { SignJWT, jwtVerify, createLocalJWKSet } from "jose";
import { db, users } from "@/db";
import { eq } from "drizzle-orm";
import { getPrivateKey, getJWKS } from "./keys";

const ISSUER = process.env.ISSUER || "https://auth.yourapp.com";
const refreshTokens = new Map<string, string>();

export const AuthService = {
  async signIn(body: { username: string; password: string }) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);
    if (
      !user ||
      !(await Bun.password.verify(body.password, user.passwordHash))
    ) {
      throw new Error("Invalid credentials");
    }
    if (!user.isActive) throw new Error("Account deactivated");
    return this.generateTokens(user);
  },

  async generateTokens(user: {
    id: string;
    username: string;
    email: string;
    role: string;
  }) {
    const jwks = await getJWKS();
    const accessToken = await new SignJWT({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: "access",
    })
      .setProtectedHeader({ alg: "RS256", kid: jwks.keys[0].kid })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(["app-a", "app-b", "app-c"])
      .setExpirationTime("15m")
      .sign(await getPrivateKey());

    const refreshToken = await new SignJWT({ sub: user.id, type: "refresh" })
      .setProtectedHeader({ alg: "RS256", kid: jwks.keys[0].kid })
      .setExpirationTime("7d")
      .sign(await getPrivateKey());

    refreshTokens.set(refreshToken, user.id);
    return { accessToken, refreshToken, expiresIn: 900, tokenType: "Bearer" };
  },

  async refresh(refreshToken: string) {
    const jwks = await getJWKS();
    try {
      const { payload } = await jwtVerify(
        refreshToken,
        createLocalJWKSet(jwks),
        { issuer: ISSUER },
      );
      if (payload.type !== "refresh") throw new Error("Invalid token type");
      const userId = refreshTokens.get(refreshToken);
      if (!userId || userId !== payload.sub) throw new Error("Token revoked");
      refreshTokens.delete(refreshToken);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      if (!user?.isActive) throw new Error("User inactive");
      return this.generateTokens(user);
    } catch {
      throw new Error("Invalid refresh token");
    }
  },

  async introspect(token: string) {
    const jwks = await getJWKS();
    try {
      const { payload } = await jwtVerify(token, createLocalJWKSet(jwks), {
        issuer: ISSUER,
      });
      return {
        active: true,
        sub: payload.sub as string,
        username: payload.username as string,
        role: payload.role as string,
        exp: payload.exp as number,
      };
    } catch {
      return { active: false };
    }
  },

  revokeRefreshToken(token: string) {
    refreshTokens.delete(token);
  },
};
