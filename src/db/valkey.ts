import { Redis } from "ioredis";

// Valkey client singleton
export const valkey = new Redis(process.env.VALKEY_URL || "redis://localhost:6379", {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Key prefixes
const PREFIX = "durian:";
export const KEYS = {
  refreshToken: (token: string) => `${PREFIX}refresh:${token}`,
  revokedToken: (token: string) => `${PREFIX}revoked:${token}`,
};

// TTL constants (in seconds)
export const TTL = {
  refreshToken: 7 * 24 * 60 * 60, // 7 days
  accessToken: 15 * 60,            // 15 minutes
};

// Helper functions
export async function storeRefreshToken(token: string, userId: string): Promise<void> {
  await valkey.setex(KEYS.refreshToken(token), TTL.refreshToken, userId);
}

export async function getRefreshTokenUser(token: string): Promise<string | null> {
  return await valkey.get(KEYS.refreshToken(token));
}

export async function deleteRefreshToken(token: string): Promise<void> {
  await valkey.del(KEYS.refreshToken(token));
}

export async function revokeToken(token: string): Promise<void> {
  await valkey.setex(KEYS.revokedToken(token), TTL.accessToken, "1");
}

export async function isTokenRevoked(token: string): Promise<boolean> {
  const exists = await valkey.exists(KEYS.revokedToken(token));
  return exists === 1;
}

// Connection check
export async function checkValkeyConnection(): Promise<boolean> {
  try {
    await valkey.ping();
    return true;
  } catch {
    return false;
  }
}
