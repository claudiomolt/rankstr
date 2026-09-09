import type { Metadata } from "next";
import Link from "next/link";
import { BoardRow } from "@/components/BoardRow";
import { searchListings } from "@/lib/board";
import { BID_STEP_SATS } from "@/lib/rankings";
import { cn, formatCount } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Search · rankstr" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const rows = query ? await searchListings(query) : [];

  return (
    <div className="pt-4">
      <h1 className="text-[28px] font-semibold tracking-[-0.03em] md:text-[36px]">Search</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {query
          ? `${formatCount(rows.length)} ${rows.length === 1 ? "listing" : "listings"} matching “${query}”. Ranks are positions on the all-time board.`
          : "Type a product, domain, @handle, npub, or category in the bar above."}
      </p>

      {query && rows.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-border bg-muted/50 px-4 py-10 text-center text-sm text-muted-foreground">
          Nothing on the board matches that yet.{" "}
          <Link href="/#claim" className="text-primary underline underline-offset-2">
            Claim it
          </Link>{" "}
          and it will be.
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ol className="mt-6 flex flex-col">
          {rows.map((row) => (
            <li key={row.listing.id} className={cn("min-w-0", row.rank <= 3 && "mb-3")}>
              <BoardRow row={row} claimSats={row.amountSats + BID_STEP_SATS} />
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
