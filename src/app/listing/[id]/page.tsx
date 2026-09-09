import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { ListingAvatar } from "@/components/ListingAvatar";
import { loadListingDetail, type ListingDetail } from "@/lib/board";
import { identityLabel, outboundHref } from "@/lib/rankings";
import { truncateNpub } from "@/lib/nostr";
import { formatCount, formatSats, formatSatsShort, hostOf, relativeDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const detail = await loadListingDetail(id);
  if (!detail) return { title: "rankstr" };
  return {
    title: `${detail.listing.title} · #${detail.overallRank} on rankstr`,
    description: detail.listing.description ?? undefined,
  };
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadListingDetail(id);
  if (!detail) notFound();

  const { listing, profile, category } = detail;
  const href = outboundHref(listing);
  const identity =
    listing.identityType === "npub" && listing.npub
      ? truncateNpub(listing.npub)
      : listing.identityType === "x"
        ? `@${listing.handle}`
        : (hostOf(listing.url) ?? identityLabel(listing));

  return (
    <article className="pt-4 pb-4">
      <nav className="text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/" className="transition-colors hover:text-foreground">
          Leaderboard
        </Link>
        {category ? (
          <>
            <span className="mx-1.5" aria-hidden>
              ·
            </span>
            <Link
              href={`/category/${category.slug}`}
              className="transition-colors hover:text-foreground"
            >
              {category.label}
            </Link>
          </>
        ) : null}
      </nav>

      <section className="mt-4 rounded-2xl border border-primary/40 bg-primary/[0.06] p-5 md:p-6">
        <div className="flex items-start gap-4 md:gap-5">
          <ListingAvatar
            listing={listing}
            profile={profile}
            className="size-14 rounded-xl md:size-16"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.03em] text-balance md:text-[34px]">
              {listing.title}
            </h1>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-xs md:text-sm">
              {category ? (
                <>
                  <Link
                    href={`/category/${category.slug}`}
                    className="inline-flex items-center gap-1 font-semibold transition-colors hover:text-foreground/80"
                  >
                    <CategoryIcon icon={category.icon} className="size-3.5 shrink-0" />
                    {category.label}
                  </Link>
                  <Dot />
                </>
              ) : null}
              <span className="font-medium text-primary">{identity}</span>
              <Dot />
              <time
                dateTime={listing.createdAt}
                className="text-muted-foreground"
                suppressHydrationWarning
              >
                {relativeDate(listing.createdAt)}
              </time>
              <Dot />
              <span className="tabular-nums text-muted-foreground">
                {formatCount(listing.clickCount)} clicks
              </span>
            </p>
          </div>
        </div>

        {listing.description ? (
          <p className="mt-4 text-sm text-muted-foreground md:text-base">{listing.description}</p>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {href ? (
            <a
              href={`/go/${listing.id}`}
              rel="noreferrer nofollow"
              className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/80"
            >
              Visit
              <ArrowUpRight className="size-4" strokeWidth={2} aria-hidden />
            </a>
          ) : null}
          <CopyLinkButton path={`/listing/${listing.id}`} />
        </div>
      </section>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <RankCard
          label="Category rank"
          rank={detail.categoryRank}
          suffix={
            category
              ? `of ${formatCount(detail.categoryTotal)} in ${category.label}`
              : `of ${formatCount(detail.categoryTotal)}`
          }
          href={category ? `/category/${category.slug}` : "/"}
          linkLabel="See category ranking"
        />
        <RankCard
          label="Overall"
          rank={detail.overallRank}
          suffix={`of ${formatCount(detail.overallTotal)} on the board`}
          href="/"
          linkLabel="See overall ranking"
        />
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-[-0.02em] md:text-xl">About this ranking</h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base" suppressHydrationWarning>
          {summary(detail)}
        </p>

        <Question q={`What rank does ${listing.title} hold on rankstr?`}>
          {listing.title} has paid {formatSats(listing.cumulativeSats)} to rank #
          {detail.categoryRank} of {formatCount(detail.categoryTotal)}
          {category ? ` in ${category.label}` : ""} and #{detail.overallRank} of{" "}
          {formatCount(detail.overallTotal)} overall.
        </Question>

        <Question q={`Has ${listing.title} ranked today?`}>
          {detail.todayRank === null ? (
            <>
              {listing.title} has not paid in the last 24 hours, so they are not on{" "}
              <Link href="/today" className="text-primary underline underline-offset-2">
                today&apos;s board
              </Link>
              .
            </>
          ) : (
            <>
              {listing.title} has paid {formatSats(detail.satsToday)} in the last 24 hours, which is
              #{detail.todayRank} on{" "}
              <Link href="/today" className="text-primary underline underline-offset-2">
                today&apos;s board
              </Link>
              .
            </>
          )}
        </Question>

        <Question q={`How do I outrank ${listing.title}?`}>
          Anyone can take this rank for {formatSats(detail.outrankSats)}
          {category ? ` on the ${category.label} board` : ""}.{" "}
          <Link href="/#claim" className="text-primary underline underline-offset-2">
            Claim it
          </Link>
          .
        </Question>
      </section>

      {detail.alsoInCategory.length > 0 && category ? (
        <section className="mt-8">
          <div className="mb-2.5 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold tracking-[-0.02em]">Also in {category.label}</h2>
            <Link
              href={`/category/${category.slug}`}
              className="inline-flex items-center gap-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              See all
              <ChevronRight className="size-3.5" strokeWidth={1.5} aria-hidden />
            </Link>
          </div>
          <ol className="space-y-1">
            {detail.alsoInCategory.map((row) => (
              <li key={row.listing.id}>
                <Link
                  href={`/listing/${row.listing.id}`}
                  className="flex items-center gap-2.5 rounded-xl px-2 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <span className="w-7 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    #{row.rank}
                  </span>
                  <ListingAvatar
                    listing={row.listing}
                    profile={row.profile}
                    className="size-6 rounded-md"
                  />
                  <span className="min-w-0 flex-1 truncate">{row.listing.title}</span>
                  <span className="shrink-0 font-semibold tabular-nums text-primary">
                    {formatSatsShort(row.amountSats)}
                    <span className="ml-1 text-[0.75em] font-medium">sats</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}

function summary(detail: ListingDetail): string {
  const { raiseCount, lastRaiseAt, listing } = detail;
  const raises =
    raiseCount === 0
      ? "This listing has no settled payments recorded on this board yet."
      : `The listing has been paid into ${raiseCount === 1 ? "once" : `${formatCount(raiseCount)} times`}${
          lastRaiseAt ? `, most recently ${relativeDate(lastRaiseAt)}` : ""
        }.`;
  const clicks =
    listing.clickCount === 0
      ? "Nobody has opened it from the board yet."
      : `${formatCount(listing.clickCount)} ${listing.clickCount === 1 ? "visitor has" : "visitors have"} opened it from the board.`;
  return `${raises} ${clicks}`;
}

function RankCard({
  label,
  rank,
  suffix,
  href,
  linkLabel,
}: {
  label: string;
  rank: number;
  suffix: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-4">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-3xl font-semibold tracking-[-0.03em] tabular-nums">#{rank}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{suffix}</p>
      <Link
        href={href}
        className="mt-2 inline-block text-xs text-primary transition-colors hover:text-primary/80"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function Question({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold md:text-base">{q}</h3>
      <p className="mt-1 text-sm text-muted-foreground md:text-base">{children}</p>
    </div>
  );
}

function Dot() {
  return (
    <span aria-hidden className="text-muted-foreground/45">
      ·
    </span>
  );
}
