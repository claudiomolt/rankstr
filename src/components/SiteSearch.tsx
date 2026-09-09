"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * Header row plus the search bar it reveals underneath.
 *
 * Search and the row live in one client boundary because opening the bar has to
 * push the rest of the page down, which means the row's own container owns the
 * state. `brand` and `nav` stay server-rendered and are passed straight through.
 *
 * The bar submits to `/search` rather than filtering in place: the board is
 * server-ranked and paginated, so results have to come from the same query that
 * builds the board or the ranks printed on them would be wrong.
 */
export function HeaderShell({ brand, nav }: { brand: React.ReactNode; nav: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Read straight off the URL rather than useSearchParams: the header sits in
  // the root layout, and that hook would opt every prerendered page out of
  // static rendering, /_not-found included.
  useEffect(() => {
    if (pathname !== "/search") return;
    const q = new URLSearchParams(window.location.search).get("q") ?? "";
    setQuery(q);
    if (q) setOpen(true);
  }, [pathname]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 pt-6 pb-3.5 md:pb-4">
      <div className="flex w-full items-center justify-between gap-4">
        {brand}
        <div className="flex items-center gap-2 sm:gap-4">
          {nav}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={open ? "Close search" : "Search the board"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X strokeWidth={1.5} /> : <Search strokeWidth={1.5} />}
          </Button>
          <ThemeToggle />
        </div>
      </div>

      {open ? (
        <form onSubmit={submit} className="animate-fade-in">
          <label htmlFor="board-search" className="sr-only">
            Search products and categories
          </label>
          <input
            id="board-search"
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            placeholder="Search products and categories…"
            className="h-11 w-full rounded-xl border border-input bg-surface px-4 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </form>
      ) : null}
    </div>
  );
}
