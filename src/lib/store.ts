/**
 * Single data-access seam for the board.
 *
 * Two implementations behind one interface: Postgres via Drizzle when
 * DATABASE_URL is set, and a process-local store otherwise so the app runs with
 * no infrastructure. Routes and pages never branch on which one is active.
 *
 * A listing is only public once a payment has claimed a rank, so `listPublic`
 * filters to listings with settled sats while lookups by id or identity still
 * see unpaid rows — that is what lets a repeat submit become a raise.
 */

import { randomUUID } from "crypto";
import { and, desc, eq, gt, inArray, sql } from "drizzle-orm";
import { db, hasDatabase } from "@/db";
import { bids, listings, takeovers } from "@/db/schema";
import { normalizeCategory } from "@/lib/categories";
import type { IdentityType } from "@/lib/identity";
import type { Listing, ListingStatus } from "@/lib/rankings";
import { seedListings } from "@/lib/seed";
import type { Takeover, TakeoverStatus } from "@/lib/takeover";

export type BidKind = "bid" | "takeover";
export type BidStatus = "pending" | "paid" | "expired" | "failed";

export type ListingDraft = {
  title: string;
  identityKey: string;
  identityType: IdentityType;
  url?: string;
  handle?: string;
  npub?: string;
  categorySlug: string;
};

export type BidRecord = {
  id: string;
  listingId: string;
  kind: BidKind;
  amountSats: number;
  targetCumulativeSats: number;
  invoiceId: string;
  paymentRequest: string;
  /** LUD21 verify URL. Server-side only. */
  verifyUrl: string | null;
  status: BidStatus;
  createdAt: string;
  settledAt: string | null;
};

export type NewBid = Omit<BidRecord, "status" | "createdAt" | "settledAt">;

export type ActivityEntry = {
  bidId: string;
  listingId: string;
  listingTitle: string;
  kind: BidKind;
  amountSats: number;
  targetCumulativeSats: number;
  settledAt: string;
};

export type Store = {
  listPublic(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | null>;
  getListingByIdentity(identityKey: string): Promise<Listing | null>;
  createListing(draft: ListingDraft): Promise<Listing>;
  putBid(bid: NewBid): Promise<BidRecord>;
  getBid(bidId: string): Promise<BidRecord | null>;
  setBidStatus(bidId: string, status: BidStatus): Promise<BidRecord | null>;
  addSats(listingId: string, amountSats: number): Promise<Listing | null>;
  recordClick(listingId: string): Promise<Listing | null>;
  listTakeovers(): Promise<Takeover[]>;
  putTakeover(takeover: Takeover & { bidId: string }): Promise<Takeover>;
  setTakeoverStatus(id: string, status: TakeoverStatus): Promise<Takeover | null>;
  recentActivity(limit: number): Promise<ActivityEntry[]>;
};

export function newId(): string {
  return randomUUID();
}

/* ------------------------------------------------------------------ memory */

type MemoryListing = Listing & { updatedAt: string };

const memListings = new Map<string, MemoryListing>();
const memBids = new Map<string, BidRecord>();
const memTakeovers = new Map<string, Takeover & { bidId: string }>();
let memSeeded = false;

function ensureSeeded(): void {
  if (memSeeded) return;
  memSeeded = true;
  for (const listing of seedListings) {
    memListings.set(listing.id, { ...listing, updatedAt: listing.createdAt });
  }
}

function cloneListing(listing: MemoryListing): Listing {
  const { updatedAt: _updatedAt, ...rest } = listing;
  void _updatedAt;
  return { ...rest };
}

/** Reset process state. Test helper — never called by the app. */
export function resetMemoryStore(): void {
  memListings.clear();
  memBids.clear();
  memTakeovers.clear();
  memSeeded = false;
}

const memoryStore: Store = {
  async listPublic() {
    ensureSeeded();
    return [...memListings.values()].filter((l) => l.cumulativeSats > 0).map(cloneListing);
  },

  async getListing(id) {
    ensureSeeded();
    const found = memListings.get(id);
    return found ? cloneListing(found) : null;
  },

  async getListingByIdentity(identityKey) {
    ensureSeeded();
    for (const listing of memListings.values()) {
      if (listing.identityKey === identityKey) return cloneListing(listing);
    }
    return null;
  },

  async createListing(draft) {
    ensureSeeded();
    const now = new Date().toISOString();
    const listing: MemoryListing = {
      id: newId(),
      title: draft.title,
      identityKey: draft.identityKey,
      identityType: draft.identityType,
      url: draft.url,
      handle: draft.handle,
      npub: draft.npub,
      categorySlug: normalizeCategory(draft.categorySlug),
      cumulativeSats: 0,
      clickCount: 0,
      createdAt: now,
      updatedAt: now,
      status: "open",
    };
    memListings.set(listing.id, listing);
    return cloneListing(listing);
  },

  async putBid(bid) {
    const record: BidRecord = {
      ...bid,
      status: "pending",
      createdAt: new Date().toISOString(),
      settledAt: null,
    };
    memBids.set(record.id, record);
    return record;
  },

  async getBid(bidId) {
    const found = memBids.get(bidId);
    return found ? { ...found } : null;
  },

  async setBidStatus(bidId, status) {
    const found = memBids.get(bidId);
    if (!found) return null;
    found.status = status;
    found.settledAt = status === "paid" ? new Date().toISOString() : found.settledAt;
    memBids.set(bidId, found);
    return { ...found };
  },

  async addSats(listingId, amountSats) {
    ensureSeeded();
    const found = memListings.get(listingId);
    if (!found) return null;
    found.cumulativeSats += amountSats;
    found.status = "climbing";
    found.updatedAt = new Date().toISOString();
    memListings.set(listingId, found);
    return cloneListing(found);
  },

  async recordClick(listingId) {
    ensureSeeded();
    const found = memListings.get(listingId);
    if (!found || found.cumulativeSats <= 0) return null;
    found.clickCount += 1;
    memListings.set(listingId, found);
    return cloneListing(found);
  },

  async listTakeovers() {
    return [...memTakeovers.values()].map(({ bidId: _bidId, ...t }) => {
      void _bidId;
      return { ...t };
    });
  },

  async putTakeover(takeover) {
    memTakeovers.set(takeover.id, { ...takeover });
    const { bidId: _bidId, ...rest } = takeover;
    void _bidId;
    return { ...rest };
  },

  async setTakeoverStatus(id, status) {
    const found = memTakeovers.get(id);
    if (!found) return null;
    found.status = status;
    memTakeovers.set(id, found);
    const { bidId: _bidId, ...rest } = found;
    void _bidId;
    return { ...rest };
  },

  async recentActivity(limit) {
    ensureSeeded();
    return [...memBids.values()]
      .filter((b): b is BidRecord & { settledAt: string } => b.status === "paid" && b.settledAt !== null)
      .sort((a, b) => new Date(b.settledAt).getTime() - new Date(a.settledAt).getTime())
      .slice(0, limit)
      .map((b) => ({
        bidId: b.id,
        listingId: b.listingId,
        listingTitle: memListings.get(b.listingId)?.title ?? "listing",
        kind: b.kind,
        amountSats: b.amountSats,
        targetCumulativeSats: b.targetCumulativeSats,
        settledAt: b.settledAt,
      }));
  },
};

/* ---------------------------------------------------------------- postgres */

type ListingRow = typeof listings.$inferSelect;
type BidRow = typeof bids.$inferSelect;
type TakeoverRow = typeof takeovers.$inferSelect;

function rowToListing(row: ListingRow): Listing {
  return {
    id: row.id,
    title: row.title,
    identityKey: row.identityKey,
    identityType: row.identityType as IdentityType,
    url: row.url ?? undefined,
    handle: row.handle ?? undefined,
    npub: row.npub ?? undefined,
    categorySlug: row.categorySlug,
    cumulativeSats: row.cumulativeSats,
    clickCount: row.clickCount,
    createdAt: row.createdAt.toISOString(),
    status: row.status as ListingStatus,
  };
}

function rowToBid(row: BidRow): BidRecord {
  return {
    id: row.id,
    listingId: row.listingId,
    kind: row.kind as BidKind,
    amountSats: row.amountSats,
    targetCumulativeSats: row.targetCumulativeSats,
    invoiceId: row.invoiceId,
    paymentRequest: row.paymentRequest,
    verifyUrl: row.verifyUrl ?? null,
    status: row.status as BidStatus,
    createdAt: row.createdAt.toISOString(),
    settledAt: row.settledAt?.toISOString() ?? null,
  };
}

function rowToTakeover(row: TakeoverRow): Takeover {
  return {
    id: row.id,
    listingId: row.listingId,
    amountSats: row.amountSats,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    status: row.status as TakeoverStatus,
  };
}

const dbStore: Store = {
  async listPublic() {
    const rows = await db!
      .select()
      .from(listings)
      .where(gt(listings.cumulativeSats, 0))
      .orderBy(desc(listings.cumulativeSats), listings.createdAt);
    return rows.map(rowToListing);
  },

  async getListing(id) {
    const rows = await db!.select().from(listings).where(eq(listings.id, id)).limit(1);
    return rows[0] ? rowToListing(rows[0]) : null;
  },

  async getListingByIdentity(identityKey) {
    const rows = await db!
      .select()
      .from(listings)
      .where(eq(listings.identityKey, identityKey))
      .limit(1);
    return rows[0] ? rowToListing(rows[0]) : null;
  },

  async createListing(draft) {
    const rows = await db!
      .insert(listings)
      .values({
        id: newId(),
        title: draft.title,
        identityKey: draft.identityKey,
        identityType: draft.identityType,
        url: draft.url ?? null,
        handle: draft.handle ?? null,
        npub: draft.npub ?? null,
        categorySlug: normalizeCategory(draft.categorySlug),
        cumulativeSats: 0,
        clickCount: 0,
        status: "open",
      })
      .returning();
    return rowToListing(rows[0]);
  },

  async putBid(bid) {
    const rows = await db!
      .insert(bids)
      .values({
        id: bid.id,
        listingId: bid.listingId,
        kind: bid.kind,
        amountSats: bid.amountSats,
        targetCumulativeSats: bid.targetCumulativeSats,
        invoiceId: bid.invoiceId,
        paymentRequest: bid.paymentRequest,
        verifyUrl: bid.verifyUrl,
        status: "pending",
      })
      .returning();
    return rowToBid(rows[0]);
  },

  async getBid(bidId) {
    const rows = await db!.select().from(bids).where(eq(bids.id, bidId)).limit(1);
    return rows[0] ? rowToBid(rows[0]) : null;
  },

  async setBidStatus(bidId, status) {
    // Guarded on status='pending' so two concurrent verifies cannot both settle.
    const rows = await db!
      .update(bids)
      .set({ status, settledAt: status === "paid" ? new Date() : null })
      .where(and(eq(bids.id, bidId), eq(bids.status, "pending")))
      .returning();
    if (rows[0]) return rowToBid(rows[0]);
    const current = await db!.select().from(bids).where(eq(bids.id, bidId)).limit(1);
    return current[0] ? rowToBid(current[0]) : null;
  },

  async addSats(listingId, amountSats) {
    const rows = await db!
      .update(listings)
      .set({
        cumulativeSats: sql`${listings.cumulativeSats} + ${amountSats}`,
        status: "climbing",
        updatedAt: new Date(),
      })
      .where(eq(listings.id, listingId))
      .returning();
    return rows[0] ? rowToListing(rows[0]) : null;
  },

  async recordClick(listingId) {
    const rows = await db!
      .update(listings)
      .set({ clickCount: sql`${listings.clickCount} + 1` })
      .where(and(eq(listings.id, listingId), gt(listings.cumulativeSats, 0)))
      .returning();
    return rows[0] ? rowToListing(rows[0]) : null;
  },

  async listTakeovers() {
    const rows = await db!
      .select()
      .from(takeovers)
      .where(inArray(takeovers.status, ["pending", "active"]))
      .orderBy(desc(takeovers.startsAt))
      .limit(50);
    return rows.map(rowToTakeover);
  },

  async putTakeover(takeover) {
    const rows = await db!
      .insert(takeovers)
      .values({
        id: takeover.id,
        listingId: takeover.listingId,
        bidId: takeover.bidId,
        amountSats: takeover.amountSats,
        startsAt: new Date(takeover.startsAt),
        endsAt: new Date(takeover.endsAt),
        status: takeover.status,
      })
      .returning();
    return rowToTakeover(rows[0]);
  },

  async setTakeoverStatus(id, status) {
    const rows = await db!
      .update(takeovers)
      .set({ status })
      .where(eq(takeovers.id, id))
      .returning();
    return rows[0] ? rowToTakeover(rows[0]) : null;
  },

  async recentActivity(limit) {
    const rows = await db!
      .select({
        bidId: bids.id,
        listingId: bids.listingId,
        listingTitle: listings.title,
        kind: bids.kind,
        amountSats: bids.amountSats,
        targetCumulativeSats: bids.targetCumulativeSats,
        settledAt: bids.settledAt,
      })
      .from(bids)
      .innerJoin(listings, eq(listings.id, bids.listingId))
      .where(eq(bids.status, "paid"))
      .orderBy(desc(bids.settledAt))
      .limit(limit);

    return rows
      .filter((r) => r.settledAt !== null)
      .map((r) => ({
        bidId: r.bidId,
        listingId: r.listingId,
        listingTitle: r.listingTitle,
        kind: r.kind as BidKind,
        amountSats: r.amountSats,
        targetCumulativeSats: r.targetCumulativeSats,
        settledAt: r.settledAt!.toISOString(),
      }));
  },
};

export function getStore(): Store {
  return hasDatabase() && db ? dbStore : memoryStore;
}

export function isMemoryStore(): boolean {
  return !hasDatabase();
}
