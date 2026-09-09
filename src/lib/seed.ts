import type { Listing } from "./rankings";

/**
 * Seed board data for local development and the no-database fallback.
 *
 * Descriptions are plain statements of what each project is. There are no
 * traction numbers here — click counts start at zero and the sats shown are
 * fixtures, not claimed revenue. `identityKey` values match exactly what
 * `normalizeIdentity` produces for the same input, so submitting one of these
 * URLs again resolves to the existing row and behaves as a raise.
 */
export const seedListings: Listing[] = [
  {
    id: "seed-lawallet",
    title: "LaWallet",
    description: "Open-source Lightning wallet built on Nostr Wallet Connect.",
    identityKey: "url:lawallet.io",
    identityType: "url",
    url: "https://lawallet.io",
    categorySlug: "wallets",
    cumulativeSats: 21000,
    clickCount: 0,
    createdAt: "2026-08-01T12:00:00.000Z",
    status: "live",
  },
  {
    id: "seed-rankstr",
    title: "rankstr",
    description: "This board. Pay sats over Lightning to stand above everyone else.",
    identityKey: "url:rankstr.io",
    identityType: "url",
    url: "https://rankstr.io",
    npub: "npub18fgzegkpe2efl54xs4jcfvhfjetf30k9chzfvkn346tpwsrhrp3ssju3rs",
    categorySlug: "other",
    cumulativeSats: 10000,
    clickCount: 0,
    createdAt: "2026-08-15T12:00:00.000Z",
    status: "climbing",
  },
  {
    id: "seed-nostr-starter",
    title: "Nostr starter",
    description: "A Nostr identity to follow while you find your first relays.",
    identityKey: "npub:npub168wdr7r7z8q9lndcrulyhxnt95tsczt54qynmvn59q9hp32snjuqhth55f",
    identityType: "npub",
    npub: "npub168wdr7r7z8q9lndcrulyhxnt95tsczt54qynmvn59q9hp32snjuqhth55f",
    categorySlug: "nostr",
    cumulativeSats: 10000,
    clickCount: 0,
    createdAt: "2026-07-01T12:00:00.000Z",
    status: "open",
  },
  {
    id: "seed-lightning-domain",
    title: "Lightning Domain",
    description: "Self-hosted LUD16 Lightning Address server for your own domain.",
    identityKey: "url:github.com/lawalletio/lightning-domain",
    identityType: "url",
    url: "https://github.com/lawalletio/lightning-domain",
    categorySlug: "dev-tools",
    cumulativeSats: 3500,
    clickCount: 0,
    createdAt: "2026-09-01T12:00:00.000Z",
    status: "open",
  },
];

export type ActiveEntry = {
  id: string;
  label: string;
  url?: string;
  npub?: string;
  note: string;
};

/** Explicitly curated — not algorithmic discovery. */
export const curatedActiveIndex: ActiveEntry[] = [
  {
    id: "a1",
    label: "LaWallet",
    url: "https://lawallet.io",
    note: "Curated seed — Lightning + Nostr wallet stack",
  },
  {
    id: "a2",
    label: "outbid.lol (reference)",
    url: "https://outbid.lol",
    note: "Curated seed — pay-to-rank mechanic reference (Lightning-only here)",
  },
  {
    id: "a3",
    label: "rankstr",
    url: "https://rankstr.io",
    note: "Curated seed — this board",
  },
];
