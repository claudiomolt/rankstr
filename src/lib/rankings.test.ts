import { describe, expect, it } from "vitest";
import {
  BID_STEP_SATS,
  BOARD_PAGE_SIZE,
  MIN_BID_SATS,
  claimTopTargetSats,
  identityLabel,
  isValidBidAmount,
  outboundHref,
  pageCount,
  pageOf,
  projectedRank,
  raiseDeltaSats,
  sortListings,
  topBidSats,
} from "./rankings";
import { makeListing } from "./test-helpers";

describe("bid units", () => {
  it("keeps the locked 1000 sat minimum and whole-sat steps", () => {
    expect(MIN_BID_SATS).toBe(1000);
    expect(BID_STEP_SATS).toBe(1);
  });

  it("accepts whole sats at or above the minimum and nothing else", () => {
    expect(isValidBidAmount(1000)).toBe(true);
    expect(isValidBidAmount(21000)).toBe(true);
    expect(isValidBidAmount(999)).toBe(false);
    expect(isValidBidAmount(1000.5)).toBe(false);
    expect(isValidBidAmount(Number.NaN)).toBe(false);
  });
});

describe("sortListings", () => {
  it("sorts by cumulative sats descending", () => {
    const ranked = sortListings([
      makeListing({ id: "a", cumulativeSats: 1000, createdAt: "2026-01-01T00:00:00.000Z" }),
      makeListing({ id: "b", cumulativeSats: 5000, createdAt: "2026-02-01T00:00:00.000Z" }),
      makeListing({ id: "c", cumulativeSats: 3000, createdAt: "2026-03-01T00:00:00.000Z" }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(["b", "c", "a"]);
  });

  it("gives the older listing the higher rank on equal bids", () => {
    const ranked = sortListings([
      makeListing({ id: "newer", cumulativeSats: 10000, createdAt: "2026-08-15T12:00:00.000Z" }),
      makeListing({ id: "older", cumulativeSats: 10000, createdAt: "2026-07-01T12:00:00.000Z" }),
      makeListing({ id: "mid", cumulativeSats: 10000, createdAt: "2026-07-20T12:00:00.000Z" }),
    ]);
    expect(ranked.map((l) => l.id)).toEqual(["older", "mid", "newer"]);
  });

  it("does not mutate the input array", () => {
    const input = [
      makeListing({ id: "a", cumulativeSats: 1000, createdAt: "2026-01-02T00:00:00.000Z" }),
      makeListing({ id: "b", cumulativeSats: 2000, createdAt: "2026-01-01T00:00:00.000Z" }),
    ];
    const copy = [...input];
    sortListings(input);
    expect(input).toEqual(copy);
  });
});

describe("raiseDeltaSats", () => {
  it("charges only the difference", () => {
    expect(raiseDeltaSats(0, 1000)).toBe(1000);
    expect(raiseDeltaSats(21000, 25000)).toBe(4000);
    expect(raiseDeltaSats(13005, 13006)).toBe(1);
  });

  it("rejects targets below the minimum bid", () => {
    expect(raiseDeltaSats(0, 999)).toBeNull();
    expect(raiseDeltaSats(0, 0)).toBeNull();
    expect(raiseDeltaSats(500, 999)).toBeNull();
  });

  it("rejects targets that do not exceed the current cumulative", () => {
    expect(raiseDeltaSats(1000, 1000)).toBeNull();
    expect(raiseDeltaSats(5000, 4999)).toBeNull();
    expect(raiseDeltaSats(10000, 1000)).toBeNull();
  });

  it("rejects fractional targets", () => {
    expect(raiseDeltaSats(1000, 1500.5)).toBeNull();
  });
});

describe("claiming #1", () => {
  const board = [
    makeListing({ id: "top", cumulativeSats: 13005, createdAt: "2026-08-01T00:00:00.000Z" }),
    makeListing({ id: "second", cumulativeSats: 13000, createdAt: "2026-08-02T00:00:00.000Z" }),
  ];

  it("reads the current top bid", () => {
    expect(topBidSats(board)).toBe(13005);
    expect(topBidSats([])).toBe(0);
  });

  it("requires one step above the current top", () => {
    expect(claimTopTargetSats(board)).toBe(13006);
  });

  it("falls back to the minimum bid on an empty board", () => {
    expect(claimTopTargetSats([])).toBe(MIN_BID_SATS);
  });
});

describe("projectedRank", () => {
  const board = sortListings([
    makeListing({ id: "a", cumulativeSats: 9000, createdAt: "2026-01-01T00:00:00.000Z" }),
    makeListing({ id: "b", cumulativeSats: 5000, createdAt: "2026-01-02T00:00:00.000Z" }),
    makeListing({ id: "c", cumulativeSats: 2000, createdAt: "2026-01-03T00:00:00.000Z" }),
  ]);

  it("places a bid below #1 at whatever rank it can take", () => {
    expect(projectedRank(board, 6000)).toBe(2);
    expect(projectedRank(board, 3000)).toBe(3);
    expect(projectedRank(board, 1000)).toBe(4);
  });

  it("takes #1 when the bid beats the top", () => {
    expect(projectedRank(board, 9001)).toBe(1);
  });

  it("puts a new listing below an existing listing it ties with", () => {
    expect(projectedRank(board, 5000)).toBe(3);
  });

  it("ignores the listing being raised when projecting its own new rank", () => {
    const raising = board.find((l) => l.id === "c")!;
    expect(projectedRank(board, 9500, raising.id, raising.createdAt)).toBe(1);
  });
});

describe("pagination", () => {
  const board = Array.from({ length: 45 }, (_, i) =>
    makeListing({
      id: `l${i}`,
      cumulativeSats: 100000 - i,
      createdAt: `2026-01-01T00:00:${String(i).padStart(2, "0")}.000Z`,
    }),
  );

  it("uses a fixed first page size so a takeover lock has a meaning", () => {
    expect(BOARD_PAGE_SIZE).toBe(20);
    expect(pageOf(board, 1)).toHaveLength(20);
  });

  it("counts pages and clamps out-of-range requests to real slices", () => {
    expect(pageCount(45)).toBe(3);
    expect(pageCount(0)).toBe(1);
    expect(pageOf(board, 3)).toHaveLength(5);
    expect(pageOf(board, 0)[0]?.id).toBe("l0");
  });
});

describe("outbound links", () => {
  it("sends X listings to the profile", () => {
    const listing = makeListing({
      id: "x1",
      cumulativeSats: 1000,
      createdAt: "2026-01-01T00:00:00.000Z",
      identityType: "x",
      identityKey: "x:jack",
      handle: "jack",
      url: undefined,
    });
    expect(outboundHref(listing)).toBe("https://x.com/jack");
    expect(identityLabel(listing)).toBe("@jack");
  });

  it("has no web destination for an npub-only listing", () => {
    const listing = makeListing({
      id: "n1",
      cumulativeSats: 1000,
      createdAt: "2026-01-01T00:00:00.000Z",
      identityType: "npub",
      identityKey: "npub:npub1abc",
      npub: "npub1abc",
      url: undefined,
    });
    expect(outboundHref(listing)).toBeNull();
  });
});
