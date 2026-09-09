"use client";

import { useEffect, useState } from "react";
import type { ActivityEntry } from "@/lib/store";
import { formatSatsShort, timeAgo } from "@/lib/utils";
import { LiveDot } from "@/components/LiveDot";

const REFRESH_MS = 15_000;

/**
 * Settled payments, newest first. Every row is a real settlement — there is no
 * projected or simulated activity here, so an empty feed is the correct state
 * for a board that has not been paid into yet.
 */
export function ActivityFeed({ initial }: { initial: ActivityEntry[] }) {
  const [entries, setEntries] = useState(initial);

  useEffect(() => setEntries(initial), [initial]);

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
    <section className="-mx-4 mt-2 mb-2 px-4 py-2 md:mx-0 md:py-3" aria-label="Latest activity">
      <h2 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold tracking-[-0.02em] md:mb-2.5">
        <LiveDot />
        Latest activity
      </h2>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No settled payments yet. A completed payment is what claims a rank.
        </p>
      ) : (
        <ul className="space-y-1">
          {entries.map((entry) => (
            <li
              key={entry.bidId}
              className="flex items-baseline gap-2 text-xs text-muted-foreground"
            >
              <span className="min-w-0 flex-1 truncate text-foreground">
                {entry.kind === "takeover" ? "Takeover · " : ""}
                {entry.listingTitle}
              </span>
              <span className="shrink-0 tabular-nums">
                <span className="font-semibold text-primary">
                  {formatSatsShort(entry.amountSats)} sats
                </span>{" "}
                {timeAgo(entry.settledAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
