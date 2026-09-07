import { nip19 } from "nostr-tools";

/** Decode npub (bech32) to hex pubkey. Returns null if invalid. */
export function decodeNpub(npub: string): string | null {
  try {
    const trimmed = npub.trim();
    if (!trimmed.toLowerCase().startsWith("npub1")) return null;
    const decoded = nip19.decode(trimmed);
    if (decoded.type !== "npub") return null;
    const data = decoded.data;
    if (typeof data !== "string" || !/^[0-9a-f]{64}$/i.test(data)) return null;
    return data.toLowerCase();
  } catch {
    return null;
  }
}

export function isValidNpub(npub: string): boolean {
  return decodeNpub(npub) != null;
}

/** Truncate npub for frost mono UI (always safe to call). */
export function truncateNpub(npub: string, head = 10, tail = 6): string {
  const s = npub.trim();
  if (s.length <= head + tail + 1) return s;
  return s.slice(0, head) + "\u2026" + s.slice(-tail);
}
