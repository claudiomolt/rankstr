import { describe, expect, it } from "vitest";
import {
  MIN_BID_SATS,
  raiseDeltaSats,
  sortListings,
  type Listing,
} from "./rankings";

function listing(
  partial: Partial<Listing> & Pick<Listing, "id" | "cumulativeSats" | "createdAt">,
): Listing {
  return {
    title: partial.title ?? `listing-${partial.id}`,
    status: partial.status ?? "open",
    ...partial,
  };
}

describe("MIN_BID_SATS", () => {
  it("is exactly 1000", () => {
    expect(MIN_BID_SATS).toBe(1000);
  });
});

describe("sortListings", () => {
  it("sorts DESC by cumulative sats", () => {
    const ranked = sortListings([
      listing({ id: "a", cumulativeSats: 1000, createdAt: "2026-01-01T00:00:00.000Z" }),
      listing({ id: "b", cumulativeSats: 5000, createdAt: "2026-02-01T00:00:00.000Z" }),
      listing({ id: "c", cumulativeSats: 3000, createdAt: "2026-03-01T00:00:00.000Z" }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(["b", "c", "a"]);
  });

  it("tie-breaks equal sats with older listing higher", () => {
    const ranked = sortListings([
      listing({ id: "newer", cumulativeSats: 10000, createdAt: "2026-08-15T12:00:00.000Z" }),
      listing({ id: "older", cumulativeSats: 10000, createdAt: "2026-07-01T12:00:00.000Z" }),
      listing({ id: "mid", cumulativeSats: 10000, createdAt: "2026-07-20T12:00:00.000Z" }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(["older", "mid", "newer"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      listing({ id: "a", cumulativeSats: 1, createdAt: "2026-01-02T00:00:00.000Z" }),
      listing({ id: "b", cumulativeSats: 2, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const copy = [...input];
    sortListings(input);
    expect(input).toEqual(copy);
  });
});

describe("raiseDeltaSats", () => {
  it("returns exact delta when target exceeds current and is ≥ min", () => {
    expect(raiseDeltaSats(0, 1000)).toBe(1000);
    expect(raiseDeltaSats(21000, 25000)).toBe(4000);
    expect(raiseDeltaSats(999, 1000)).toBe(1);
  });

  it("returns null when target is below MIN_BID_SATS", () => {
    expect(raiseDeltaSats(0, 999)).toBeNull();
    expect(raiseDeltaSats(0, 0)).toBeNull();
    expect(raiseDeltaSats(500, 500)).toBeNull();
  });

  it("returns null when target does not exceed current cumulative", () => {
    expect(raiseDeltaSats(1000, 1000)).toBeNull();
    expect(raiseDeltaSats(5000, 4999)).toBeNull();
    expect(raiseDeltaSats(10000, 1000)).toBeNull();
  });
});
