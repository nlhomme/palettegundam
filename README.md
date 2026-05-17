# Palette Gundam

Harmony-driven character palette generator. Like Coolors, but built around the case where you need a palette **per character** plus one for the **background**, all colors tied together by a single master harmony. Exports straight to ProCreate `.swatches`.

Pure HTML/CSS/vanilla JS. Runs on a Cloudflare Worker.

---

## What it does

- **Background palette** anchors the composition (1 to 5 swatches; default 1).
- **Character palettes** are generated as harmonic offshoots of the background's dominant hue. Add as many as you need.
- Each character palette has **5 semantic slots** in fixed order:
  1. **Skin** — realistic gamut (occasionally stylized non-human: green / blue / lavender), nudged in temperature against the background.
  2. **Hair** — weighted across brown, blonde, auburn, grey, plus stylized hues.
  3. **Main** — the character's harmonic hue at high saturation.
  4. **Secondary** — analogous shift of Main, or a shade/tint.
  5. **Accent** — complement of Main, punchy.
- **7 master harmonies** + `Auto`: monochromatic, analogous, complementary, split-complementary, triadic, tetradic, square. Character hues are auto-distributed across the harmony's spokes.
- **Two regeneration scopes**: global "Regenerate all" (Space / FAB) and per-palette reroll.
- **Per-swatch**: lock, edit hex, drag-reorder, tap to copy.
- **Bilingual UI**: French / English, auto-detected from the browser, toggleable.
- **Exports**: ProCreate `.swatches` (per palette or zipped bundle), PNG preview, CSS variables, JSON.
- **Shareable short URL** via a Cloudflare KV-backed `/api/share` endpoint. Full state also lives in the URL hash, so reload preserves everything.

---

## Keyboard shortcuts (desktop)

| Key                 | Action                      |
| ------------------- | --------------------------- |
| `Space`             | Regenerate all palettes     |
| `L` (over a swatch) | Toggle lock                 |
| `C` (over a swatch) | Copy hex to clipboard       |

---

## Getting started

### Prerequisites

- Node.js 18+ (Wrangler requirement)
- A Cloudflare account if you want to deploy

### Install

```bash
npm install
```

### Local dev

```bash
npm run dev
```

This runs `wrangler dev` with Miniflare's local KV emulation; no Cloudflare account or KV namespace is needed for local development. Open <http://localhost:8787>.

### Deploy

1. Create the KV namespace once:

   ```bash
   npx wrangler kv namespace create PALETTES
   ```

   Paste the returned `id` into `wrangler.toml` in place of `REPLACE_WITH_KV_ID`.

2. Deploy:

   ```bash
   npm run deploy
   ```

---

## Architecture

```text
palettegundam/
├── public/                   # static assets, served via Workers ASSETS binding
│   ├── index.html
│   ├── styles.css
│   ├── favicon.svg
│   └── js/
│       ├── main.js           # boot: parse URL, install state, mount UI
│       ├── i18n.js           # English / French translations
│       ├── state.js          # AppState + URL-hash encode/decode + share client
│       ├── color.js          # HSL / HSV / RGB / HEX conversions
│       ├── harmony.js        # 7 harmonies, hue-offset distribution
│       ├── generator.js      # palette generation, lock-aware, semantic slots
│       ├── zip.js            # minimal STORE ZIP writer (vanilla, no deps)
│       ├── exporters.js      # ProCreate / PNG / CSS / JSON
│       └── ui.js             # rendering, swatch interactions, DnD
└── worker/
    └── index.js              # fetch handler: /api/share + ASSETS fallthrough
```

No frameworks, no bundler. Modules load directly via `<script type="module">`.

---

## How harmony works

The background's dominant hue is the master anchor. The selected harmony defines a set of hue "spokes" relative to that anchor:

| Harmony             | Character hue spokes (deg from anchor)  |
| ------------------- | --------------------------------------- |
| Monochromatic       | 0 (saturation/lightness variation only) |
| Analogous           | ±30, ±60, ...                           |
| Complementary       | 180                                     |
| Split-complementary | 150, 210                                |
| Triadic             | 120, 240                                |
| Tetradic            | 60, 180, 240                            |
| Square              | 90, 180, 270                            |

Each character palette claims one spoke as its "Main" hue, with the remaining slots derived from it. When there are more characters than spokes, additional characters drift analogously from already-claimed spokes (±20° steps) to stay on theme.

Locking the **Main** swatch (slot 3) of a character anchors its harmonic placement during a global regeneration. Locking any other slot just preserves that color.

---

## ProCreate `.swatches` format

A `.swatches` file is a ZIP archive containing a single `Swatches.json`:

```json
{
  "name": "Character 1",
  "swatches": [
    { "hue": 0.135, "saturation": 0.70, "brightness": 0.50, "alpha": 1, "colorSpace": 0 }
  ]
}
```

- H/S/V are floats in `[0, 1]`.
- `colorSpace: 0` is sRGB; `alpha: 1` always.
- ProCreate caps each palette at 30 swatches (we use up to 5).

The ZIP is built in vanilla JS (`public/js/zip.js`, STORE-only, ~70 lines).

---

## Share short links

- `POST /api/share` accepts the state JSON, generates a 7-character base32 code, stores under that key in KV with a 90-day TTL, returns `{ code }`.
- `GET /api/share/:code` returns the stored state.
- The frontend then strips `?s=<code>` and rewrites it into a self-contained `#<hash>` URL, so the share link works even if KV ever loses the entry.

Codes use a confusable-character-free alphabet (`abcdefghijkmnpqrstuvwxyz23456789`).

---

## Persistence

- **Palette state**: lives only in the URL (hash or shared short code). Nothing about your palettes is saved locally.
- **Language preference**: persisted in `localStorage` as `pg.lang` so the manual toggle survives reloads. No other use of `localStorage`.

---

## License

GPL-3.0. See `LICENSE`.
