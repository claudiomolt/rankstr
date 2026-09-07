/**
 * Fixed category taxonomy. Categories are a board surface, not user-created data,
 * so they live in code rather than a table — a listing stores only its slug.
 * Bitcoin and Nostr only, matching the public copy constraint.
 */

export type Category = {
  slug: string;
  label: string;
  blurb: string;
};

export const CATEGORIES: Category[] = [
  { slug: "wallets", label: "wallets", blurb: "Lightning and on-chain wallets." },
  { slug: "nostr", label: "nostr", blurb: "Clients, relays, and Nostr-native apps." },
  { slug: "nodes", label: "nodes", blurb: "Nodes, routing, and infrastructure." },
  { slug: "dev-tools", label: "dev tools", blurb: "Libraries, SDKs, and developer tooling." },
  { slug: "commerce", label: "commerce", blurb: "Merchant tools and sats payments." },
  { slug: "media", label: "media", blurb: "Media, writing, and education." },
  { slug: "other", label: "other", blurb: "Everything else Bitcoin." },
];

export const DEFAULT_CATEGORY = "other";

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string | undefined | null): Category | null {
  if (!slug) return null;
  return BY_SLUG.get(slug.trim().toLowerCase()) ?? null;
}

export function isCategorySlug(slug: string | undefined | null): boolean {
  return getCategory(slug) !== null;
}

/** Coerce arbitrary input to a known slug so a bad value can never orphan a listing. */
export function normalizeCategory(slug: string | undefined | null): string {
  return getCategory(slug)?.slug ?? DEFAULT_CATEGORY;
}
