/** Soft Nostr profile enrichment for listings (read-only). */
export type Profile = {
  npub: string;
  pubkey?: string;
  name?: string;
  picture?: string;
  about?: string;
};

export type FetchProfileOptions = {
  relays?: string[];
  timeoutMs?: number;
};
