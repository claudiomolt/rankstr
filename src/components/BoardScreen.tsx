import { ActivityFeed } from "@/components/ActivityFeed";
import { BoardPagination } from "@/components/BoardPagination";
import { BoardRow } from "@/components/BoardRow";
import { BoardTabs } from "@/components/BoardTabs";
import { ClaimPanel } from "@/components/ClaimPanel";
import { TakeoverBanner } from "@/components/TakeoverBanner";
import { TodayTopStrip } from "@/components/TodayTopStrip";
import type { BoardView } from "@/lib/board";
import { BID_STEP_SATS } from "@/lib/rankings";
import { cn } from "@/lib/utils";

/**
 * Shared board surface. The main board, every category board and the rolling
 * 24h board render the same thing; only the scope of the ranking changes.
 *
 * The rolling-24h podium is spliced in after rank 3 and the activity feed after
 * rank 10, so the page reads as one continuous leaderboard rather than a stack
 * of separate panels.
 */
export function BoardScreen({
  view,
  basePath,
  allTimeHref,
  todayHref,
}: {
  view: BoardView;
  basePath: string;
  allTimeHref: string;
  todayHref: string;
}) {
  const showTakeover = view.takeover !== null && view.page === 1 && view.categorySlug === null;
  const showStrips = view.page === 1 && view.window === "all-time";

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-5 md:gap-6">
        <BoardTabs active={view.window} allTimeHref={allTimeHref} todayHref={todayHref} />
        <ClaimPanel
          window={view.window}
          claimTopSats={view.claimTopSats}
          categorySlug={view.categorySlug}
          categoryLabel={view.category?.label ?? null}
          mock={view.quote.mock}
        />
      </div>

      {showTakeover && view.takeover ? (
        <TakeoverBanner takeover={view.takeover.takeover} listing={view.takeover.listing} />
      ) : null}

      <div className="flex scroll-mt-6 flex-col gap-4">
        {view.rows.length === 0 ? (
          <EmptyBoard window={view.window} />
        ) : (
          <ol className="flex flex-col pt-1 md:pt-2">
            {view.rows.map((row, index) => (
              <li key={row.listing.id} className={cn("min-w-0", row.rank <= 3 && "mb-3")}>
                <BoardRow
                  row={row}
                  claimSats={row.amountSats + BID_STEP_SATS}
                  showCategory={view.categorySlug === null}
                />
                {showStrips && index === 2 ? (
                  <TodayTopStrip rows={view.todayTop} seeAllHref={todayHref} />
                ) : null}
                {showStrips && index === 9 ? <ActivityFeed initial={view.activity} /> : null}
              </li>
            ))}
          </ol>
        )}

        <BoardPagination
          basePath={basePath}
          page={view.page}
          pages={view.pages}
          total={view.total}
          pageSize={view.pageSize}
        />
      </div>

      {view.rows.length > 0 && view.rows.length <= 10 && showStrips ? (
        <ActivityFeed initial={view.activity} />
      ) : null}
    </div>
  );
}

function EmptyBoard({ window }: { window: BoardView["window"] }) {
  return (
    <p className="rounded-2xl border border-border bg-muted/50 px-4 py-10 text-center text-sm text-muted-foreground">
      {window === "today"
        ? "Nobody has claimed a rank in the last 24 hours."
        : "Nothing here yet. A completed payment is what claims the first rank."}
    </p>
  );
}
