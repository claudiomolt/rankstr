# DESIGN.md — rankstr

> **Not in force on the public UI (2026-09-09).** Agustin rejected the Basalt / vermilion / brass
> look for the public product and directed that it be a visual clone of outbid.lol instead. The
> tokens and components below are kept for reference and for any non-public surface; the shipped
> system is documented in [`../docs/outbid-reference.md`](../docs/outbid-reference.md).

**Status:** **ready-for-dev** · Agustin last-yes DEV 2026-09-07. Canva/vault canonical still gated  
**Direction:** Basalt / vermilion / brass (Precision Instrument / Signal Rail)  
**Source pick:** `options/model-gpt-cursor/` · GPT engine  
**Owner:** Studio · PO: rankstr · Domain: rankstr.io

## Intent / thesis
Open pay-to-rank index for Bitcoin + Nostr projects. Rank = bid. Lightning settles. Instrument board, not casino, not algo feed.

## Themes (light + dark)
Semantic pairs — same hue identity; light deepens accents for contrast on bone paper.

| Role | Dark | Light |
|---|---|---|
| void | `#0D0C0B` | `#F4EFE6` |
| basalt | `#181613` | `#EBE4D8` |
| plate | `#24211D` | `#FFFFFF` |
| rule | `#3B3630` | `#D2C8B6` |
| chalk (ink) | `#F2EEE4` | `#181613` |
| muted | `#AAA298` | `#6B645A` |
| vermilion | `#FF4533` | `#E03A2A` |
| brass | `#F2C94C` | `#A67F12` (fill may stay `#F2C94C`) |
| frost | `#B9DCE8` | `#4F6F7C` |

Switch: `data-theme="dark"` | `"light"` in `tokens.css`.

## Typography
| Role | Family | Use |
|---|---|---|
| Display | **Saira Condensed** 600–700 | wordmark, urgency headlines |
| Body | **Public Sans** 400–700 | UI |
| Mono | **IBM Plex Mono** 500–600 | ranks, sats, stamps |

## Color rules
- Vermilion = climb / bid / signal rail / CTA
- Brass = rank value / `#01`
- Frost = info / npub / stamps (never casino green)
- One loud accent per view (vermilion OR brass emphasis)
- Never La Crypta / LaWallet / VEINTIUNO hex as identity

## Spacing / radius / elevation
- Radius: **0** (sharp instrument) — optional 2px only on tiny stamps
- Borders: 1px `rule`; left rail 3px vermilion on live boards
- Elevation: plate on basalt; no soft shadow glow

## Logo / mark
- Wordmark: lowercase **rankstr** + vermilion square terminal
- Compact: plate square + left vermilion rail + brass tick
- Clearspace / min-size: TBD post last-yes (do not invent cm/px)

## Voice
- Lowercase product. Instrumental, precise, urgent without hype.
- Standout: “Live signal board. Powered by sats.”
- Bitcoin-only public copy.

## Graphic elements
- Signal rail (vertical vermilion)
- Stamp states (`LIVE` / `OPEN` / `CLIMBING`) in mono + frost
- Brass underline / tick under leader sats
- Left tick rail (instrument scale)

## Anti-patterns
- No sibling brand tokens/marks/voice
- No invented metrics/claims
- No dark-only kit
- Live CSS / extractors = drift evidence only

## Drift
This file + `tokens.yaml` win until last-yes revises them. Canva/vault Knowledge only after last-yes.
