import { BoardRow } from "@/components/BoardRow";
import { BidForm } from "@/components/BidForm";
import { getBoardListings } from "@/db";
import { sortListings } from "@/lib/rankings";
import { fetchProfiles } from "@/lib/nostr";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const listings = await getBoardListings();
  const ranked = sortListings(listings);

  const npubs = ranked.map((l) => l.npub).filter((n): n is string => Boolean(n?.trim()));
  const profiles = await fetchProfiles(npubs);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--rs-frost)]">
          live signal board
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold lowercase tracking-tight">
          rankstr
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Powered by sats. Rank = bid. Bitcoin + Nostr projects — no opaque algo.
        </p>
      </div>

      <section className="space-y-2" aria-label="Leaderboard">
        {ranked.map((listing, i) => {
          const key = listing.npub?.trim();
          const profile = key ? profiles.get(key) ?? null : null;
          return (
            <BoardRow
              key={listing.id}
              listing={listing}
              rank={i + 1}
              profile={profile}
            />
          );
        })}
      </section>

      <BidForm listings={ranked} />
    </div>
  );
}
