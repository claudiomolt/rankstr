"use client";

import { useEffect, useState } from "react";
import type { ActivityEntry } from "@/lib/store";
import { formatSats, timeAgo } from "@/lib/utils";

const REFRESH_MS = 15_000;

/**
 * Settled payments, newest first. Every row is a real settlement — there is no
 * projected or simulated activity here, so an empty feed is the correct state
 * for a board that has not been paid into yet.
 */
export function ActivityFeed({ initial }: { initial: ActivityEntry[] }) {
  const [entries, setEntries] = useState(initial);

  useEffect(() => {
    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const res = await fetch("/api/activity?limit=8", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { entries: ActivityEntry[] };
        if (!cancelled) setEntries(data.entries);
      } catch {
        // A missed refresh is not worth surfacing; the next tick retries.
      }
    }, REFRESH_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <section className="border border-border bg-card p-4" aria-label="Recent settled bids">
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[color:var(--rs-frost)]">
        live activity
      </h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No settled payments yet. A completed payment is what claims a rank.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {entries.map((entry) => (
            <li
              key={entry.bidId}
              className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs"
            >
              <span className="truncate text-card-foreground">
                {entry.kind === "takeover" ? "takeover · " : ""}
                {entry.listingTitle}
              </span>
              <span className="text-primary">
                +{formatSats(entry.amountSats)}
                <span className="ml-2 text-muted-foreground">{timeAgo(entry.settledAt)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
