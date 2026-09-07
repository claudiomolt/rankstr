# rankstr — Spec

**Status:** PO ACK 2026-09-07 · repo live · scope extended 2026-09-07 to outbid-full parity
**Source:** briefs/spec-mvp.brief.yaml (status: ready) + outbid parity scope change
**Playbook:** Dev-build-pipeline v1
**Parity source:** [`docs/outbid-reference.md`](./docs/outbid-reference.md) — verbatim `outbid.lol/rules`

Open Qs → PO recommends applied until Agustin overrides vía CoS.

## 1. Product

**One-liner:** Public pay-to-rank board in sats (Lightning) for Bitcoin+Nostr projects, plus a minimal active-projects index.

**Audience:** bitcoiner, Nostr
**Problem:** discoverability / ranking of Bitcoin+Nostr projects without opaque algos
**Promise:** mechanic tipo outbid + índice bitcoiner + Nostr de proyectos activos
**Domain / repo:** rankstr.io · https://github.com/claudiomolt/rankstr (live)

## 2. Locked decisions

| Q | Decision |
| --- | --- |
| Repo | public https://github.com/claudiomolt/rankstr |
| LN payment rail | **LUD16 Lightning Address + LUD06 invoice + LUD21 verify** (replaces hosted LSP / Voltage) |
| LN config | single env `LN_ADDRESS`; unset ⇒ labelled mock rail |
| LN network | mainnet |
| Nostr MVP | npub + optional profile fetch (read) |
| Listing identity | website URL, X @handle, or npub |
| Active index | Curated/manual seed |
| Data store | Postgres, in-process fallback when unset |
| Min bid | 1000 sats, whole sats, 1 sat steps |
| Board page size | 20 |
| Takeover | 2× current #1, locks first page 3h, one at a time |

## 3. In scope

1. Public leaderboard ordered strictly by cumulative bid (sats) — rank = bid
2. Listing identity: website URL or X @handle, plus npub allowed
3. Whole-sat bids, 1000 sat minimum; paying less than #1 still places at that rank
4. Equal bids → older listing keeps the higher rank
5. Raise by resubmitting the same identity; pay only the difference; must exceed the listing's current bid
6. Claim #1 by exceeding the current top bid
7. Category boards alongside the main board
8. Takeover: 2× the current #1, locks the first page for 3 hours, only one live
9. App Store / Play Store / GitHub keyed by path; all query strings stripped
10. Disallow chat and invite links, NSFW, and link shorteners (redirects resolved)
11. Lightning payment: LUD16 address → LUD06 invoice → LUD21 verify to settlement
12. After settlement: listing public; outbound clicks without query parameters, counted
13. Live activity feed of settled payments
14. Rules page mirroring outbid, adapted to sats
15. Dark + light UI from brand tokens + shadcn
16. Minimal active projects index (seeded curated list) — Bitcoin/Nostr only

## 4. Out of scope

- Fiat / Stripe / cards
- Other chains / altcoins
- Hosted LSP or node-API invoice path, and payment webhooks
- Canva kit / vault Knowledge / public marketing posts
- Ads, revenue share, affiliate params
- Prod deploy / DNS without last-yes
- Full relay crawl / social graph analytics
- Mobile native apps
- NIP-07 login required to bid
- Invented metrics — only settled payments and real clicks are counted

## 5. Acceptance

| # | Criterion |
| --- | --- |
| A1 | Ordered board; higher sats = higher rank |
| A2 | Bid flow issues a Lightning invoice from `LN_ADDRESS` (mainnet) |
| A3 | LUD21 verify settlement creates/raises the listing; rank updates |
| A4 | Equal bids → older higher |
| A5 | Dark/light uses brand tokens |
| A6 | Bitcoin-only public copy |
| A7 | Active-index curated seed without false traction |
| A8 | Resubmitting the same identity raises it and charges only the difference |
| A9 | Takeover costs 2× #1, holds the first page 3h, and blocks a second takeover |
| A10 | Chat, NSFW, and shortener submissions are rejected; shorteners resolve first |
| A11 | Nothing is public and no click is counted before a payment settles |
| A12 | Mock rail is unmistakably labelled and disabled once `LN_ADDRESS` is set |

## 6. Mechanics

- Rank = cumulative sats, descending; tie-break older-first
- Min bid 1000 sats; whole sats only; smallest raise is 1 sat
- Raise: invoice = target − current cumulative, target must exceed the listing's current bid
- Claim #1: target must exceed the current top bid
- Takeover cost = 2 × current #1, floored at the min bid; window 3h; one live at a time
- Identity is canonical: scheme, `www.`, trailing slash, case and query params collapse to one key;
  platform links key on path
- Settlement is idempotent — a paid bid never adds sats twice

## 7. Stack

Next.js App Router · shadcn + brand/ui · LUD16/LUD06/LUD21 Lightning · Nostr read · Postgres · Vercel (prod gated)

## 8. Gates

Preview OK. Prod/DNS/Canva/vault last-yes.
