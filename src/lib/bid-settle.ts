import type { Listing } from "@/lib/rankings";

/** Pure settle math: bump cumulative and mark listing climbing. */
export function applyPaidBid<T extends { cumulativeSats: number; status: Listing["status"] }>(
  listing: T,
  amountSats: number,
): T {
  return {
    ...listing,
    cumulativeSats: listing.cumulativeSats + amountSats,
    status: "climbing",
  };
}

export type SettleBidSnapshot = {
  bidStatus: string;
  listingId: string;
  amountSats: number;
  listing: Listing | null;
};

export type SettleBidOutcome =
  | {
      ok: true;
      alreadyPaid: boolean;
      listingId: string;
      cumulativeSats: number;
      listing: Listing | null;
    }
  | { ok: false; reason: string };

/**
 * Pure decision tree for paid webhook / mock-pay settle.
 * Callers persist side effects; this keeps behavior identical without I/O.
 */
export function resolvePaidSettle(input: SettleBidSnapshot): SettleBidOutcome {
  if (input.bidStatus === "paid") {
    return {
      ok: true,
      alreadyPaid: true,
      listingId: input.listingId,
      cumulativeSats: input.listing?.cumulativeSats ?? 0,
      listing: input.listing,
    };
  }
  if (input.bidStatus !== "pending") {
    return { ok: false, reason: `bid status is ${input.bidStatus}` };
  }
  if (!input.listing) {
    return { ok: false, reason: "listing not found" };
  }
  const listing = applyPaidBid(input.listing, input.amountSats);
  return {
    ok: true,
    alreadyPaid: false,
    listingId: input.listingId,
    cumulativeSats: listing.cumulativeSats,
    listing,
  };
}
