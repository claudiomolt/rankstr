import { describe, expect, it } from "vitest";
import { applyPaidBid, decideSettlement } from "./bid-settle";

describe("applyPaidBid", () => {
  it("adds the paid sats to the listing rather than replacing them", () => {
    expect(applyPaidBid(21000, 4000)).toBe(25000);
    expect(applyPaidBid(0, 1000)).toBe(1000);
  });
});

describe("decideSettlement", () => {
  const base = { listingCumulative: 21000, amountSats: 4000 };

  it("claims the rank when verify reports settled", () => {
    expect(
      decideSettlement({ ...base, bidStatus: "pending", verify: { state: "settled" } }),
    ).toEqual({ action: "settle", nextCumulative: 25000 });
  });

  it("waits while verify is still pending", () => {
    expect(
      decideSettlement({ ...base, bidStatus: "pending", verify: { state: "pending" } }),
    ).toEqual({ action: "wait", reason: undefined });
  });

  it("passes a pending reason through so the UI can explain the wait", () => {
    const decision = decideSettlement({
      ...base,
      bidStatus: "pending",
      verify: { state: "pending", reason: "verify timed out" },
    });
    expect(decision).toEqual({ action: "wait", reason: "verify timed out" });
  });

  it("fails on a terminal verify failure", () => {
    expect(
      decideSettlement({ ...base, bidStatus: "pending", verify: { state: "failed", reason: "expired" } }),
    ).toEqual({ action: "fail", reason: "expired" });
  });

  it("is idempotent: an already-paid bid never adds sats twice", () => {
    expect(
      decideSettlement({ ...base, bidStatus: "paid", verify: { state: "settled" } }),
    ).toEqual({ action: "already-settled", nextCumulative: 21000 });
  });

  it("refuses to settle a bid that already failed or expired", () => {
    expect(
      decideSettlement({ ...base, bidStatus: "failed", verify: { state: "settled" } }).action,
    ).toBe("fail");
    expect(
      decideSettlement({ ...base, bidStatus: "expired", verify: { state: "settled" } }).action,
    ).toBe("fail");
  });
});
