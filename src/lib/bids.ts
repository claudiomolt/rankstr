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
  memoryMarkPaid,
  memoryPutPending,
  memoryUpsertListing,
  type PendingBid,
} from "@/lib/memory-store";

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
      url: input.url?.trim() || undefined,
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
    if (bid.status === "paid") {
      const listingRows = await db
        .select()
        .from(listings)
        .where(eq(listings.id, bid.listingId))
        .limit(1);
      return {
        ok: true,
        listingId: bid.listingId,
        cumulativeSats: listingRows[0]?.cumulativeSats ?? 0,
      };
    }
    if (bid.status !== "pending") {
      return { ok: false, reason: `bid status is ${bid.status}` };
    }

    const listingRows = await db
      .select()
      .from(listings)
      .where(eq(listings.id, bid.listingId))
      .limit(1);
    const listing = listingRows[0];
    if (!listing) return { ok: false, reason: "listing not found" };

    const nextCumulative = listing.cumulativeSats + bid.amountSats;
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
      .where(eq(listings.id, listing.id));

    return { ok: true, listingId: listing.id, cumulativeSats: nextCumulative };
  }

  const pending = memoryMarkPaid(invoiceId);
  if (!pending) {
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
  if (!listing) {
    return { ok: false, reason: "listing not found" };
  }

  const nextCumulative = listing.cumulativeSats + pending.amountSats;
  memoryUpsertListing({
    ...listing,
    cumulativeSats: nextCumulative,
    status: "climbing",
  });

  return { ok: true, listingId: listing.id, cumulativeSats: nextCumulative };
}

export function listBoardForClient(): Listing[] {
  if (hasDatabase()) {
    return [];
  }
  return memoryGetListings();
}

export { isMockMode };
