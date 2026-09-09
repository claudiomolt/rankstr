import Link from "next/link";
import { Trophy } from "lucide-react";
import type { BoardWindow } from "@/lib/rankings";
import { cn } from "@/lib/utils";

const TAB =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold leading-none tracking-tight transition-colors";

/** All-time and Today rank the same payments over different windows of time. */
export function BoardTabs({
  active,
  allTimeHref,
  todayHref,
}: {
  active: BoardWindow;
  allTimeHref: string;
  todayHref: string;
}) {
  return (
    <div className="flex justify-center">
      <div className="inline-flex items-center rounded-full border border-border p-0.5">
        <Link
          href={allTimeHref}
          className={cn(
            TAB,
            active === "all-time"
              ? "bg-primary text-primary-foreground"
              : "text-primary hover:bg-muted hover:text-primary/80",
          )}
        >
          <Trophy className="size-3.5" strokeWidth={1.5} aria-hidden />
          All-time
        </Link>
        <Link
          href={todayHref}
          className={cn(
            TAB,
            active === "today"
              ? "bg-primary text-primary-foreground"
              : "text-primary hover:bg-muted hover:text-primary/80",
          )}
        >
          <PulseDot />
          Today
        </Link>
      </div>
    </div>
  );
}

/** Inherits the tab's text colour so it reads on both the filled and hollow state. */
function PulseDot() {
  return (
    <span className="relative inline-flex size-2 shrink-0">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-75 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2 rounded-full bg-current" />
    </span>
  );
}
