# rankstr UI handoff (shadcn-ready)

**Status:** ready-for-dev · Agustin last-yes DEV 2026-09-07 · Canva/vault still gated

1. In the app repo: `npx shadcn@latest init` (cssVariables: true).
2. Replace semantic vars in your `globals.css` with `brand/ui/globals.css` (`:root` = light, `.dark` / `[data-theme="dark"]` = dark).
3. Merge `tailwind.preset.ts` into Tailwind config (or preset).
4. Keep `components.json` as reference for style + cssVariables.
5. Skin first: Button, Badge, Card, Input, Table, Tabs, Dialog — map in `components.md`.
6. Product chrome: open `preview.html` (leaderboard + bid flow, dark/light). Snippets in `pieces/`.

Studio owns tokens. Eng wires the repo. No new hex outside `tokens.yaml`.
