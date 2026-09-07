CREATE TYPE "public"."listing_status" AS ENUM('live', 'open', 'climbing');
--> statement-breakpoint
CREATE TYPE "public"."bid_status" AS ENUM('pending', 'paid', 'expired');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text,
	"npub" text,
	"title" text NOT NULL,
	"cumulative_sats" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" "listing_status" DEFAULT 'open' NOT NULL,
	CONSTRAINT "listings_url_or_npub_check" CHECK (url IS NOT NULL OR npub IS NOT NULL),
	CONSTRAINT "listings_cumulative_sats_nonneg" CHECK (cumulative_sats >= 0)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bids" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"amount_sats" integer NOT NULL,
	"invoice_id" text NOT NULL,
	"payment_hash" text,
	"status" "bid_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bids_invoice_id_unique" UNIQUE("invoice_id"),
	CONSTRAINT "bids_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "active_index_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"url" text,
	"npub" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"note" text
);
