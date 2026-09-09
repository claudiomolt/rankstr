import type { Metadata } from "next";
import Link from "next/link";
import { loadBoard } from "@/lib/board";
import { MIN_BID_SATS } from "@/lib/rankings";
import { formatCount, formatSats } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "About · rankstr" };

export default async function AboutPage() {
  const view = await loadBoard();
  const topListing = view.rows[0]?.listing ?? null;

  return (
    <article className="mx-auto w-full max-w-2xl pt-6 pb-4">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] md:text-[40px]">About</h1>

      <p className="mt-4 text-sm text-muted-foreground md:text-base">
        rankstr is a public leaderboard for Bitcoin and Nostr projects. No ads, no API keys, no
        revenue share, and no ranking algorithm to reverse-engineer. You pay sats to stand above
        everyone else, and the amount you paid is the whole of your rank.
      </p>

      <h2 className="mt-8 text-lg font-semibold tracking-[-0.02em] md:text-xl">
        Why a board and not a feed
      </h2>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">
        Discovery lists usually hide their weighting. Votes get gamed, engagement gets farmed, and
        nobody outside the company can tell why one project sits above another. Here the ordering is
        a single public number. If you disagree with a rank, you can change it — that is the entire
        mechanic, and it is written out on{" "}
        <Link href="/rules" className="text-primary underline underline-offset-2">
          the rules page
        </Link>
        .
      </p>

      <h2 className="mt-8 text-lg font-semibold tracking-[-0.02em] md:text-xl">Sats, over Lightning</h2>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">
        Every amount on this site is sats. rankstr asks its Lightning Address for an invoice over
        LUD16 and confirms settlement against the LUD21 verify endpoint that the callback returns.
        There are no cards, no fiat, no other chains, and no payment secret in the browser. A rank
        is claimed by a settled payment and by nothing else, so an unpaid listing never appears.
      </p>

      <h2 className="mt-8 text-lg font-semibold tracking-[-0.02em] md:text-xl">
        What you can put on it
      </h2>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">
        A product website, an X @handle, or a Nostr npub. A listing with an npub can carry its
        kind-0 name and picture, read-only — rankstr never signs anything and never asks for a key.
        The minimum is {formatSats(MIN_BID_SATS)} and you move in whole sats from there.
      </p>

      <h2 className="mt-8 text-lg font-semibold tracking-[-0.02em] md:text-xl">Where it stands</h2>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">
        These are the only numbers this board has, and all of them are settled payments and real
        outbound clicks. There is no visitor counter here because there is nothing honest to put
        behind one yet.
      </p>

      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        <Stat value={formatCount(view.stats.satsClaimed)} unit="sats" label="claimed" />
        <Stat value={formatCount(view.stats.listings)} label="listings ranked" />
        <Stat
          value={topListing ? formatCount(topListing.cumulativeSats) : "—"}
          unit={topListing ? "sats" : undefined}
          label={topListing ? `highest rank · ${topListing.title}` : "highest rank"}
        />
      </dl>

      <h2 className="mt-8 text-lg font-semibold tracking-[-0.02em] md:text-xl">Credit</h2>
      <p className="mt-2 text-sm text-muted-foreground md:text-base">
        The pay-to-rank mechanic and the interface are modelled on{" "}
        <a
          href="https://outbid.lol"
          rel="noreferrer"
          className="text-primary underline underline-offset-2"
        >
          outbid.lol
        </a>
        . rankstr is the Bitcoin-only version of the same idea: sats instead of dollars, Lightning
        instead of cards, and a taxonomy that stops at Bitcoin and Nostr.
      </p>
    </article>
  );
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border px-4 py-3">
      <dt className="sr-only">{label}</dt>
      <dd>
        <p className="text-2xl font-semibold tracking-[-0.03em] tabular-nums">
          {value}
          {unit ? <span className="ml-1 text-sm font-medium text-primary">{unit}</span> : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{label}</p>
      </dd>
    </div>
  );
}
