import Link from "next/link";
import { getStore } from "@/lib/store";
import { formatCount } from "@/lib/utils";

const LINKS = [
  { href: "/rules", label: "Rules" },
  { href: "/about", label: "About" },
  { href: "/categories", label: "Categories" },
  { href: "/daily", label: "Daily" },
  { href: "/today", label: "Today" },
];

/**
 * Board totals plus the standing links. Both numbers are settled Lightning
 * payments and live listings — nothing projected.
 */
export async function SiteFooter() {
  const listings = await getStore().listPublic();
  const satsClaimed = listings.reduce((sum, l) => sum + l.cumulativeSats, 0);

  return (
    <footer className="mx-auto w-full max-w-5xl px-4 pt-8 pb-14">
      <div className="rounded-2xl border border-border bg-muted/60 px-5 py-6 text-center">
        <p className="text-xs text-muted-foreground">
          Everything settled on this board so far. Sats only — no cards, no fiat.
        </p>
        <div className="mt-4 flex flex-wrap items-start justify-center gap-x-14 gap-y-5">
          <Stat value={formatCount(satsClaimed)} unit="sats" label="claimed" />
          <Stat value={formatCount(listings.length)} label="listings ranked" />
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Bitcoin only. Paid over Lightning with a LUD16 address, confirmed with LUD21 verify.
      </p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {LINKS.map((link, i) => (
          <span key={link.href} className="inline-flex items-center gap-2">
            {i > 0 ? <span aria-hidden>·</span> : null}
            <Link href={link.href} className="transition-colors hover:text-foreground">
              {link.label}
            </Link>
          </span>
        ))}
      </p>
    </footer>
  );
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-semibold tracking-[-0.03em] tabular-nums md:text-3xl">
        {value}
        {unit ? <span className="ml-1 text-base font-medium text-primary">{unit}</span> : null}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
