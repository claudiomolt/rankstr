import { SimplePool, useWebSocketImplementation as setWebSocketImpl } from "nostr-tools/pool";
import WebSocket from "ws";
import { globalSingleton } from "@/lib/global-singleton";
import { decodeNpub } from "./npub";
import type { FetchProfileOptions, Profile } from "./types";

/** Public defaults when NOSTR_RELAYS is unset. */
export const DEFAULT_NOSTR_RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
] as const;

let wsWired = false;

/**
 * Closing the pool while a relay socket is still handshaking makes `ws` emit an
 * `error` event with no listener, which Node escalates to an uncaught exception
 * and takes the render down with it. Profile enrichment is meant to fail open,
 * so every socket gets a no-op listener.
 */
class QuietWebSocket extends WebSocket {
  constructor(...args: ConstructorParameters<typeof WebSocket>) {
    super(...args);
    this.on("error", () => {});
  }
}

function ensureNodeWebSocket(): void {
  if (wsWired) return;
  if (typeof window === "undefined") {
    // nostr-tools setter (not a React Hook) — aliased so eslint hooks rule ignores it
    setWebSocketImpl(QuietWebSocket as unknown as typeof globalThis.WebSocket);
  }
  wsWired = true;
}

const PROFILE_TTL_MS = 5 * 60 * 1000;

type CacheEntry = { profile: Profile | null; at: number };

/**
 * Relay round-trips cost up to `timeoutMs` per npub and the board renders the
 * same handful of listings on every request, so resolved profiles are held for
 * a few minutes rather than refetched per page view.
 */
function profileCache(): Map<string, CacheEntry> {
  return globalSingleton("nostr-profile-cache", () => new Map<string, CacheEntry>());
}

export function getNostrRelays(override?: string[]): string[] {
  if (override && override.length > 0) {
    return override.filter(Boolean);
  }
  const fromEnv = process.env.NOSTR_RELAYS?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return fromEnv;
  return [...DEFAULT_NOSTR_RELAYS];
}

type Kind0Content = {
  name?: string;
  display_name?: string;
  displayName?: string;
  picture?: string;
  about?: string;
};

function parseKind0Content(content: string): Kind0Content {
  try {
    const raw = JSON.parse(content) as Kind0Content;
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

/**
 * Soft profile fetch (kind 0). Never throws to callers — returns null on any failure.
 * Invalid npub / relay timeout / missing metadata → null (UI still shows listing npub).
 */
export async function fetchProfile(
  npub: string,
  opts: FetchProfileOptions = {},
): Promise<Profile | null> {
  try {
    const pubkey = decodeNpub(npub);
    if (!pubkey) return null;

    ensureNodeWebSocket();

    const relays = getNostrRelays(opts.relays);
    const timeoutMs = opts.timeoutMs ?? 2500;
    const pool = new SimplePool();

    const eventPromise = pool
      .get(relays, {
        kinds: [0],
        authors: [pubkey],
        limit: 1,
      })
      .catch(() => null);

    const timedOut = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    const event = await Promise.race([eventPromise, timedOut]);

    try {
      pool.close(relays);
    } catch {
      /* ignore close errors */
    }

    if (!event) {
      return { npub: npub.trim(), pubkey };
    }

    const meta = parseKind0Content(event.content);
    const name =
      (typeof meta.display_name === "string" && meta.display_name.trim()) ||
      (typeof meta.displayName === "string" && meta.displayName.trim()) ||
      (typeof meta.name === "string" && meta.name.trim()) ||
      undefined;
    const picture =
      typeof meta.picture === "string" && meta.picture.trim()
        ? meta.picture.trim()
        : undefined;
    const about =
      typeof meta.about === "string" && meta.about.trim()
        ? meta.about.trim()
        : undefined;

    return {
      npub: npub.trim(),
      pubkey,
      name: name || undefined,
      picture,
      about,
    };
  } catch {
    return null;
  }
}

/** Resolve many npubs fail-soft (Promise.allSettled), reusing recent lookups. */
export async function fetchProfiles(
  npubs: string[],
  opts: FetchProfileOptions = {},
): Promise<Map<string, Profile | null>> {
  const unique = [...new Set(npubs.map((n) => n.trim()).filter(Boolean))];
  const map = new Map<string, Profile | null>();
  if (unique.length === 0) return map;

  const cache = profileCache();
  const now = Date.now();
  const misses: string[] = [];

  for (const npub of unique) {
    const hit = cache.get(npub);
    if (hit && now - hit.at < PROFILE_TTL_MS) {
      map.set(npub, hit.profile);
    } else {
      misses.push(npub);
    }
  }

  const settled = await Promise.allSettled(misses.map((npub) => fetchProfile(npub, opts)));
  misses.forEach((npub, i) => {
    const result = settled[i];
    const profile = result.status === "fulfilled" ? result.value : null;
    cache.set(npub, { profile, at: Date.now() });
    map.set(npub, profile);
  });

  return map;
}
