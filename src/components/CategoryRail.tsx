import Link from "next/link";
import { LayoutGrid, Compass } from "lucide-react";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CATEGORIES } from "@/lib/categories";
import { cn } from "@/lib/utils";

const PILL =
  "inline-flex h-7 shrink-0 items-center gap-1 rounded-full px-2.5 text-[0.8rem] font-semibold whitespace-nowrap transition-colors [&_svg]:size-3.5";

/**
 * Horizontally scrolling pill rail sitting inside a single muted capsule, with
 * the active board filled in the accent colour and an Explore escape hatch
 * pinned to the right edge.
 */
export function CategoryRail({ active }: { active?: string | null }) {
  return (
    <div className="relative z-20 overflow-hidden rounded-full bg-muted px-3 py-1.5">
      <div className="flex items-center gap-1">
        <div className="relative min-w-0 flex-1">
          <nav className="no-scrollbar overflow-x-auto" aria-label="Categories">
            <div className="flex w-max min-w-full items-center gap-0.5">
              <Link
                href="/"
                className={cn(
                  PILL,
                  active
                    ? "hover:bg-background/70 hover:text-foreground"
                    : "bg-primary text-primary-foreground hover:bg-primary/80",
                )}
              >
                <LayoutGrid strokeWidth={1.5} aria-hidden />
                All
              </Link>
              {CATEGORIES.map((category) => (
                <Link
                  key={category.slug}
                  href={`/category/${category.slug}`}
                  className={cn(
                    PILL,
                    active === category.slug
                      ? "bg-primary text-primary-foreground hover:bg-primary/80"
                      : "hover:bg-background/70 hover:text-foreground",
                  )}
                >
                  <CategoryIcon icon={category.icon} className="size-3.5" />
                  {active === category.slug ? category.label : category.short}
                </Link>
              ))}
            </div>
          </nav>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-muted via-muted/85 to-transparent" />
        </div>
        <Link
          href="/categories"
          className={cn(PILL, "shrink-0 text-primary hover:bg-background/70")}
        >
          <Compass strokeWidth={1.5} aria-hidden />
          Explore
        </Link>
      </div>
    </div>
  );
}
