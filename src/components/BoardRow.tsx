import { createElement } from "react";
import { formatSats } from "@/lib/utils";
import type { Listing } from "@/lib/rankings";
import { truncateNpub, type Profile } from "@/lib/nostr";

type Props = {
  listing: Listing;
  rank: number;
  profile?: Profile | null;
};

export function BoardRow({ listing, rank, profile }: Props) {
  const isLeader = rank === 1;
  const rankClass = isLeader ? "text-accent" : "text-[color:var(--rs-frost)]";
  const stamp =
    listing.status === "live"
      ? "border-[color:var(--rs-frost)] text-[color:var(--rs-frost)]"
      : listing.status === "climbing"
        ? "border-primary text-primary"
        : "border-muted-foreground text-muted-foreground";

  const npub = listing.npub?.trim() || undefined;
  const displayName = profile?.name?.trim() || undefined;
  const picture = profile?.picture?.trim() || undefined;

  const rankEl = createElement(
    "div",
    { className: "font-mono text-lg font-semibold " + rankClass },
    "#" + String(rank).padStart(2, "0"),
  );

  const titleRow = createElement(
    "div",
    { className: "flex flex-wrap items-center gap-2" },
    picture
      ? createElement("img", {
          src: picture,
          alt: "",
          width: 20,
          height: 20,
          className: "h-5 w-5 shrink-0 rounded-full object-cover",
          referrerPolicy: "no-referrer",
        })
      : null,
    createElement(
      "span",
      { className: "truncate font-sans text-sm font-semibold text-card-foreground" },
      listing.title,
    ),
    displayName
      ? createElement(
          "span",
          { className: "truncate font-sans text-xs text-muted-foreground" },
          displayName,
        )
      : null,
    createElement(
      "span",
      {
        className:
          "rounded-none border px-1.5 py-0.5 font-mono text-[10px] uppercase " + stamp,
      },
      listing.status,
    ),
  );

  const metaBits: ReturnType<typeof createElement>[] = [];
  if (listing.url) {
    metaBits.push(
      createElement(
        "div",
        { className: "mt-1 truncate font-mono text-xs text-muted-foreground" },
        listing.url,
      ),
    );
  }
  if (npub) {
    metaBits.push(
      createElement(
        "div",
        {
          className: "mt-1 truncate font-mono text-xs text-[color:var(--rs-frost)]",
          title: npub,
        },
        truncateNpub(npub),
      ),
    );
  }

  const body = createElement(
    "div",
    { className: "min-w-0" },
    titleRow,
    ...metaBits,
  );

  const sats = createElement(
    "div",
    {
      className:
        "text-right font-mono text-sm " +
        (isLeader ? "text-accent underline decoration-accent" : "text-primary"),
    },
    formatSats(listing.cumulativeSats),
  );

  return createElement(
    "div",
    {
      className:
        "grid grid-cols-[3rem_1fr_auto] items-center gap-3 border border-border bg-card px-4 py-3",
      style: { borderLeft: "3px solid hsl(var(--primary))" },
    },
    rankEl,
    body,
    sats,
  );
}
