# NaijaBiz IQ — Brand Guide

Visual identity for NaijaBiz IQ, built on Wema Bank's brand. Open [preview.html](preview.html) in a browser to see everything rendered.

**Source:** colors, fonts and logos were taken from Wema Bank's live website (wemabank.com: its stylesheet, favicon and logo asset) on October 5, 2026. Wema does not publish a public brand-guidelines document, so these are the values its site actually uses. Colors marked *derived* were added by us for app states and are not Wema colors.

---

## Logos

| File | Use |
|---|---|
| `naijabiz-iq-logo.svg` | Main logo on light backgrounds |
| `naijabiz-iq-logo-dark.svg` | Main logo on dark/purple backgrounds |
| `naijabiz-iq-mark.svg` | App icon, favicon, small spaces |
| `naijabiz-iq-mark-mono.svg` | Icon on a purple background |
| `wema/wema-logo-full.svg` | Official Wema Bank logo (unmodified) |
| `wema/wema-mark.svg` | Official Wema "W" mark (unmodified) |

**NaijaBiz IQ mark:** three rising bars (growth, cash flow) and a teal dot (the "insight"), on a Wema-purple rounded square. The rounded strokes echo the rounded line style of Wema's W.

**Wema logo rules:**
- Use the Wema logo **as-is**. Never recolor, stretch, crop or combine it with our mark.
- Use it only where we're referring to Wema: "Connect Wema Account", "Built for Wema Hackaholics 7.0", the pitch title slide, the ecosystem slide.
- Keep a vertical divider and "Built for" between the two logos (see the lockup in the preview).

**Note:** the wordmark SVGs use live text, so they need the **Outfit** font loaded on the page. In the app, render the logo as the mark SVG followed by HTML text.

---

## Colors

### Wema brand colors (from wemabank.com)

| Token | Hex | Use |
|---|---|---|
| `purple-600` (primary) | `#981D87` | Primary buttons, links, active nav, key highlights |
| `purple-500` | `#A83595` | Wema full-logo fill; hover on light surfaces |
| `magenta` | `#AD1E9B` | Focus rings / outlines |
| `orchid` | `#B13AAC` | Gradient start |
| `plum-900` | `#3B1439` | Dark surfaces, hero backgrounds, gradient end |
| `aubergine` | `#4F2356` | Dark overlays |
| `indigo` | `#411E83` | Alternate gradient end |
| `tint` | `#FFF4FF` | Light purple background (selected rows, callouts) |
| `teal` | `#33CBB0` | Accent (Wema uses it in a teal→purple gradient) |
| `red` | `#E8323E` | Alerts / danger fills |
| `red-dark` | `#AC2932` | Danger text |
| `ink` | `#111928` | Body text, headings |
| `grey` | `#858A8B` | Secondary text |
| `border` | `#D1D5DB` | Dividers, input borders |
| `surface` | `#F7F7F8` | Input backgrounds, cards on white |

### App status colors (derived)

Each status has a fill color for chips and bars, and a darker text color that meets WCAG AA (4.5:1) on white.

| Status | Fill | Text | Used for |
|---|---|---|---|
| Positive | `#33CBB0` | `#0B7A66` *(derived)* | Growth up, "Comfortable", Healthy |
| Caution | `#FFD42D` | `#8A5A00` *(derived)* | Medium risk, "You can, but be careful" |
| Danger | `#E8323E` | `#AC2932` | High risk, "Cannot safely afford" |

**Rules:**
- Purple is the brand color, not a status color. Never use purple to mean "good" or "bad".
- Always pair a status color with a word or icon (↑, ⚠), never color alone.
- Teal on white is decorative only. Use `#0B7A66` for teal text.

### Gradients (from wemabank.com)

```css
--gradient-hero:  linear-gradient(137deg, #B13AAC 6%, #3B1439 90%);
--gradient-brand: linear-gradient(137deg, #33CBB0 6%, #981D87 90%);
```

Use gradients only for the Welcome screen hero and the pitch deck, not on dashboard cards.

---

## Typography

Wema's site uses **Inter** for body text, with **Outfit** and **Inter Tight** for display text. All three are free on Google Fonts.

| Role | Font | Weight | Size |
|---|---|---|---|
| Display / page titles | Outfit | 600 | 28–40px |
| Section headings | Outfit | 600 | 18–22px |
| Body | Inter | 400 | 14–16px |
| Labels / table headers | Inter | 500 | 12–14px |
| Money and metrics | Inter, `font-feature-settings: "tnum"` | 600 | 24–36px |

- Use **tabular numerals** (`tnum`) for all amounts so figures line up in tables and charts.
- Currency format: `₦2,450,000`; on compact cards `₦2.45M` / `₦580K`.

```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
```

---

## Tailwind config

```ts
// tailwind.config.ts → theme.extend
colors: {
  brand: {
    DEFAULT: "#981D87", 500: "#A83595", magenta: "#AD1E9B", orchid: "#B13AAC",
    plum: "#3B1439", aubergine: "#4F2356", indigo: "#411E83", tint: "#FFF4FF",
  },
  ink: "#111928",
  muted: "#858A8B",
  line: "#D1D5DB",
  surface: "#F7F7F8",
  positive: { DEFAULT: "#33CBB0", text: "#0B7A66" },
  caution:  { DEFAULT: "#FFD42D", text: "#8A5A00" },
  danger:   { DEFAULT: "#E8323E", text: "#AC2932" },
},
fontFamily: {
  display: ["Outfit", "Inter", "sans-serif"],
  sans: ["Inter", "sans-serif"],
},
borderRadius: { card: "16px", input: "8px" },
```

**Shapes and spacing (matching wemabank.com):** inputs 52px tall, 8px radius, `#F7F7F8` background with no border; cards 16px radius; labels 14px / 500 weight in `ink`.

---

## Voice

Plain, warm and direct, as if a trusted adviser were talking to Aisha. See master plan, Phase 16.

- ✅ "You may have less cash available later this month."
- ❌ "Projected liquidity stress detected."
