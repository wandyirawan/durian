import { Elysia } from "elysia";
import { AuthService, AuthError } from "./service";
import { authGuard } from "./plugin";
import { getJWKS } from "./keys";
import { AuthModel } from "./model";

export const authModule = new Elysia({ prefix: "/auth" })
  // JWKS endpoint (public)
  .get("/.well-known/jwks.json", async () => await getJWKS())

  // OpenID Configuration (public)
  .get("/.well-known/openid-configuration", () => ({
    issuer: process.env.ISSUER,
    authorization_endpoint: `${process.env.ISSUER}/api/auth/authorize`,
    token_endpoint: `${process.env.ISSUER}/api/auth/token`,
    userinfo_endpoint: `${process.env.ISSUER}/api/auth/userinfo`,
    jwks_uri: `${process.env.ISSUER}/api/auth/.well-known/jwks.json`,
    response_types_supported: ["token"],
    grant_types_supported: ["password", "refresh_token"],
    id_token_signing_alg_values_supported: ["RS256"],
  }))

  // Register new user
  .post("/register", async ({ body }) => AuthService.register(body), {
    body: AuthModel.registerBody,
    response: AuthModel.tokenResponse,
  })

  // Login
  .post("/login", async ({ body }) => AuthService.signIn(body), {
    body: AuthModel.signInBody,
    response: AuthModel.tokenResponse,
  })

  // Refresh token
  .post("/refresh", async ({ body }) => AuthService.refresh(body.refreshToken), {
    body: AuthModel.refreshBody,
    response: AuthModel.tokenResponse,
  })

  // Introspect token
  .post("/introspect", async ({ body }) => AuthService.introspect(body.token), {
    body: AuthModel.introspectBody,
    response: AuthModel.introspectResponse,
  })

  // Logout (revoke token)
  .post("/logout", async ({ body }) => AuthService.logout(body?.refreshToken), {
    body: AuthModel.logoutBody,
  })

  // Protected routes (need auth)
  .use(authGuard)
  .get("/userinfo", ({ user }) => ({ user }))

  // Error handler
  .onError(({ error, set }) => {
    if (error instanceof AuthError) {
      set.status = error.statusCode;
      return { error: error.message };
    }
    console.error("Auth error:", error);
    set.status = 500;
    return { error: "Internal server error" };
  });
