import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { desc, eq } from "drizzle-orm";
import * as schema from "./schema";
import { listings } from "./schema";
import type { Listing } from "@/lib/rankings";
import { memoryGetListings } from "@/lib/memory-store";

export type Db = ReturnType<typeof drizzle<typeof schema>>;

const databaseUrl = process.env.DATABASE_URL?.trim();

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: Db | null = null;

if (databaseUrl) {
  client = postgres(databaseUrl, { max: 5, prepare: false });
  dbInstance = drizzle(client, { schema });
}

/** Drizzle client when DATABASE_URL is set; otherwise null (seed / memory fallback). */
export const db: Db | null = dbInstance;

export function hasDatabase(): boolean {
  return db !== null;
}

function rowToListing(row: typeof listings.$inferSelect): Listing {
  return {
    id: row.id,
    title: row.title,
    url: row.url ?? undefined,
    npub: row.npub ?? undefined,
    cumulativeSats: row.cumulativeSats,
    createdAt: row.createdAt.toISOString(),
    status: row.status,
  };
}

/** Board listings: Postgres when configured, else in-memory seed (mutable for mock bids). */
export async function getBoardListings(): Promise<Listing[]> {
  if (!db) {
    return memoryGetListings();
  }
  const rows = await db
    .select()
    .from(listings)
    .orderBy(desc(listings.cumulativeSats), listings.createdAt);
  return rows.map(rowToListing);
}

export async function getListingById(id: string): Promise<Listing | null> {
  if (!db) {
    return memoryGetListings().find((l) => l.id === id) ?? null;
  }
  const rows = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  const row = rows[0];
  return row ? rowToListing(row) : null;
}

export { schema };
