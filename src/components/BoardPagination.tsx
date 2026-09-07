import Link from "next/link";

/** Page 1 is "the first page" a takeover locks, so paging is part of the mechanic. */
export function BoardPagination({
  basePath,
  page,
  pages,
}: {
  basePath: string;
  page: number;
  pages: number;
}) {
  if (pages <= 1) return null;

  const href = (n: number) => (n <= 1 ? basePath : `${basePath}?page=${n}`);
  const linkClass =
    "rounded-none border border-border px-3 py-1.5 font-mono text-xs uppercase text-muted-foreground hover:text-foreground";

  return (
    <nav className="flex items-center justify-between gap-2" aria-label="Board pages">
      {page > 1 ? (
        <Link href={href(page - 1)} className={linkClass}>
          previous
        </Link>
      ) : (
        <span />
      )}
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        page {page} / {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className={linkClass}>
          next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
