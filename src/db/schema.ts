import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * listings: at least one of url | npub required.
 * Drizzle does not express CHECK constraints cleanly across all versions —
 * enforced in app validation and in drizzle/0000_init.sql:
 *   CHECK (url IS NOT NULL OR npub IS NOT NULL)
 */

export const listingStatusEnum = pgEnum("listing_status", [
  "live",
  "open",
  "climbing",
]);

export const bidStatusEnum = pgEnum("bid_status", [
  "pending",
  "paid",
  "expired",
]);

export const listings = pgTable("listings", {
  id: text("id").primaryKey(),
  url: text("url"),
  npub: text("npub"),
  title: text("title").notNull(),
  cumulativeSats: integer("cumulative_sats").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  status: listingStatusEnum("status").notNull().default("open"),
});

export const bids = pgTable("bids", {
  id: text("id").primaryKey(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id),
  amountSats: integer("amount_sats").notNull(),
  invoiceId: text("invoice_id").notNull().unique(),
  paymentHash: text("payment_hash"),
  status: bidStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const activeIndexEntries = pgTable("active_index_entries", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  url: text("url"),
  npub: text("npub"),
  sort: integer("sort").notNull().default(0),
  note: text("note"),
});

export type ListingRow = typeof listings.$inferSelect;
export type BidRow = typeof bids.$inferSelect;
export type ActiveIndexEntryRow = typeof activeIndexEntries.$inferSelect;
