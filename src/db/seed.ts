/**
 * Seed Postgres from existing UI seed data.
 * Usage: DATABASE_URL=... npx tsx src/db/seed.ts
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { listings, activeIndexEntries } from "./schema";
import { seedListings, curatedActiveIndex } from "../lib/seed";

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error("DATABASE_URL is required to seed");
    process.exit(1);
  }

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);

  await db
    .insert(listings)
    .values(
      seedListings.map((l) => ({
        id: l.id,
        title: l.title,
        url: l.url ?? null,
        npub: l.npub ?? null,
        cumulativeSats: l.cumulativeSats,
        createdAt: new Date(l.createdAt),
        updatedAt: new Date(l.createdAt),
        status: l.status,
      })),
    )
    .onConflictDoNothing();

  await db
    .insert(activeIndexEntries)
    .values(
      curatedActiveIndex.map((e, i) => ({
        id: e.id,
        label: e.label,
        url: e.url ?? null,
        npub: e.npub ?? null,
        sort: i,
        note: e.note,
      })),
    )
    .onConflictDoNothing();

  console.log(
    `Seeded ${seedListings.length} listings and ${curatedActiveIndex.length} active_index_entries`,
  );
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
