import { beforeEach, describe, expect, it } from "vitest";
import { BidError, createBid, getBoardQuote, settleBid } from "./bids";
import { mockReset, mockSettle } from "./ln";
import { MIN_BID_SATS, sortListings } from "./rankings";
import { getStore, resetMemoryStore } from "./store";
import { TAKEOVER_DURATION_MS } from "./takeover";

/**
 * End-to-end over the in-process store and the mock Lightning rail: no node,
 * no database, no network. Seed board tops out at 21000 sats.
 */

const SEED_TOP_SATS = 21000;

async function payFor(result: Awaited<ReturnType<typeof createBid>>) {
  expect(result.mockInvoiceId).toBeDefined();
  expect(mockSettle(result.mockInvoiceId!)).toBe(true);
  return settleBid(result.bidId);
}

async function board() {
  return sortListings(await getStore().listPublic());
}

beforeEach(() => {
  delete process.env.LN_ADDRESS;
  resetMemoryStore();
  mockReset();
});

describe("creating a bid", () => {
  it("invoices the full bid for a new listing and keeps it off the board until paid", async () => {
    const result = await createBid({ identity: "https://newthing.example", bidSats: 25000 });

    expect(result.amountSats).toBe(25000);
    expect(result.projectedRank).toBe(1);
    expect(result.invoice.mock).toBe(true);
    expect((await board()).some((l) => l.id === result.listingId)).toBe(false);
  });

  it("makes the listing public at its bid once the payment settles", async () => {
    const result = await createBid({
      identity: "https://newthing.example",
      title: "New Thing",
      categorySlug: "wallets",
      bidSats: 25000,
    });

    const settled = await payFor(result);
    expect(settled.state).toBe("settled");
    expect(settled.cumulativeSats).toBe(25000);

    const ranked = await board();
    expect(ranked[0]?.id).toBe(result.listingId);
    expect(ranked[0]?.title).toBe("New Thing");
    expect(ranked[0]?.categorySlug).toBe("wallets");
  });

  it("places a bid below #1 at whatever rank that bid can take", async () => {
    const result = await createBid({ identity: "https://midtier.example", bidSats: 15000 });
    await payFor(result);

    const ranked = await board();
    expect(ranked.findIndex((l) => l.id === result.listingId)).toBe(1);
    expect(ranked[0]?.cumulativeSats).toBe(SEED_TOP_SATS);
  });

  it("rejects bids below the minimum and fractional bids", async () => {
    await expect(createBid({ identity: "https://a.example", bidSats: 999 })).rejects.toThrow(
      new RegExp(`${MIN_BID_SATS} sats`),
    );
    await expect(createBid({ identity: "https://a.example", bidSats: 1500.5 })).rejects.toThrow(
      /whole sats/,
    );
  });

  it("leaves no listing behind when the submission is rejected", async () => {
    const store = getStore();
    const before = (await store.listPublic()).length;

    await expect(createBid({ identity: "https://ghost.example", bidSats: 999 })).rejects.toThrow();
    expect(await store.getListingByIdentity("url:ghost.example")).toBeNull();
    expect(await store.listPublic()).toHaveLength(before);
  });

  it("rejects identities the board does not accept", async () => {
    await expect(createBid({ identity: "https://t.me/group", bidSats: 5000 })).rejects.toThrow(
      /Chat and invite links/,
    );
    await expect(createBid({ identity: "https://pornhub.com", bidSats: 5000 })).rejects.toThrow(
      /sexual content/,
    );
    await expect(createBid({ identity: "", bidSats: 5000 })).rejects.toBeInstanceOf(BidError);
  });

  it("replaces a shortener with the URL it redirects to", async () => {
    const result = await createBid(
      { identity: "https://bit.ly/abc", bidSats: 5000 },
      async () => "https://real.example/product?ref=aff",
    );

    const listing = await getStore().getListing(result.listingId);
    expect(listing?.identityKey).toBe("url:real.example/product");
    expect(listing?.url).toBe("https://real.example/product");
  });
});

describe("raising a listing", () => {
  it("charges only the difference when the same identity is submitted again", async () => {
    const first = await createBid({ identity: "https://climber.example", bidSats: 5000 });
    await payFor(first);

    const second = await createBid({ identity: "https://climber.example", bidSats: 25000 });
    expect(second.listingId).toBe(first.listingId);
    expect(second.amountSats).toBe(20000);

    const settled = await payFor(second);
    expect(settled.cumulativeSats).toBe(25000);
    expect((await board())[0]?.id).toBe(first.listingId);
  });

  it("treats a differently written form of the same identity as the same listing", async () => {
    const first = await createBid({ identity: "https://www.climber.example/", bidSats: 5000 });
    await payFor(first);

    const second = await createBid({ identity: "climber.example?utm_source=x", bidSats: 6000 });
    expect(second.listingId).toBe(first.listingId);
    expect(second.amountSats).toBe(1000);
  });

  it("refuses a raise that does not exceed the listing's current bid", async () => {
    const first = await createBid({ identity: "https://climber.example", bidSats: 5000 });
    await payFor(first);

    await expect(createBid({ identity: "https://climber.example", bidSats: 5000 })).rejects.toThrow(
      /already at 5000 sats/,
    );
  });

  it("lets a one sat raise reclaim #1", async () => {
    const quote = await getBoardQuote();
    expect(quote.topBidSats).toBe(SEED_TOP_SATS);
    expect(quote.claimTopSats).toBe(SEED_TOP_SATS + 1);

    const result = await createBid({ identity: "https://sniper.example", bidSats: quote.claimTopSats });
    await payFor(result);

    expect((await board())[0]?.id).toBe(result.listingId);
  });
});

describe("settlement", () => {
  it("stays pending until the invoice is paid", async () => {
    const result = await createBid({ identity: "https://slow.example", bidSats: 5000 });

    const before = await settleBid(result.bidId);
    expect(before.state).toBe("pending");
    expect(before.cumulativeSats).toBe(0);

    await payFor(result);
    expect((await settleBid(result.bidId)).state).toBe("settled");
  });

  it("never counts the same payment twice", async () => {
    const result = await createBid({ identity: "https://once.example", bidSats: 5000 });
    await payFor(result);

    const again = await settleBid(result.bidId);
    expect(again.state).toBe("settled");
    expect(again.cumulativeSats).toBe(5000);

    const listing = await getStore().getListing(result.listingId);
    expect(listing?.cumulativeSats).toBe(5000);
  });

  it("reports a failure for an unknown invoice and does not claim a rank", async () => {
    const result = await createBid({ identity: "https://ghost.example", bidSats: 5000 });
    mockReset();

    const settled = await settleBid(result.bidId);
    expect(settled.state).toBe("failed");
    expect((await board()).some((l) => l.id === result.listingId)).toBe(false);
  });

  it("rejects an unknown bid id", async () => {
    await expect(settleBid("not-a-bid")).rejects.toBeInstanceOf(BidError);
  });
});

describe("takeover", () => {
  it("costs 2x the current #1 and runs for 3 hours once paid", async () => {
    const quote = await getBoardQuote();
    expect(quote.takeoverCostSats).toBe(SEED_TOP_SATS * 2);
    expect(quote.takeoverAvailable).toBe(true);

    const result = await createBid({ identity: "https://loud.example", kind: "takeover", bidSats: 0 });
    expect(result.amountSats).toBe(SEED_TOP_SATS * 2);

    const settled = await payFor(result);
    expect(settled.state).toBe("settled");
    expect(settled.takeover).toBeDefined();

    const window =
      new Date(settled.takeover!.endsAt).getTime() - new Date(settled.takeover!.startsAt).getTime();
    expect(window).toBe(TAKEOVER_DURATION_MS);
    expect(settled.takeover!.listingId).toBe(result.listingId);
  });

  it("blocks a second takeover while one is live", async () => {
    const first = await createBid({ identity: "https://loud.example", kind: "takeover", bidSats: 0 });
    await payFor(first);

    await expect(
      createBid({ identity: "https://louder.example", kind: "takeover", bidSats: 0 }),
    ).rejects.toThrow(/Only one takeover can be live/);

    const quote = await getBoardQuote();
    expect(quote.takeoverAvailable).toBe(false);
    expect(quote.takeoverActiveUntil).toBeDefined();

    // The blocked attempt must not leave an unpaid listing behind either.
    expect(await getStore().getListingByIdentity("url:louder.example")).toBeNull();
  });
});

describe("activity feed", () => {
  it("lists settled payments only", async () => {
    const paid = await createBid({ identity: "https://paid.example", bidSats: 5000 });
    await payFor(paid);
    await createBid({ identity: "https://unpaid.example", bidSats: 5000 });

    const activity = await getStore().recentActivity(10);
    expect(activity).toHaveLength(1);
    expect(activity[0]?.amountSats).toBe(5000);
    expect(activity[0]?.listingId).toBe(paid.listingId);
  });
});

describe("clicks", () => {
  it("counts clicks on public listings and ignores unpaid ones", async () => {
    const store = getStore();
    const result = await createBid({ identity: "https://clicky.example", bidSats: 5000 });

    expect(await store.recordClick(result.listingId)).toBeNull();

    await payFor(result);
    await store.recordClick(result.listingId);
    const listing = await store.recordClick(result.listingId);

    expect(listing?.clickCount).toBe(2);
  });
});
