import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NUMBER = new Intl.NumberFormat("en-US");

export function formatCount(value: number): string {
  return NUMBER.format(value);
}

/** Amounts are sats everywhere on the board. Never fiat. */
export function formatSats(sats: number): string {
  return `${NUMBER.format(sats)} sats`;
}

/** Tight variant for leaderboard rows and tiles, where the unit is already implied. */
export function formatSatsShort(sats: number): string {
  return `${NUMBER.format(sats)}`;
}

/**
 * Drop every query parameter from an outbound link.
 *
 * The board strips query parameters rather than a tracking allowlist, so
 * affiliate, referral, and campaign URLs cannot survive a click.
 */
export function stripQueryParams(url: string | undefined | null): string {
  if (!url?.trim()) return "";
  const raw = url.trim();
  try {
    const parsed = new URL(raw);
    return `${parsed.origin}${parsed.pathname.replace(/\/$/, "") || "/"}`;
  } catch {
    return raw;
  }
}

/** Host without scheme or www, which is what the board prints under a title. */
export function hostOf(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Short relative stamp for the activity feed. */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const deltaMs = now.getTime() - new Date(iso).getTime();
  const seconds = Math.max(0, Math.round(deltaMs / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Long-form relative stamp used on leaderboard rows ("yesterday", "2 weeks ago"). */
export function relativeDate(iso: string, now: Date = new Date()): string {
  const deltaMs = now.getTime() - new Date(iso).getTime();
  if (deltaMs < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(deltaMs / 60000));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(deltaMs / (60 * 60 * 1000));
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(deltaMs / DAY_MS);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "last week";
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months <= 1) return "last month";
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

/** UTC calendar day key, which is what the Daily board is bucketed by. */
export function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatUtcDay(dayKey: string): string {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
