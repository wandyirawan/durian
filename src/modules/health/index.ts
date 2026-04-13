import { Elysia } from "elysia";
import { db } from "@/db";

export const healthModule = new Elysia({ prefix: "/health" })
  .get("/live", () => ({
    status: "alive",
    timestamp: new Date().toISOString(),
  }))
  .get("/ready", async () => {
    try {
      await db.$client.exec("SELECT 1");
      return { status: "ready", checks: { database: "connected" } };
    } catch {
      return { status: "not ready", checks: { database: "disconnected" } };
    }
  })
  .get("/metrics", () => ({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    bun: Bun.version,
  }));
