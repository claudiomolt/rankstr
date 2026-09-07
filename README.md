# rankstr

Public pay-to-rank board in sats (Lightning) for Bitcoin+Nostr projects.

- Spec: [`spec.md`](./spec.md)
- Plan: [`implementation-plan.md`](./implementation-plan.md)
- Brand: [`brand/`](./brand/)

## App

```bash
npm install
npm run dev
```

Routes: `/` board · `/active` curated index · `/rules`

Bitcoin-only public copy. Prod/DNS gated.

## Data (P1)

- Drizzle schema: `src/db/schema.ts` · migration `drizzle/0000_init.sql`
- Set `DATABASE_URL` for Postgres. When absent, the board keeps using the in-memory seed (`src/lib/seed.ts` via `src/lib/memory-store.ts`).
- Seed DB: `DATABASE_URL=… npm run db:seed`

## Lightning bids (P3)

Provider: hosted LSP / Voltage-style thin REST adapter (`src/lib/ln/lsp.ts`) — **not** LNbits/Alby.

| Mode | Env | Behavior |
| --- | --- | --- |
| **Mock (dev)** | `LN_LSP_BASE_URL` or `LN_LSP_API_KEY` missing | Returns `lnbc_mock_…` / `lntb_mock_…` invoices. No spend. Use **mock pay** on the board or `POST /api/bids/mock-pay`. |
| **Live** | Both `LN_LSP_BASE_URL` + `LN_LSP_API_KEY` set | `POST {base}/v1/invoices` (LND REST shape). Confirm via `POST /api/webhooks/ln` with `LN_WEBHOOK_SECRET`. Mock-pay is **403**. |

Raise mechanic: invoice amount = delta to exceed current cumulative; result ≥ `MIN_BID_SATS` (1000). On paid webhook → bump `cumulative_sats`.

`NEXT_PUBLIC_NETWORK=mainnet` for live.
