import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { swagger } from "@elysiajs/swagger";
import { authModule } from "@/modules/auth";
import { userModule } from "@/modules/user";
import { healthModule } from "@/modules/health";

export const app = new Elysia({ prefix: "/api" })
  .use(cors())
  .use(
    swagger({
      documentation: { info: { title: "Auth Service API", version: "1.0.0" } },
    }),
  )
  .use(healthModule)
  .use(authModule)
  .use(userModule)
  .all("/*", ({ set }) => {
    set.status = 404;
    return { message: "Not found" };
  });

export type App = typeof app;
