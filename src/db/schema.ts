import {
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

/**
 * listings: one row per canonical identity. `identity_key` is the dedupe key
 * produced by src/lib/identity.ts — submitting the same website, @handle, or
 * npub again resolves to the same row, which is what makes a raise a raise.
 *
 * Drizzle does not express CHECK constraints cleanly across versions, so the
 * url/npub/handle presence rule lives in app validation and in the SQL
 * migrations (drizzle/0000_init.sql, drizzle/0001_outbid_parity.sql).
 */

export const listingStatusEnum = pgEnum("listing_status", [
  "live",
  "open",
  "climbing",
]);

export const identityTypeEnum = pgEnum("identity_type", ["url", "x", "npub"]);

export const bidStatusEnum = pgEnum("bid_status", [
  "pending",
  "paid",
  "expired",
  "failed",
]);

export const bidKindEnum = pgEnum("bid_kind", ["bid", "takeover"]);

export const takeoverStatusEnum = pgEnum("takeover_status", [
  "pending",
  "active",
  "expired",
  "cancelled",
]);

export const listings = pgTable(
  "listings",
  {
    id: text("id").primaryKey(),
    identityKey: text("identity_key").notNull().unique(),
    identityType: identityTypeEnum("identity_type").notNull().default("url"),
    url: text("url"),
    handle: text("handle"),
    npub: text("npub"),
    title: text("title").notNull(),
    description: text("description"),
    categorySlug: text("category_slug").notNull().default("other"),
    cumulativeSats: integer("cumulative_sats").notNull().default(0),
    clickCount: integer("click_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    status: listingStatusEnum("status").notNull().default("open"),
  },
  (table) => ({
    // Board order is the hot read: cumulative DESC, then oldest first.
    rankIdx: index("listings_rank_idx").on(table.cumulativeSats, table.createdAt),
    categoryIdx: index("listings_category_idx").on(table.categorySlug),
  }),
);

export const bids = pgTable(
  "bids",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    kind: bidKindEnum("kind").notNull().default("bid"),
    amountSats: integer("amount_sats").notNull(),
    targetCumulativeSats: integer("target_cumulative_sats").notNull(),
    invoiceId: text("invoice_id").notNull().unique(),
    paymentRequest: text("payment_request").notNull().default(""),
    /** LUD21 verify endpoint. Server-side only — never returned to the browser. */
    verifyUrl: text("verify_url"),
    status: bidStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (table) => ({
    listingIdx: index("bids_listing_idx").on(table.listingId),
    settledIdx: index("bids_settled_idx").on(table.settledAt),
  }),
);

export const takeovers = pgTable(
  "takeovers",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    bidId: text("bid_id")
      .notNull()
      .references(() => bids.id),
    amountSats: integer("amount_sats").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
    status: takeoverStatusEnum("status").notNull().default("pending"),
  },
  (table) => ({
    windowIdx: index("takeovers_window_idx").on(table.status, table.endsAt),
  }),
);

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
export type TakeoverRow = typeof takeovers.$inferSelect;
export type ActiveIndexEntryRow = typeof activeIndexEntries.$inferSelect;
