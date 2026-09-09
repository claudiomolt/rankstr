/**
 * Fixed category taxonomy. Categories are a board surface, not user-created data,
 * so they live in code rather than a table — a listing stores only its slug.
 * Bitcoin and Nostr only, matching the public copy constraint.
 *
 * `icon` is a key rather than a component so this module stays free of React and
 * can be imported by the store and the API routes.
 */

export type CategoryIconKey =
  | "wallet"
  | "nostr"
  | "node"
  | "code"
  | "cart"
  | "media"
  | "mining"
  | "shield"
  | "vault"
  | "dots";

export type Category = {
  slug: string;
  label: string;
  /** Compact label for the category rail, where horizontal space is tight. */
  short: string;
  blurb: string;
  icon: CategoryIconKey;
};

export const CATEGORIES: Category[] = [
  {
    slug: "wallets",
    label: "Wallets",
    short: "Wallets",
    blurb: "Lightning and on-chain wallets.",
    icon: "wallet",
  },
  {
    slug: "nostr",
    label: "Nostr",
    short: "Nostr",
    blurb: "Clients, relays, and Nostr-native apps.",
    icon: "nostr",
  },
  {
    slug: "nodes",
    label: "Nodes & Infrastructure",
    short: "Nodes",
    blurb: "Nodes, routing, and Lightning infrastructure.",
    icon: "node",
  },
  {
    slug: "dev-tools",
    label: "Developer Tools",
    short: "Developer",
    blurb: "Libraries, SDKs, and developer tooling.",
    icon: "code",
  },
  {
    slug: "commerce",
    label: "Commerce & Payments",
    short: "Commerce",
    blurb: "Merchant tools and sats payments.",
    icon: "cart",
  },
  {
    slug: "media",
    label: "Media & Education",
    short: "Media",
    blurb: "Media, writing, and education.",
    icon: "media",
  },
  {
    slug: "mining",
    label: "Mining & Hardware",
    short: "Mining",
    blurb: "Miners, pools, and Bitcoin hardware.",
    icon: "mining",
  },
  {
    slug: "privacy",
    label: "Privacy & Security",
    short: "Privacy",
    blurb: "Coinjoin, key management, and self-custody security.",
    icon: "shield",
  },
  {
    slug: "custody",
    label: "Custody & Exchange",
    short: "Custody",
    blurb: "Bitcoin-only exchanges, brokers, and custody.",
    icon: "vault",
  },
  {
    slug: "other",
    label: "Other",
    short: "Other",
    blurb: "Everything else Bitcoin.",
    icon: "dots",
  },
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
