import { Elysia } from "elysia";
import { AuthService } from "./service";
import { authGuard } from "./plugin";
import { getJWKS } from "./keys";
import { AuthModel } from "./model";

export const authModule = new Elysia({ prefix: "/auth" })
  .get("/.well-known/jwks.json", async () => await getJWKS())
  .get("/.well-known/openid-configuration", () => ({
    issuer: process.env.ISSUER,
    token_endpoint: `${process.env.ISSUER}/api/auth/login`,
    userinfo_endpoint: `${process.env.ISSUER}/api/auth/userinfo`,
    jwks_uri: `${process.env.ISSUER}/api/auth/.well-known/jwks.json`,
    response_types_supported: ["token"],
    id_token_signing_alg_values_supported: ["RS256"],
  }))
  .post("/login", async ({ body }) => AuthService.signIn(body), {
    body: AuthModel.signInBody,
    response: AuthModel.tokenResponse,
  })
  .post(
    "/refresh",
    async ({ body }) => AuthService.refresh(body.refreshToken),
    { body: AuthModel.refreshBody, response: AuthModel.tokenResponse },
  )
  .post("/introspect", async ({ body }) => AuthService.introspect(body.token), {
    body: AuthModel.introspectBody,
    response: AuthModel.introspectResponse,
  })
  .use(authGuard)
  .get("/userinfo", ({ user }) => ({ user }))
  .post("/logout", async ({ bearer }) => {
    return { message: "Logged out" };
  });
