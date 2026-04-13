import { importPKCS8, importSPKI, exportJWK } from "jose";
let privateKeyCache: CryptoKey | null = null;
let publicKeyCache: CryptoKey | null = null;
let jwksCache: { keys: any[] } | null = null;

export async function getPrivateKey(): Promise<CryptoKey> {
  if (!privateKeyCache) {
    const privateKeyPem = process.env.RSA_PRIVATE_KEY;
    if (!privateKeyPem) {
      throw new Error("RSA_PRIVATE_KEY not set in environment");
    }
    privateKeyCache = await importPKCS8(privateKeyPem, "RS256");
  }
  return privateKeyCache;
}

async function getPublicKey(): Promise<CryptoKey> {
  if (!publicKeyCache) {
    const publicKeyPem = process.env.RSA_PUBLIC_KEY;
    if (!publicKeyPem) {
      throw new Error("RSA_PUBLIC_KEY not set in environment");
    }
    publicKeyCache = await importSPKI(publicKeyPem, "RS256");
  }
  return publicKeyCache;
}

export async function getJWKS() {
  if (!jwksCache) {
    const publicKey = await getPublicKey();
    const jwk = await exportJWK(publicKey);

    jwksCache = {
      keys: [
        {
          ...jwk,
          kid: process.env.KEY_ID || "auth-key-1",
          kty: "RSA",
          use: "sig",
          alg: "RS256",
        },
      ],
    };
  }
  return jwksCache;
}
