import { Elysia } from "elysia";
import { authGuard } from "@/modules/auth/plugin";
import { UserService } from "./service";
import { UserModel } from "./model";

export const userModule = new Elysia({ prefix: "/users" })
  .use(authGuard)
  .get("/me", async ({ user }) => UserService.findById(user!.id), {
    response: UserModel.response,
  })
  .patch("/me", async ({ user, body }) => UserService.update(user!.id, body), {
    body: UserModel.updateBody,
    response: UserModel.response,
  })
  .delete("/me", async ({ user }) => {
    await UserService.deactivate(user!.id);
    return { message: "Account deactivated" };
  });
