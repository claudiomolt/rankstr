import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSats(sats: number): string {
  return new Intl.NumberFormat("en-US").format(sats) + " sats";
}

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "ref_src",
]);

/** Drop common tracking junk from outbound listing URLs. */
export function stripTrackingParams(url: string | undefined | null): string {
  if (!url?.trim()) return "";
  const raw = url.trim();
  try {
    const parsed = new URL(raw);
    for (const key of [...parsed.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        parsed.searchParams.delete(key);
      }
    }
    const qs = parsed.searchParams.toString();
    return qs
      ? `${parsed.origin}${parsed.pathname}?${qs}${parsed.hash}`
      : `${parsed.origin}${parsed.pathname}${parsed.hash}`;
  } catch {
    return raw;
  }
}
