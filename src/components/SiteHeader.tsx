import Link from "next/link";
import { LiveDot } from "@/components/LiveDot";
import { HeaderShell } from "@/components/SiteSearch";
import { getStore } from "@/lib/store";
import { formatCount } from "@/lib/utils";

const NAV = [
  { href: "/daily", label: "Daily" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/rules", label: "Rules", desktopOnly: true },
];

/**
 * Wordmark, a live counter pill, and the top-level nav.
 *
 * The counter reports settled board state only — listings and sats actually
 * paid in. There is no visitor or presence number here because there is nothing
 * real to put behind one.
 */
export async function SiteHeader() {
  const listings = await getStore().listPublic();
  const satsClaimed = listings.reduce((sum, l) => sum + l.cumulativeSats, 0);

  const brand = (
    <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
      <Link
        href="/"
        className="inline-flex shrink-0 items-center gap-1.5 text-[22px] font-medium tracking-[-0.04em]"
      >
        <RankMark />
        <span>
          rankstr<span className="text-primary">.</span>
        </span>
      </Link>
      <div className="hidden min-w-0 md:block">
        <Link
          href="/daily"
          className="inline-block max-w-full whitespace-nowrap rounded-full border border-border px-2.5 py-1 text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <LiveDot />
            <span className="font-semibold text-live">board live</span>
          </span>
          <span> · {formatCount(listings.length)} listings</span>
          <span className="text-foreground"> · {formatCount(satsClaimed)} sats claimed →</span>
        </Link>
      </div>
    </div>
  );

  const nav = (
    <nav>
      <ul className="flex items-center gap-3 text-xs sm:gap-6 sm:text-sm">
        {NAV.map((item) => (
          <li key={item.href} className={item.desktopOnly ? "hidden md:block" : undefined}>
            <Link
              href={item.href}
              className="font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );

  return (
    <header className="w-full">
      <HeaderShell brand={brand} nav={nav} />
    </header>
  );
}

/** Three ascending bars — the leaderboard read as a mark. */
function RankMark() {
  return (
    <svg viewBox="0 0 24 18" className="h-4 w-5" aria-hidden>
      <rect x="0" y="12" width="24" height="3" rx="1.5" fill="currentColor" />
      <rect x="0" y="6.5" width="17" height="3" rx="1.5" fill="currentColor" opacity="0.65" />
      <rect x="0" y="1" width="10" height="3" rx="1.5" className="fill-primary" />
    </svg>
  );
}
