# naijabiz-iq

Naija Business IQ: financial intelligence for Nigerian small businesses, built on Wema transactions.
Built for **Wema Hackaholics 7.0** (University of Ibadan, 7–9 October 2026).

> Wema already has the transactions. NaijaBiz IQ turns those transactions into intelligence.

NaijaBiz IQ reads a business's bank transactions and tells the owner, in plain words, where the money goes, what's coming next and whether they can afford a purchase. The demo follows Aisha, who runs a mini mart in Ibadan: her sales grew 12% in three months, but her stock spending grew 31%, so her cash is shrinking.

**Prototype:** the Wema connection is simulated with a realistic 6-month demo dataset (247 transactions). No real account is accessed.

## What it does

| Feature | On the demo data |
|---|---|
| Categorizes every transaction, asks when unsure, learns from answers | 97.6% correct; 7 flagged; one answer recognizes 4 similar transactions |
| Sales, spending, cash flow, growth, minimum cash reserve | Sales +12% vs stock +31% (last 3 months) |
| Business Health Score (not a credit score) | 66 Healthy, down from 84 in June |
| 14-day cash forecast | Medium risk, lowest ≈ ₦393K around 12 Oct |
| Recommendations and plain-language insights | Every number checked against the engine |
| **Can I afford this?** | ₦300K → "You can, but be careful", safer range ₦180K–₦210K |
| Financial readiness profile (never a loan decision) | 75 Developing |
| WhatsApp alerts (Twilio sandbox, optional) | Cash alert, affordability answer, weekly summary |

The engine calculates every number; the insight layer only explains them. Works offline, mobile-first, WCAG 2.1 AA checked.

## Run it

Requires Node.js 20.9+.

```bash
npm install
npm run dev          # http://localhost:3000  (another port: npm run dev -- -p 3001)
```

For the demo, use the faster production build: `npm run build` then `npm start`. See [DEMO.md](DEMO.md) for the click-by-click demo script, reset steps and fallbacks.

### WhatsApp alerts (optional)

The Forecast, "Can I afford this?" and More screens can send the alert to WhatsApp through the free Twilio WhatsApp Sandbox. Copy [.env.example](.env.example) to `.env.local` and fill it in (setup steps in [DEMO.md](DEMO.md)). Without it, the buttons show the exact message instead. The server writes the text from the engine's numbers and only ever sends to the one number configured in `.env.local`, at most once every 20 seconds.

## Scripts

| Command | What it does |
|---|---|
| `npm test` | Unit tests (engine, classifier, forecast, affordability, insights, CSV) |
| `npm run data:generate` / `data:validate` | Regenerate / check the demo dataset |
| `npm run engine:report [date]` | Print every number the app shows (`-- --confirm-fuel` for the "after" state) |
| `npm run engine:classify-report` | Categorization accuracy against the hidden ground truth |
| `npm run smoke -- <url>` | Click through every screen in Edge on desktop, 390px and 320px |
| `npm run a11y -- <url>` | Accessibility scan of every screen (axe, WCAG 2.1 AA) |
| `npm run record-demo -- <url> desktop\|mobile` | Record a backup demo video into `demo-backup/` |

The browser scripts drive the installed Microsoft Edge and need the app running (e.g. `npx next start -p 3100`).

## Project layout

```
src/lib/engine/   classification, metrics, health, forecast, recommendations, readiness, affordability, insights
src/app/          Next.js 16 screens (welcome, setup, connect, dashboard, transactions, afford, forecast, …)
src/app/api/      server route for WhatsApp alerts (src/lib/alerts.ts writes them, src/lib/twilio.ts sends them)
src/data/         demo account + 247 transactions (generated)
data/             hidden ground truth for tests (never bundled into the app)
scripts/          dataset generator/validator, reports, smoke, a11y, demo recorder
brand/            brand guide, NaijaBiz IQ logo, official Wema logos (unmodified)
pitch/            pitch deck (PowerPoint)
```

## Docs

- [PHASES.md](PHASES.md): build plan and status
- [SPEC.md](SPEC.md): every rule and formula behind the numbers
- [DEMO.md](DEMO.md): demo-day runbook and judge Q&A
- [brand/BRAND.md](brand/BRAND.md): colours, fonts, logo rules
