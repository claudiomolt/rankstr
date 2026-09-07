import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSats(sats: number): string {
  return `${new Intl.NumberFormat("en-US").format(sats)} sats`;
}

export function formatCount(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
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
