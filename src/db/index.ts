import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "./schema";

const sqlite = new Database(process.env.DB_URL || "db.sqlite");
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqlite, { schema });

// Re-export schema tables untuk import langsung
export { users } from "./schema";
export type { User, NewUser } from "./schema";
