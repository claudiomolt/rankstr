import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

const databaseUrl = process.env.DATABASE_URL?.trim();

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: Db | null = null;

if (databaseUrl) {
  client = postgres(databaseUrl, { max: 5, prepare: false });
  dbInstance = drizzle(client, { schema });
}

/** Drizzle client when DATABASE_URL is set; otherwise null, and the store falls back to memory. */
export const db: Db | null = dbInstance;

export function hasDatabase(): boolean {
  return db !== null;
}

export { schema };
