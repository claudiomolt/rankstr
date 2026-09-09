/**
 * Server-side board assembly shared by the main board, the category boards and
 * the time-windowed boards.
 *
 * One payment ranks a listing on every board that includes that spend. The
 * windows differ only in the slice of time they count:
 *   all-time — everything the listing has ever been paid, never expires
 *   today    — a rolling 24 hours, each payment dropping off a day later
 *   daily    — a UTC calendar day, frozen once the day closes
 *
 * Ranks are always absolute within the board being viewed, so row #1 on a
 * category board is that category's leader, not the site leader.
 */

import { getCategory, type Category } from "@/lib/categories";
import { fetchProfiles } from "@/lib/nostr";
import type { Profile } from "@/lib/nostr";
import {
  BID_STEP_SATS,
  BOARD_PAGE_SIZE,
  MIN_BID_SATS,
  pageCount,
  pageOf,
  sortListings,
  type BoardWindow,
  type Listing,
} from "@/lib/rankings";
import { getStore, type ActivityEntry, type SettledPayment } from "@/lib/store";
import { activeTakeover, type Takeover } from "@/lib/takeover";
import { getBoardQuote } from "@/lib/bids";
import { utcDayKey } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

/** How far back the Daily archive page looks. */
export const DAILY_ARCHIVE_DAYS = 30;

export type BoardRowData = {
  listing: Listing;
  rank: number;
  /** Sats that count on this board — cumulative on all-time, windowed otherwise. */
  amountSats: number;
  profile: Profile | null;
};

export type BoardStats = {
  listings: number;
  satsClaimed: number;
};

export type BoardView = {
  window: BoardWindow;
  rows: BoardRowData[];
  total: number;
  page: number;
  pages: number;
  pageSize: number;
  categorySlug: string | null;
  category: Category | null;
  takeover: { takeover: Takeover; listing: Listing } | null;
  activity: ActivityEntry[];
  quote: Awaited<ReturnType<typeof getBoardQuote>>;
  /** Smallest bid that claims #1 on the board being viewed. */
  claimTopSats: number;
  topAmountSats: number;
  /** Top three of the rolling 24h board, shown as a strip inside the main board. */
  todayTop: BoardRowData[];
  stats: BoardStats;
};

function sumByListing(payments: SettledPayment[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const p of payments) {
    totals.set(p.listingId, (totals.get(p.listingId) ?? 0) + p.amountSats);
  }
  return totals;
}

/** Rank by amount DESC; equal amounts keep the order they were placed in. */
function rankByAmount(
  listings: Listing[],
  amountOf: (listing: Listing) => number,
): { listing: Listing; amountSats: number }[] {
  return listings
    .map((listing) => ({ listing, amountSats: amountOf(listing) }))
    .filter((entry) => entry.amountSats > 0)
    .sort((a, b) => {
      if (b.amountSats !== a.amountSats) return b.amountSats - a.amountSats;
      return (
        new Date(a.listing.createdAt).getTime() - new Date(b.listing.createdAt).getTime()
      );
    });
}

function claimTopFor(topAmountSats: number): number {
  return Math.max(topAmountSats + BID_STEP_SATS, MIN_BID_SATS);
}

export async function loadBoard(
  options: {
    categorySlug?: string | null;
    page?: number;
    window?: BoardWindow;
    now?: Date;
  } = {},
): Promise<BoardView> {
  const store = getStore();
  const now = options.now ?? new Date();
  const window: BoardWindow = options.window === "today" ? "today" : "all-time";
  const category = getCategory(options.categorySlug);
  const requestedPage = Math.max(1, Math.floor(options.page ?? 1) || 1);

  const [all, takeovers, activity, quote, rolling] = await Promise.all([
    store.listPublic(),
    store.listTakeovers(),
    store.recentActivity(8),
    getBoardQuote(),
    store.settledSince(new Date(now.getTime() - DAY_MS).toISOString()),
  ]);

  const rollingTotals = sumByListing(rolling);
  const scoped = category ? all.filter((l) => l.categorySlug === category.slug) : all;

  const ranked =
    window === "today"
      ? rankByAmount(scoped, (l) => rollingTotals.get(l.id) ?? 0)
      : sortListings(scoped).map((listing) => ({
          listing,
          amountSats: listing.cumulativeSats,
        }));

  const pages = pageCount(ranked.length, BOARD_PAGE_SIZE);
  const page = Math.min(requestedPage, pages);
  const slice = pageOf(ranked, page, BOARD_PAGE_SIZE);
  const offset = (page - 1) * BOARD_PAGE_SIZE;

  const todayRanked = rankByAmount(scoped, (l) => rollingTotals.get(l.id) ?? 0).slice(0, 3);

  const npubs = [...slice, ...todayRanked]
    .map((entry) => entry.listing.npub)
    .filter((n): n is string => Boolean(n?.trim()));
  const profiles = await fetchProfiles(npubs);

  const live = activeTakeover(takeovers, now);
  const takeoverListing = live ? all.find((l) => l.id === live.listingId) ?? null : null;

  const withProfile = (
    entry: { listing: Listing; amountSats: number },
    index: number,
  ): BoardRowData => ({
    listing: entry.listing,
    amountSats: entry.amountSats,
    rank: index + 1,
    profile: entry.listing.npub ? profiles.get(entry.listing.npub) ?? null : null,
  });

  const topAmountSats = ranked[0]?.amountSats ?? 0;

  return {
    window,
    rows: slice.map((entry, i) => withProfile(entry, offset + i)),
    total: ranked.length,
    page,
    pages,
    pageSize: BOARD_PAGE_SIZE,
    categorySlug: category?.slug ?? null,
    category,
    takeover: live && takeoverListing ? { takeover: live, listing: takeoverListing } : null,
    activity,
    quote,
    claimTopSats: claimTopFor(topAmountSats),
    topAmountSats,
    todayTop: todayRanked.map(withProfile),
    stats: {
      listings: all.length,
      satsClaimed: all.reduce((sum, l) => sum + l.cumulativeSats, 0),
    },
  };
}

export type DailyBoard = {
  dayKey: string;
  live: boolean;
  total: number;
  rows: BoardRowData[];
};

/**
 * The Daily archive: one UTC calendar day per board, newest first. Today's day
 * stays live until midnight UTC, then freezes.
 */
export async function loadDailyBoards(
  options: { days?: number; now?: Date } = {},
): Promise<{ boards: DailyBoard[]; startedOn: string | null }> {
  const store = getStore();
  const now = options.now ?? new Date();
  const days = Math.max(1, options.days ?? DAILY_ARCHIVE_DAYS);
  const since = new Date(now.getTime() - days * DAY_MS);

  const [all, payments] = await Promise.all([
    store.listPublic(),
    store.settledSince(since.toISOString()),
  ]);

  const byId = new Map(all.map((l) => [l.id, l]));
  const byDay = new Map<string, Map<string, number>>();
  for (const payment of payments) {
    const key = utcDayKey(new Date(payment.settledAt));
    const bucket = byDay.get(key) ?? new Map<string, number>();
    bucket.set(payment.listingId, (bucket.get(payment.listingId) ?? 0) + payment.amountSats);
    byDay.set(key, bucket);
  }

  const todayKey = utcDayKey(now);
  if (!byDay.has(todayKey)) byDay.set(todayKey, new Map());

  const npubs = all.map((l) => l.npub).filter((n): n is string => Boolean(n?.trim()));
  const profiles = await fetchProfiles(npubs);

  const boards = [...byDay.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([dayKey, totals]) => {
      const ranked = [...totals.entries()]
        .map(([listingId, amountSats]) => ({ listing: byId.get(listingId), amountSats }))
        .filter((entry): entry is { listing: Listing; amountSats: number } =>
          Boolean(entry.listing),
        )
        .sort((a, b) => {
          if (b.amountSats !== a.amountSats) return b.amountSats - a.amountSats;
          return (
            new Date(a.listing.createdAt).getTime() - new Date(b.listing.createdAt).getTime()
          );
        });

      return {
        dayKey,
        live: dayKey === todayKey,
        total: ranked.length,
        rows: ranked.map((entry, i) => ({
          listing: entry.listing,
          amountSats: entry.amountSats,
          rank: i + 1,
          profile: entry.listing.npub ? profiles.get(entry.listing.npub) ?? null : null,
        })),
      };
    });

  const earliest = payments.reduce<string | null>((min, p) => {
    const key = utcDayKey(new Date(p.settledAt));
    return min === null || key < min ? key : min;
  }, null);

  return { boards, startedOn: earliest };
}

export type ListingDetail = {
  listing: Listing;
  profile: Profile | null;
  category: Category | null;
  overallRank: number;
  overallTotal: number;
  categoryRank: number;
  categoryTotal: number;
  /** Sats this listing took in the rolling 24h window; 0 means it is off Today's board. */
  satsToday: number;
  todayRank: number | null;
  /** Smallest amount that takes this listing's rank. */
  outrankSats: number;
  raiseCount: number;
  lastRaiseAt: string | null;
  alsoInCategory: BoardRowData[];
};

/**
 * Everything the listing page prints. Ranks are recomputed here rather than
 * stored, so a listing's page can never disagree with the board it came from.
 */
export async function loadListingDetail(
  listingId: string,
  options: { now?: Date } = {},
): Promise<ListingDetail | null> {
  const store = getStore();
  const now = options.now ?? new Date();

  const [all, payments, rolling] = await Promise.all([
    store.listPublic(),
    store.settledForListing(listingId),
    store.settledSince(new Date(now.getTime() - DAY_MS).toISOString()),
  ]);

  const overall = sortListings(all);
  const overallIndex = overall.findIndex((l) => l.id === listingId);
  if (overallIndex === -1) return null;

  const listing = overall[overallIndex];
  const category = getCategory(listing.categorySlug);
  const scoped = overall.filter((l) => l.categorySlug === listing.categorySlug);
  const categoryIndex = scoped.findIndex((l) => l.id === listingId);

  const rollingTotals = sumByListing(rolling);
  const todayRanked = rankByAmount(all, (l) => rollingTotals.get(l.id) ?? 0);
  const todayIndex = todayRanked.findIndex((entry) => entry.listing.id === listingId);

  const npubs = scoped.map((l) => l.npub).filter((n): n is string => Boolean(n?.trim()));
  const profiles = await fetchProfiles(npubs);

  return {
    listing,
    profile: listing.npub ? profiles.get(listing.npub) ?? null : null,
    category,
    overallRank: overallIndex + 1,
    overallTotal: overall.length,
    categoryRank: categoryIndex + 1,
    categoryTotal: scoped.length,
    satsToday: rollingTotals.get(listingId) ?? 0,
    todayRank: todayIndex === -1 ? null : todayIndex + 1,
    outrankSats: claimTopFor(listing.cumulativeSats),
    raiseCount: payments.length,
    lastRaiseAt: payments[0]?.settledAt ?? null,
    alsoInCategory: scoped
      .filter((l) => l.id !== listingId)
      .slice(0, 5)
      .map((l) => ({
        listing: l,
        amountSats: l.cumulativeSats,
        rank: scoped.findIndex((s) => s.id === l.id) + 1,
        profile: l.npub ? profiles.get(l.npub) ?? null : null,
      })),
  };
}

/**
 * Free-text search across the public board. Matches title, description and the
 * submitted identity, so a domain, an @handle or an npub all find their listing.
 */
export async function searchListings(
  query: string,
  options: { limit?: number } = {},
): Promise<BoardRowData[]> {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];

  const store = getStore();
  const all = sortListings(await store.listPublic());

  const matches = all
    .map((listing, index) => ({ listing, rank: index + 1 }))
    .filter(({ listing }) => {
      const category = getCategory(listing.categorySlug);
      return [
        listing.title,
        listing.description,
        listing.url,
        listing.handle,
        listing.npub,
        category?.label,
      ]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(needle));
    })
    .slice(0, options.limit ?? 30);

  const npubs = matches.map((m) => m.listing.npub).filter((n): n is string => Boolean(n?.trim()));
  const profiles = await fetchProfiles(npubs);

  return matches.map(({ listing, rank }) => ({
    listing,
    rank,
    amountSats: listing.cumulativeSats,
    profile: listing.npub ? profiles.get(listing.npub) ?? null : null,
  }));
}

/** Per-category summary used by the Categories index. */
export type CategorySummary = {
  category: Category;
  listings: number;
  satsClaimed: number;
  top: BoardRowData[];
  /** Sats claimed in this category in the rolling 24h window. */
  satsToday: number;
  claimsToday: number;
  lastClaimAt: string | null;
};

export async function loadCategorySummaries(
  options: { now?: Date } = {},
): Promise<CategorySummary[]> {
  const { CATEGORIES } = await import("@/lib/categories");
  const store = getStore();
  const now = options.now ?? new Date();

  const [all, rolling] = await Promise.all([
    store.listPublic(),
    store.settledSince(new Date(now.getTime() - DAY_MS).toISOString()),
  ]);

  const byId = new Map(all.map((l) => [l.id, l]));
  const npubs = all.map((l) => l.npub).filter((n): n is string => Boolean(n?.trim()));
  const profiles = await fetchProfiles(npubs);

  return CATEGORIES.map((category) => {
    const scoped = sortListings(all.filter((l) => l.categorySlug === category.slug));
    const payments = rolling.filter(
      (p) => byId.get(p.listingId)?.categorySlug === category.slug,
    );

    return {
      category,
      listings: scoped.length,
      satsClaimed: scoped.reduce((sum, l) => sum + l.cumulativeSats, 0),
      top: scoped.slice(0, 3).map((listing, i) => ({
        listing,
        amountSats: listing.cumulativeSats,
        rank: i + 1,
        profile: listing.npub ? profiles.get(listing.npub) ?? null : null,
      })),
      satsToday: payments.reduce((sum, p) => sum + p.amountSats, 0),
      claimsToday: payments.length,
      lastClaimAt:
        payments
          .map((p) => p.settledAt)
          .sort()
          .at(-1) ?? null,
    };
  });
}
