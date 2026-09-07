/**
 * Listing identity: what you can list, and what counts as "the same listing".
 *
 * Mirrors the outbid.lol /rules "What you can list" section (see
 * docs/outbid-reference.md for the verbatim source), plus the rankstr addition
 * of a Nostr npub as a listable identity.
 *
 * Normalization is pure and synchronous. Link shorteners need a network hop to
 * resolve, so callers run `resolveIdentity` which follows the redirect first and
 * then normalizes whatever it lands on.
 */

import { isValidNpub } from "./nostr/npub";

export type IdentityType = "url" | "x" | "npub";

export type Identity = {
  type: IdentityType;
  /** Canonical dedupe key. Same key means the same listing, so a repeat submit is a raise. */
  key: string;
  /** Board-facing label for the identity. */
  display: string;
  /** Outbound destination for a click, already query-free. Absent for npub-only listings. */
  href?: string;
  url?: string;
  handle?: string;
  npub?: string;
};

export type IdentityRejectionCode =
  | "empty"
  | "invalid"
  | "chat_link"
  | "nsfw"
  | "shortener"
  | "bad_npub";

export type IdentityResult =
  | { ok: true; identity: Identity }
  | { ok: false; code: IdentityRejectionCode; message: string };

/** Chat and invite links — the board is for products and profiles, not group chats. */
export const CHAT_HOSTS = [
  "t.me",
  "telegram.me",
  "telegram.dog",
  "telegram.org",
  "wa.me",
  "whatsapp.com",
  "chat.whatsapp.com",
  "discord.gg",
  "discord.com",
  "discordapp.com",
  "m.me",
  "messenger.com",
  "signal.me",
  "signal.group",
  "signal.org",
  "join.skype.com",
  "chat.google.com",
  "slack.com",
  "join.slack.com",
  "matrix.to",
  "groupme.com",
];

/** Adult platforms. Links to sexual content do not belong on the board. */
export const NSFW_HOSTS = [
  "pornhub.com",
  "xvideos.com",
  "xnxx.com",
  "xhamster.com",
  "redtube.com",
  "youporn.com",
  "onlyfans.com",
  "fansly.com",
  "chaturbate.com",
  "stripchat.com",
  "livejasmin.com",
  "brazzers.com",
  "spankbang.com",
  "nsfw.xxx",
  "rule34.xxx",
  "e621.net",
];

/** Substrings that mark a host or path as adult regardless of the exact domain. */
export const NSFW_MARKERS = ["porn", "xxx", "nsfw", "hentai", "camgirl", "escort", "milf"];

/** Shorteners are replaced by the URL they redirect to, never listed directly. */
export const SHORTENER_HOSTS = [
  "bit.ly",
  "tinyurl.com",
  "goo.gl",
  "t.co",
  "ow.ly",
  "buff.ly",
  "is.gd",
  "cutt.ly",
  "rebrand.ly",
  "short.io",
  "shorturl.at",
  "rb.gy",
  "lnkd.in",
  "trib.al",
  "dub.sh",
  "s.id",
  "tiny.cc",
  "v.gd",
  "shorte.st",
  "bl.ink",
];

const X_HOSTS = ["x.com", "twitter.com", "mobile.twitter.com", "mobile.x.com"];

/**
 * X reserves these first-path segments for site chrome, so they are not handles.
 * Without this, https://x.com/i/status/123 would key as the handle "i".
 */
const X_RESERVED_PATHS = new Set([
  "i",
  "home",
  "explore",
  "search",
  "settings",
  "notifications",
  "messages",
  "compose",
  "intent",
  "share",
  "hashtag",
  "login",
  "signup",
  "privacy",
  "tos",
]);

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;

function stripWww(host: string): string {
  return host.replace(/^www\./, "");
}

function trimTrailingSlash(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.replace(/\/+$/, "");
  return path === "/" ? "" : path;
}

function hostMatches(host: string, list: string[]): boolean {
  return list.some((entry) => host === entry || host.endsWith(`.${entry}`));
}

export function isShortenerHost(host: string): boolean {
  return hostMatches(stripWww(host.toLowerCase()), SHORTENER_HOSTS);
}

/** True when the input looks like a shortened link that must be resolved before listing. */
export function isShortenedInput(input: string): boolean {
  const parsed = parseUrlish(input);
  return parsed ? isShortenerHost(parsed.hostname) : false;
}

function parseUrlish(input: string): URL | null {
  const raw = input.trim();
  if (!raw) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let parsed: URL;
  try {
    parsed = new URL(withScheme);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  if (!parsed.hostname.includes(".")) return null;
  return parsed;
}

function isNsfw(host: string, path: string): boolean {
  if (hostMatches(host, NSFW_HOSTS)) return true;
  const haystack = `${host}${path}`.toLowerCase();
  return NSFW_MARKERS.some((marker) => haystack.includes(marker));
}

/**
 * Platform links are keyed by their path so different apps never share a bid.
 * Returns the key path for known platforms, or null to fall through to the
 * generic host+path key.
 */
function platformKeyPath(host: string, segments: string[], params: URLSearchParams): string | null {
  if (host === "github.com") {
    const [owner, repo] = segments;
    if (!owner) return null;
    return repo ? `/${owner}/${repo}` : `/${owner}`;
  }

  if (host === "apps.apple.com" || host === "itunes.apple.com") {
    // Locale segments vary per visitor; the idNNNN segment is the app.
    const appId = segments.find((seg) => /^id\d+$/.test(seg));
    return appId ? `/app/${appId}` : null;
  }

  if (host === "play.google.com") {
    // The one platform whose app identity lives in a query parameter. Dropping it
    // would collide every Play listing on /store/apps/details.
    const pkg = params.get("id");
    return pkg ? `/store/apps/${pkg}` : null;
  }

  return null;
}

function normalizeXHandle(handle: string): IdentityResult {
  const clean = handle.trim().replace(/^@+/, "");
  if (!clean) return { ok: false, code: "empty", message: "Enter a website, an X @handle, or an npub." };
  if (!HANDLE_RE.test(clean)) {
    return { ok: false, code: "invalid", message: `"@${clean}" is not a valid X handle.` };
  }
  const lower = clean.toLowerCase();
  return {
    ok: true,
    identity: {
      type: "x",
      key: `x:${lower}`,
      display: `@${clean}`,
      href: `https://x.com/${clean}`,
      handle: clean,
    },
  };
}

function normalizeNpub(input: string): IdentityResult {
  const clean = input.trim().toLowerCase().replace(/^nostr:/, "");
  if (!isValidNpub(clean)) {
    return { ok: false, code: "bad_npub", message: "That npub is not a valid bech32 npub1 key." };
  }
  return {
    ok: true,
    identity: {
      type: "npub",
      key: `npub:${clean}`,
      display: clean,
      npub: clean,
    },
  };
}

function normalizeUrl(parsed: URL): IdentityResult {
  const host = stripWww(parsed.hostname.toLowerCase());
  const path = trimTrailingSlash(parsed.pathname);
  const segments = path.split("/").filter(Boolean);

  if (hostMatches(host, CHAT_HOSTS)) {
    return {
      ok: false,
      code: "chat_link",
      message: "Chat and invite links are not allowed. The board is for products and profiles.",
    };
  }
  if (isNsfw(host, path)) {
    return {
      ok: false,
      code: "nsfw",
      message: "Links to sexual content are not allowed.",
    };
  }
  if (hostMatches(host, SHORTENER_HOSTS)) {
    return {
      ok: false,
      code: "shortener",
      message: "Link shorteners are not allowed. Submit the URL it redirects to.",
    };
  }

  if (X_HOSTS.includes(host)) {
    const first = segments[0];
    if (first && !X_RESERVED_PATHS.has(first.toLowerCase())) {
      return normalizeXHandle(first);
    }
    return { ok: false, code: "invalid", message: "That X link does not point at a profile." };
  }

  const platformPath = platformKeyPath(host, segments, parsed.searchParams);
  const keyPath = platformPath ?? path;

  // Query parameters are stripped from listing links. Affiliate, referral and
  // tracking URLs do not survive. Play Store keeps its ?id= via platformKeyPath.
  const href = `https://${host}${path}`;

  return {
    ok: true,
    identity: {
      type: "url",
      key: `url:${host}${keyPath}`.toLowerCase(),
      display: `${host}${path}`,
      href,
      url: href,
    },
  };
}

/**
 * Turn raw submitted text into a canonical listing identity.
 *
 * Pure and synchronous: a shortener is rejected here with code `shortener` so the
 * async `resolveIdentity` wrapper can follow the redirect and retry.
 */
export function normalizeIdentity(input: string): IdentityResult {
  const raw = input?.trim() ?? "";
  if (!raw) {
    return { ok: false, code: "empty", message: "Enter a website, an X @handle, or an npub." };
  }

  if (raw.startsWith("@")) return normalizeXHandle(raw);
  if (/^(nostr:)?npub1/i.test(raw)) return normalizeNpub(raw);

  const parsed = parseUrlish(raw);
  if (!parsed) {
    return { ok: false, code: "invalid", message: `"${raw}" is not a website, @handle, or npub.` };
  }
  return normalizeUrl(parsed);
}

export type RedirectResolver = (url: string) => Promise<string | null>;

/** Follows a shortener to its destination. Returns null when it cannot be resolved. */
export const fetchRedirectTarget: RedirectResolver = async (url) => {
  try {
    const res = await fetch(url, { method: "GET", redirect: "follow" });
    return res.url && res.url !== url ? res.url : null;
  } catch {
    return null;
  }
};

/**
 * Normalize, following one shortener hop when needed. A shortener that cannot be
 * resolved stays rejected rather than being listed as-is.
 */
export async function resolveIdentity(
  input: string,
  resolver: RedirectResolver = fetchRedirectTarget,
): Promise<IdentityResult> {
  const first = normalizeIdentity(input);
  if (first.ok || first.code !== "shortener") return first;

  const parsed = parseUrlish(input);
  if (!parsed) return first;

  const target = await resolver(parsed.toString());
  if (!target) {
    return {
      ok: false,
      code: "shortener",
      message: "That link shortener could not be resolved. Submit the destination URL.",
    };
  }

  const resolved = normalizeIdentity(target);
  if (!resolved.ok && resolved.code === "shortener") {
    return {
      ok: false,
      code: "shortener",
      message: "That link shortener points at another shortener.",
    };
  }
  return resolved;
}
