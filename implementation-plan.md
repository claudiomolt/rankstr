# rankstr — Implementation plan (MVP)

**Status:** PO ACK · repo live claudiomolt/rankstr · P0 GO 2026-09-07
**Build:** Cloud Agents GPT → Opus (CloudAgent blocked until Cursor GitHub can access repo)

## 0. Status

1. DONE public https://github.com/claudiomolt/rankstr
2. CloudAgent: blocked — Cursor GitHub account cannot access this repo (MCP write OK)
3. Secrets later: LSP keys, DATABASE_URL, webhook secret

## Phases

### P0 — Repo bootstrap (GPT)
Next.js App Router + TS · wire brand/ui · CI · README · spec on repo

### P1 — Data model
Postgres: listings, bids, active_index_entries

### P2 — Leaderboard + rules + index UI
/, /rules, /active · theme toggle · seed data

### P3 — Lightning bid flow
LSP invoices · raise delta · webhook

### P4 — Nostr read
Optional profile fetch by npub

### P5 — Opus harden + tests

### P6 — Preview + QA (prod gated)

## Brand source
brand/ui/ — globals.css, components.md, pieces/, tokens

Bitcoin-only. No invent scope.
