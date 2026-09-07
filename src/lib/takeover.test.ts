import { describe, expect, it } from "vitest";
import { MIN_BID_SATS } from "./rankings";
import { makeListing } from "./test-helpers";
import {
  TAKEOVER_DURATION_MS,
  activeTakeover,
  canStartTakeover,
  isTakeoverLive,
  takeoverCostSats,
  takeoverRemainingMs,
  takeoverWindow,
  type Takeover,
} from "./takeover";

const board = [
  makeListing({ id: "top", cumulativeSats: 13005, createdAt: "2026-08-01T00:00:00.000Z" }),
  makeListing({ id: "second", cumulativeSats: 13000, createdAt: "2026-08-02T00:00:00.000Z" }),
];

function takeover(over: Partial<Takeover> = {}): Takeover {
  const startsAt = "2026-09-07T12:00:00.000Z";
  return {
    id: "t1",
    listingId: "top",
    amountSats: 26010,
    startsAt,
    endsAt: new Date(new Date(startsAt).getTime() + TAKEOVER_DURATION_MS).toISOString(),
    status: "active",
    ...over,
  };
}

describe("takeoverCostSats", () => {
  it("costs 2x the current #1", () => {
    expect(takeoverCostSats(board)).toBe(26010);
  });

  it("floors at the minimum bid so an empty board cannot be taken for nothing", () => {
    expect(takeoverCostSats([])).toBe(MIN_BID_SATS);
  });
});

describe("takeover window", () => {
  it("locks the first page for exactly 3 hours", () => {
    const window = takeoverWindow(new Date("2026-09-07T12:00:00.000Z"));
    expect(window.endsAt).toBe("2026-09-07T15:00:00.000Z");
    expect(TAKEOVER_DURATION_MS).toBe(3 * 60 * 60 * 1000);
  });

  it("is live inside the window and not outside it", () => {
    const live = takeover();
    expect(isTakeoverLive(live, new Date("2026-09-07T12:00:00.000Z"))).toBe(true);
    expect(isTakeoverLive(live, new Date("2026-09-07T14:59:59.000Z"))).toBe(true);
    expect(isTakeoverLive(live, new Date("2026-09-07T15:00:00.000Z"))).toBe(false);
    expect(isTakeoverLive(live, new Date("2026-09-07T11:59:59.000Z"))).toBe(false);
  });

  it("ignores takeovers that are not active", () => {
    expect(isTakeoverLive(takeover({ status: "expired" }), new Date("2026-09-07T13:00:00.000Z"))).toBe(
      false,
    );
  });

  it("reports remaining time and never goes negative", () => {
    const live = takeover();
    expect(takeoverRemainingMs(live, new Date("2026-09-07T14:00:00.000Z"))).toBe(60 * 60 * 1000);
    expect(takeoverRemainingMs(live, new Date("2026-09-07T20:00:00.000Z"))).toBe(0);
  });
});

describe("only one takeover can be live at a time", () => {
  it("blocks a second takeover while one is running", () => {
    const result = canStartTakeover([takeover()], board, new Date("2026-09-07T13:00:00.000Z"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.activeUntil).toBe("2026-09-07T15:00:00.000Z");
  });

  it("allows a takeover once the window has closed", () => {
    const result = canStartTakeover([takeover()], board, new Date("2026-09-07T15:00:01.000Z"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.costSats).toBe(26010);
  });

  it("allows a takeover when nothing is running", () => {
    expect(canStartTakeover([], board).ok).toBe(true);
  });

  it("picks the latest start if overlapping rows ever exist", () => {
    const earlier = takeover({ id: "t1" });
    const later = takeover({
      id: "t2",
      startsAt: "2026-09-07T12:30:00.000Z",
      endsAt: "2026-09-07T15:30:00.000Z",
    });
    const live = activeTakeover([earlier, later], new Date("2026-09-07T13:00:00.000Z"));
    expect(live?.id).toBe("t2");
  });

  it("returns null when nothing is live", () => {
    expect(activeTakeover([takeover()], new Date("2026-09-08T00:00:00.000Z"))).toBeNull();
  });
});
