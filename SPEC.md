# NaijaBiz IQ — Engine Specification (Phase 0)

This is the single source of truth for every number the app shows. If a number appears in the demo, its formula is in this file.

- **Status:** locked for build. Change this file first, then the code.
- **Plan files:** [PHASES.md](PHASES.md), [NaijaBiz_IQ_Hackathon_Master_Build_Plan.md](NaijaBiz_IQ_Hackathon_Master_Build_Plan.md)

---

## 1. Global conventions

| Item | Decision |
|---|---|
| Currency | Nigerian naira, stored as **integers** (no kobo) |
| Dataset period | April 1 – September 30, 2026 |
| Demo "today" (`asOf`) | **September 30, 2026** (end of day). The app never uses the system clock. |
| Forecast horizon | October 1 – 14, 2026 (14 days) |
| Months | Calendar months |
| Headline growth period | **Last 3 complete months vs. the 3 before** (Q3: Jul–Sep vs. Q2: Apr–Jun) |
| Month-on-month | Shown on dashboard cards (September vs. August) |
| Display rounding | Money: `₦2,760,000` in tables, `₦2.76M` / `₦580K` on cards. Percentages: 1 decimal place in the facts payload, whole numbers in the UI |
| Engine style | Pure TypeScript functions. Every function takes `(transactions, asOf)` and never reads the clock or the network |

All engine functions take `asOf`, so the same code can compute **past** scores (for example, Health as of June 30) for the trend line.

---

## 2. Categories

| Category | Direction | Counts as | User prompt label |
|---|---|---|---|
| `SALES` | credit | Revenue | — |
| `OTHER_INFLOW` | credit | Cash only (not revenue) | — |
| `INVENTORY` | debit | Expense | Stock |
| `SALARIES` | debit | Expense | Salary |
| `RENT` | debit | Expense | Rent |
| `ELECTRICITY` | debit | Expense | Utilities |
| `GENERATOR_FUEL` | debit | Expense | Utilities |
| `INTERNET` | debit | Expense | Utilities |
| `TRANSPORT` | debit | Expense | Transport |
| `BANK_CHARGES` | debit | Expense | Other |
| `CASH_WITHDRAWAL` | debit | Expense | Business withdrawal |
| `MISC` | debit | Expense | Other |
| `UNCATEGORIZED` | either | Expense (debit) / cash only (credit) | — |

**Rules:**
- **Revenue** = sum of `SALES` credits in the period.
- **Expenses** = sum of all debits in the period.
- **Operating costs** = expenses excluding `INVENTORY`.
- Cash withdrawals count as expenses because, in this business, cash is used for petty business spending.
- Internal transfers and loans are **not in the dataset**. This keeps the meaning of "expense" simple for the MVP.
- `BANK_CHARGES` includes POS charges, SMS alerts, account maintenance and the ₦50 Electronic Money Transfer Levy (EMTL).

---

## 3. Dataset targets (Phase 1)

| Item | Target |
|---|---|
| Total transactions | **Exactly 247** (matches the "247 transactions imported" demo line) |
| Opening balance (April 1) | **₦250,000** |
| Closing balance (September 30) | **₦580,000** (±₦10K) |
| Random seed | Fixed. The generator produces identical output on every run. |

### Monthly targets (₦ thousands, tolerance ±3% per figure)

| Month | Revenue | Inventory | Operating costs | Total expenses | Net cash flow | Closing balance |
|---|---:|---:|---:|---:|---:|---:|
| Apr | 2,200 | 1,500 | 530 | 2,030 | +170 | 420 |
| May | 2,400 | 1,640 | 530 | 2,170 | +230 | 650 |
| Jun | 2,600 | 1,870 | 530 | 2,400 | +200 | 850 |
| Jul | 2,620 | 2,020 | 590 | 2,610 | +10 | 860 |
| Aug | 2,680 | 2,210 | 590 | 2,800 | −120 | 740 |
| Sep | 2,760 | 2,330 | 590 | 2,920 | −160 | 580 |

**Resulting headline facts (Q3 vs. Q2):**
- Revenue **+11.9%** (₦7.20M → ₦8.06M)
- Inventory spending **+30.9%** (₦5.01M → ₦6.56M)
- Total expenses **+26.2%**
- Cash balance **−21.6%** in September (₦740K → ₦580K), down from a peak of ₦860K in July

**Story:** Aisha's sales are growing, but she's buying stock faster than she sells it, so cash is shrinking. Operating costs rise in Q3 mainly because diesel and transport get more expensive.

### Monthly operating costs (approximate, ₦)

| Item | Q2 per month | Q3 per month | Pattern |
|---|---:|---:|---|
| Salaries (2 staff) | 130,000 | 130,000 | Two transfers on the 27th–28th |
| Rent | 120,000 | 120,000 | 1st–3rd of the month |
| Electricity (prepaid) | 45,000 | 50,000 | 2 token purchases |
| Generator fuel (diesel) | 60,000 | 95,000 | 2–3 purchases; price rise in Q3 |
| Internet / data | 15,000 | 15,000 | Around the 5th |
| Transport / logistics | 40,000 | 60,000 | Irregular |
| Bank charges | ~15,000 | ~15,000 | Monthly fees + POS charges + EMTL |
| Cash withdrawals | ~80,000 | ~80,000 | ATM / POS cash-out |
| Misc (levies, cleaning, repairs) | ~25,000 | ~25,000 | Irregular |
| **Total** | **~530,000** | **~590,000** | |

### Transaction mix (per month, about 41)

| Type | Count / month | Notes |
|---|---:|---|
| POS settlements (credit) | ~12 | Aggregated every 2–3 days; channel `POS` |
| Customer transfers (credit) | ~6 | Wholesale buyers, regular customers |
| Supplier payments (debit) | ~8 | 3 recurring suppliers + occasional one-offs |
| Fixed costs (debit) | ~6 | Salaries ×2, rent, internet, electricity ×2 |
| Fuel and transport (debit) | ~4 | |
| Bank charges (debit) | ~3 | |
| Cash withdrawals (debit) | ~2 | |

### Description quality mix (across all 247)

| Level | Example | Share |
|---|---|---:|
| 1 Clear | `SALARY SEPTEMBER - TUNDE`, `POS SETTLEMENT 29/09` | ~65% |
| 2 Moderately ambiguous | `TRF/829374829` to a repeat counterparty | ~20% |
| 3 Highly ambiguous | `TRANSFER`, `PAYMENT` | ~10% |
| 4 Missing | `—` (empty) | ~5% |

Each transaction carries a hidden `trueCategory` and `descriptionLevel` used only for testing.

*Phase 1 change:* the level 1/2 shares moved from 60/25 to 65/20. POS settlements, bank charges and ATM withdrawals are always clear on a real statement, and together they make up about 38% of rows.

### Generated dataset (Phase 1 result)

`npm run data:generate` then `npm run data:validate`. The validator passes all checks.

| Item | Result |
|---|---|
| Transactions | 247 (seed 20260931: the first seed variation where the balance stays ≥ ₦50K and the level mix is on target) |
| Closing balance | ₦580,000 exactly; lowest ₦78,328 on April 10 |
| Monthly revenue / inventory / operating costs | Exactly on target |
| Level mix | 66.0% / 17.8% / 9.7% / 6.5% |
| Category counts | SALES 90, INVENTORY 55, BANK_CHARGES 18, GENERATOR_FUEL 15, TRANSPORT 15, ELECTRICITY 12, CASH_WITHDRAWAL 12, SALARIES 12, RENT 6, INTERNET 6, MISC 6 |
| Active days (last 90) | 65 / 90 = 72% |

Files: `src/data/transactions.json` and `src/data/account.json` are bundled with the app. `data/ground-truth.json` is for tests only and must never be imported by app code. `public/sample/aisha-mini-mart-transactions.csv` is for the upload fallback.

**Recurring patterns built in:** Adebayo Provisions every Monday; Kolawole Beverages every second Friday (next on October 9); Mama Nkechi around the 8th; rent on the 1st–3rd (moved to Monday if it falls on a weekend); salaries on the 27th (moved to Friday if on a weekend); MTN data around the 5th.

---

## 4. Transaction intelligence (Phase 2)

Rule-based scoring. For each transaction, every allowed category (filtered by direction) collects evidence points from these signals:

| Signal | Example | Points |
|---|---|---:|
| Description keyword | `SALARY`, `RENT`, `DIESEL`, `IKEDC`, `POS SETTLEMENT`, `ATM` | +0.60 |
| Known counterparty (history or user-confirmed) | `ADEBAYO FOODS LTD` → INVENTORY | +0.50 (user-confirmed: +0.90) |
| Channel | `POS` credit → SALES; `ATM` debit → CASH_WITHDRAWAL | +0.40 |
| Recurrence | Same counterparty ≥ 3 times at a regular interval → that counterparty's most common category | +0.20 |
| Amount band | Debit ₦80K–₦600K by transfer → INVENTORY prior | +0.15 |
| Timing | Day 25–30, two similar debits → SALARIES; day 1–3, ~₦120K → RENT | +0.15 |

**Confidence** = `min(0.98, topScore) × (topScore / (topScore + secondScore))`, rounded to 2 decimals. If no category scores above 0, the result is `UNCATEGORIZED` with confidence 0.

| Confidence | UI treatment |
|---|---|
| ≥ 0.80 | Category shown normally |
| 0.60 – 0.79 | Shown as "Likely {category}" |
| < 0.60 | Flagged: "We couldn't confidently identify this transaction. What was this for?" |

**User confirmation:** sets the category, sets confidence to 1.0 and `userConfirmed = true`, and adds the counterparty to the known-counterparty map, so later transactions from the same counterparty score higher.

**Targets:** accuracy against `trueCategory` ≥ 85%; between 4 and 10 transactions flagged (< 0.60) in the demo dataset.

The weights above are starting values. They may be tuned in Phase 2 against the dataset, and any change is recorded here.

### Phase 2 result (implemented in `src/lib/engine/classify.ts`)

**Tuned weights:**

| Signal | Spec start | Final | Why |
|---|---:|---:|---|
| Description keyword | 0.60 | **0.80** | A clear narration such as "SALARY SEP 2026 - TUNDE" should be high-confidence on its own |
| Counterparty name keyword | — | **0.50** | Business names carry meaning ("… BEVERAGES DIST.", "IBEDC") |
| Credit → Sales (direction) | — | **0.60** | Almost all money coming into this shop is sales |
| Counterparty history | 0.50 | **0.60** | A counterparty that was consistently one category is strong evidence |
| User-confirmed pattern | — | **0.70** | Description + channel when there's no counterparty (e.g. a bare `POS PURCHASE`), applied only to amounts within ±30% |
| Others | as above | unchanged | |

**How it works:** pass 1 scores each transaction on its own. Counterparty profiles are then built from pass-1 results with confidence ≥ 0.80 (a category counts as "known" when it covers ≥ 60% of at least 2 transactions). Pass 2 adds history, recurrence and user confirmations. Every result carries plain-language `reasons`.

**Recurrence cadence matching:** the median interval must be within ±20% (at least ±2 days) of 7, 14 or 30 days. This replaces the flat ±5 days, which couldn't tell weekly from bi-weekly.

**Results** (`npm run engine:classify-report`):

| Metric | Result |
|---|---|
| Overall accuracy | **97.6%** (241/247) |
| Accuracy among transactions not flagged | **100%** (240/240) |
| Flagged for review | **7**: five bare `POS PURCHASE` diesel buys, one empty narration, one vague `TRF` |
| Confident (≥ 0.80) but wrong | **0** |

**Demo moment:** confirming one bare `POS PURCHASE` as *Generator fuel* automatically recognizes the other four. The flagged count drops from 7 to 2.

---

## 5. Financial metrics (Phase 3)

For any period P:

| Metric | Formula |
|---|---|
| `revenue` | Σ SALES credits in P |
| `otherInflows` | Σ non-SALES credits in P |
| `expenses` | Σ debits in P |
| `operatingCosts` | `expenses` − INVENTORY debits |
| `netCashFlow` | (`revenue` + `otherInflows`) − `expenses` |
| `expenseRatio` | `expenses` / `revenue` |
| `closingBalance` | Opening balance + Σ credits − Σ debits up to end of P |
| `growth(x)` | (current − previous) / previous × 100 |
| `byCategory` | Σ debits in P grouped by category |

**Derived values used across the app (as of `asOf`):**

| Value | Formula | Expected on September 30 |
|---|---|---|
| `cashBalance` | Closing balance at `asOf` | ₦580,000 |
| `avgDailyOutflow90` | Σ debits in last 90 days / 90 | ₦90,972 |
| `avgDailyOperatingCost90` | Σ operating costs in last 90 days / 90 | ₦18,083 |
| `minimumReserve` (R) | 10 × `avgDailyOperatingCost90`, rounded to the nearest ₦5,000 | **₦180,000** |
| `daysOfCashCover` | `cashBalance` / `avgDailyOutflow90` | 6.4 days |

R is the minimum cash Aisha should keep to cover 10 days of running costs (salaries, rent, fuel and so on), not counting stock. The "last 90 days" window is July 2 – September 30, so it leaves out July 1's costs; that's why R is ₦180K rather than the ₦190K first estimated.

### Phase 3 result (implemented in `src/lib/engine/metrics.ts`)

- Metrics are computed from the **classifier's** categories, not the hidden ground truth. Monthly revenue, stock, running costs, net cash flow and closing balances match the §3 targets exactly, and closing balances agree with the bank's running balance.
- **Q3 vs. Q2:** revenue +11.9%, expenses +26.2%, stock +30.9%, running costs +11.3%. Transport is up 50%, salaries flat.
- **As of June 30:** balance ₦850K, 11.8 days of cover, R = ₦165K. There's no previous quarter, so growth is `null` (shown as "not enough history").
- **"Complete month" rule:** `asOf`'s own month counts only if `asOf` is its last day.

**Known distortion from uncategorized transactions:** before Aisha answers any review questions, three Q2 diesel purchases are `UNCATEGORIZED`, so *Generator fuel* reads **+166%** (Q3 vs. Q2) instead of the true **+58%**. **Rule for Phase 4:** don't quote a category's growth (recommendation #5) when uncategorized spending is more than 3% of running costs in either period. Instead, raise "Categorize {n} transactions" to Medium priority with the reason "so we can measure your costs accurately". Once she confirms one diesel purchase, the figure corrects to about +58%.

Run `npm run engine:report` (optionally followed by a date, e.g. `2026-06-30`) to print these numbers.

---

## 6. Business Health Score (Phase 4)

All sub-scores range from 0 to 100. `clamp(x)` limits x to the range [0, 1].

| Component | Weight | Formula | Expected (Sep 30) |
|---|---:|---|---:|
| Cash-flow stability | 25% | 100 × (0.5 × positiveMonths/months + 0.5 × clamp((netMargin3m + 0.15) / 0.25)) | 57 |
| Revenue consistency | 20% | 100 − 2 × CV% of monthly revenue (up to 6 months), floored at 0 | 85 |
| Expense management | 20% | 100 × (0.5 × clamp((1.3 − expenseRatio3m) / 0.6) + 0.5 × clamp(1 − gap / 40)) | 54 |
| Cash reserve | 20% | 100 × clamp(daysOfCashCover / 10) | 64 |
| Transaction consistency | 15% | 100 × (0.5 × activeDayRatio90 + 0.5 × confidentShare) | ~82 |
| **Total** | | Weighted sum, rounded | **~67** |

*Phase 1 change:* revenue consistency uses **monthly** revenue. Weekly totals swing by about 38%, because POS settlements land every few days, so a weekly measure would punish normal settlement timing.

Where:
- `positiveMonths` / `months` = months with net cash flow > 0, out of the months available (up to 6).
- `netMargin3m` = net cash flow / revenue over the last 3 months.
- `expenseRatio3m` = expenses / revenue over the last 3 months.
- `gap` = expense growth − revenue growth, in percentage points (3m vs. previous 3m). If `gap` ≤ 0, that half scores 100. If there's no previous period, only the ratio half counts.
- CV = coefficient of variation (standard deviation / mean).
- `activeDayRatio90` = days with at least one transaction / 90.
- `confidentShare` = share of transactions with confidence ≥ 0.80 or user-confirmed.

| Band | Label |
|---|---|
| 80–100 | Strong |
| 60–79 | Healthy |
| 40–59 | Fair |
| 0–39 | Needs attention |

**Expected demo result: ~67 / 100 — Healthy**, with *Expense management* (54) and *Cash-flow stability* (57) as the weakest components.

**Score trend:** as of June 30, the same formulas give about **87 (Strong)**. Demo line: *"Aisha's Health Score fell from 87 to 68 in three months."*

The score is never described as a credit score or a loan decision.

---

## 7. Cash-flow forecast (Phase 4)

A daily projection from `asOf` + 1 day through `asOf` + 14 days.

1. **Recurring series detection** (over the full history): same counterparty (or same normalized description), at least 3 occurrences, median interval within ±5 days of 7, 14 or 30 days, and amount CV < 25%. Next due date = last date + median interval. Amount = median of the last 3 payments.
2. **Expected daily inflow** = average daily SALES over the last 28 days.
3. **Expected daily variable outflow** = average daily debits over the last 28 days, **excluding** transactions that belong to a recurring series.
4. **Projected balance** on day d = `cashBalance` + Σ (daily inflow − daily variable outflow − recurring payments due that day).

**Outputs:** expected inflows, expected outflows, projected balance on day 14, projected **lowest balance** and its date, the list of scheduled payments in the window, and the risk level.

| Risk | Rule |
|---|---|
| High | Projected lowest balance < R |
| Medium | Lowest ≥ R **and** (cashBalance − lowest) / cashBalance > 15% |
| Low | Otherwise |

**Expected demo result:** lowest balance about **₦415,000** (a fall of about ₦165K, or 28%), which stays above R, so risk is **Medium**. The main drivers are rent on October 1–3 and recurring supplier payments.

*To verify in Phase 4:* in the generated data, the October 1–14 window holds rent, MTN data, Adebayo ×2 (October 5 and 12), Kolawole (October 9) and Mama Nkechi (around October 8). A rough estimate puts the lowest balance at ₦300K–₦420K. Once the forecast code exists, the supplier schedule will be tuned (and the dataset regenerated) so the result lands on target. The §8 affordability numbers follow from it.

The wording is always estimative: "expected", "likely", "based on recent patterns".

---

## 8. "Can I Afford This?" (Phase 5)

**Inputs:** `amount` (₦) and an optional `purpose` (Stock / Equipment / Personal / Other).

| Output | Formula | Demo (₦300,000) |
|---|---|---:|
| Current cash | `cashBalance` | ₦580,000 |
| Upcoming expected expenses | `cashBalance` − forecast lowest balance (floored at 0) | ₦165,000 |
| Remaining buffer | Current cash − amount − upcoming expected expenses | ₦115,000 |
| Minimum reserve | R | ₦190,000 |
| Max safe amount | Current cash − upcoming expected expenses − R | ₦225,000 |
| Recommended range | [floor₁₀ₖ(0.85 × max safe), floor₁₀ₖ(max safe)] | **₦190,000 – ₦220,000** |

floor₁₀ₖ rounds down to the nearest ₦10,000.

| Verdict | Rule | Message |
|---|---|---|
| Comfortable | buffer ≥ R | "Yes, you can afford this comfortably." |
| Careful | 0 ≤ buffer < R | "You can, but be careful." |
| Cannot | buffer < 0 | "Not right now — this could leave you short." |

If max safe ≤ 0, show no range. Show "Wait until cash improves" instead.

**Test cases:** ₦100,000 → Comfortable (buffer ₦315K) · ₦300,000 → Careful (buffer ₦115K) · ₦500,000 → Cannot (buffer −₦85K).

If `purpose` is Stock and inventory growth is more than 10 points above revenue growth, add: "Your stock spending is already growing faster than your sales."

---

## 9. Recommendations (Phase 4)

Each rule that fires produces one recommendation. They are sorted by priority, then by rule order.

| # | Condition | Priority | Title |
|---|---|---|---|
| 1 | Forecast risk = High | High | Protect your cash: you may fall below your safety reserve |
| 2 | Forecast risk = Medium | High | Protect your operating cash reserve |
| 3 | Last month's expense ratio > 1.0 | High | You spent more than you earned last month |
| 4 | Inventory growth − revenue growth > 10 points (3m) | Medium | Review your stock purchases |
| 5 | Any operating cost category grew > 25% (3m) | Medium | {Category} costs are rising |
| 6 | One supplier > 40% of inventory spend (3m) | Low | Consider negotiating payment timing with {supplier} |
| 7 | Flagged transactions > 0 | Low | Categorize {n} unidentified transactions |
| 8 | Revenue growth > 0 and > expense growth | Info | Your sales momentum is positive |

Every recommendation stores the metric that triggered it (`supportingMetric`), so the UI can show "Why am I seeing this?".

**Expected on September 30:** #2, #3, #4, #5 (generator fuel +58%, transport +50%), likely #6, and #7. #8 does not fire, because expenses grew faster than revenue.

---

## 10. Financial Readiness Profile (Phase 4)

| Indicator | Weight | Formula | Expected |
|---|---:|---|---:|
| Consistent activity | 10% | 100 × activeDayRatio90 | 72 |
| Revenue stability | 10% | = Health "Revenue consistency" | 85 |
| Revenue growth | 10% | 100 × clamp((revenueGrowth3m + 5) / 20) | 85 |
| Positive cash-flow history | 20% | = Health "Cash-flow stability" | 57 |
| Cash reserve | 20% | = Health "Cash reserve" | 64 |
| Predictable expenses | 10% | 100 − 2 × CV% of monthly operating costs (6 months) | ~89 |
| Record quality | 10% | 100 × confidentShare | ~93 |
| Recurring income | 10% | 100 × share of last 13 weeks with at least 2 sales inflows | 100 |
| **Total** | | | **~77** |

| Band | Label |
|---|---|
| 85–100 | Strong |
| 65–84 | Developing |
| 45–64 | Emerging |
| 0–44 | Early stage |

**Expected demo result: ~77 / 100 — Developing.** Indicators ≥ 80 are listed as **strengths**, and those < 65 as **areas to improve**.

This is never presented as loan eligibility. Next steps are framed as "build a stronger reserve before taking on larger commitments".

---

## 11. AI insight layer (Phase 6)

The LLM receives only a `InsightFacts` JSON object built by the engine. It never sees raw transactions.

**Prompt rules:** plain English a shop owner understands; no jargon; use only numbers from the facts; at most 3 sentences per insight; estimates use hedged wording.

**Validation:** extract every number in the response (₦ amounts, percentages, plain numbers ≥ 10). Each one must match a fact value, as formatted, within rounding. If any number doesn't match, or the call fails or takes longer than 8 seconds, use the **templated fallback** for that insight.

**Cache:** for the demo dataset, generated insights are cached by `asOf`, so the live demo doesn't need the network.

**Model:** Claude API. The exact model is chosen in Phase 6.

---

## 12. Shared types

These go into `src/lib/types.ts` in Phase 1.

```ts
export type Direction = "credit" | "debit";
export type Channel = "POS" | "TRANSFER" | "ATM" | "USSD" | "CARD" | "BANK";

export type Category =
  | "SALES" | "OTHER_INFLOW"
  | "INVENTORY" | "SALARIES" | "RENT" | "ELECTRICITY" | "GENERATOR_FUEL"
  | "INTERNET" | "TRANSPORT" | "BANK_CHARGES" | "CASH_WITHDRAWAL" | "MISC"
  | "UNCATEGORIZED";

export interface RawTransaction {
  id: string;
  date: string;            // ISO "2026-09-29"
  amount: number;          // naira, positive integer
  direction: Direction;
  description: string;     // may be "" (level 4)
  counterparty: string | null;
  channel: Channel;
  rawReference: string;
  accountId: string;
  balanceAfter: number;
}

/** Test-only fields; never sent to the UI. */
export interface GroundTruth {
  trueCategory: Category;
  descriptionLevel: 1 | 2 | 3 | 4;
}

export interface ClassifiedTransaction extends RawTransaction {
  category: Category;
  confidence: number;      // 0..1
  userConfirmed: boolean;
  reasons: string[];       // e.g. ["Repeat counterparty", "Similar amount monthly"]
}

export interface PeriodMetrics {
  period: string;          // "2026-09" or "2026-Q3"
  revenue: number;
  otherInflows: number;
  expenses: number;
  operatingCosts: number;
  netCashFlow: number;
  expenseRatio: number;
  closingBalance: number;
  byCategory: Partial<Record<Category, number>>;
}

export interface ScoreComponent { key: string; label: string; weight: number; score: number; explanation: string; }

export interface HealthScore {
  asOf: string;
  score: number;
  band: "Strong" | "Healthy" | "Fair" | "Needs attention";
  components: ScoreComponent[];
}

export type RiskLevel = "Low" | "Medium" | "High";

export interface ScheduledPayment { date: string; label: string; amount: number; category: Category; }

export interface Forecast {
  asOf: string;
  horizonDays: number;
  expectedInflow: number;
  expectedOutflow: number;
  projectedEndBalance: number;
  lowestBalance: number;
  lowestBalanceDate: string;
  daily: { date: string; balance: number }[];
  scheduled: ScheduledPayment[];
  risk: RiskLevel;
  reason: string;
}

export interface Recommendation {
  id: string;
  priority: "High" | "Medium" | "Low" | "Info";
  title: string;
  message: string;
  supportingMetric: { label: string; value: string };
}

export type Verdict = "Comfortable" | "Careful" | "Cannot";

export interface AffordabilityResult {
  amount: number;
  purpose?: string;
  currentCash: number;
  upcomingExpenses: number;
  remainingBuffer: number;
  minimumReserve: number;
  maxSafeAmount: number;
  recommendedRange: [number, number] | null;
  verdict: Verdict;
  message: string;
  notes: string[];
}

export interface ReadinessProfile {
  asOf: string;
  score: number;
  band: "Strong" | "Developing" | "Emerging" | "Early stage";
  indicators: ScoreComponent[];
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
}

export interface InsightFacts {
  asOf: string;
  revenueGrowth3m: number;
  expenseGrowth3m: number;
  inventoryGrowth3m: number;
  cashBalance: number;
  cashBalanceChangeMoM: number;
  healthScore: number;
  healthScorePrev?: number;
  forecastRisk: RiskLevel;
  lowestBalance: number;
  lowestBalanceDate: string;
  flaggedCount: number;
  topRisingCost?: { category: Category; growth: number };
}
```

---

## 13. Expected demo numbers (acceptance checklist)

The engine is correct when, with `asOf` = September 30, 2026:

- [ ] 247 transactions loaded; closing balance ₦580,000 (±₦10K)
- [ ] Revenue growth (Q3 vs. Q2) ≈ +12%; inventory growth ≈ +31%; expense growth ≈ +26%
- [ ] September: revenue ≈ ₦2.76M, expenses ≈ ₦2.92M, net ≈ −₦160K
- [ ] Health Score 64–72, band **Healthy**; as of June 30, ≥ 80 (**Strong**)
- [ ] Classification accuracy ≥ 85%; 4–10 transactions flagged
- [ ] Forecast risk **Medium**; lowest balance ≈ ₦415K (±₦40K)
- [x] Minimum reserve ≈ ₦180K (Phase 3)
- [ ] ₦300K → Careful, range ≈ ₦190K–₦220K; ₦100K → Comfortable; ₦500K → Cannot
- [ ] Readiness 72–82, band **Developing**
- [ ] Recommendations include "Protect your operating cash reserve" (High) and "Review your stock purchases" (Medium)

### Changes from the master plan's illustrative numbers

| Master plan example | Spec | Why |
|---|---|---|
| Health 78 | ~67 | A business whose cash has fallen two months in a row shouldn't score close to "Strong". The drop from 87 makes a stronger demo moment. |
| Dashboard "Net Cash Flow ₦580K" | Cash balance ₦580K; September net −₦160K | Net cash flow and cash balance are different numbers. |
| Range ₦200K–₦230K | ₦190K–₦220K | Comes from the reserve formula, not hand-picked. |
| Readiness 74 | ~77 | Comes from the formula; same band ("Developing"). |
