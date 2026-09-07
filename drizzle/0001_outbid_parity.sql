-- outbid parity: canonical identities, categories, click counts, takeovers,
-- and LUD21 verify state on bids.

CREATE TYPE "public"."identity_type" AS ENUM('url', 'x', 'npub');
--> statement-breakpoint
CREATE TYPE "public"."bid_kind" AS ENUM('bid', 'takeover');
--> statement-breakpoint
CREATE TYPE "public"."takeover_status" AS ENUM('pending', 'active', 'expired', 'cancelled');
--> statement-breakpoint
ALTER TYPE "public"."bid_status" ADD VALUE IF NOT EXISTS 'failed';
--> statement-breakpoint

ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "identity_key" text;
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "identity_type" "identity_type" DEFAULT 'url' NOT NULL;
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "handle" text;
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "category_slug" text DEFAULT 'other' NOT NULL;
--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "click_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- Backfill identity_key for rows created before canonical identities existed so
-- the NOT NULL + UNIQUE constraints below can be applied without data loss.
UPDATE "listings"
SET "identity_key" = CASE
	WHEN "url" IS NOT NULL THEN 'url:' || lower(regexp_replace(regexp_replace("url", '^https?://(www\.)?', ''), '[?#].*$', ''))
	WHEN "npub" IS NOT NULL THEN 'npub:' || lower("npub")
	ELSE 'listing:' || "id"
END
WHERE "identity_key" IS NULL;
--> statement-breakpoint
UPDATE "listings"
SET "identity_type" = 'npub'
WHERE "url" IS NULL AND "npub" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "listings" ALTER COLUMN "identity_key" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_identity_key_unique" UNIQUE("identity_key");
--> statement-breakpoint
ALTER TABLE "listings" DROP CONSTRAINT IF EXISTS "listings_url_or_npub_check";
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_identity_present_check"
	CHECK (url IS NOT NULL OR npub IS NOT NULL OR handle IS NOT NULL);
--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_click_count_nonneg" CHECK (click_count >= 0);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_rank_idx" ON "listings" ("cumulative_sats","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "listings_category_idx" ON "listings" ("category_slug");
--> statement-breakpoint

ALTER TABLE "bids" ADD COLUMN IF NOT EXISTS "kind" "bid_kind" DEFAULT 'bid' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN IF NOT EXISTS "target_cumulative_sats" integer;
--> statement-breakpoint
UPDATE "bids" SET "target_cumulative_sats" = "amount_sats" WHERE "target_cumulative_sats" IS NULL;
--> statement-breakpoint
ALTER TABLE "bids" ALTER COLUMN "target_cumulative_sats" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN IF NOT EXISTS "payment_request" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN IF NOT EXISTS "verify_url" text;
--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN IF NOT EXISTS "settled_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "bids" DROP COLUMN IF EXISTS "payment_hash";
--> statement-breakpoint
ALTER TABLE "bids" ADD CONSTRAINT "bids_amount_sats_positive" CHECK (amount_sats > 0);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bids_listing_idx" ON "bids" ("listing_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bids_settled_idx" ON "bids" ("settled_at");
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "takeovers" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"bid_id" text NOT NULL,
	"amount_sats" integer NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" "takeover_status" DEFAULT 'pending' NOT NULL,
	CONSTRAINT "takeovers_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "takeovers_bid_id_bids_id_fk" FOREIGN KEY ("bid_id") REFERENCES "public"."bids"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "takeovers_window_check" CHECK (ends_at > starts_at)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "takeovers_window_idx" ON "takeovers" ("status","ends_at");
--> statement-breakpoint
-- Only one takeover can be live at a time.
CREATE UNIQUE INDEX IF NOT EXISTS "takeovers_single_active_idx" ON "takeovers" ((1)) WHERE "status" = 'active';
