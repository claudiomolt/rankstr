/**
 * Leaderboard takeover: costs 2× the current #1 and locks the first page for
 * 3 hours. Only one takeover can be live at a time.
 *
 * "Locks the first page" is read narrowly: the holder owns an exclusive pinned
 * slot above page 1 for the window, and no second takeover may start while it
 * runs. Bids underneath keep settling and re-ranking. See docs/outbid-reference.md.
 */

import { MIN_BID_SATS, topBidSats, type Listing } from "./rankings";

export const TAKEOVER_MULTIPLIER = 2;
export const TAKEOVER_DURATION_MS = 3 * 60 * 60 * 1000;

export type TakeoverStatus = "pending" | "active" | "expired" | "cancelled";

export type Takeover = {
  id: string;
  listingId: string;
  amountSats: number;
  startsAt: string;
  endsAt: string;
  status: TakeoverStatus;
};

/**
 * 2× the current #1. Floored at the minimum bid so an empty board cannot be
 * taken over for nothing.
 */
export function takeoverCostSats(listings: Listing[]): number {
  return Math.max(topBidSats(listings) * TAKEOVER_MULTIPLIER, MIN_BID_SATS);
}

export function takeoverWindow(startsAt: Date): { startsAt: string; endsAt: string } {
  return {
    startsAt: startsAt.toISOString(),
    endsAt: new Date(startsAt.getTime() + TAKEOVER_DURATION_MS).toISOString(),
  };
}

export function isTakeoverLive(takeover: Takeover, now: Date = new Date()): boolean {
  if (takeover.status !== "active") return false;
  const nowMs = now.getTime();
  return nowMs >= new Date(takeover.startsAt).getTime() && nowMs < new Date(takeover.endsAt).getTime();
}

/** The single live takeover, or null. Latest start wins if data ever overlaps. */
export function activeTakeover(takeovers: Takeover[], now: Date = new Date()): Takeover | null {
  const live = takeovers.filter((t) => isTakeoverLive(t, now));
  if (live.length === 0) return null;
  return live.reduce((latest, t) =>
    new Date(t.startsAt).getTime() > new Date(latest.startsAt).getTime() ? t : latest,
  );
}

export type TakeoverEligibility =
  | { ok: true; costSats: number }
  | { ok: false; reason: string; activeUntil?: string };

/** Only one takeover can be live at a time. */
export function canStartTakeover(
  takeovers: Takeover[],
  listings: Listing[],
  now: Date = new Date(),
): TakeoverEligibility {
  const live = activeTakeover(takeovers, now);
  if (live) {
    return {
      ok: false,
      reason: "A takeover is already live. Only one takeover can be live at a time.",
      activeUntil: live.endsAt,
    };
  }
  return { ok: true, costSats: takeoverCostSats(listings) };
}

export function takeoverRemainingMs(takeover: Takeover, now: Date = new Date()): number {
  return Math.max(0, new Date(takeover.endsAt).getTime() - now.getTime());
}
