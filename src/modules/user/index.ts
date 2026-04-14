import { Elysia } from "elysia";
import { authGuard } from "@/modules/auth/plugin";
import { UserService } from "./service";
import { UserModel } from "./model";

export const userModule = new Elysia({ prefix: "/users" })
  .use(authGuard)
  .post("/", async ({ body }) => UserService.create(body), {
    body: UserModel.createBody,
    response: UserModel.response,
  })
  .get(
    "/:id",
    async ({ user, params }) => {
      // Check permission: admin bisa lihat semua, user hanya dirinya sendiri
      if (user.role !== "admin" && user.id !== params.id) {
        throw new Error("Forbidden");
      }
      return UserService.findById(params.id);
    },
    { response: UserModel.response },
  )
  .get("/", async ({ user }) => {
    if (user.role !== "admin") throw new Error("Forbidden");
    return UserService.getAll();
  })
  .delete("/:id", async ({ user, params }) => {
    if (user.role !== "admin") throw new Error("Forbidden");
    await UserService.delete(params.id);
    return { message: "User deleted" };
  })
  .get("/me", async ({ user }) => UserService.findById(user.id), {
    response: UserModel.response,
  })
  .patch("/me", async ({ user, body }) => UserService.update(user.id, body), {
    body: UserModel.updateBody,
    response: UserModel.response,
  })
  .delete("/me", async ({ user }) => {
    await UserService.deactivate(user.id);
    return { message: "Account deactivated" };
  });
