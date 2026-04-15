import { SignJWT, jwtVerify, createLocalJWKSet } from "jose";
import { db, users, sessions } from "@/db";
import { eq } from "drizzle-orm";
import { getPrivateKey, getJWKS } from "./keys";
import { UserService } from "@/modules/user/service";
import {
  storeRefreshToken,
  getRefreshTokenUser,
  deleteRefreshToken,
  revokeToken,
  isTokenRevoked,
  checkValkeyConnection,
} from "@/db/valkey";
import type { Session } from "@/db/schema";

const ISSUER = process.env.ISSUER || "https://auth.yourapp.com";

// Custom error class untuk auth errors
export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// Check Valkey availability (fallback ke memory kalau down)
let useValkey = true;
let fallbackMode = false;

// Fallback in-memory store (untuk development atau kalau Valkey down)
const fallbackRefreshTokens = new Map<string, string>();
const fallbackRevokedTokens = new Set<string>();

async function initValkey(): Promise<void> {
  const connected = await checkValkeyConnection();
  if (!connected) {
    console.warn("⚠️  Valkey not available, using in-memory fallback");
    useValkey = false;
    fallbackMode = true;
  } else {
    console.log("✅ Valkey connected");
    useValkey = true;
    fallbackMode = false;
  }
}

// Call init saat startup
initValkey();

// Type untuk session metadata
type SessionMetadata = {
  userAgent?: string;
  ipAddress?: string;
};

export const AuthService = {
  /**
   * Register new user dan langsung login
   */
  async register(
    body: {
      username: string;
      email: string;
      password: string;
      role?: string;
    },
    meta?: SessionMetadata,
  ) {
    // Check if username exists
    const existing = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (existing.length > 0) {
      throw new AuthError("Username already exists", 409);
    }

    // Create user via UserService
    const user = await UserService.create({
      username: body.username,
      email: body.email,
      password: body.password,
    });

    // Generate tokens
    return this.generateTokens(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      meta,
    );
  },

  /**
   * Login user
   */
  async signIn(
    body: { username: string; password: string },
    meta?: SessionMetadata,
  ) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, body.username))
      .limit(1);

    if (!user) {
      throw new AuthError("Invalid credentials");
    }

    const validPassword = await Bun.password.verify(
      body.password,
      user.passwordHash,
    );

    if (!validPassword) {
      throw new AuthError("Invalid credentials");
    }

    if (!user.isActive) {
      throw new AuthError("Account deactivated", 403);
    }

    return this.generateTokens(user, meta);
  },

  /**
   * Generate access & refresh tokens with session tracking
   */
  async generateTokens(
    user: {
      id: string;
      username: string;
      email: string;
      role: string;
    },
    meta?: SessionMetadata,
  ) {
    const jwks = await getJWKS();
    const kid = jwks.keys[0]?.kid;

    if (!kid) {
      throw new AuthError("Invalid JWKS configuration", 500);
    }

    // Generate unique JWT ID (jti) untuk session tracking
    const jti = crypto.randomUUID();
    const now = new Date();
    const accessExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes
    const refreshExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const accessToken = await new SignJWT({
      sub: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      type: "access",
      jti, // JWT ID untuk tracking
    })
      .setProtectedHeader({ alg: "RS256", kid })
      .setIssuedAt()
      .setIssuer(ISSUER)
      .setAudience(["your-app"])
      .setExpirationTime("15m")
      .sign(await getPrivateKey());

    const refreshToken = await new SignJWT({
      sub: user.id,
      type: "refresh",
      jti, // Same jti untuk associate access & refresh
    })
      .setProtectedHeader({ alg: "RS256", kid })
      .setExpirationTime("7d")
      .sign(await getPrivateKey());

    // Store refresh token (Valkey atau fallback)
    if (useValkey && !fallbackMode) {
      await storeRefreshToken(refreshToken, user.id);
    } else {
      fallbackRefreshTokens.set(refreshToken, user.id);
    }

    // Create session record in database untuk audit trail
    await db.insert(sessions).values({
      id: jti,
      userId: user.id,
      device: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      createdAt: now,
      expiresAt: refreshExpiresAt,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: "Bearer" as const,
    };
  },

  /**
   * Refresh access token using refresh token
   */
  async refresh(
    refreshToken: string,
    meta?: SessionMetadata,
  ) {
    // Check if token is revoked
    const isRevoked = useValkey
      ? await isTokenRevoked(refreshToken)
      : fallbackRevokedTokens.has(refreshToken);

    if (isRevoked) {
      throw new AuthError("Token has been revoked");
    }

    const jwks = await getJWKS();

    try {
      const { payload } = await jwtVerify(
        refreshToken,
        createLocalJWKSet(jwks),
        { issuer: ISSUER },
      );

      if (payload.type !== "refresh") {
        throw new AuthError("Invalid token type");
      }

      // Get userId dari Valkey atau fallback
      const userId = useValkey
        ? await getRefreshTokenUser(refreshToken)
        : fallbackRefreshTokens.get(refreshToken);

      if (!userId || userId !== payload.sub) {
        throw new AuthError("Token revoked or invalid");
      }

      // Revoke old session in database (mark as revoked)
      if (payload.jti) {
        await db
          .update(sessions)
          .set({ revokedAt: new Date() })
          .where(eq(sessions.id, payload.jti as string));
      }

      // Delete old refresh token (rotate)
      if (useValkey) {
        await deleteRefreshToken(refreshToken);
      } else {
        fallbackRefreshTokens.delete(refreshToken);
      }

      // Get user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user?.isActive) {
        throw new AuthError("User account is inactive");
      }

      // Generate new tokens with new session
      return this.generateTokens(user, meta);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError("Invalid refresh token");
    }
  },

  /**
   * Introspect token (check if valid and get claims)
   */
  async introspect(token: string) {
    // Check if revoked
    const isRevoked = useValkey
      ? await isTokenRevoked(token)
      : fallbackRevokedTokens.has(token);

    if (isRevoked) {
      return { active: false };
    }

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
        type: payload.type as string,
      };
    } catch {
      return { active: false };
    }
  },

  /**
   * Revoke a token
   */
  async revokeToken(token: string): Promise<void> {
    if (useValkey) {
      await revokeToken(token);
    } else {
      fallbackRevokedTokens.add(token);
    }
  },

  /**
   * Logout user (revoke refresh token)
   */
  async logout(refreshToken?: string): Promise<{ message: string }> {
    if (refreshToken) {
      // Revoke the refresh token
      if (useValkey) {
        await revokeToken(refreshToken);
        await deleteRefreshToken(refreshToken);
      } else {
        fallbackRevokedTokens.add(refreshToken);
        fallbackRefreshTokens.delete(refreshToken);
      }
    }
    return { message: "Logged out successfully" };
  },
};
