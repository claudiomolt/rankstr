import Link from "next/link";
import { cn, formatCount } from "@/lib/utils";

/** Page 1 is "the first page" a takeover locks, so paging is part of the mechanic. */
export function BoardPagination({
  basePath,
  page,
  pages,
  total,
  pageSize,
}: {
  basePath: string;
  page: number;
  pages: number;
  total: number;
  pageSize: number;
}) {
  if (total === 0) return null;

  const href = (n: number) => {
    if (n <= 1) return basePath;
    return basePath.includes("?") ? `${basePath}&page=${n}` : `${basePath}?page=${n}`;
  };
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <nav className="mt-6 flex flex-col items-center gap-2" aria-label="Board pages">
      {pages > 1 ? (
        <ul className="flex flex-wrap items-center justify-center gap-1">
          {pageWindow(page, pages).map((entry, i) =>
            entry === null ? (
              <li key={`gap-${i}`} className="px-1.5 text-sm text-muted-foreground">
                …
              </li>
            ) : (
              <li key={entry}>
                <Link
                  href={href(entry)}
                  aria-current={entry === page ? "page" : undefined}
                  className={cn(
                    "inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular-nums transition-colors",
                    entry === page
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {entry}
                </Link>
              </li>
            ),
          )}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground tabular-nums">
        {formatCount(from)} - {formatCount(to)} of {formatCount(total)}
      </p>
    </nav>
  );
}

/** First, last, and a short run around the current page; `null` renders an ellipsis. */
function pageWindow(page: number, pages: number): (number | null)[] {
  const around = new Set<number>([1, pages, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((n) => around.add(n));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((n) => around.add(n));

  const sorted = [...around].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let previous = 0;
  for (const n of sorted) {
    if (previous && n - previous > 1) out.push(null);
    out.push(n);
    previous = n;
  }
  return out;
}
