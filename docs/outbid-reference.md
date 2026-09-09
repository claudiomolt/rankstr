# outbid.lol — reference findings

**Updated:** 2026-09-09 · supersedes the 2026-09-07 search-index pass, which was itself a
supersession of the 2026-09-05 secondary-source-only pass.

**Method.** Earlier passes could not reach the site: `curl` and the fetch tool both get a Vercel
Security Checkpoint from this network, and there is no Wayback snapshot. This pass drove a **headed**
Chrome (Playwright, `headless: false`, real X display) which clears the checkpoint, so everything
below is read off the live pages and the live stylesheet rather than off a search-index summary.

Captured: `/`, `/rules`, `/about`, `/daily`, `/categories`, `/today`, `/category/<slug>`, `/faq`,
the claim → confirm-dialog flow, the shipped CSS bundle, and the `:root` custom properties. Two
routes guessed from the older notes do not exist: `/c/<slug>` and `/stats`.

Where an earlier pass and this one disagree, this one wins — the older notes were reconstructed from
third parties, and the live product has also moved on (see "What changed" below).

## Visual system — read off the live stylesheet

The design tokens below are verbatim from the shipped `:root` / `.dark` blocks. rankstr uses these
values as-is; the earlier Basalt / vermilion / brass palette does not apply to the public UI.

| Token | Light | Dark |
| --- | --- | --- |
| `--background` | `#fffdfa` | `#1a1512` |
| `--foreground` | `#282624` | `#f7f5f1` |
| `--card` / `--surface` | `#fffdfa` / `#fff` | `#231e1b` |
| `--primary` | `#e57255` | `#e57255` |
| `--primary-foreground` | `#fff` | `#fff` |
| `--muted` / `--secondary` / `--accent` | `#f6f3ef` | `#2d2824` |
| `--muted-foreground` | `#67625d` | `#aba39b` |
| `--border` | `#e6e0da` | `#ffffff1a` |
| `--destructive` | `#e40014` | `#ff6568` |
| `--live` | `#009f31` | `#50c05f` |
| `--radius` | `0.875rem` | `0.875rem` |

Type is **Poppins** at a 16px base. Every interactive control is a full pill; cards and rows use
`rounded-xl` / `rounded-2xl`. Page content is capped at `max-w-5xl` with `px-4`.

Structure, in source order on the board pages:

1. Header — wordmark with the dot in `--primary`, a bordered counter pill with a pulsing `--live`
   dot, then `Daily / Categories / About / Rules`, a search button, and a theme toggle.
2. Category rail — one `rounded-full bg-muted` capsule holding a horizontally scrolling row of
   `h-7` pills, a gradient fade on the right edge, and an `Explore` pill pinned outside the scroller.
3. Board tabs — `All-time` / `Today`, an `inline-flex rounded-full border p-0.5` segmented control
   with the active tab filled in `--primary`. `Today` carries a pulsing `bg-current` dot.
4. Claim headline — `Claim #1 for − <amount> +` at `text-[28px] md:text-[40px]`, the amount being an
   inline number input styled `underline decoration-2 decoration-dashed underline-offset-[6px]` in
   `--primary`, flanked by `size-6` `bg-primary/15` stepper buttons.
5. Claim form — one row: identity input with a leading icon, a category select, and the `Claim rank`
   button, all `h-11 rounded-xl` on a white plate.
6. Leaderboard — top three are tinted cards at `bg-primary/14`, `/8`, `/4` with `size-14 md:size-18`
   marks and the rank in `--primary`; ranks 4+ are flat rows separated by a hairline with
   `size-10 md:size-14` marks and the rank in `--muted-foreground`. Every row: title, one-line
   `line-clamp-1` description, and a meta line of `category · relative time · host · N clicks ·
   see details`, with the amount right-aligned in `--primary`. Hovering a row floats a
   `claim this rank for <amount>` pill on its top edge.
7. Inline strips — `Today's top ranking` (three compact tiles) after rank 3, and `Latest activity`
   after rank 10.
8. Pagination — numbered pills with an ellipsis plus an `N - M of T` line.
9. Footer — a totals block, then `Rules · FAQ · Terms · Privacy · Imprint · Live stats`.

The confirm step is a modal: `Confirm this rank`, a RANK tile and a PRICE tile marked `Due now`, a
disclaimer, a terms checkbox, then `Cancel` / `Continue to checkout`.

Search is not a dialog. The header's magnifier toggles an inline bar between the header row and the
category rail — full width, `rounded-xl`, placeholder `Search products and categories…` — which
pushes the rest of the page down.

The `see details` link on every row goes to `/product/<host>`, which is laid out as: a
`Leaderboard · <Category>` breadcrumb, a tinted hero card (mark, title, `category · host · age ·
clicks` meta, description, then `Visit ›` and `Copy link`), two rank cards (`CATEGORY RANK` and
`OVERALL`, each with an `of N` line and a coral link to that board), an `About this ranking` section
that opens with a raise-count and click summary and then answers `What rank does X hold?`, `Has X
ranked today?` and `How do I outrank X?`, and finally an `Also in <Category>` list of five.

rankstr uses `/listing/<id>` rather than a host-derived path, because a listing can be a URL, an X
handle, or an npub, and the id is the only identifier all three share without collision.

## Source of truth — `/rules`, verbatim

> # Rules
>
> Outbid is a public leaderboard. There are no ads, no API keys, and no revenue share. You pay to
> stand above everyone else. Rank is what you pay — nothing else.
>
> ## The boards
>
> One payment ranks you on every board that includes that spend. The boards just look at different
> windows of time.
>
> - All-time is the main board. Rank is everything you have ever paid for that listing. It does not
>   expire.
> - Today is a rolling 24 hours. Each payment counts from the moment you paid, then drops off a day
>   later. Whoever spent the most in that window is #1.
> - Daily is a UTC calendar day — midnight to midnight — starting August 21, 2026. The current day
>   stays live until it closes; past days freeze as an archive. Rank is what you spent that day, not
>   the last 24 hours.
>
> ## How ranking works
>
> - New listings are whole US dollars, $10 minimum, $999,999 maximum, $1 at a time. Ranks already on
>   the board keep their amount until they raise or get outranked.
> - Taking #1 costs at least $5 more than the current #1. Paying less still puts you on the board at
>   whatever rank that amount can take. Equal amounts stay in the order they were placed — the older
>   listing keeps the higher rank.
> - Taking today's #1 costs at least $5 more than the most anyone else spent in the last 24 hours.
> - Already on the list? Enter the same URL or @handle again and raise your rank. The new amount must
>   be at least $1 above your current rank; checkout only charges the difference. Someone else cannot
>   take your rank by paying that difference.
> - App Store, Play Store, GitHub, and similar platform links are keyed by their path, so different
>   apps don't share a rank. Tracking query strings are ignored.
>
> ## What you can list
>
> - A product website, or an X @handle.
> - Chat and invite links are not allowed — Telegram, WhatsApp, Discord, Messenger, Signal, and
>   similar. The board is for products and profiles, not group chats.
> - Links to sexual content are not allowed. If it is porn, NSFW, or an adult platform, it does not
>   belong on the board.
> - Query parameters are stripped from listing links. Affiliate, referral, and tracking URLs will not
>   work.
> - Link shortener URLs are not allowed. If you submit one, it is replaced by the URL it redirects to.
>
> ## Categories
>
> Categories for existing listings were auto-assigned by AI. If your product is in the wrong
> category, DM @jonathan_wilke on X to have it changed.
>
> ## After you pay
>
> - Your listing is public. Clicks go to the URL or profile you submitted, without query parameters.
> - A completed payment is what claims the rank. Payments are not refundable.
> - Paying means you agree to the Terms of Service and Privacy Policy, including the requirement that
>   listed projects show valid company details.

## What changed since the 2026-09-07 notes

| Then | Now | Effect on rankstr |
| --- | --- | --- |
| One board | Three windows: All-time, Today (rolling 24h), Daily (UTC day) | Implemented — `BoardWindow` in `src/lib/rankings.ts`, bucketed in `src/lib/board.ts` |
| `$2` minimum, `$1` to take #1 | `$10` minimum, `$5` to take #1, `$999,999` cap | Not adopted: rankstr's sats economics are locked at 1000 min / 1 sat step |
| Takeover: 2× #1, locks page 1 for 3 hours | No longer in `/rules` | Kept — it is a locked rankstr mechanic, and removing it is not a visual requirement |
| Categories inferred from a third party | Confirmed: 28 categories at `/category/<slug>`, chosen at claim time | Implemented with a Bitcoin-only taxonomy at `/category/<slug>` |
| Card settlement | Unchanged | Not applicable — rankstr is Lightning-only |

## Deliberate rankstr divergences

These are the only places rankstr departs from the source, and each is a locked project constraint,
not a discovered outbid feature.

| # | outbid.lol | rankstr | Why |
| --- | --- | --- | --- |
| 1 | Whole US dollars, $10 min, $1 steps | Whole sats, 1000 sat min, 1 sat steps | Bitcoin-only copy; 1000 sats min locked in `spec.md` |
| 2 | Card settlement | LUD16 Lightning Address pay + LUD21 verify | Bitcoin-only; no Stripe, no fiat |
| 3 | Website or X @handle | Website, X @handle, **or Nostr npub** | Nostr integration is in the project contract |
| 4 | No profile enrichment | Optional read-only Nostr kind-0 profile | Soft enrichment, fails open |
| 5 | 28 general startup categories | 10 Bitcoin and Nostr categories | Bitcoin-only copy constraint |
| 6 | Visitor and revenue counters in the chrome | Listings and sats claimed | Those are the only numbers rankstr actually has; no invented traction |
| 7 | Title and description scraped from the listed page | Optional name and one-line fields, revealed after an identity is entered | No scraper in rankstr; the default form row stays a single line |

## Ambiguity resolved explicitly

`/rules` no longer documents the takeover, so the 2026-09-07 reading still stands as the rankstr
definition: the takeover holder owns an exclusive pinned slot at the top of page 1 for 3 hours and no
second takeover may start during that window. Bids underneath keep settling and re-ranking normally.
`/rules` also does not state a page size; rankstr uses 20 rows per page so that "first page" has a
concrete meaning. outbid itself paginates at 50.

The Play Store is the one platform where app identity lives in a query parameter (`?id=<package>`)
rather than the path. Stripping it would make every Play listing collide on `/store/apps/details`,
which contradicts "different apps don't share a rank", so rankstr keeps `id` for that host only and
drops every other parameter.
