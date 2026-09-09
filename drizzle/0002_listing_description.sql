-- The board prints a one-line tagline under every listing title, the way the
-- reference leaderboard does. Nullable so existing rows stay valid.
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "description" text;
