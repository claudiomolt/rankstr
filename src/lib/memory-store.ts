import type { Listing } from "@/lib/rankings";
import { seedListings } from "@/lib/seed";

export type PendingBid = {
  id: string;
  listingId: string;
  amountSats: number;
  invoiceId: string;
  paymentHash: string | null;
  paymentRequest: string;
  status: "pending" | "paid" | "expired";
  targetCumulativeSats: number;
  createdAt: string;
  /** When creating a brand-new listing (no DB), stash draft until paid. */
  newListing?: {
    title: string;
    url?: string;
    npub?: string;
  };
};

/** Mutable board copy used when DATABASE_URL is absent. */
const boardListings: Listing[] = seedListings.map((l) => ({ ...l }));

/** Pending bids keyed by invoiceId (no-DB / mock path). */
const pendingByInvoice = new Map<string, PendingBid>();

export function memoryGetListings(): Listing[] {
  return boardListings.map((l) => ({ ...l }));
}

export function memoryGetListing(id: string): Listing | undefined {
  return boardListings.find((l) => l.id === id);
}

export function memoryUpsertListing(listing: Listing): void {
  const idx = boardListings.findIndex((l) => l.id === listing.id);
  if (idx >= 0) {
    boardListings[idx] = { ...listing };
  } else {
    boardListings.push({ ...listing });
  }
}

export function memoryPutPending(bid: PendingBid): void {
  pendingByInvoice.set(bid.invoiceId, bid);
}

export function memoryGetPending(invoiceId: string): PendingBid | undefined {
  return pendingByInvoice.get(invoiceId);
}

export function memoryMarkPaid(invoiceId: string): PendingBid | undefined {
  const bid = pendingByInvoice.get(invoiceId);
  if (!bid || bid.status !== "pending") return undefined;
  bid.status = "paid";
  pendingByInvoice.set(invoiceId, bid);
  return bid;
}
