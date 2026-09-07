import type { VerifyResult } from "@/lib/ln/types";
import type { BidStatus } from "@/lib/store";

/**
 * Pure decision layer between an LUD21 verify result and a database write.
 *
 * Keeping this separate from the store means the settle rules — a completed
 * payment claims the rank, and only once — are testable without a node, a
 * network, or a database.
 */

export type SettleDecision =
  | { action: "settle"; nextCumulative: number }
  | { action: "already-settled"; nextCumulative: number }
  | { action: "wait"; reason?: string }
  | { action: "fail"; reason: string };

export type SettleInput = {
  bidStatus: BidStatus;
  verify: VerifyResult;
  listingCumulative: number;
  amountSats: number;
};

export function decideSettlement(input: SettleInput): SettleDecision {
  if (input.bidStatus === "paid") {
    return { action: "already-settled", nextCumulative: input.listingCumulative };
  }
  if (input.bidStatus === "failed" || input.bidStatus === "expired") {
    return { action: "fail", reason: `bid is ${input.bidStatus}` };
  }

  switch (input.verify.state) {
    case "settled":
      return { action: "settle", nextCumulative: input.listingCumulative + input.amountSats };
    case "failed":
      return { action: "fail", reason: input.verify.reason ?? "payment failed" };
    default:
      return { action: "wait", reason: input.verify.reason };
  }
}

/** Cumulative sats after a paid bid. A bid adds to the listing, it does not replace it. */
export function applyPaidBid(currentCumulative: number, amountSats: number): number {
  return currentCumulative + amountSats;
}
