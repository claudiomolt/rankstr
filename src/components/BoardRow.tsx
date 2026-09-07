import { getCategory } from "@/lib/categories";
import { truncateNpub, type Profile } from "@/lib/nostr";
import { identityLabel, outboundHref, type Listing } from "@/lib/rankings";
import { formatCount, formatSats } from "@/lib/utils";

type Props = {
  listing: Listing;
  rank: number;
  profile?: Profile | null;
  showCategory?: boolean;
};

export function BoardRow({ listing, rank, profile, showCategory = true }: Props) {
  const isLeader = rank === 1;
  const href = outboundHref(listing);
  const label = identityLabel(listing);
  const category = getCategory(listing.categorySlug);
  const displayName = profile?.name?.trim();
  const picture = profile?.picture?.trim();

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
      <div
        className={
          "font-mono text-lg font-semibold " +
          (isLeader ? "text-accent" : "text-[color:var(--rs-frost)]")
        }
      >
        #{String(rank).padStart(2, "0")}
      </div>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {picture ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={picture}
              alt=""
              width={20}
              height={20}
              className="h-5 w-5 shrink-0 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : null}
          <span className="truncate font-sans text-sm font-semibold text-card-foreground">
            {listing.title}
          </span>
          {displayName ? (
            <span className="truncate font-sans text-xs text-muted-foreground">{displayName}</span>
          ) : null}
          <span
            className={"rounded-none border px-1.5 py-0.5 font-mono text-[10px] uppercase " + stamp}
          >
            {listing.status}
          </span>
          {showCategory && category ? (
            <a
              href={`/c/${category.slug}`}
              className="rounded-none border border-border px-1.5 py-0.5 font-mono text-[10px] uppercase text-muted-foreground hover:text-foreground"
            >
              {category.label}
            </a>
          ) : null}
        </div>

        {href ? (
          <a
            href={`/go/${listing.id}`}
            rel="noreferrer nofollow"
            className="mt-1 block truncate font-mono text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            {label}
          </a>
        ) : (
          <div className="mt-1 truncate font-mono text-xs text-[color:var(--rs-frost)]" title={label}>
            {listing.npub ? truncateNpub(listing.npub) : label}
          </div>
        )}

        {listing.identityType !== "npub" && listing.npub ? (
          <div
            className="mt-1 truncate font-mono text-xs text-[color:var(--rs-frost)]"
            title={listing.npub}
          >
            {truncateNpub(listing.npub)}
          </div>
        ) : null}
      </div>

      <div className="text-right">
        <div
          className={
            "font-mono text-sm " +
            (isLeader ? "text-accent underline decoration-accent" : "text-primary")
          }
        >
          {formatSats(listing.cumulativeSats)}
        </div>
        {listing.clickCount > 0 ? (
          <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {formatCount(listing.clickCount)} clicks
          </div>
        ) : null}
      </div>
    </div>
  );
}
