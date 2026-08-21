import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL no está configurada");
  const sql = globalForDb.sql ?? postgres(url, { prepare: false, max: 1 });
  if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
  return drizzle(sql);
}
