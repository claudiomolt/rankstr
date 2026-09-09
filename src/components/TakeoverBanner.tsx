import { Crown } from "lucide-react";
import { ListingAvatar } from "@/components/ListingAvatar";
import { identityLabel, outboundHref, type Listing } from "@/lib/rankings";
import { takeoverRemainingMs, type Takeover } from "@/lib/takeover";
import { formatSatsShort } from "@/lib/utils";

function remainingLabel(takeover: Takeover): string {
  const minutes = Math.ceil(takeoverRemainingMs(takeover) / 60000);
  if (minutes <= 0) return "ending";
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m left` : `${minutes}m left`;
}

/** The live takeover holds the top of page 1 for its 3-hour window. */
export function TakeoverBanner({
  takeover,
  listing,
}: {
  takeover: Takeover;
  listing: Listing;
}) {
  const href = outboundHref(listing);

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-primary/40 bg-primary/[0.09] px-4 py-4"
      aria-label="Board takeover"
    >
      {href ? (
        <a
          href={`/go/${listing.id}`}
          rel="noreferrer nofollow"
          aria-label={`Open ${listing.title}`}
          className="absolute inset-0 z-0 rounded-[inherit]"
        />
      ) : null}
      <div className="pointer-events-none relative z-10 flex items-center gap-3">
        <ListingAvatar listing={listing} className="size-14 md:size-16" />
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary md:text-xs">
            <Crown className="size-3.5" strokeWidth={1.5} aria-hidden />
            Board takeover · {remainingLabel(takeover)}
          </p>
          <p className="truncate text-base font-semibold md:text-lg">{listing.title}</p>
          <p className="truncate text-xs text-muted-foreground">{identityLabel(listing)}</p>
        </div>
        <p className="shrink-0 text-sm font-semibold tabular-nums text-primary md:text-base">
          {formatSatsShort(takeover.amountSats)}
          <span className="ml-1 text-[0.75em] font-medium">sats</span>
        </p>
      </div>
    </section>
  );
}
