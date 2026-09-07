import { ActivityFeed } from "@/components/ActivityFeed";
import { BidForm } from "@/components/BidForm";
import { BoardPagination } from "@/components/BoardPagination";
import { BoardRow } from "@/components/BoardRow";
import { CategoryNav } from "@/components/CategoryNav";
import { TakeoverBanner } from "@/components/TakeoverBanner";
import type { BoardView } from "@/lib/board";

/**
 * Shared board surface. The main board and every category board render the same
 * thing; only the scope of the ranking changes.
 */
export function BoardScreen({
  view,
  basePath,
  heading,
  blurb,
}: {
  view: BoardView;
  basePath: string;
  heading: string;
  blurb: string;
}) {
  const showTakeover = view.takeover !== null && view.page === 1 && view.categorySlug === null;

  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--rs-frost)]">
          live signal board
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold lowercase tracking-tight">{heading}</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">{blurb}</p>
      </div>

      {view.quote.mock ? (
        <p
          className="border border-border bg-card px-3 py-2 font-mono text-xs text-[color:var(--rs-brass)]"
          style={{ borderLeft: "3px solid hsl(var(--accent))" }}
        >
          mock rail — LN_ADDRESS is not configured, so invoices are simulated and no sats move.
        </p>
      ) : null}

      <CategoryNav active={view.categorySlug} />

      {showTakeover && view.takeover ? (
        <TakeoverBanner takeover={view.takeover.takeover} listing={view.takeover.listing} />
      ) : null}

      <section className="space-y-2" aria-label="Leaderboard">
        {view.rows.length === 0 ? (
          <p className="border border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing here yet. A completed payment is what claims the first rank.
          </p>
        ) : (
          view.rows.map((row) => (
            <BoardRow
              key={row.listing.id}
              listing={row.listing}
              rank={row.rank}
              profile={row.profile}
              showCategory={view.categorySlug === null}
            />
          ))
        )}
      </section>

      <BoardPagination basePath={basePath} page={view.page} pages={view.pages} />

      <BidForm quote={view.quote} defaultCategory={view.categorySlug ?? undefined} />

      <ActivityFeed initial={view.activity} />
    </div>
  );
}
