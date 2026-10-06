# NaijaBiz IQ — Build Phases

**Team:** 2 people
- **Developer (Dev):** owns all technical work
- **Partner (Biz):** non-technical; owns product content, data realism review, testing as a user, pitch and presentation

**Hackathon:** Wema Hackaholics 7.0, October 7–9, 2026

Companion to [NaijaBiz_IQ_Hackathon_Master_Build_Plan.md](NaijaBiz_IQ_Hackathon_Master_Build_Plan.md).

---

## Solo-developer adjustments

With one developer, everything runs in sequence, so the plan is simplified to protect the demo:

1. **No authentication.** A single demo business (Aisha Mini Mart) is enough for the demo.
2. **Database is optional.** The engine runs in memory from a seeded JSON dataset. Onboarding answers are kept in `localStorage`. Add Supabase only if Day 2 finishes early.
3. **Engine before UI.** All numbers come from pure TypeScript functions that can be tested without the UI.
4. **AI has a fallback.** Every AI insight has a templated version, so the demo still works if the API fails.
5. **The partner works in parallel on everything non-technical** (see the "Biz" column).

---

## Phase overview

| # | Phase | Output | Dev | Biz | When |
|---|---|---|---|---|---|
| 0 | Spec lock | One-page spec with every rule and formula decided | Writes formulas | Sanity-checks business rules | Oct 5–6 |
| 1 | Dataset | ~250 transactions plus a validation script | Builds generator | Reviews realism of narrations and amounts | Oct 6 |
| 2 | Transaction intelligence | Category and confidence for each transaction | Builds | — | Day 1 AM |
| 3 | Financial engine | Monthly metrics, trends, balance | Builds | — | Day 1 AM |
| 4 | Intelligence layer | Health Score, forecast, recommendations, readiness | Builds | Writes recommendation wording | Day 1 PM |
| 5 | Decision simulator | "Can I Afford This?" | Builds | Writes verdict wording | Day 1 PM |
| 6 | AI insight layer | LLM explanations plus templated fallback | Builds | Reviews tone and plain language | Day 2 AM |
| 7 | App foundation | Next.js shell, onboarding, simulated Wema connection | Builds | — | Day 2 AM |
| 8 | UI screens | The 10 demo screens | Builds | Tests the flow as "Aisha" | Day 2 PM |
| 9 | Testing and hardening | Verified numbers, deployment, backups | Fixes | Runs the demo repeatedly and logs issues | Day 3 AM |
| 10 | Pitch and demo | Deck, script, rehearsals | Supports demo | **Owns** | Oct 6 → Day 3 |

> **Check the hackathon rules.** If code written before October 7 is not allowed, Phase 0 stays as a written spec, and the Phase 1 generator moves to the start of Day 1. Everything else shifts by about half a day, so cut from the "Cut list" below.

---

## Phase 0 — Spec lock

**Goal:** every demo number traces back to a written rule.

**Status: ✅ Done.** See [SPEC.md](SPEC.md).

Decided and recorded in `SPEC.md`:
- [x] Opening balance ₦250K; cash reserve = running account balance (§3, §5)
- [x] Headline growth = last 3 months vs. previous 3 (Q3 vs. Q2); month-on-month on cards (§1)
- [x] Minimum reserve = 10 days of operating costs (≈ ₦190K); it drives the recommended range (§5, §8)
- [x] Health Score formulas and bands: expected 68 Healthy, down from 87 in June (§6)
- [x] Financial Readiness formulas and bands: expected ~78 Developing (§10)
- [x] Forecast method, 14-day horizon, risk rules: expected Medium (§7)
- [x] Affordability verdicts: ₦100K Comfortable / ₦300K Careful / ₦500K Cannot (§8)
- [x] Classification confidence thresholds: < 0.60 asks the user (§4)
- [x] Shared TypeScript types (§12)
- [ ] **Open:** confirm whether the hackathon allows code written before October 7

**Done when:** every number in the demo script follows from a formula in `SPEC.md`.

---

## Phase 1 — Dataset

**Goal:** Aisha's six months of transactions tell the planned story.

**Status: ✅ Done.** `npm run data:generate` then `npm run data:validate` (all checks pass). Details in [SPEC.md §3](SPEC.md).

- [x] Generator script ([scripts/generate-dataset.ts](scripts/generate-dataset.ts)) with a fixed seed
- [x] Exactly 247 transactions, April 1 – September 30, 2026
- [x] Revenue arrives as POS settlements (~10/month) plus customer transfers (5–6/month)
- [x] All four description-quality levels (66% / 18% / 10% / 6%)
- [x] Recurring patterns: weekly, bi-weekly and monthly suppliers, salaries, rent, electricity, internet
- [x] Hidden ground truth kept in a separate file (`data/ground-truth.json`), never bundled with the app
- [x] Opening balance ₦250K → closing ₦580K, with a running balance on every row
- [x] Validation script ([scripts/validate-dataset.ts](scripts/validate-dataset.ts))
- [x] Output: `src/data/transactions.json`, `src/data/account.json`, `public/sample/aisha-mini-mart-transactions.csv`
- [ ] **Biz:** review the narrations and amounts (open the CSV in Excel)

**Story targets:**

| Month | Revenue | Expenses | Note |
|---|---|---|---|
| April | ~₦2.2M | ~₦1.8M | Stable |
| May | ~₦2.4M | ~₦1.9M | Growing, healthy |
| June | ~₦2.6M | — | Inventory begins rising |
| July | ↑ | Inventory ↑ faster | Reserve starts shrinking |
| August | Strong | Inventory ↑ significantly | Cash tighter |
| September | ~+12% | Inventory ~+31% | Demo month: growing but under cash pressure |

**Biz task:** check that descriptions, counterparty names, amounts and charges look like a real Nigerian bank statement.

**Done when:** the validation output matches the story targets.

---

## Phase 2 — Transaction intelligence

- [x] Rule-based classifier using direction, amount, recurrence, counterparty history, channel and description keywords ([classify.ts](src/lib/engine/classify.ts), [recurrence.ts](src/lib/engine/recurrence.ts))
- [x] Confidence score per transaction, with plain-language reasons; low-confidence transactions flagged
- [x] User confirmation updates counterparty and pattern memory (`confirmCategory`; the UI will persist it in `localStorage`)
- [x] Accuracy report against ground truth (`npm run engine:classify-report`)
- [x] Tests: `npm test` (22 passing)

**Done when:** accuracy > 85% and the intended ambiguous transactions are flagged.

**Status: ✅ Done.** 97.6% accuracy, 7 flagged, 0 confident mistakes. Details in [SPEC.md §4](SPEC.md).

---

## Phase 3 — Financial engine

- [x] Revenue, expenses, net cash flow, expense ratio, cash balance, days of cover, minimum reserve ([metrics.ts](src/lib/engine/metrics.ts))
- [x] Growth: 3-month headline (total and per category); month-on-month via `monthlyMetrics` + `growth()`
- [x] Pure functions with unit tests (43 tests passing in total)
- [x] `npm run engine:report [date]` prints the demo numbers

**Done when:** engine totals exactly match the Phase 1 validation output.

**Status: ✅ Done.** Totals match exactly. Minimum reserve ₦180K. One distortion to handle in Phase 4: before review, uncategorized diesel purchases inflate fuel growth (see [SPEC.md §5](SPEC.md)).

---

## Phase 4 — Intelligence layer

- [x] Business Health Score: 5 weighted components, each with an explanation ([health.ts](src/lib/engine/health.ts))
- [x] 14-day cash forecast with risk level and a plain-language reason ([forecast.ts](src/lib/engine/forecast.ts)); dataset tuned so it lands on Medium
- [x] Recommendation rules sorted into High, Medium, Low and Info priority ([recommendations.ts](src/lib/engine/recommendations.ts))
- [x] Financial Readiness score with strengths, areas to improve and next steps ([readiness.ts](src/lib/engine/readiness.ts))
- [x] `analyze()` returns everything the app needs in one call ([index.ts](src/lib/engine/index.ts))
- [x] 66 tests passing

**Biz task:** write or approve the plain-language wording for each recommendation and readiness message. Run `npm run engine:report` to see all of it, or read [SPEC.md §9–§10](SPEC.md).

**Done when:** outputs match the spec (Health ~78 "Healthy", forecast risk "Medium").

**Status: ✅ Done.** Health 66 Healthy (84 Strong in June) · forecast Medium, lowest ₦393K on October 12 · Readiness 75 Developing.

---

## Phase 5 — "Can I Afford This?"

- [x] Inputs: amount and optional purpose (Stock / Equipment / Personal / Other)
- [x] Outputs: current cash, purchase amount, upcoming expenses, remaining buffer, verdict, recommended range, plain-language notes ([affordability.ts](src/lib/engine/affordability.ts))
- [x] Test cases: ₦500K → Cannot; ₦300K → Careful (range ₦180K–₦210K); ₦100K → Comfortable

**Done when:** all three test cases return the expected verdicts.

**Status: ✅ Done.** All three verdicts as expected; 76 tests passing. **The engine is complete** (Phases 2–5): every number in the demo now comes from tested code.

---

## Phase 6 — Insight layer

**Decision (Oct 6):** no paid LLM API for the MVP. Cut-list item 3 was applied, and the templated insights are now the primary path.

- [x] Insights built **only from verified metrics** (`InsightFacts`) ([insights.ts](src/lib/engine/insights.ts))
- [x] Plain-language templates, with the most important insight first (that one is the dashboard's key insight)
- [x] Number checker: every ₦ amount, % and number in an insight must match a fact (`checkNumbers`)
- [x] Works offline and is deterministic, so no caching or network is needed
- [ ] *(Optional, later)* plug in a free-tier LLM behind `checkNumbers`, keeping the templates as fallback

**Done when:** insights never contain a number that isn't in the metrics, and the demo works offline using the fallback.

**Status: ✅ Done.** 6 insights on the demo date, all verified; 87 tests passing.

---

## Phase 7 — App foundation

- [ ] Next.js + Tailwind project, deployed to Vercel early (Day 2 AM)
- [ ] Welcome and Business Setup screens (answers stored in `localStorage`)
- [ ] "Connect Wema Account" simulation: consent → loading → "247 transactions imported"
- [ ] CSV upload fallback

**Done when:** the connection flow loads the dataset and reaches the dashboard.

---

## Phase 8 — UI screens

Build in this order. Stop at the end of any tier if time runs out.

**Tier 1:** Dashboard → "Can I Afford This?" → Transactions (with low-confidence prompt)
**Tier 2:** Forecast → Recommendations → Insights
**Tier 3:** Financial Readiness → polish (loading, empty and error states; mobile)

**Biz task:** go through the flow as Aisha and note anything confusing or full of jargon.

**Done when:** the full demo journey runs end to end on the deployed URL.

---

## Phase 9 — Testing and hardening

- [ ] Data, classification, forecast and affordability tests pass
- [ ] Production deployment plus a second backup deployment
- [ ] Backup screenshots and a recorded demo video (in case of Wi-Fi or laptop failure)
- [ ] Definition of Done checklist (master plan, Phase 24)

**Biz task:** run the full demo at least 3 times and log every glitch.

---

## Phase 10 — Pitch and demo (owned by Biz)

Biz can start on October 6, while Dev builds:
- [ ] 10-slide deck (structure in master plan, Phase 21)
- [ ] Aisha demo script (master plan, Phase 20), updated with real numbers once Phase 4 is done
- [ ] Answers to likely judge questions: data privacy and consent, how Wema benefits, why this isn't a loan product, accuracy of classification
- [ ] At least 2 timed rehearsals together on Day 3

**Rule:** no new features on Day 3.

---

## Cut list (if time runs short, cut from the top)

1. Supabase / database persistence
2. CSV upload fallback (keep only the simulated Wema connection)
3. ~~Live LLM calls (use only the templated or cached insights)~~ **Applied in Phase 6**
4. Financial Readiness screen (mention it in the pitch instead)
5. Insights screen (merge its content into the Dashboard)
6. Learning from user corrections (keep the prompt, skip the learning)

**Never cut:** correct numbers, Dashboard, "Can I Afford This?", the Aisha story.
