import cluster from "node:cluster";
import { app } from "./server";

const PORT = parseInt(process.env.PORT || "3000");
const isProd = process.env.NODE_ENV === "production";

if (isProd && cluster.isPrimary) {
  const workers = parseInt(process.env.WORKERS || "4");
  console.log(`Primary ${process.pid} spawning ${workers} workers`);
  for (let i = 0; i < workers; i++) cluster.fork();
  cluster.on("exit", (w) => {
    console.log(`Worker ${w.process.pid} died, restarting`);
    cluster.fork();
  });
} else {
  const server = app.listen(PORT, () =>
    console.log(
      `${isProd ? "Worker" : "Dev"} ${process.pid} at http://localhost:${PORT}/api`,
    ),
  );
  const shutdown = (sig: string) => {
    console.log(`\n${sig} received, stopping...`);
    server.stop();
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
