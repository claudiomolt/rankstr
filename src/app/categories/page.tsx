import type { Metadata } from "next";
import Link from "next/link";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ListingAvatar } from "@/components/ListingAvatar";
import { loadCategorySummaries, type CategorySummary } from "@/lib/board";
import { formatCount, formatSatsShort, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Categories · rankstr" };

export default async function CategoriesPage() {
  const summaries = await loadCategorySummaries();
  const hottest = summaries
    .filter((s) => s.claimsToday > 0)
    .sort((a, b) => b.satsToday - a.satsToday)
    .slice(0, 3);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-[32px] font-semibold tracking-[-0.03em] md:text-[40px]">Categories</h1>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Every category has its own ranking. Pick one to see who leads it.
        </p>
      </div>

      <section className="rounded-2xl bg-muted/70 p-4 md:p-5">
        <h2 className="inline-flex items-center gap-1.5 text-sm font-semibold tracking-[-0.02em]">
          <span className="size-1.5 rounded-full bg-primary" aria-hidden />
          Most active categories
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Where ranks are getting claimed right now — and who is holding the top spot.
        </p>

        {hottest.length === 0 ? (
          <p className="mt-4 text-xs text-muted-foreground">
            No ranks have been claimed in the last 24 hours.
          </p>
        ) : (
          <ol className="mt-4 grid gap-3 md:grid-cols-3">
            {hottest.map((summary, i) => (
              <li key={summary.category.slug}>
                <Link
                  href={`/category/${summary.category.slug}`}
                  className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background px-3.5 py-3 transition-colors hover:border-primary/40"
                >
                  <div className="flex items-start gap-2">
                    <CategoryIcon
                      icon={summary.category.icon}
                      className="mt-0.5 size-4 shrink-0 text-primary"
                    />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-primary">
                        #{i + 1}
                        {i === 0 ? " HOTTEST" : ""}
                      </p>
                      <p className="truncate text-sm font-semibold">{summary.category.label}</p>
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {formatCount(summary.claimsToday)}{" "}
                      {summary.claimsToday === 1 ? "claim" : "claims"}
                    </span>
                    {summary.lastClaimAt ? (
                      <span suppressHydrationWarning>{timeAgo(summary.lastClaimAt)}</span>
                    ) : null}
                  </div>
                  {summary.top[0] ? (
                    <div className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1.5 text-xs">
                      <ListingAvatar
                        listing={summary.top[0].listing}
                        profile={summary.top[0].profile}
                        className="size-5 rounded"
                      />
                      <span className="min-w-0 flex-1 truncate">
                        <span className="text-muted-foreground">Leading </span>
                        {summary.top[0].listing.title}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums text-primary">
                        {formatSatsShort(summary.top[0].amountSats)}
                      </span>
                    </div>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {summaries.map((summary) => (
          <li key={summary.category.slug}>
            <CategoryCard summary={summary} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CategoryCard({ summary }: { summary: CategorySummary }) {
  const { category, top } = summary;

  return (
    <Link
      href={`/category/${category.slug}`}
      className="flex h-full flex-col gap-3 rounded-2xl border border-border p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start gap-2">
        <CategoryIcon icon={category.icon} className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-[-0.02em]">{category.label}</h3>
          <p className="text-xs text-muted-foreground">
            {formatCount(summary.listings)} {summary.listings === 1 ? "listing" : "listings"} ·{" "}
            {formatSatsShort(summary.satsClaimed)} sats
          </p>
        </div>
      </div>

      {top.length === 0 ? (
        <p className="rounded-xl bg-muted px-3 py-4 text-center text-xs text-muted-foreground">
          Nobody has claimed a rank here yet.
        </p>
      ) : (
        <ol className="space-y-1">
          {top.map((row) => (
            <li
              key={row.listing.id}
              className="flex items-center gap-2 rounded-lg bg-muted px-2 py-1.5 text-xs"
            >
              <span className="w-5 shrink-0 font-semibold tabular-nums text-muted-foreground">
                #{row.rank}
              </span>
              <ListingAvatar
                listing={row.listing}
                profile={row.profile}
                className="size-5 rounded"
              />
              <span className="min-w-0 flex-1 truncate font-medium">{row.listing.title}</span>
              <span className="shrink-0 font-semibold tabular-nums text-primary">
                {formatSatsShort(row.amountSats)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Link>
  );
}
