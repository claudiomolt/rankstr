import { identityLabel, outboundHref, type Listing } from "@/lib/rankings";
import { takeoverRemainingMs, type Takeover } from "@/lib/takeover";
import { formatSats } from "@/lib/utils";

function remainingLabel(takeover: Takeover): string {
  const minutes = Math.ceil(takeoverRemainingMs(takeover) / 60000);
  if (minutes <= 0) return "ending";
  const hours = Math.floor(minutes / 60);
  return hours > 0 ? `${hours}h ${minutes % 60}m left` : `${minutes}m left`;
}

/** The live takeover holds the top of page 1 for its 3-hour window. */
export function TakeoverBanner({ takeover, listing }: { takeover: Takeover; listing: Listing }) {
  const href = outboundHref(listing);

  return (
    <section
      className="border border-accent bg-card px-4 py-3"
      style={{ borderLeft: "3px solid hsl(var(--accent))" }}
      aria-label="Board takeover"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-accent">
          board takeover · {remainingLabel(takeover)}
        </p>
        <p className="font-mono text-xs text-accent">{formatSats(takeover.amountSats)}</p>
      </div>
      <h2 className="mt-1 font-display text-2xl font-bold lowercase tracking-tight">
        {listing.title}
      </h2>
      {href ? (
        <a
          href={`/go/${listing.id}`}
          rel="noreferrer nofollow"
          className="font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {identityLabel(listing)}
        </a>
      ) : (
        <p className="font-mono text-xs text-muted-foreground">{identityLabel(listing)}</p>
      )}
    </section>
  );
}
