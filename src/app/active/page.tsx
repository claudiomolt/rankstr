import type { Metadata } from "next";
import { curatedActiveIndex } from "@/lib/seed";
import { stripQueryParams } from "@/lib/utils";

// The header and footer counters read settled board state, so no page can be
// prerendered without freezing those numbers at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Active projects · rankstr" };

export default function ActiveIndexPage() {
  return (
    <div className="mx-auto w-full max-w-2xl pt-6">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] md:text-[40px]">
        Active projects
      </h1>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">
        A curated seed list — not algorithmic discovery, and not traction metrics.
      </p>

      <ul className="mt-6 space-y-3">
        {curatedActiveIndex.map((entry) => (
          <li key={entry.id} className="rounded-2xl border border-border px-4 py-3">
            <p className="text-sm font-semibold">{entry.label}</p>
            {entry.url ? (
              <a
                className="text-xs text-primary underline-offset-2 hover:underline"
                href={stripQueryParams(entry.url)}
                rel="noreferrer"
              >
                {stripQueryParams(entry.url)}
              </a>
            ) : null}
            <p className="mt-1 text-sm text-muted-foreground">{entry.note}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
