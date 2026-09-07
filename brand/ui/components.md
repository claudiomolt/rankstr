# rankstr · component map (Dev handoff)

**Status:** ready-for-dev · Agustin last-yes DEV 2026-09-07 · Canva/vault still gated  
**Tokens:** `globals.css` (shadcn HSL + `--rs-*` hex) · `tokens.yaml` / `tokens.css` win  
**Radius:** `0` (`--radius: 0rem`) · instrument feel  
**Fonts:** `--font-display` Saira Condensed · `--font-body` Public Sans · `--font-mono` IBM Plex Mono

Theme switch: `.dark` / `[data-theme="dark"]` or `[data-theme="light"]` on `<html>`.

## Semantic ↔ brand map

| shadcn var | Brand role | Dark | Light |
|---|---|---|---|
| `--primary` | vermilion CTA / climb | `--rs-vermilion` #FF4533 | #E03A2A |
| `--accent` | brass rank value | `--rs-brass` #F2C94C | #A67F12 |
| `--background` | void stage | `--rs-void` | bone paper |
| `--card` | plate | `--rs-plate` | white |
| `--secondary` / `--muted` | basalt / plate fill | `--rs-basalt` / plate | soft plate |
| `--border` / `--input` | rule | `--rs-rule` | #D2C8B6 |
| `--foreground` | chalk ink | `--rs-chalk` | basalt ink |
| `--muted-foreground` | muted meta | `--rs-muted` | #6B645A |
| `--destructive` | danger (= vermilion) | `--rs-danger` | same hue |

Extra brand-only (no shadcn default): `--rs-frost`, `--rs-brass-fill`, `--rs-elevated`, `--rs-faint`.

## Primitive → token usage

### Button
| Variant | Background | Text | Border |
|---|---|---|---|
| primary | `--rs-vermilion` / `--primary` | chalk-on-vermilion `#FFF2EC` (on-accent only; not a brand fill) | `--rs-vermilion` |
| secondary | `--rs-plate` / `--secondary` | `--rs-chalk` | `--rs-rule` |
| ghost | transparent | `--rs-chalk` | transparent → rule on hover |
| destructive | transparent | `--rs-danger` | `--rs-danger` |

shadcn: `Button` variants `default|secondary|ghost|destructive`. Keep `rounded-none`.

### Badge / stamp
| State | Color | Notes |
|---|---|---|
| LIVE | `--rs-frost` border+text | mono uppercase |
| OPEN | `--rs-muted` | quieter |
| CLIMBING | `--rs-vermilion` | climb signal |
| rank `#01` | `--rs-brass` border+text | brass value; fill tick may use `--rs-brass-fill` |

### Card / plate row
- Surface: `--rs-plate` + 1px `--rs-rule`
- Live board: **left rail 3px `--rs-vermilion`**
- Title: display font / chalk; body muted

### Input
- BG `--rs-basalt`; text `--rs-chalk`; border `--rs-rule`
- Focus: border `--rs-vermilion` + inset 3px vermilion rail
- Placeholder: `--rs-faint`
- Mono for sats amounts

### Table / leaderboard
- Container: plate + vermilion left rail
- Head: basalt bg, faint mono labels
- Rank `#01`: `--rs-brass`; other ranks: `--rs-frost`
- Project name: body bold chalk; meta: frost mono (npub/url)
- Bid: vermilion mono; brass underline tick on leader (`--rs-brass-fill`)

### Tabs
- Inactive: `--rs-muted`; active chalk + 2px bottom `--rs-vermilion`
- Rule line: `--rs-rule`

### Dialog
- Backdrop: `--rs-basalt` + rule
- Shell: `--rs-plate` + vermilion left rail
- Actions: ghost + primary buttons

### Header (app chrome)
- Basalt bar, rule border, vermilion left rail
- Wordmark lowercase + vermilion square
- LIVE stamp frost; primary CTA Climb rank

### Bid CTA
- Plate + vermilion rail; brass for current rank value; frost meta lines; primary Pay & climb

### Empty state
- Dashed `--rs-rule` on basalt; display headline; muted body; primary CTA

## Pieces → eng components

| Piece file | Suggested shadcn / custom |
|---|---|
| `pieces/header.html` | custom `AppHeader` + `Badge` + `Button` |
| `pieces/leaderboard-row.html` | `TableRow` / custom `BoardRow` |
| `pieces/rank-badge.html` | `Badge` variants |
| `pieces/bid-cta.html` | `Card` + `Input` + `Button` |
| `pieces/empty-state.html` | custom empty + `Button` |

## Preview
Open `brand/ui/preview.html` — dark/light toggle shows leaderboard chrome + bid flow + primitives.

## Do not
- Invent hex outside `tokens.yaml`
- Soft radius / glow shadows
- Sibling desk colors (La Crypta / LaWallet / VEINTIUNO)
- Non-Bitcoin chain marks in UI copy
