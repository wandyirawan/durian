import { Elysia, t } from "elysia";
import { authGuard } from "@/modules/auth/plugin";
import { UserService } from "./service";
import { UserModel } from "./model";

// Helper untuk check admin
const requireAdmin = (user: { role: string }) => {
  if (user.role !== "admin") throw new Error("Forbidden: Admin only");
};

export const userModule = new Elysia({ prefix: "/users" })
  .use(authGuard)
  // Public - create user
  .post("/", async ({ body }) => UserService.create(body), {
    body: UserModel.createBody,
    response: UserModel.response,
  })
  // Get user (admin: any, user: own only)
  .get(
    "/:id",
    async ({ user, params }) => {
      if (user.role !== "admin" && user.id !== params.id) {
        throw new Error("Forbidden");
      }
      return UserService.findById(params.id);
    },
    { response: UserModel.response },
  )
  // Admin: Get all active users
  .get("/", async ({ user }) => {
    requireAdmin(user);
    return UserService.getAll();
  })
  // Admin: Get all users including inactive
  .get("/all", async ({ user }) => {
    requireAdmin(user);
    return UserService.getAllWithInactive();
  })
  // Admin: Full update any user
  .patch("/:id", async ({ user, params, body }) => {
    requireAdmin(user);
    return UserService.adminUpdate(params.id, body);
  }, {
    body: UserModel.adminUpdateBody,
    response: UserModel.response,
  })
  // Admin: Update role specifically
  .put("/:id/role", async ({ user, params, body }) => {
    requireAdmin(user);
    return UserService.updateRole(params.id, body.role);
  }, {
    body: UserModel.roleUpdateBody,
    response: UserModel.response,
  })
  // Admin: Reactivate user
  .post("/:id/activate", async ({ user, params }) => {
    requireAdmin(user);
    return UserService.reactivate(params.id);
  }, {
    response: UserModel.response,
  })
  // Admin: Hard delete user
  .delete("/:id", async ({ user, params }) => {
    requireAdmin(user);
    await UserService.delete(params.id);
    return { message: "User deleted" };
  })
  // Admin: Get user sessions (audit)
  .get("/:id/sessions", async ({ user, params }) => {
    requireAdmin(user);
    const sessions = await UserService.getUserSessions(params.id);
    return { sessions };
  }, {
    response: t.Object({
      sessions: t.Array(UserModel.sessionResponse),
    }),
  })
  // Admin: Force logout user from all devices
  .delete("/:id/sessions", async ({ user, params }) => {
    requireAdmin(user);
    await UserService.revokeAllSessions(params.id);
    return { message: "All sessions revoked" };
  })
  // Current user: Get own profile
  .get("/me", async ({ user }) => UserService.findById(user.id), {
    response: UserModel.response,
  })
  // Current user: Update own profile
  .patch("/me", async ({ user, body }) => UserService.update(user.id, body), {
    body: UserModel.updateBody,
    response: UserModel.response,
  })
  // Current user: Deactivate own account
  .delete("/me", async ({ user }) => {
    await UserService.deactivate(user.id);
    return { message: "Account deactivated" };
  });
