/**
 * Seed Postgres from the shared development seed data.
 * Usage: DATABASE_URL=... npm run db:seed
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
        identityKey: l.identityKey,
        identityType: l.identityType,
        url: l.url ?? null,
        handle: l.handle ?? null,
        npub: l.npub ?? null,
        categorySlug: l.categorySlug,
        cumulativeSats: l.cumulativeSats,
        clickCount: l.clickCount,
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
