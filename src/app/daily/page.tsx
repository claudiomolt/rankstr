import type { Metadata } from "next";
import Link from "next/link";
import { BoardRow } from "@/components/BoardRow";
import { loadDailyBoards, type DailyBoard } from "@/lib/board";
import { formatCount, formatUtcDay } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Daily · rankstr" };

/** Rows shown per day before the archive collapses into a link to the day. */
const PREVIEW_ROWS = 3;

export default async function DailyPage() {
  const { boards, startedOn } = await loadDailyBoards();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] md:text-[40px]">Daily</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground md:text-base">
          Each UTC day{startedOn ? ` since ${formatUtcDay(startedOn)}` : ""} gets its own board.
          Rank is what you spent that day. Today stays live until midnight UTC, then the day closes.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {boards.map((board) => (
          <DayCard key={board.dayKey} board={board} />
        ))}
      </div>
    </div>
  );
}

function DayCard({ board }: { board: DailyBoard }) {
  const rows = board.rows.slice(0, PREVIEW_ROWS);

  return (
    <section
      className={
        board.live
          ? "rounded-2xl border border-primary/40 bg-primary/[0.05] px-4 py-4"
          : "rounded-2xl border border-border px-4 py-4"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold tracking-[-0.02em] md:text-base">
          {formatUtcDay(board.dayKey)}
          {board.live ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
              <span className="size-1.5 rounded-full bg-current" aria-hidden />
              Live
            </span>
          ) : null}
        </h2>
        <p className="text-xs text-muted-foreground">
          {board.live
            ? "Open until midnight UTC"
            : `${formatCount(board.total)} ${board.total === 1 ? "listing" : "listings"}`}
        </p>
      </div>

      {board.live ? (
        <p className="mt-1 text-xs text-primary">
          This day is still open for claims. It closes at midnight UTC.
        </p>
      ) : null}

      {rows.length === 0 ? (
        <>
          <p className="mt-3 text-sm text-muted-foreground">Nobody claimed a rank this day.</p>
          {board.live ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/#claim"
                className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
              >
                Claim a rank
              </Link>
              <Link
                href="/today"
                className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted"
              >
                Show all ranks
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <ol className="mt-2 flex flex-col">
            {rows.map((row) => (
              <li key={row.listing.id} className={row.rank <= 3 ? "mb-2" : undefined}>
                <BoardRow row={row} />
              </li>
            ))}
          </ol>
          {board.total > rows.length ? (
            <Link
              href="/today"
              className="mt-1 inline-flex h-9 w-full items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted"
            >
              Show all ranks
            </Link>
          ) : null}
        </>
      )}
    </section>
  );
}
