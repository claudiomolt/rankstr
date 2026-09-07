/**
 * Bid orchestration: identity → listing → invoice → LUD21 settlement.
 *
 * Nothing here is public until a payment settles. Creating a bid only reserves
 * an invoice; `settleBid` is the single place a rank can be claimed.
 */

import { normalizeCategory } from "@/lib/categories";
import { decideSettlement } from "@/lib/bid-settle";
import { resolveIdentity, type Identity, type RedirectResolver } from "@/lib/identity";
import { checkInvoice, createInvoice, isMockMode } from "@/lib/ln";
import {
  BID_STEP_SATS,
  MIN_BID_SATS,
  claimTopTargetSats,
  isValidBidAmount,
  projectedRank,
  raiseDeltaSats,
  sortListings,
  topBidSats,
  type Listing,
} from "@/lib/rankings";
import { getStore, newId, type BidKind, type BidRecord } from "@/lib/store";
import {
  canStartTakeover,
  takeoverCostSats,
  takeoverWindow,
  type Takeover,
} from "@/lib/takeover";

export class BidError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "BidError";
  }
}

export type CreateBidInput = {
  /** Raw submitted website, @handle, or npub. Omitted when raising by listingId. */
  identity?: string;
  /** Shortcut for raising an existing listing without retyping its identity. */
  listingId?: string;
  title?: string;
  /** Optional Nostr enrichment, independent of the listing identity. */
  npub?: string;
  categorySlug?: string;
  bidSats: number;
  kind?: BidKind;
};

/** Everything the browser is allowed to see about a reserved bid. */
export type CreateBidResult = {
  bidId: string;
  listingId: string;
  kind: BidKind;
  amountSats: number;
  bidSats: number;
  projectedRank: number;
  invoice: {
    paymentRequest: string;
    expiresAt: string;
    mock: boolean;
  };
  mockInvoiceId?: string;
};

function requireWholeBid(value: number): number {
  const bid = Number(value);
  if (!Number.isFinite(bid) || !Number.isInteger(bid)) {
    throw new BidError(400, "Bids are whole sats.");
  }
  if (!isValidBidAmount(bid)) {
    throw new BidError(400, `Minimum bid is ${MIN_BID_SATS} sats.`);
  }
  return bid;
}

async function resolveListing(
  input: CreateBidInput,
  redirectResolver?: RedirectResolver,
): Promise<{ listing: Listing; identity?: Identity }> {
  const store = getStore();

  if (input.listingId) {
    const listing = await store.getListing(input.listingId);
    if (!listing) throw new BidError(404, "Listing not found.");
    return { listing };
  }

  if (!input.identity?.trim()) {
    throw new BidError(400, "Enter a website, an X @handle, or an npub.");
  }

  const resolved = await resolveIdentity(input.identity, redirectResolver);
  if (!resolved.ok) {
    throw new BidError(400, resolved.message);
  }
  const identity = resolved.identity;

  const existing = await store.getListingByIdentity(identity.key);
  if (existing) return { listing: existing, identity };

  const title = input.title?.trim() || identity.display;
  const listing = await store.createListing({
    title,
    identityKey: identity.key,
    identityType: identity.type,
    url: identity.url,
    handle: identity.handle,
    npub: identity.npub ?? input.npub?.trim() ?? undefined,
    categorySlug: normalizeCategory(input.categorySlug),
  });
  return { listing, identity };
}

export async function createBid(
  input: CreateBidInput,
  redirectResolver?: RedirectResolver,
): Promise<CreateBidResult> {
  const store = getStore();
  const kind: BidKind = input.kind ?? "bid";
  const { listing } = await resolveListing(input, redirectResolver);
  const board = sortListings(await store.listPublic());

  let amountSats: number;
  let bidSats: number;

  if (kind === "takeover") {
    const eligibility = canStartTakeover(await store.listTakeovers(), board);
    if (!eligibility.ok) throw new BidError(409, eligibility.reason);
    amountSats = eligibility.costSats;
    bidSats = listing.cumulativeSats + amountSats;
  } else {
    bidSats = requireWholeBid(input.bidSats);
    const delta = raiseDeltaSats(listing.cumulativeSats, bidSats);
    if (delta === null) {
      throw new BidError(
        400,
        listing.cumulativeSats > 0
          ? `That listing is already at ${listing.cumulativeSats} sats. Raise it by at least ${BID_STEP_SATS} sat.`
          : `Minimum bid is ${MIN_BID_SATS} sats.`,
      );
    }
    amountSats = delta;
  }

  const invoice = await createInvoice({
    amountSats,
    memo: `rankstr ${kind} · ${listing.title}`,
  });

  const bid = await store.putBid({
    id: newId(),
    listingId: listing.id,
    kind,
    amountSats,
    targetCumulativeSats: bidSats,
    invoiceId: invoice.invoiceId,
    paymentRequest: invoice.paymentRequest,
    verifyUrl: invoice.verifyUrl,
  });

  return {
    bidId: bid.id,
    listingId: listing.id,
    kind,
    amountSats,
    bidSats,
    projectedRank: projectedRank(board, bidSats, listing.id, listing.createdAt),
    invoice: {
      paymentRequest: invoice.paymentRequest,
      expiresAt: invoice.expiresAt,
      mock: invoice.mock,
    },
    // Mock mode has no wallet to pay with, so the dev settle button needs the id.
    mockInvoiceId: invoice.mock ? invoice.invoiceId : undefined,
  };
}

export type SettleResult = {
  state: "settled" | "pending" | "failed";
  bidId: string;
  listingId: string;
  cumulativeSats: number;
  kind: BidKind;
  reason?: string;
  takeover?: Takeover;
};

/**
 * Check LUD21 verify once and, if the invoice settled, claim the rank.
 * Safe to call repeatedly — an already-paid bid reports settled without
 * double-counting sats.
 */
export async function settleBid(bidId: string): Promise<SettleResult> {
  const store = getStore();
  const bid = await store.getBid(bidId);
  if (!bid) throw new BidError(404, "Bid not found.");

  const listing = await store.getListing(bid.listingId);
  if (!listing) throw new BidError(404, "Listing not found.");

  const verify = bid.status === "pending" ? await checkInvoice(bid.verifyUrl) : { state: "pending" as const };
  const decision = decideSettlement({
    bidStatus: bid.status,
    verify,
    listingCumulative: listing.cumulativeSats,
    amountSats: bid.amountSats,
  });

  const base = { bidId: bid.id, listingId: bid.listingId, kind: bid.kind };

  switch (decision.action) {
    case "already-settled":
      return { ...base, state: "settled", cumulativeSats: decision.nextCumulative };

    case "fail": {
      if (bid.status === "pending") await store.setBidStatus(bid.id, "failed");
      return { ...base, state: "failed", cumulativeSats: listing.cumulativeSats, reason: decision.reason };
    }

    case "wait":
      return { ...base, state: "pending", cumulativeSats: listing.cumulativeSats, reason: decision.reason };

    case "settle": {
      const claimed = await store.setBidStatus(bid.id, "paid");
      // Another request won the race and already applied the sats.
      if (!claimed || claimed.settledAt === null || claimed.status !== "paid") {
        const current = await store.getListing(bid.listingId);
        return { ...base, state: "settled", cumulativeSats: current?.cumulativeSats ?? listing.cumulativeSats };
      }

      const updated = await store.addSats(bid.listingId, bid.amountSats);
      const cumulativeSats = updated?.cumulativeSats ?? decision.nextCumulative;

      let takeover: Takeover | undefined;
      if (bid.kind === "takeover") {
        takeover = await startTakeover(bid, cumulativeSats);
      }

      return { ...base, state: "settled", cumulativeSats, takeover };
    }
  }
}

async function startTakeover(bid: BidRecord, _cumulativeSats: number): Promise<Takeover | undefined> {
  void _cumulativeSats;
  const store = getStore();
  const board = sortListings(await store.listPublic());
  const eligibility = canStartTakeover(await store.listTakeovers(), board);
  if (!eligibility.ok) return undefined;

  const window = takeoverWindow(new Date());
  return store.putTakeover({
    id: newId(),
    listingId: bid.listingId,
    bidId: bid.id,
    amountSats: bid.amountSats,
    startsAt: window.startsAt,
    endsAt: window.endsAt,
    status: "active",
  });
}

/** Board-facing quote so the bid form can show costs before anyone pays. */
export async function getBoardQuote(): Promise<{
  topBidSats: number;
  claimTopSats: number;
  takeoverCostSats: number;
  takeoverAvailable: boolean;
  takeoverActiveUntil?: string;
  minBidSats: number;
  mock: boolean;
}> {
  const store = getStore();
  const board = sortListings(await store.listPublic());
  const eligibility = canStartTakeover(await store.listTakeovers(), board);

  return {
    topBidSats: topBidSats(board),
    claimTopSats: claimTopTargetSats(board),
    takeoverCostSats: takeoverCostSats(board),
    takeoverAvailable: eligibility.ok,
    takeoverActiveUntil: eligibility.ok ? undefined : eligibility.activeUntil,
    minBidSats: MIN_BID_SATS,
    mock: isMockMode(),
  };
}

export { isMockMode };
