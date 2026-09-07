# outbid.lol — reference findings (2026-09-05)

**Método:** secondary sources + `/rules` text from search index. Live `https://outbid.lol` (y `/rules`) respondieron Vercel Security Checkpoint / 429 desde box (curl + WebFetch). No se inventó UI no vista; features abajo son las documentadas públicamente.

## Qué es

Public pay-to-rank leaderboard: submit URL o X @handle + bid; **rank = bid**, sin score editorial, votos ni algoritmo.

## Features visibles / documentadas

- Leaderboard público ordenado por monto de bid (USD enteros)
- Listing: product website o X @handle
- Bid mínimo documentado ~$2–$5 (fuentes varían levemente); techos altos ($999,999 en una fuente)
- Subir listing existente: mismo URL/@handle, bid ≥ +$1 sobre el actual; se paga solo la diferencia
- Claim #1: bid por encima del leader (reglas publicadas: ≥ +$1 o +$5 según fuente; equal bids → orden de llegada, el más viejo queda arriba)
- Categories (fuente microsaas): boards por categoría además del main
- Post-pay: listing público; clicks al URL/profile sin query params
- Payment rail del original: card settlement (no Lightning) — rankstr is sats/Lightning only
- Rules extras citadas: no chat/invite links; no NSFW; no shorteners (se resuelve redirect); App Store/Play/GitHub keyed by path; takeover 2× #1 lockea first page 3h (una a la vez)
- Pitch: no ads, no API keys, no revenue share — pagás para estar arriba

## Explicitamente NO en el original (relevante para rankstr)

- No Lightning / onchain Bitcoin settlement en outbid.lol
- No Nostr integration en outbid.lol
- Clones BTC existen aparte (ej. btcbid.lol: sats, Lightning/onchain, 21 slots) — **no son el scope**; solo contexto de mercado

## Implicación para rankstr (sin expandir scope)

One-liner locked = mismo mechanic de pay-to-rank **abierto**, con **Lightning payments** + **Nostr**. Todo lo demás (slots cap, categories, takeover, listing types, etc.) = TBD / spec — no asumir.
