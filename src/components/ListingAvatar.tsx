"use client";

import { useState } from "react";
import type { Profile } from "@/lib/nostr";
import type { Listing } from "@/lib/rankings";
import { cn, hostOf } from "@/lib/utils";

/**
 * Square listing mark. Websites and @handles resolve to a favicon, Nostr
 * listings to their kind-0 picture, and anything unresolved falls back to the
 * first letter of the title rather than a broken image.
 */
function markUrl(listing: Listing, profile?: Profile | null): string | null {
  const picture = profile?.picture?.trim();
  if (picture) return picture;
  if (listing.identityType === "x") return "https://www.google.com/s2/favicons?domain=x.com&sz=128";
  const host = hostOf(listing.url);
  return host ? `https://www.google.com/s2/favicons?domain=${host}&sz=128` : null;
}

export function ListingAvatar({
  listing,
  profile,
  className,
}: {
  listing: Listing;
  profile?: Profile | null;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = markUrl(listing, profile);

  return (
    <span
      className={cn(
        "relative flex shrink-0 select-none items-center justify-center overflow-hidden rounded-lg border border-border bg-surface",
        className,
      )}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-sm font-semibold text-muted-foreground">
          {listing.title.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </span>
  );
}
