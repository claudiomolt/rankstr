import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ListingAvatar } from "@/components/ListingAvatar";
import { LiveDot } from "@/components/LiveDot";
import type { BoardRowData } from "@/lib/board";
import { formatSatsShort } from "@/lib/utils";

/**
 * Rolling-24h podium, dropped inline between rank 3 and rank 4 of the main
 * board so the fast-moving window stays visible without leaving the page.
 */
export function TodayTopStrip({
  rows,
  seeAllHref,
}: {
  rows: BoardRowData[];
  seeAllHref: string;
}) {
  return (
    <section className="-mx-4 mt-2 mb-2 px-4 py-2 md:mx-0 md:mt-2.5 md:mb-2.5 md:py-3">
      <div className="mb-2 flex items-center justify-between gap-3 md:mb-2.5">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-[-0.02em]">
          <LiveDot />
          Today&apos;s top ranking
        </h2>
        <Link
          href={seeAllHref}
          className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          See all
          <ChevronRight className="size-3.5" strokeWidth={1.5} aria-hidden />
        </Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nobody has claimed a rank in the last 24 hours.
        </p>
      ) : (
        <ol className="grid gap-2 md:grid-cols-3">
          {rows.map((row) => (
            <li key={row.listing.id} className="min-w-0">
              <a
                href={`/go/${row.listing.id}`}
                rel="noreferrer nofollow"
                className="relative flex h-full items-center gap-2 rounded-xl bg-primary/[0.05] px-3 py-2 text-xs transition-colors hover:bg-primary/[0.09] md:gap-2.5 md:px-3.5 md:py-3"
              >
                <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
                  <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                    #{row.rank}
                  </span>
                  <ListingAvatar
                    listing={row.listing}
                    profile={row.profile}
                    className="size-7 rounded-md"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 leading-snug">
                  <div className="flex items-baseline gap-2">
                    <p className="min-w-0 flex-1 truncate font-semibold">{row.listing.title}</p>
                    <p className="shrink-0 font-semibold tabular-nums text-primary">
                      {formatSatsShort(row.amountSats)}
                    </p>
                  </div>
                  {row.listing.description ? (
                    <p className="truncate text-muted-foreground/70">{row.listing.description}</p>
                  ) : null}
                </div>
              </a>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
