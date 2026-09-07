import type { Metadata } from "next";
import { BID_STEP_SATS, BOARD_PAGE_SIZE, MIN_BID_SATS } from "@/lib/rankings";
import { TAKEOVER_MULTIPLIER } from "@/lib/takeover";
import { formatSats } from "@/lib/utils";

export const metadata: Metadata = { title: "rankstr · rules" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-display text-xl font-semibold lowercase">{title}</h2>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">{children}</ul>
    </section>
  );
}

export default function RulesPage() {
  return (
    <article className="max-w-none space-y-6 text-sm text-foreground">
      <div>
        <h1 className="font-display text-3xl font-bold lowercase">rules</h1>
        <p className="mt-2 text-muted-foreground">
          rankstr is a public leaderboard. There are no ads, no API keys, and no revenue share. You
          pay in sats to stand above everyone else. Rank is the bid — nothing else.
        </p>
      </div>

      <Section title="how ranking works">
        <li>
          Bids are whole sats, {formatSats(MIN_BID_SATS)} minimum, {BID_STEP_SATS} sat at a time.
        </li>
        <li>
          Paying less than #1 still puts you on the board at whatever rank that bid can take. Equal
          bids stay in the order they were placed — the older bid keeps the higher rank.
        </li>
        <li>
          Enter the same website, @handle, or npub again to raise that listing back to #1. The new
          bid must be above the current top bid; you only pay the difference. Someone else cannot
          take your rank by paying that difference.
        </li>
        <li>
          App Store, Play Store, GitHub, and similar platform links are keyed by their path, so
          different apps don&apos;t share a bid. Tracking query strings are ignored.
        </li>
        <li>
          A leaderboard takeover costs {TAKEOVER_MULTIPLIER}× the current #1 and locks the first page
          for 3 hours. Only one takeover can be live at a time. The first page is the top{" "}
          {BOARD_PAGE_SIZE} listings.
        </li>
      </Section>

      <Section title="what you can list">
        <li>A product website, an X @handle, or a Nostr npub.</li>
        <li>
          Chat and invite links are not allowed — Telegram, WhatsApp, Discord, Messenger, Signal, and
          similar. The board is for products and profiles, not group chats.
        </li>
        <li>
          Links to sexual content are not allowed. If it is porn, NSFW, or an adult platform, it does
          not belong on the board.
        </li>
        <li>
          Query parameters are stripped from listing links. Affiliate, referral, and tracking URLs
          will not work.
        </li>
        <li>
          Link shorteners are not allowed. If you submit one, it is replaced by the URL it redirects
          to.
        </li>
        <li>Pick a category. Your listing appears on that category board and on the main board.</li>
      </Section>

      <Section title="after you pay">
        <li>
          Your listing is public. Clicks go to the URL or profile you submitted, without query
          parameters.
        </li>
        <li>A completed payment is what claims the rank.</li>
        <li>
          Payment is Lightning only. rankstr requests an invoice from its Lightning Address and
          confirms settlement against the payer&apos;s verify endpoint. No cards, no fiat, no other
          chains.
        </li>
      </Section>

      <p className="text-muted-foreground">Live signal board. Powered by sats.</p>
    </article>
  );
}
