import type { IdentityType } from "./identity";

export type ListingStatus = "live" | "open" | "climbing";

export type Listing = {
  id: string;
  title: string;
  /** One-line tagline the submitter supplies. Printed under the title on the board. */
  description?: string;
  /** Canonical identity key from src/lib/identity.ts — one listing per key. */
  identityKey: string;
  identityType: IdentityType;
  url?: string;
  handle?: string;
  npub?: string;
  categorySlug: string;
  cumulativeSats: number;
  clickCount: number;
  createdAt: string;
  status: ListingStatus;
};

/**
 * Where a click on this listing goes, already free of query parameters.
 * npub-only listings have no web destination, so they are not clickable.
 */
export function outboundHref(listing: Listing): string | null {
  if (listing.identityType === "x" && listing.handle) return `https://x.com/${listing.handle}`;
  if (listing.url) return listing.url;
  return null;
}

/** What the board prints under a listing title. */
export function identityLabel(listing: Listing): string {
  if (listing.identityType === "x" && listing.handle) return `@${listing.handle}`;
  if (listing.url) return listing.url.replace(/^https?:\/\//, "");
  return listing.npub ?? listing.identityKey;
}

/** Whole sats only, 1000 minimum. The sats analogue of outbid's whole-dollar $2 floor. */
export const MIN_BID_SATS = 1000;

/** Bids move in whole units, so the smallest raise is one sat. */
export const BID_STEP_SATS = 1;

/** Rows per board page. Gives "locks the first page" a concrete meaning. */
export const BOARD_PAGE_SIZE = 20;

/**
 * The three windows the same payments are ranked in.
 *
 * One payment ranks a listing on every board that includes that spend — the
 * boards differ only in the slice of time they look at.
 */
export type BoardWindow = "all-time" | "today" | "daily";

/** Rank = cumulative sats DESC; equal sats → the older listing keeps the higher rank. */
export function sortListings(listings: Listing[]): Listing[] {
  return [...listings].sort((a, b) => {
    if (b.cumulativeSats !== a.cumulativeSats) {
      return b.cumulativeSats - a.cumulativeSats;
    }
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });
}

/** A bid must be a whole number of sats at or above the minimum. */
export function isValidBidAmount(sats: number): boolean {
  return Number.isInteger(sats) && sats >= MIN_BID_SATS;
}

/** Current #1 cumulative, or 0 on an empty board. */
export function topBidSats(listings: Listing[]): number {
  return listings.reduce((max, l) => (l.cumulativeSats > max ? l.cumulativeSats : max), 0);
}

/** Smallest bid that claims #1 outright: strictly above the current top. */
export function claimTopTargetSats(listings: Listing[]): number {
  return Math.max(topBidSats(listings) + BID_STEP_SATS, MIN_BID_SATS);
}

/**
 * Sats to invoice so a listing reaches `targetCumulative`. You only pay the
 * difference. Returns null when the target is not a legal destination.
 */
export function raiseDeltaSats(currentCumulative: number, targetCumulative: number): number | null {
  if (!isValidBidAmount(targetCumulative)) return null;
  if (targetCumulative <= currentCumulative) return null;
  return targetCumulative - currentCumulative;
}

/**
 * Where a bid lands. Paying less than #1 still puts you on the board at whatever
 * rank that bid can take. `createdAt` omitted means a brand-new listing, which
 * sits below every existing listing it ties with.
 */
export function projectedRank(
  listings: Listing[],
  bidSats: number,
  listingId?: string,
  createdAt?: string,
): number {
  const createdMs = createdAt ? new Date(createdAt).getTime() : Number.POSITIVE_INFINITY;
  let above = 0;
  for (const other of listings) {
    if (listingId && other.id === listingId) continue;
    if (other.cumulativeSats > bidSats) {
      above += 1;
    } else if (other.cumulativeSats === bidSats) {
      if (new Date(other.createdAt).getTime() <= createdMs) above += 1;
    }
  }
  return above + 1;
}

export function pageCount(total: number, pageSize: number = BOARD_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

/** 1-indexed page slice of an already-ranked board. */
export function pageOf<T>(ranked: T[], page: number, pageSize: number = BOARD_PAGE_SIZE): T[] {
  const safe = Math.max(1, Math.floor(page) || 1);
  const start = (safe - 1) * pageSize;
  return ranked.slice(start, start + pageSize);
}
