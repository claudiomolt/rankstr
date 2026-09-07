import type { Listing } from "./rankings";

/** Seed board data for P0–P2 UI — not live traction. */
export const seedListings: Listing[] = [
  {
    id: "1",
    title: "LaWallet NWC",
    url: "https://lawallet.io",
    cumulativeSats: 21000,
    createdAt: "2026-08-01T12:00:00.000Z",
    status: "live",
  },
  {
    id: "2",
    title: "rankstr (self)",
    url: "https://rankstr.io",
    npub: "npub1rankstrexample000000000000000000000000000000000000",
    cumulativeSats: 10000,
    createdAt: "2026-08-15T12:00:00.000Z",
    status: "climbing",
  },
  {
    id: "3",
    title: "Nostr starter",
    npub: "npub1nostrstarterexample0000000000000000000000000000000",
    cumulativeSats: 10000,
    createdAt: "2026-07-01T12:00:00.000Z",
    status: "open",
  },
  {
    id: "4",
    title: "Lightning Domain",
    url: "https://github.com/lawalletio/lightning-domain",
    cumulativeSats: 3500,
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
