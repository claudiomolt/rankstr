# rankstr — Spec mínima MVP

**Status:** PO ACK 2026-09-07 · repo live
**Source:** briefs/spec-mvp.brief.yaml (status: ready)
**Playbook:** Dev-build-pipeline v1

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
| LN provider | Hosted LSP / Voltage-style node API |
| LN network | mainnet |
| Nostr MVP | npub + optional profile fetch (read) |
| Listing identity | URL and/or npub |
| Active index | Curated/manual seed |
| Data store | Postgres |
| Min bid | 1000 sats |

## 3. In scope

1. Public leaderboard ordered strictly by cumulative bid (sats) — rank = bid
2. Create/raise listing: project URL and/or Nostr npub
3. Lightning invoice for initial bid or difference to raise
4. After payment settles → listing public; outbound link without tracking junk
5. Dark + light UI from brand tokens + shadcn ui/
6. Minimal active projects index (seeded curated list) — Bitcoin/Nostr only
7. Basic rules page

## 4. Out of scope

- Fiat/Stripe
- Other chains / altcoins
- Categories / takeover / clone-directory meta
- Canva kit / vault Knowledge / public marketing posts
- Ads, revenue share, affiliate params
- Prod deploy / DNS without last-yes
- Full relay crawl / social graph analytics
- Mobile native apps
- NIP-07 login required to bid

## 5. Acceptance

| # | Criterion |
| --- | --- |
| A1 | Ordered board; higher sats = higher rank |
| A2 | Bid flow → Lightning invoice (mainnet) |
| A3 | Confirmed payment creates/raises listing; rank updates |
| A4 | Equal bids → older listing higher |
| A5 | Dark/light uses brand tokens |
| A6 | Bitcoin-only public copy |
| A7 | Active-index curated seed without false traction |

## 6. Mechanics

- Rank = cumulative sats
- Raise: invoice = delta to exceed current cumulative; result ≥ 1000 sats
- Min bid 1000 sats
- Tie-break: equal sats → older higher
- Identity: at least one of URL or npub

## 7. Stack

Next.js App Router · shadcn + brand/ui · Lightning LSP · Nostr read · Postgres · Vercel (prod gated)

## 8. Gates

Preview OK. Prod/DNS/Canva/vault last-yes.
