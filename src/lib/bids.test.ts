import { describe, expect, it } from "vitest";
import {
  applyPaidBid,
  resolvePaidSettle,
} from "./bid-settle";
import type { Listing } from "./rankings";
import { stripTrackingParams } from "./utils";

function baseListing(over: Partial<Listing> = {}): Listing {
  return {
    id: "listing-1",
    title: "Demo",
    cumulativeSats: 21000,
    createdAt: "2026-08-01T12:00:00.000Z",
    status: "live",
    ...over,
  };
}

describe("applyPaidBid", () => {
  it("bumps cumulative_sats by paid amount and marks climbing", () => {
    const next = applyPaidBid(baseListing(), 4000);
    expect(next.cumulativeSats).toBe(25000);
    expect(next.status).toBe("climbing");
    expect(next.id).toBe("listing-1");
  });

  it("works from zero cumulative (new listing settle)", () => {
    const next = applyPaidBid(baseListing({ cumulativeSats: 0, status: "open" }), 1000);
    expect(next.cumulativeSats).toBe(1000);
    expect(next.status).toBe("climbing");
  });
});

describe("resolvePaidSettle (webhook / mock-pay helper)", () => {
  it("settles pending bid → paid outcome with bumped cumulative", () => {
    const outcome = resolvePaidSettle({
      bidStatus: "pending",
      listingId: "listing-1",
      amountSats: 4000,
      listing: baseListing(),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.alreadyPaid).toBe(false);
    expect(outcome.cumulativeSats).toBe(25000);
    expect(outcome.listing?.status).toBe("climbing");
    expect(outcome.listing?.cumulativeSats).toBe(25000);
  });

  it("is idempotent for already-paid bids", () => {
    const outcome = resolvePaidSettle({
      bidStatus: "paid",
      listingId: "listing-1",
      amountSats: 4000,
      listing: baseListing({ cumulativeSats: 25000, status: "climbing" }),
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.alreadyPaid).toBe(true);
    expect(outcome.cumulativeSats).toBe(25000);
  });

  it("rejects non-pending statuses", () => {
    const outcome = resolvePaidSettle({
      bidStatus: "expired",
      listingId: "listing-1",
      amountSats: 1000,
      listing: baseListing(),
    });
    expect(outcome).toEqual({ ok: false, reason: "bid status is expired" });
  });

  it("rejects missing listing on pending settle", () => {
    const outcome = resolvePaidSettle({
      bidStatus: "pending",
      listingId: "missing",
      amountSats: 1000,
      listing: null,
    });
    expect(outcome).toEqual({ ok: false, reason: "listing not found" });
  });
});

describe("stripTrackingParams", () => {
  it("removes utm and click ids from outbound URLs", () => {
    expect(
      stripTrackingParams(
        "https://lawallet.io/path?utm_source=x&utm_campaign=y&keep=1&fbclid=abc",
      ),
    ).toBe("https://lawallet.io/path?keep=1");
  });

  it("returns empty for blank input", () => {
    expect(stripTrackingParams("")).toBe("");
    expect(stripTrackingParams(undefined)).toBe("");
  });
});
