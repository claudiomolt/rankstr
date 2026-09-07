/**
 * Server-side board assembly shared by the main board and the category boards.
 *
 * Ranks are always absolute within the board being viewed, so row #1 on a
 * category board is that category's leader, not the site leader.
 */

import { getCategory } from "@/lib/categories";
import { fetchProfiles } from "@/lib/nostr";
import type { Profile } from "@/lib/nostr";
import {
  BOARD_PAGE_SIZE,
  pageCount,
  pageOf,
  sortListings,
  type Listing,
} from "@/lib/rankings";
import { getStore, type ActivityEntry } from "@/lib/store";
import { activeTakeover, type Takeover } from "@/lib/takeover";
import { getBoardQuote } from "@/lib/bids";

export type BoardRowData = {
  listing: Listing;
  rank: number;
  profile: Profile | null;
};

export type BoardView = {
  rows: BoardRowData[];
  total: number;
  page: number;
  pages: number;
  categorySlug: string | null;
  takeover: { takeover: Takeover; listing: Listing } | null;
  activity: ActivityEntry[];
  quote: Awaited<ReturnType<typeof getBoardQuote>>;
};

export async function loadBoard(options: {
  categorySlug?: string | null;
  page?: number;
} = {}): Promise<BoardView> {
  const store = getStore();
  const category = getCategory(options.categorySlug);
  const requestedPage = Math.max(1, Math.floor(options.page ?? 1) || 1);

  const [all, takeovers, activity, quote] = await Promise.all([
    store.listPublic(),
    store.listTakeovers(),
    store.recentActivity(8),
    getBoardQuote(),
  ]);

  const scoped = category ? all.filter((l) => l.categorySlug === category.slug) : all;
  const ranked = sortListings(scoped);
  const pages = pageCount(ranked.length, BOARD_PAGE_SIZE);
  const page = Math.min(requestedPage, pages);

  const slice = pageOf(ranked, page, BOARD_PAGE_SIZE);
  const offset = (page - 1) * BOARD_PAGE_SIZE;

  const npubs = slice.map((l) => l.npub).filter((n): n is string => Boolean(n?.trim()));
  const profiles = await fetchProfiles(npubs);

  const live = activeTakeover(takeovers);
  const takeoverListing = live ? ranked.find((l) => l.id === live.listingId) ?? null : null;

  return {
    rows: slice.map((listing, i) => ({
      listing,
      rank: offset + i + 1,
      profile: listing.npub ? profiles.get(listing.npub) ?? null : null,
    })),
    total: ranked.length,
    page,
    pages,
    categorySlug: category?.slug ?? null,
    takeover: live && takeoverListing ? { takeover: live, listing: takeoverListing } : null,
    activity,
    quote,
  };
}
