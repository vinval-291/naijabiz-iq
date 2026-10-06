# Demo-day runbook

For whoever runs the NaijaBiz IQ demo. Numbers below are what the app shows; they're the same every time.

## Before you present

1. **Start the app** (in the project folder):
   ```
   npm run build
   npm start
   ```
   Open **http://localhost:3000**. Use `npm start` (production) rather than `npm run dev` for the demo: it's faster and has no developer badges.
   If `npm` isn't found, use `npm.cmd` instead, or restart VS Code.
2. **Reset to a fresh start:** in the app, open **More → Disconnect and start over** (on desktop: go to `/more`). Do this after every rehearsal.
3. **No internet needed.** Everything, including fonts, runs from the laptop.
4. Close other tabs; turn off notifications; zoom the browser to 100–125% so the back row can read it.

## The demo (about 3 minutes)

| Step | Click | Say / point at |
|---|---|---|
| 1 | Welcome page | "Meet Aisha. She runs a mini mart in Ibadan." Point at the statement card: raw bank lines → what they mean. |
| 2 | **Get started → Continue** | Business details are pre-filled. |
| 3 | **Connect Wema account → Allow and connect** | Consent: can read, can never move money. Watch the import: **247 transactions imported · 240 understood automatically · 7 need your input.** |
| 4 | **See my business** | "Aisha's revenue is growing… but something is wrong." Key insight: **sales +12%, stock +31%.** Spending ₦2.92M > sales ₦2.76M in September. Health **66**, down from **84** in June. |
| 5 | **Transactions** (or the yellow "7 transactions need your input" link) → tap a **POS PURCHASE** → **Generator fuel** | "NaijaBiz IQ learns": **"We also recognized 4 similar transactions."** 7 → 2. |
| 6 | **Forecast** | **Medium cash pressure.** Lowest about **₦393K around 12 Oct**, when supplier payments fall due. |
| 7 | **Can I afford this?** → type **300000** → **Check** | The killer moment: **"You can, but be careful."** ₦580K − ₦300K − ₦187K expected expenses = **₦93K left**, below the ₦180K reserve. Safer: **₦180K–₦210K**. Tap **Check ₦210K instead** → **"Yes, you can afford this comfortably."** |
| 8 | **Recommendations** | What to do next, each backed by a number ("Why am I seeing this?"). |
| 9 | Close | "Wema already has the transactions. NaijaBiz IQ turns those transactions into intelligence." |

## If something goes wrong

| Problem | Do this |
|---|---|
| App shows an error screen | Tap **Start over**, then reconnect (steps 2–3). |
| Laptop/app won't start | Play the backup video: `demo-backup/naijabiz-iq-demo-desktop.webm` (opens in Edge/Chrome). Screenshots of every step are in the same folder. |
| Numbers look different | Someone answered review questions already: **More → Disconnect and start over**. |
| Projector is portrait / small | Use the mobile video `demo-backup/naijabiz-iq-demo-mobile.webm`. |

To re-record the backup videos after changes: start the app with `npx next start -p 3100`, then `npm run record-demo -- http://localhost:3100 desktop` (and `mobile`).

## Likely judge questions

- **Is the Wema connection real?** No: it's a prototype with simulated data. In production Aisha connects once, with consent, and data flows continuously.
- **Is this a credit score / loan approval?** No. The Business Health Score and Financial Readiness describe her records; they never approve financing.
- **Is it AI?** The engine calculates every number and categorizes transactions from patterns (97.6% accurate on this data, and it learns from Aisha's answers). The insight layer explains those numbers in plain language, and every number in an explanation is checked against the engine. A language model can be plugged in later behind the same check.
- **How accurate is the categorization?** 97.6% on the demo data; whenever it isn't sure (7 of 247), it asks instead of guessing.
- **Privacy?** Read-only access; it can never move money. Demo data stays in the browser.
