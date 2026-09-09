# rankstr

Public pay-to-rank leaderboard in sats for Bitcoin and Nostr projects. Rank is the bid — nothing
else.

- Spec: [`spec.md`](./spec.md)
- Plan: [`implementation-plan.md`](./implementation-plan.md)
- Parity source: [`docs/outbid-reference.md`](./docs/outbid-reference.md)
- Brand: [`brand/`](./brand/)

## Run it

```bash
npm install
npm run dev
```

With no environment set at all the board runs on an in-process store and a mock Lightning rail, so
`npm run dev` works on a clean machine. Every mock surface says so on screen.

| Route | What it is |
| --- | --- |
| `/` | All-time board, 20 rows per page |
| `/today` | Rolling 24h board — same listings, ranked on the last day of payments |
| `/daily` | UTC calendar-day archive; the current day stays live until midnight UTC |
| `/categories` | Category index with the leader of each board |
| `/category/[slug]` | Category board — same rules, narrower scope (`/c/[slug]` redirects here) |
| `/rules` | The ranking contract |
| `/active` | Curated index of active projects (seeded, not discovery) |
| `/go/[id]` | Outbound click: counts the click, redirects without query parameters |

### The three windows

One payment ranks a listing on every board that includes that spend; the boards differ only in the
slice of time they count. All-time never expires, Today is a rolling 24 hours, and Daily buckets by
UTC calendar day and freezes once the day closes. All three read the same settled payments, so there
is no separate ranking to keep in sync.

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `LN_ADDRESS` | For real payments | LUD16 Lightning Address that receives bids. Unset ⇒ mock rail. |
| `DATABASE_URL` | For persistence | Postgres connection string. Unset ⇒ in-process store. |
| `NOSTR_RELAYS` | No | Comma-separated `wss://` relays for read-only profile lookup. |
| `NEXT_PUBLIC_NETWORK` | No | Public network label and mock invoice prefix. Defaults to `mainnet`. |

See [`.env.example`](./.env.example) for the annotated version.

## Payments — LUD16 pay, LUD21 verify

Bitcoin only. No cards, no fiat, no other chains, and no payment secret in the browser.

1. **LUD16.** `LN_ADDRESS` (`name@domain`) resolves to `https://{domain}/.well-known/lnurlp/{name}`.
2. **LUD06.** Those pay parameters give a callback; the server requests the bid amount in millisats
   and gets back a BOLT11 invoice.
3. **LUD21.** The callback also returns a `verify` URL. The server polls it until the invoice
   settles, fails, or the window closes. A settled invoice is what claims the rank.

The verify URL is server-side only. The browser polls `GET /api/bids/{bidId}`, which runs the verify
check and applies settlement. There is no webhook and no shared secret to configure.

| Mode | Condition | Behaviour |
| --- | --- | --- |
| **Mock** | `LN_ADDRESS` unset | Simulated invoices marked `_mock_`, labelled in the UI. `POST /api/bids/mock-pay` settles one. No sats move. |
| **Live** | `LN_ADDRESS` set | Real LNURL-pay invoices. Mock pay returns **403**. |

If a Lightning Address does not advertise LUD21 verify, invoices still issue but settlement cannot be
confirmed automatically, and the bid stays pending with that reason.

Code: `src/lib/ln/` — `lnurl.ts` (LUD16/06/21), `mock.ts` (mock rail), `index.ts` (facade).

## Mechanics

Full text on `/rules`. The short version:

- **Rank is the bid.** Cumulative sats descending; equal bids keep their original order, so the
  older bid stays higher.
- **Whole sats, 1000 minimum, 1 sat at a time.** Paying less than #1 still places you at whatever
  rank that bid can take.
- **Raising.** Submit the same website, @handle, or npub again. It resolves to the same listing and
  you pay only the difference. Identity is canonical, so `https://www.example.com/?ref=x` and
  `example.com` are one listing.
- **Platform links keyed by path.** App Store by app id, Play Store by package, GitHub by
  `owner/repo`, so different apps never share a bid.
- **Query parameters are stripped** from listing links and from outbound clicks.
- **Not listable:** chat and invite links, sexual content, link shorteners (a shortener is replaced
  by the URL it redirects to, or rejected if it cannot be resolved).
- **Takeover.** 2× the current #1 locks the top of page one for 3 hours. Only one at a time.
- **Nothing is public until a payment settles.** Unpaid listings do not appear and do not accrue
  clicks.

Code: `src/lib/rankings.ts` (rank, delta, projection, paging), `src/lib/identity.ts` (what you can
list, and what counts as the same listing), `src/lib/takeover.ts`, `src/lib/bids.ts` (orchestration),
`src/lib/store.ts` (Postgres or in-process behind one interface).

## Nostr

Optional, read-only, and fails open. A listing can be an npub, or carry one alongside a website. The
server fetches kind 0 metadata for a display name and picture; a relay timeout or a bad npub never
blocks the board or a bid. No NIP-07, no signing, no spend.

## Data

- Schema: `src/db/schema.ts` · migrations `drizzle/0000_init.sql`, `drizzle/0001_outbid_parity.sql`,
  `drizzle/0002_listing_description.sql`
- Seed: `DATABASE_URL=… npm run db:seed`
- Seed rows are development data, not traction.

## Checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Look and feel

The public UI is a visual clone of [outbid.lol](https://outbid.lol): warm paper background, coral
accent, Poppins, pill controls, and a 14px card radius. The tokens are read off the live stylesheet
and recorded in [`docs/outbid-reference.md`](./docs/outbid-reference.md), which also lists every
place rankstr deliberately diverges. The Basalt / vermilion / brass system in [`brand/`](./brand/)
does not govern the public UI.

Bitcoin-only public copy. Every amount on the site is sats. Prod and DNS remain gated.
