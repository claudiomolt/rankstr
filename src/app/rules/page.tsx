import type { Metadata } from "next";
import Link from "next/link";
import { BID_STEP_SATS, BOARD_PAGE_SIZE, MIN_BID_SATS } from "@/lib/rankings";
import { TAKEOVER_MULTIPLIER } from "@/lib/takeover";
import { formatCount, formatSats } from "@/lib/utils";

export const metadata: Metadata = { title: "Rules · rankstr" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold tracking-[-0.02em] md:text-xl">{title}</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground md:text-base">
        {children}
      </ul>
    </section>
  );
}

function Board({ children }: { children: React.ReactNode }) {
  return <span className="font-medium text-primary">{children}</span>;
}

export default function RulesPage() {
  return (
    <article className="mx-auto w-full max-w-2xl pt-6 pb-4">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em] md:text-[40px]">Rules</h1>
      <p className="mt-4 text-sm text-muted-foreground md:text-base">
        rankstr is a public leaderboard. There are no ads, no API keys, and no revenue share. You
        pay in sats to stand above everyone else. Rank is what you pay — nothing else.
      </p>

      <Section title="The boards">
        <li>
          <Board>All-time</Board> is the main board. Rank is everything you have ever paid for that
          listing. It does not expire.
        </li>
        <li>
          <Board>Today</Board> is a rolling 24 hours. Each payment counts from the moment it
          settled, then drops off a day later. Whoever spent the most in that window is #1.
        </li>
        <li>
          <Board>Daily</Board> is a UTC calendar day — midnight to midnight. The current day stays
          live until it closes; past days freeze as an archive. Rank is what you spent that day, not
          the last 24 hours.
        </li>
        <li>
          One payment ranks you on every board that includes that spend. The boards just look at
          different windows of time.
        </li>
      </Section>

      <Section title="How ranking works">
        <li>
          Amounts are whole sats, {formatSats(MIN_BID_SATS)} minimum, {BID_STEP_SATS} sat at a time.
          Ranks already on the board keep their amount until they raise or get outranked.
        </li>
        <li>
          Taking #1 costs at least {BID_STEP_SATS} sat more than the current #1. Paying less still
          puts you on the board at whatever rank that amount can take. Equal amounts stay in the
          order they were placed — the older listing keeps the higher rank.
        </li>
        <li>
          Taking today&apos;s #1 costs at least {BID_STEP_SATS} sat more than the most anyone else
          spent in the last 24 hours.
        </li>
        <li>
          Already on the list? Enter the same URL, @handle, or npub again and raise your rank. The
          new amount must be above your current rank; checkout only charges the difference. Someone
          else cannot take your rank by paying that difference.
        </li>
        <li>
          App Store, Play Store, GitHub, and similar platform links are keyed by their path, so
          different apps don&apos;t share a rank. Tracking query strings are ignored.
        </li>
        <li>
          A leaderboard takeover costs {TAKEOVER_MULTIPLIER}× the current #1 and locks the first
          page for 3 hours. Only one takeover can be live at a time. The first page is the top{" "}
          {formatCount(BOARD_PAGE_SIZE)} listings.
        </li>
      </Section>

      <Section title="What you can list">
        <li>A product website, an X @handle, or a Nostr npub.</li>
        <li>
          Chat and invite links are not allowed — Telegram, WhatsApp, Discord, Messenger, Signal,
          and similar. The board is for products and profiles, not group chats.
        </li>
        <li>
          Links to sexual content are not allowed. If it is porn, NSFW, or an adult platform, it
          does not belong on the board.
        </li>
        <li>
          Query parameters are stripped from listing links. Affiliate, referral, and tracking URLs
          will not work.
        </li>
        <li>
          Link shortener URLs are not allowed. If you submit one, it is replaced by the URL it
          redirects to.
        </li>
      </Section>

      <Section title="Categories">
        <li>
          Pick a category when you claim. Your listing appears on that{" "}
          <Link href="/categories" className="text-primary underline underline-offset-2">
            category board
          </Link>{" "}
          and on the main board at the same time.
        </li>
        <li>
          The taxonomy is Bitcoin and Nostr only. There are no altcoin categories and there will not
          be any.
        </li>
      </Section>

      <Section title="How you pay">
        <li>
          Lightning only. rankstr requests an invoice from its Lightning Address over LUD16 and
          confirms settlement against the LUD21 verify endpoint the callback returns.
        </li>
        <li>Every amount on this site is sats. No cards, no fiat, no other chains.</li>
      </Section>

      <Section title="After you pay">
        <li>
          Your listing is public. Clicks go to the URL or profile you submitted, without query
          parameters.
        </li>
        <li>A completed payment is what claims the rank. Payments are not refundable.</li>
      </Section>
    </article>
  );
}
