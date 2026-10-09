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
5. **Pause OneDrive syncing** for the day (OneDrive icon → Settings → Pause syncing). It has rolled project files back once already.

## WhatsApp alerts (optional; needs internet)

Without this set-up the app still works: the WhatsApp buttons show the exact message instead of sending it.

1. **Once:** create a free Twilio account. In the Twilio Console open **Messaging → Try it out → Send a WhatsApp message** and note the join code.
2. **From the demo phone**, send `join <your code>` to **+1 415 523 8886** on WhatsApp. The opt-in lasts **3 days**, so redo it if the demo is later.
3. **On the demo laptop:** copy `.env.example` to `.env.local` and fill in the Account SID, Auth Token and the demo phone's number (`whatsapp:+234…`). Never commit or share `.env.local`. Restart the app.
4. **Check:** the app's **More** screen (desktop: **Alerts & account**) should say *Connected: alerts go to •••• 1234*.
5. **Within 24 hours of presenting**, send `hi` to the sandbox number from the demo phone, then press **Send my weekly summary** once as a test. If it shows *WhatsApp preview* instead of ✓ *Sent*, the small grey note under the message tells you what to fix (not joined, 24-hour window, wrong keys).

**Current status (9 Oct):** this Twilio account is on the newer trial, which only allows Twilio's ready-made templates (error 21654), so live sending needs an upgraded account. For the demo, rename `.env.local` to `.env.local.off` and restart: the buttons then show the preview straight away. Rename it back after upgrading.

The free trial includes 100 WhatsApp messages. The app sends at most one every 20 seconds and only ever to the number in `.env.local`.

## The demo (about 3 minutes)

| Step | Click | Say / point at |
|---|---|---|
| 1 | Welcome page | "Meet Aisha. She runs a mini mart in Ibadan." Point at the statement card: raw bank lines → what they mean. |
| 2 | **Get started → Continue** | Business details are pre-filled. |
| 3 | **Connect Wema account → Allow and connect** | Consent: can read, can never move money. Watch the import: **247 transactions imported · 240 understood automatically · 7 need your input.** |
| 4 | **See my business** | "Aisha's revenue is growing… but something is wrong." Key insight: **sales +12%, stock +31%.** In plain words: *"In September you earned ₦2.76M and spent ₦2.92M. That's ₦160K more than you earned."* Health **66**, down from **84** in June. |
| 4b | Flip the switch to **In-depth** (sidebar on desktop, top bar on mobile) | "Aisha sees plain sentences. If she, or her bank, wants the detail, it's one tap away": stat tiles, the 6-month chart, every part of the Health Score. Flip back to **Simple**. |
| 5 | **Transactions** (or the yellow "7 transactions need your input" link) → tap a **POS PURCHASE** → **Generator fuel** | "NaijaBiz IQ learns": **"We also recognized 4 similar transactions."** 7 → 2. |
| 6 | **Forecast** | **Medium cash pressure.** Lowest about **₦393K around 12 Oct**, when supplier payments fall due. |
| 6b | **Send this alert to my WhatsApp** (optional) | "NaijaBiz IQ doesn't wait for Aisha to open the app." With live sending: hold up the phone as the alert arrives. With the preview: "This is the alert Aisha receives on WhatsApp. It's wired to Twilio; the free trial only allows template messages, so live sending switches on with a paid account." |
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
- **Is it AI? What kind?** See *How the intelligence works* below. Short version: *"Explainable AI: statistical and rule-based models that classify, forecast and recommend, and learn from feedback. We chose them over a black-box chatbot so every number is calculated, never generated, and a bank can audit why the app said something."*
- **How accurate is the categorization?** 97.6% on the demo data; whenever it isn't sure (7 of 247), it asks instead of guessing.
- **Privacy?** Read-only access; it can never move money. Demo data stays in the browser.
- **Isn't this too much data for a shop owner?** The app opens in **Simple** mode: plain sentences, one key number each. **In-depth** is one tap away for owners, accountants or bank staff who want the statistics.
- **Why WhatsApp, not SMS?** Most small business owners already use WhatsApp, and Nigerian SMS has Do-Not-Disturb filtering and sender-ID registration that can silently drop finance messages. The alert text is written by the engine, so the same message can go to SMS or USSD later.
- **Does WhatsApp actually send?** It's wired to Twilio. Twilio's free trial only allows its own template messages, so in the demo we show the exact alert Aisha receives; live sending switches on with a paid Twilio account, with no code changes.

## How the intelligence works

There is **no ChatGPT-style model (LLM) and no trained machine-learning model**. The intelligence is statistical and rule-based ("explainable AI"):

| Feature | How it works | Say |
|---|---|---|
| Categorizing transactions | A scoring model: each transaction collects evidence from 6 signals (description, counterparty name, counterparty history, channel, amount, timing/repetition). Most evidence wins; its strength is the confidence. Learns from Aisha's answers. | "97.6% accurate, never confidently wrong, and it asks when unsure. Answer once and it recognizes similar ones." |
| 14-day forecast | Statistical time-series: detects regular payments from the gaps between them and how stable the amounts are, then projects the balance day by day from the last 4 weeks plus scheduled payments. Risk is measured against a 10-day safety reserve. | "It knows Adebayo is paid every Monday and Kolawole every second Friday, so it can see the 12 October dip coming." |
| Health Score, Readiness | Weighted scoring models with a written reason for each part. | "Every score shows why." |
| Recommendations | A rule-based expert system; each rule fires on a measured signal and shows that number. | "Tap 'Why am I seeing this?' and you see the number behind it." |
| Plain-English insights | Template-based language generation, with a checker that rejects any number not produced by the engine. | "It can't make up a figure." |

**If pushed ("so is it really AI?"):** *"It's AI in the decision-intelligence sense: it classifies, forecasts and recommends from data, and learns from feedback. It isn't a chatbot. With real Wema data, the next step is machine-learning models trained across many businesses, and an LLM for conversation behind the same number-checker."*

**Don't claim** machine learning, neural networks or "LLM/ChatGPT-powered". A technical judge may ask to see the model.

## Features we plan to add (if asked "what's next?")

| Feature | Status | Answer |
|---|---|---|
| WhatsApp alerts | **Built** (live sending needs a paid Twilio account) | "Aisha hears about cash problems before they happen, in the app she already uses." |
| Simple / in-depth modes | **Built** | "Plain sentences first; the full analysis is one tap away." |
| USSD (e.g. `*945*IQ#`) | Next | "For owners without a smartphone or data: the same engine behind a USSD menu, via a gateway such as Africa's Talking." |
| Live Wema connection | Next | "With consent, Aisha connects once and her data stays up to date." |
| Machine learning on real data | Next | "Models trained across thousands of businesses, learning patterns no single shop shows." |
| Ask NaijaBiz IQ (chat) | Later | "Questions in plain language, answered by an LLM that can only quote the engine's numbers." |
| Local languages (Pidgin, Yoruba, Hausa, Igbo) | Later | "The same insights in the language the owner thinks in." |
| Supplier and stock insights, scenario planning | Later | "Can I afford to hire someone? Which supplier terms would ease my cash?" |
| Responsible financing pathways | Later | "Readiness shows healthy habits; a Wema officer decides. Never automatic approval." |
