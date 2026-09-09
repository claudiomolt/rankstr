import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ListingAvatar } from "@/components/ListingAvatar";
import type { BoardRowData } from "@/lib/board";
import { getCategory } from "@/lib/categories";
import { truncateNpub } from "@/lib/nostr";
import { identityLabel, outboundHref } from "@/lib/rankings";
import { cn, formatCount, formatSatsShort, hostOf, relativeDate } from "@/lib/utils";

/** Podium tint fades out across the top three, then rows go flat. */
const PODIUM_TINT = ["bg-primary/[0.14]", "bg-primary/[0.08]", "bg-primary/[0.04]"];

export function BoardRow({
  row,
  claimSats,
  showCategory = true,
}: {
  row: BoardRowData;
  /** Sats it would take to claim this rank, shown in the hover pill. */
  claimSats?: number;
  showCategory?: boolean;
}) {
  const { listing, rank, amountSats, profile } = row;
  const podium = rank <= 3;
  const href = outboundHref(listing);
  const category = getCategory(listing.categorySlug);
  const host = hostOf(listing.url);
  const identity =
    listing.identityType === "npub" && listing.npub
      ? truncateNpub(listing.npub)
      : listing.identityType === "x"
        ? `@${listing.handle}`
        : (host ?? identityLabel(listing));

  const rankMark = (mobile: boolean) => (
    <span
      className={cn(
        "tabular-nums",
        mobile ? "mr-1.5 md:hidden" : "hidden min-w-7 items-center justify-center md:inline-flex md:min-w-10 md:text-base",
        !mobile && "text-xs",
        podium ? "font-semibold text-primary" : "font-medium text-muted-foreground",
      )}
    >
      #{rank}
    </span>
  );

  return (
    <article
      className={cn(
        "group relative scroll-mt-6",
        podium ? "rounded-xl md:rounded-2xl" : "border-t border-border px-3 md:px-4",
      )}
    >
      {href ? (
        <a
          href={`/go/${listing.id}`}
          rel="noreferrer nofollow"
          aria-label={`Open ${listing.title}`}
          className="absolute inset-0 z-0 rounded-[inherit] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
      ) : null}

      <div
        className={cn(
          "relative z-10 overflow-hidden",
          podium && `rounded-xl px-3 md:rounded-2xl md:px-4 ${PODIUM_TINT[rank - 1]}`,
        )}
      >
        <div className="pointer-events-none relative z-10 flex items-start gap-2 py-3 md:gap-3 md:py-4">
          <div className="flex shrink-0 items-center md:gap-3">
            {rankMark(false)}
            <ListingAvatar
              listing={listing}
              profile={profile}
              className={podium ? "size-14 md:size-18" : "size-10 md:size-14"}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <p
                className={cn(
                  "min-w-0 flex-1 truncate text-sm md:text-base",
                  podium ? "font-semibold text-foreground" : "font-medium",
                )}
              >
                {rankMark(true)}
                {listing.title}
              </p>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-primary md:text-base">
                {formatSatsShort(amountSats)}
                <span className="ml-1 text-[0.75em] font-medium">sats</span>
              </p>
            </div>

            {listing.description ? (
              <p className="line-clamp-1 text-xs text-muted-foreground/70 md:text-sm">
                {listing.description}
              </p>
            ) : null}

            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] md:text-xs">
              {showCategory && category ? (
                <>
                  <Link
                    href={`/category/${category.slug}`}
                    className="pointer-events-auto inline-flex items-center gap-1 font-semibold text-foreground transition-colors hover:text-foreground/80"
                  >
                    <CategoryIcon icon={category.icon} className="size-3 shrink-0" />
                    {category.short}
                  </Link>
                  <Dot />
                </>
              ) : null}
              <time
                dateTime={listing.createdAt}
                className="shrink-0 text-muted-foreground/70"
              >
                {relativeDate(listing.createdAt)}
              </time>
              <Dot />
              <span className="truncate font-medium text-muted-foreground">{identity}</span>
              {listing.clickCount > 0 ? (
                <>
                  <Dot />
                  <span className="tabular-nums text-muted-foreground/70">
                    {formatCount(listing.clickCount)} clicks
                  </span>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {claimSats !== undefined ? (
        <Link
          href={`/?claim=${encodeURIComponent(listing.identityKey)}&sats=${claimSats}#claim`}
          className="pointer-events-none absolute top-0 left-1/2 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-primary-foreground opacity-0 shadow-sm transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
        >
          claim this rank for {formatSatsShort(claimSats)} sats
        </Link>
      ) : null}
    </article>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/45">
      ·
    </span>
  );
}
