import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db, hasDatabase } from "@/db";
import { bids, listings } from "@/db/schema";
import { createInvoice, isMockMode } from "@/lib/ln";
import {
  MIN_BID_SATS,
  raiseDeltaSats,
  type Listing,
} from "@/lib/rankings";
import {
  memoryGetListing,
  memoryGetListings,
  memoryGetPending,
  memoryMarkPaid,
  memoryPutPending,
  memoryUpsertListing,
  type PendingBid,
} from "@/lib/memory-store";
import { stripTrackingParams } from "@/lib/utils";
import { resolvePaidSettle } from "@/lib/bid-settle";

export { applyPaidBid, resolvePaidSettle } from "@/lib/bid-settle";

export type CreateBidInput = {
  listingId?: string;
  title?: string;
  url?: string;
  npub?: string;
  targetCumulativeSats: number;
};

export type CreateBidResult = {
  bidId: string;
  listingId: string;
  amountSats: number;
  targetCumulativeSats: number;
  invoice: {
    invoiceId: string;
    paymentRequest: string;
    paymentHash: string;
    expiresAt: string;
    mock: boolean;
  };
};

function requireUrlOrNpub(url?: string, npub?: string): void {
  if (!url?.trim() && !npub?.trim()) {
    throw new BidError(400, "At least one of url or npub is required");
  }
}

export class BidError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "BidError";
  }
}

async function resolveCurrentListing(
  listingId: string | undefined,
): Promise<Listing | null> {
  if (!listingId) return null;
  if (hasDatabase() && db) {
    const rows = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      url: row.url ?? undefined,
      npub: row.npub ?? undefined,
      cumulativeSats: row.cumulativeSats,
      createdAt: row.createdAt.toISOString(),
      status: row.status,
    };
  }
  return memoryGetListing(listingId) ?? null;
}

export async function createBid(input: CreateBidInput): Promise<CreateBidResult> {
  const target = Math.floor(Number(input.targetCumulativeSats));
  if (!Number.isFinite(target)) {
    throw new BidError(400, "targetCumulativeSats must be a number");
  }

  const existing = await resolveCurrentListing(input.listingId);
  let listingId: string;
  let currentCumulative: number;
  let newListingDraft: PendingBid["newListing"] | undefined;

  if (existing) {
    listingId = existing.id;
    currentCumulative = existing.cumulativeSats;
  } else {
    if (input.listingId) {
      throw new BidError(404, "Listing not found");
    }
    requireUrlOrNpub(input.url, input.npub);
    if (!input.title?.trim()) {
      throw new BidError(400, "title is required for a new listing");
    }
    listingId = randomUUID();
    currentCumulative = 0;
    newListingDraft = {
      title: input.title.trim(),
      url: stripTrackingParams(input.url?.trim()) || undefined,
      npub: input.npub?.trim() || undefined,
    };
  }

  const amountSats = raiseDeltaSats(currentCumulative, target);
  if (amountSats == null) {
    throw new BidError(
      400,
      `Invalid raise: target must exceed current cumulative (${currentCumulative}) and be ≥ ${MIN_BID_SATS} sats`,
    );
  }

  const invoice = await createInvoice({
    amountSats,
    memo: `rankstr bid ${listingId} → ${target} sats`,
    metadata: { listingId, targetCumulativeSats: String(target) },
  });

  const bidId = randomUUID();

  if (hasDatabase() && db) {
    if (!existing && newListingDraft) {
      await db.insert(listings).values({
        id: listingId,
        title: newListingDraft.title,
        url: newListingDraft.url ?? null,
        npub: newListingDraft.npub ?? null,
        cumulativeSats: 0,
        status: "open",
      });
    }
    await db.insert(bids).values({
      id: bidId,
      listingId,
      amountSats,
      invoiceId: invoice.invoiceId,
      paymentHash: invoice.paymentHash || null,
      status: "pending",
    });
  } else {
    memoryPutPending({
      id: bidId,
      listingId,
      amountSats,
      invoiceId: invoice.invoiceId,
      paymentHash: invoice.paymentHash || null,
      paymentRequest: invoice.paymentRequest,
      status: "pending",
      targetCumulativeSats: target,
      createdAt: new Date().toISOString(),
      newListing: newListingDraft,
    });
  }

  return {
    bidId,
    listingId,
    amountSats,
    targetCumulativeSats: target,
    invoice: {
      invoiceId: invoice.invoiceId,
      paymentRequest: invoice.paymentRequest,
      paymentHash: invoice.paymentHash,
      expiresAt: invoice.expiresAt,
      mock: invoice.mock,
    },
  };
}

export async function settleInvoicePaid(invoiceId: string): Promise<{
  ok: true;
  listingId: string;
  cumulativeSats: number;
} | { ok: false; reason: string }> {
  if (!invoiceId?.trim()) {
    return { ok: false, reason: "invoiceId required" };
  }

  if (hasDatabase() && db) {
    const bidRows = await db
      .select()
      .from(bids)
      .where(eq(bids.invoiceId, invoiceId))
      .limit(1);
    const bid = bidRows[0];
    if (!bid) return { ok: false, reason: "bid not found" };

    const listingRows = await db
      .select()
      .from(listings)
      .where(eq(listings.id, bid.listingId))
      .limit(1);
    const listingRow = listingRows[0];
    const listingForSettle: Listing | null = listingRow
      ? {
          id: listingRow.id,
          title: listingRow.title,
          url: listingRow.url ?? undefined,
          npub: listingRow.npub ?? undefined,
          cumulativeSats: listingRow.cumulativeSats,
          createdAt: listingRow.createdAt.toISOString(),
          status: listingRow.status,
        }
      : null;

    const outcome = resolvePaidSettle({
      bidStatus: bid.status,
      listingId: bid.listingId,
      amountSats: bid.amountSats,
      listing: listingForSettle,
    });
    if (!outcome.ok) return outcome;
    if (outcome.alreadyPaid) {
      return {
        ok: true,
        listingId: outcome.listingId,
        cumulativeSats: outcome.cumulativeSats,
      };
    }

    const nextCumulative = outcome.cumulativeSats;
    await db
      .update(bids)
      .set({ status: "paid" })
      .where(eq(bids.id, bid.id));
    await db
      .update(listings)
      .set({
        cumulativeSats: nextCumulative,
        updatedAt: new Date(),
        status: "climbing",
      })
      .where(eq(listings.id, bid.listingId));

    return { ok: true, listingId: bid.listingId, cumulativeSats: nextCumulative };
  }

  const pending = memoryGetPending(invoiceId);
  if (!pending || pending.status !== "pending") {
    return { ok: false, reason: "pending bid not found or already settled" };
  }

  let listing = memoryGetListing(pending.listingId);
  if (!listing && pending.newListing) {
    listing = {
      id: pending.listingId,
      title: pending.newListing.title,
      url: pending.newListing.url,
      npub: pending.newListing.npub,
      cumulativeSats: 0,
      createdAt: pending.createdAt,
      status: "open",
    };
  }

  const outcome = resolvePaidSettle({
    bidStatus: pending.status,
    listingId: pending.listingId,
    amountSats: pending.amountSats,
    listing: listing ?? null,
  });
  if (!outcome.ok) return outcome;

  const marked = memoryMarkPaid(invoiceId);
  if (!marked) {
    return { ok: false, reason: "pending bid not found or already settled" };
  }

  if (!outcome.listing) {
    return { ok: false, reason: "listing not found" };
  }
  memoryUpsertListing(outcome.listing);

  return {
    ok: true,
    listingId: outcome.listingId,
    cumulativeSats: outcome.cumulativeSats,
  };
}

export function listBoardForClient(): Listing[] {
  if (hasDatabase()) {
    return [];
  }
  return memoryGetListings();
}

export { isMockMode };
