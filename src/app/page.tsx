import { BoardRow } from "@/components/BoardRow";
import { BidStub } from "@/components/BidStub";
import { sortListings } from "@/lib/rankings";
import { seedListings } from "@/lib/seed";

export default function BoardPage() {
  const ranked = sortListings(seedListings);

  return (
    <div className="space-y-8">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--rs-frost)]">live signal board</p>
        <h1 className="mt-1 font-display text-3xl font-bold lowercase tracking-tight">rankstr</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Powered by sats. Rank = bid. Bitcoin + Nostr projects — no opaque algo.
        </p>
      </div>

      <section className="space-y-2" aria-label="Leaderboard">
        {ranked.map((listing, i) => (
          <BoardRow key={listing.id} listing={listing} rank={i + 1} />
        ))}
      </section>

      <BidStub />
    </div>
  );
}
