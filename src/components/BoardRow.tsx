import { formatSats } from "@/lib/utils";
import type { Listing } from "@/lib/rankings";

export function BoardRow({ listing, rank }: { listing: Listing; rank: number }) {
  const isLeader = rank === 1;
  const rankClass = isLeader ? "text-accent" : "text-[color:var(--rs-frost)]";
  const stamp =
    listing.status === "live"
      ? "border-[color:var(--rs-frost)] text-[color:var(--rs-frost)]"
      : listing.status === "climbing"
        ? "border-primary text-primary"
        : "border-muted-foreground text-muted-foreground";

  return (
    <div
      className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border border-border bg-card px-4 py-3"
      style={{ borderLeft: "3px solid hsl(var(--primary))" }}
    >
      <div className={`font-mono text-lg font-semibold ${rankClass}`}>#{String(rank).padStart(2, "0")}</div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-sans text-sm font-semibold text-card-foreground">{listing.title}</span>
          <span className={`rounded-none border px-1.5 py-0.5 font-mono text-[10px] uppercase ${stamp}`}>
            {listing.status}
          </span>
        </div>
        <div className="mt-1 truncate font-mono text-xs text-[color:var(--rs-frost)]">
          {listing.url ?? listing.npub}
        </div>
      </div>
      <div className={`text-right font-mono text-sm ${isLeader ? "text-accent underline decoration-accent" : "text-primary"}`}>
        {formatSats(listing.cumulativeSats)}
      </div>
    </div>
  );
}
