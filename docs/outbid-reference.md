# outbid.lol — reference findings

**Updated:** 2026-09-07 · supersedes the 2026-09-05 secondary-source-only pass.

**Method.** `https://outbid.lol/rules` still answers a Vercel Security Checkpoint / HTTP 429 to
`curl` and to the fetch tool from this box, and the page has no Wayback snapshot. The full page text
below was recovered verbatim from the search index entry for `https://outbid.lol/rules` and is
treated as the authoritative source for parity. Everything outside the quoted block is labelled as
secondary or as an explicit rankstr adaptation. Nothing here is invented UX.

## Source of truth — `/rules`, verbatim

> # Rules
>
> Outbid is a public leaderboard. There are no ads, no API keys, and no revenue share. You pay to
> stand above everyone else. Rank is the bid — nothing else.
>
> ## How ranking works
>
> - Bids are whole US dollars, $2 minimum, $1 at a time.
> - Paying less than #1 still puts you on the board at whatever rank that bid can take. Equal bids
>   stay in the order they were placed — the older bid keeps the higher rank.
> - Enter the same website or @handle again to raise that listing back to #1. The new bid must be at
>   least $1 above the current top bid; you only pay the difference. Someone else cannot take your
>   rank by paying that difference.
> - App Store, Play Store, GitHub, and similar platform links are keyed by their path, so different
>   apps don't share a bid. Tracking query strings are ignored.
> - A leaderboard takeover costs 2× the current #1 and locks the first page for 3 hours. Only one
>   takeover can be live at a time.
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
> - Link shorteners are not allowed. If you submit one, it is replaced by the URL it redirects to.
>
> ## After you pay
>
> - Your listing is public. Clicks go to the URL or profile you submitted, without query parameters.
> - A completed payment is what claims the rank.

## Secondary sources (context only, lower trust)

| Claim | Source | Use in rankstr |
| --- | --- | --- |
| Categories exist — submitters "choose a category" alongside URL/@handle | microsaasexamples.com | Implemented: static taxonomy + per-category boards + main board |
| Listings send measurable click-throughs | businessinsider press release | Implemented: click counter behind the outbound redirect the rules already require |
| Takeover costs 5× the top bid | automatio.ai | **Rejected** — `/rules` says 2×, and `/rules` wins |
| Claiming #1 needs +$5 / new listings start at $5 | microsaasexamples.com | **Rejected** — `/rules` says $2 minimum and $1 increments |
| Payments settle by card, with webhooks flipping the row to paid | automatio.ai | Not applicable — rankstr is Lightning-only (LUD16 pay + LUD21 verify) |

Where secondary sources contradict `/rules`, `/rules` wins.

## Deliberate rankstr divergences

These are the only places rankstr departs from the source, and each is a locked project constraint,
not a discovered outbid feature.

| # | outbid.lol | rankstr | Why |
| --- | --- | --- | --- |
| 1 | Whole US dollars, $2 min, $1 steps | Whole sats, 1000 sat min, 1 sat steps | Bitcoin-only copy; 1000 sats min locked in `spec.md` |
| 2 | Card settlement | LUD16 Lightning Address pay + LUD21 verify | Bitcoin-only; no Stripe, no fiat |
| 3 | Website or X @handle | Website, X @handle, **or Nostr npub** | Nostr integration is in the project contract |
| 4 | No profile enrichment | Optional read-only Nostr kind-0 profile | Soft enrichment, fails open |

## Ambiguity resolved explicitly

`/rules` says a takeover "locks the first page for 3 hours" without defining the lock. rankstr reads
this as the narrowest defensible meaning: the takeover holder owns an exclusive pinned slot at the
top of page 1 for 3 hours and no second takeover may start during that window. Bids underneath keep
settling and re-ranking normally. Freezing every other listing's rank would be a stronger claim than
the source supports, so rankstr does not do it. `/rules` also does not state a page size; rankstr
uses 20 rows per page so that "first page" has a concrete meaning.

The Play Store is the one platform where app identity lives in a query parameter (`?id=<package>`)
rather than the path. Stripping it would make every Play listing collide on `/store/apps/details`,
which contradicts "different apps don't share a bid", so rankstr keeps `id` for that host only and
drops every other parameter.
