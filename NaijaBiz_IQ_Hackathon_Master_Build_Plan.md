# NaijaBiz IQ — Hackathon Master Build Plan

**Project:** NaijaBiz IQ  
**Event:** Wema Hackaholics 7.0 — University of Ibadan  
**Hackathon Dates:** October 7–9, 2026  
**Primary Goal:** Build a convincing MVP that demonstrates how transaction data can become actionable financial intelligence for Nigerian SMEs.

---

## 0. Product Definition

### One-line definition

> **NaijaBiz IQ is an AI-powered financial intelligence platform that helps Nigerian small businesses understand their cash flow, identify financial risks, make better decisions, and become financially ready for responsible access to banking services.**

### What NaijaBiz IQ is

NaijaBiz IQ is a **financial intelligence layer for SMEs**, not a traditional accounting application.

It takes business transaction data and turns it into:

1. Understanding — What is happening?
2. Prediction — What is likely to happen?
3. Advice — What should the business owner do?
4. Decision support — Can the business afford something?
5. Financial readiness — How financially healthy and organized is the business?

### Core product statement

> **Wema already has the transactions. NaijaBiz IQ turns those transactions into intelligence.**

---

# PHASE 1 — Product Scope & Hackathon Strategy

## Objectives

Lock the product direction before development begins.

### Confirm the target user

Primary persona:

**Aisha — Nigerian SME Owner**

- 32 years old
- Based in Ibadan
- Owns a mini supermarket / retail business
- Has approximately two employees
- Monthly revenue around ₦2M–₦3M
- Receives customer payments
- Pays suppliers, salaries, electricity, transport, rent and other operating expenses
- Understands her business operationally but does not have a financial analyst
- Often looks at her account balance without knowing the full financial picture

### Core problem

Aisha has transaction data, but raw transactions do not answer questions such as:

- Am I actually making money?
- Where is my money going?
- Why does my account balance keep reducing?
- Are my expenses growing too quickly?
- Will I have enough cash later this month?
- Can I afford to buy ₦300,000 worth of stock?
- Is my business financially healthy?
- Am I becoming financially ready for formal banking services?

### Product promise

NaijaBiz IQ should answer these questions using existing financial data.

### Do NOT build

Avoid scope creep.

Do not build:

- Full accounting software
- Payroll system
- Inventory management
- Invoice management
- POS infrastructure
- Real loan approval
- Real credit scoring
- Real banking integration during the hackathon
- Complex financial products
- Dozens of unrelated AI features

---

# PHASE 2 — Aisha's Realistic Transaction Dataset

## Objective

Create the dataset that powers the entire prototype.

### Dataset period

**April 1 – September 30, 2026**

### Target size

Approximately **200–300 transactions**.

Recommended target:

**~250 transactions**

### Business profile

**Aisha Mini Mart — Ibadan**

Monthly revenue should generally fall within approximately:

**₦2M–₦3M**

### Transaction categories

Include:

- Customer revenue
- Inventory / stock purchases
- Salaries
- Rent
- Electricity
- Internet / data
- Transport
- Bank charges
- POS charges
- Utilities
- Cash withdrawals
- Business transfers
- Supplier payments
- Miscellaneous expenses
- Ambiguous transactions

### Transaction quality

The dataset MUST intentionally contain different levels of information quality.

#### Level 1 — Clear

Example:

`SALARY SEPTEMBER`

Easy classification → Salaries.

#### Level 2 — Moderately ambiguous

Example:

`TRF/829374829`

Repeated monthly to the same counterparty.

The system can infer:

> Likely supplier payment.

#### Level 3 — Highly ambiguous

Example:

`TRANSFER`

The system must use other signals.

#### Level 4 — Missing description

Example:

`—`

The system should ask the user to classify it if confidence is low.

### Dataset fields

Recommended raw fields:

- transaction_id
- date
- amount
- direction
- description
- counterparty
- channel
- raw_reference
- account_id

Internal evaluation fields:

- true_category
- expected_category
- classification_confidence
- user_confirmed

Do NOT expose the hidden `true_category` to the user-facing application.

---

# PHASE 3 — Transaction Intelligence Engine

## Objective

Determine what each transaction most likely represents.

### Critical principle

NaijaBiz IQ must NOT depend on descriptions alone.

The classification engine should use:

1. Transaction direction
2. Amount
3. Frequency
4. Transaction timing
5. Counterparty
6. Channel
7. Merchant/category metadata when available
8. Historical classification
9. User confirmation

### Example

Transaction:

- Debit
- ₦120,000
- Description: `TRF/829374829`
- Same counterparty every month
- Similar amount every month

Historical pattern:

> Supplier payment

Result:

**Inventory — 87% confidence**

### Low-confidence workflow

If confidence is low:

> **We couldn't confidently identify this transaction. What was this for?**

Options:

- Stock
- Salary
- Transport
- Utilities
- Rent
- Business withdrawal
- Other

User confirmation should become historical context for future classification.

### Product principle

Do not claim:

> "NaijaBiz IQ categorizes every transaction perfectly."

Instead:

> **"NaijaBiz IQ learns the financial patterns of your business."**

---

# PHASE 4 — Financial Calculation Engine

## Objective

Convert categorized transactions into verified financial metrics.

### Important architecture rule

**The system calculates. AI interprets.**

Do not ask an LLM to calculate financial totals.

### Core calculations

#### Revenue

Sum validated business inflows.

```text
Total Revenue = Sum of qualifying business credits
```

#### Expenses

Sum validated business outflows.

```text
Total Expenses = Sum of qualifying business debits
```

#### Net Cash Flow

```text
Net Cash Flow = Total Revenue - Total Expenses
```

#### Expense ratio

```text
Expense Ratio = Total Expenses / Total Revenue
```

#### Cash reserve

Determine available operating cash based on the account balance and defined business rules.

#### Revenue growth

```text
Revenue Growth =
(Current Period Revenue - Previous Period Revenue)
/
Previous Period Revenue
× 100
```

#### Expense growth

```text
Expense Growth =
(Current Period Expenses - Previous Period Expenses)
/
Previous Period Expenses
× 100
```

### Important distinction

Cash flow is not automatically the same thing as accounting profit.

For the hackathon, clearly position the product around **cash-flow intelligence and transaction-derived financial insights**, unless a proper accounting model is implemented.

---

# PHASE 5 — Business Health Score

## Objective

Create a simple, explainable score representing business financial health.

### Initial proposed weighting

| Component | Weight |
|---|---:|
| Cash-flow stability | 25% |
| Revenue consistency | 20% |
| Expense management | 20% |
| Cash reserve | 20% |
| Transaction consistency | 15% |
| **Total** | **100%** |

### Score

Produce a score from:

**0–100**

Example:

**78 / 100 — Healthy**

### Score explanation

The user must be able to see WHY the score exists.

Example:

- Cash-flow stability: 82
- Revenue consistency: 76
- Expense management: 71
- Cash reserve: 84
- Transaction consistency: 79

### Important

Do not present the score as:

- A bank credit score
- A loan approval score
- A guarantee of financial performance

Call it:

> **Business Health Score**

---

# PHASE 6 — Six-Month Financial Trend Analysis

## Objective

Use the dataset to identify meaningful business trends.

The six-month dataset should intentionally tell a story.

### April

Stable business.

- Revenue around ₦2.2M
- Expenses around ₦1.8M
- Positive cash flow

### May

Revenue increases.

- Revenue around ₦2.4M
- Expenses around ₦1.9M
- Still healthy

### June

Growth continues.

- Revenue around ₦2.6M
- Inventory purchases begin increasing

### July

Early warning.

- Revenue continues growing
- Inventory costs increase faster
- Cash reserve begins shrinking

### August

Pressure becomes more obvious.

- Revenue remains strong
- Inventory spending rises significantly
- Cash flow becomes tighter

### September

Demo month.

The business is growing, but cash pressure is increasing.

This should allow the system to discover:

> **Your business is growing, but your cash position is becoming less comfortable.**

---

# PHASE 7 — AI Insight Engine

## Objective

Turn verified metrics into understandable business explanations.

### Input

The deterministic analytics engine supplies verified facts.

Example:

```text
Revenue growth: +12.4%
Inventory expense growth: +31.2%
Cash reserve change: -18.7%
```

### AI output

The AI interprets those facts:

> **Your business is growing, but inventory spending is rising much faster than revenue. If this continues, you may experience cash pressure later in the month.**

### AI responsibilities

The AI can:

- Explain trends
- Summarize financial behavior
- Identify potential risks
- Explain why a metric changed
- Generate plain-language recommendations
- Answer questions about the user's financial dashboard

### AI must NOT independently determine

- Raw transaction totals
- Account balances
- Mathematical calculations
- Financial facts that contradict system data

---

# PHASE 8 — Cash-Flow Forecasting

## Objective

Estimate future cash-flow pressure using historical transaction behavior.

### MVP approach

Use a lightweight statistical approach rather than building an unnecessarily complex ML model.

Potential inputs:

- Historical revenue
- Historical expense patterns
- Recurring payments
- Supplier payments
- Salary dates
- Rent dates
- Utility patterns
- Recent cash-flow trends

### Forecast output

Example:

> **Expected cash position in 14 days: ₦320,000**

And:

> **Potential risk: Medium**

### User-friendly explanation

> "Based on your recent transaction patterns, your cash position may become tight around the end of the month because supplier payments and salaries are due around the same period."

### Forecasting principle

The forecast should be presented as an estimate, not certainty.

Use wording such as:

- Expected
- Estimated
- Likely
- Potential
- Based on recent patterns

Avoid guarantees.

---

# PHASE 9 — Recommendation Engine

## Objective

Move from insight to action.

### Example rule

If:

```text
Revenue growth > Expense growth
```

then:

> Positive business momentum.

If:

```text
Inventory expense growth >> Revenue growth
```

then:

> Review stock purchasing and inventory turnover.

If:

```text
Cash reserve < expected upcoming expenses
```

then:

> Reduce discretionary spending or delay non-essential purchases.

### Recommendation examples

- Maintain a minimum operating cash reserve.
- Review unusually fast-growing expenses.
- Avoid large discretionary purchases this week.
- Consider negotiating supplier payment timing.
- Monitor recurring expenses.
- Build a stronger cash buffer.
- Review transactions that the system could not confidently categorize.

Recommendations should be based on verified financial signals.

---

# PHASE 10 — "Can I Afford This?" Decision Simulator

## Objective

Create the main demo feature.

The business owner asks:

> **Can I afford this?**

### User input

Example:

**Purchase amount: ₦300,000**

### System calculates

Current available cash:

**₦580,000**

Proposed purchase:

**₦300,000**

Remaining:

**₦280,000**

Upcoming expected expenses:

**₦165,000**

Remaining buffer:

**₦115,000**

### Result

> **You can, but be careful.**

Recommended purchase range:

**₦200,000–₦230,000**

### Why this feature matters

It demonstrates the entire product pipeline:

```text
Transaction Data
↓
Financial Analysis
↓
Forecast
↓
Risk Assessment
↓
Recommendation
↓
Business Decision
```

This should be one of the strongest moments of the demo.

---

# PHASE 11 — Financial Readiness Profile

## Objective

Show whether the business demonstrates healthy financial behavior.

This is NOT a loan approval system.

### Possible indicators

- Consistent transaction activity
- Stable revenue
- Positive cash-flow history
- Healthy cash reserve
- Predictable expense patterns
- Good transaction categorization
- Recurring business income
- Improving financial behavior

### Example output

**Financial Readiness: 74 / 100**

Status:

> **Developing**

Explanation:

> "Your business demonstrates consistent revenue activity and improving cash-flow stability. Your operating reserve could be strengthened before taking on larger financial commitments."

### Wema relevance

This can create a pathway toward future financial products without claiming that NaijaBiz IQ itself approves financing.

---

# PHASE 12 — Wema Integration Concept

## Hackathon reality

Do NOT depend on a live banking API unless the hackathon provides one and the team has confirmed access.

Use a **simulated Wema integration** for the MVP.

### Ideal production architecture

```text
Wema Business Account
        ↓
Transaction Data
        ↓
NaijaBiz IQ
        ↓
Transaction Intelligence
        ↓
Financial Intelligence
        ↓
Business Decisions
        ↓
Wema Ecosystem Services
```

### Demo connection

The UI can show:

> **Connect Wema Account**

Then simulate:

> Account connected successfully.

Followed by:

> **247 transactions imported**

### Fallback

Allow transaction CSV upload if necessary.

### Important product statement

> **Aisha shouldn't have to upload statements every week. In production, she connects her Wema account once, with consent, and NaijaBiz IQ continuously receives transaction data.**

---

# PHASE 13 — MVP Application Screens

Build only the screens necessary for the story.

## Screen 1 — Welcome

Purpose:

Introduce NaijaBiz IQ.

Headline:

> **Understand your business. Make smarter decisions.**

CTA:

> Get Started

---

## Screen 2 — Business Setup

Collect:

- Business name
- Business type
- Revenue range
- Number of employees
- Location

Example:

**Aisha Mini Mart**

---

## Screen 3 — Connect Account

Show:

**Connect Wema Account**

Alternative:

**Upload Transaction Data**

For demo:

> Wema account connected successfully.

---

## Screen 4 — Dashboard

Display:

- Revenue
- Expenses
- Net Cash Flow
- Business Health Score
- Trend chart
- Key insight
- Warning
- Recommendation

Example:

```text
Revenue        ₦2.45M    ↑12%
Expenses       ₦1.87M    ↑8%
Net Cash Flow  ₦580K     Positive

Business Health
78/100
Healthy
```

Insight:

> Revenue is growing 12%, but inventory spending is growing 31%.

---

## Screen 5 — Transactions

Show:

- Date
- Description
- Amount
- Direction
- Category
- Confidence

Include uncertain transactions.

Example:

> TRF/829374 — ₦120,000 — Inventory — 87%

---

## Screen 6 — Insights

Show AI-generated explanations.

Examples:

- Revenue is growing
- Inventory costs are rising
- Cash reserve is shrinking
- Supplier payments are becoming larger
- Certain transactions remain uncategorized

---

## Screen 7 — Forecast

Show:

- Expected inflows
- Expected outflows
- Expected cash position
- Risk level
- Forecast chart

Example:

> **Medium cash-flow pressure expected within 14 days.**

---

## Screen 8 — Recommendations

Show prioritized actions.

Example:

### High Priority

> Protect your operating cash reserve.

### Medium Priority

> Review recent inventory purchases.

### Low Priority

> Categorize 4 unidentified transactions.

---

## Screen 9 — Can I Afford This?

Input:

> What do you want to spend?

Example:

**₦300,000**

Output:

> **You can, but be careful.**

Show:

- Current cash
- Purchase amount
- Upcoming expenses
- Remaining buffer
- Recommended range

---

## Screen 10 — Financial Readiness

Show:

- Financial readiness score
- Positive indicators
- Areas to improve
- Potential next steps

---

# PHASE 14 — Technical Architecture

## Tentative stack

### Frontend

- Next.js / React
- Tailwind CSS
- Component library as appropriate

### Backend

- Next.js API routes / Node.js

### Database

- Supabase / PostgreSQL

### Authentication

- Supabase Auth

### Analytics

- JavaScript/TypeScript for deterministic calculations
- Python only if useful for forecasting/model experimentation

### AI

LLM API for interpretation and conversational insights.

### Deployment

- Vercel
- Supabase

### Banking integration

Simulated Wema API / mock transaction feed for hackathon.

---

# PHASE 15 — Database Design

## businesses

Suggested fields:

- id
- name
- business_type
- location
- revenue_band
- employee_count
- created_at

## accounts

Suggested fields:

- id
- business_id
- provider
- account_name
- account_number_masked
- connection_status
- created_at

## transactions

Suggested fields:

- id
- account_id
- date
- amount
- direction
- description
- counterparty
- channel
- raw_reference
- category
- confidence
- user_confirmed
- created_at

## financial_metrics

Suggested fields:

- id
- business_id
- period
- revenue
- expenses
- net_cash_flow
- expense_ratio
- cash_reserve
- created_at

## health_scores

Suggested fields:

- id
- business_id
- score
- cash_flow_score
- revenue_score
- expense_score
- reserve_score
- consistency_score
- created_at

## forecasts

Suggested fields:

- id
- business_id
- forecast_date
- predicted_inflow
- predicted_outflow
- predicted_cash
- risk_level
- model_version
- created_at

## recommendations

Suggested fields:

- id
- business_id
- type
- severity
- title
- message
- supporting_metric
- created_at

## decisions

Suggested fields:

- id
- business_id
- scenario_amount
- purpose
- current_cash
- expected_expenses
- projected_buffer
- recommendation
- created_at

---

# PHASE 16 — UI/UX Direction

## Product personality

NaijaBiz IQ should feel:

- Modern
- Trustworthy
- Financial
- Intelligent
- Simple
- Nigerian
- Premium
- Professional

Avoid making it look like:

- A generic accounting app
- A bank clone
- An AI chatbot with a dashboard attached

### UX principle

A business owner should understand the dashboard without needing financial expertise.

Instead of:

> "Expense volatility coefficient increased by 18%."

Say:

> **"Your expenses are becoming less predictable."**

Instead of:

> "Projected liquidity stress."

Say:

> **"You may have less cash available later this month."**

---

# PHASE 17 — Build the Intelligence Engine Before the UI

The order matters.

Do not start by building beautiful dashboard cards.

First make the numbers work.

### Build order

1. Import dataset
2. Parse transactions
3. Categorize transactions
4. Calculate revenue
5. Calculate expenses
6. Calculate cash flow
7. Calculate trends
8. Calculate health score
9. Generate forecast
10. Generate recommendations
11. Build affordability calculation
12. Connect the UI to those outputs

### Principle

> **Beautiful UI around incorrect numbers is worse than simple UI around trustworthy numbers.**

---

# PHASE 18 — 3-Day Hackathon Execution Plan

## DAY 1 — October 7

### Morning

- Team alignment
- Confirm problem
- Confirm MVP
- Confirm roles
- Set repository
- Set project structure
- Set database
- Load sample dataset

### Midday

Build:

- Business onboarding
- Transaction ingestion
- Transaction table
- Categorization engine
- Core financial calculations

### Afternoon

Build:

- Dashboard
- Revenue
- Expenses
- Cash flow
- Health score

### End of Day 1 target

The application should already be able to:

> Import transactions → analyze them → show basic financial metrics.

---

# DAY 2 — October 8

### Morning

Build:

- Insights
- Forecast
- Recommendation engine

### Midday

Build:

- Can I Afford This?
- Financial Readiness
- Wema connection simulation

### Afternoon

Integration and polish:

- UI refinement
- Charts
- Loading states
- Error states
- Empty states
- Mobile responsiveness
- Demo data consistency

### End of Day 2 target

The entire demo journey should work from start to finish.

---

# DAY 3 — October 9

## No major new features.

Focus on:

- Bug fixing
- Performance
- Demo rehearsal
- Pitch
- Presentation
- Screenshots
- Backup demo environment
- Backup dataset
- Backup deployment

### Final principle

**Do not introduce a major feature on demo day.**

---

# PHASE 19 — Testing

## Data tests

Verify:

- Revenue totals
- Expense totals
- Net cash flow
- Monthly trends
- Recurring transactions
- Transaction categories

## Intelligence tests

Verify:

- High-confidence transactions
- Low-confidence transactions
- Missing descriptions
- Repeated suppliers
- Customer inflows
- Salaries
- Rent
- Utilities
- Withdrawals

## Forecast tests

Verify:

- Historical data is being used
- Future dates are sensible
- Recurring expenses are recognized
- Risk levels are explainable

## Affordability tests

Test:

### Scenario A

Large purchase.

Expected:

> Cannot safely afford.

### Scenario B

Moderate purchase.

Expected:

> Can afford with caution.

### Scenario C

Small purchase.

Expected:

> Comfortable.

---

# PHASE 20 — Demo Story

The demo should not begin with technical architecture.

Begin with Aisha.

### Opening

> "Meet Aisha. She runs a mini supermarket in Ibadan."

> "Every day, money enters and leaves her business."

> "But her bank statement doesn't tell her whether her business is actually healthy."

### Connect account

> "She connects her Wema business account."

Show:

**247 transactions imported.**

### Dashboard

Reveal:

- Revenue
- Expenses
- Cash flow
- Health score

Then say:

> "Aisha's revenue is growing."

Pause.

> "But something is wrong."

### Insight

Show:

> **Revenue +12%**

> **Inventory spending +31%**

Then explain:

> "Her business is growing, but her spending on inventory is growing much faster."

### Forecast

Show:

> **Medium cash-flow pressure expected.**

### Killer moment

Ask:

> "Aisha wants to buy ₦300,000 worth of stock. Can she afford it?"

Enter:

**₦300,000**

NaijaBiz IQ calculates the impact.

Show:

> **You can, but be careful.**

Then:

> **Recommended purchase range: ₦200,000–₦230,000**

### Closing

> "This is not just a dashboard."

> "It's a financial intelligence layer that helps a small business owner understand what is happening, anticipate what is coming, and make better decisions."

Final line:

> **"Wema already has the transactions. NaijaBiz IQ turns those transactions into intelligence."**

---

# PHASE 21 — Pitch Structure

## Slide 1 — The Problem

Millions of SMEs transact every day but lack accessible financial intelligence.

## Slide 2 — Aisha

Show the real-life business owner.

## Slide 3 — The Solution

Introduce NaijaBiz IQ.

## Slide 4 — How It Works

```text
Transactions
↓
Intelligence
↓
Insights
↓
Forecast
↓
Recommendations
↓
Decisions
```

## Slide 5 — Product Demo

Dashboard.

## Slide 6 — Killer Feature

"Can I afford this?"

## Slide 7 — Wema Ecosystem

Show how Wema can benefit.

## Slide 8 — Impact

Potential outcomes:

- Better financial decisions
- Better cash-flow management
- Improved SME financial behavior
- Greater engagement with formal banking
- Better visibility into SME financial activity

## Slide 9 — Future

Potential future capabilities:

- Deeper Wema integration
- Personalized financial products
- SME financial coaching
- Supplier/payment intelligence
- Automated business alerts
- Responsible financing pathways

## Slide 10 — Closing

> **Wema already has the transactions. NaijaBiz IQ turns those transactions into intelligence.**

---

# PHASE 22 — Future Roadmap

These features should NOT be required for the hackathon MVP.

### Phase 2

- Real Wema account integration
- Continuous transaction synchronization
- Improved categorization
- User-specific transaction learning
- More advanced forecasting

### Phase 3

- Business benchmarking
- Supplier intelligence
- Cash-flow scenario planning
- Advanced financial coaching
- SME financial health trends

### Phase 4

- Responsible access to financial products
- Personalized Wema services
- Embedded financing pathways
- Deeper ecosystem integrations

---

# PHASE 23 — Team Roles

Assign ownership clearly.

## Product Lead

Responsible for:

- Product direction
- Feature prioritization
- User journey
- Demo story
- Pitch

## Frontend Developer

Responsible for:

- UI
- Dashboard
- Charts
- User interactions
- Responsive design

## Backend Developer

Responsible for:

- API
- Database
- Authentication
- Transaction ingestion
- Business logic

## Data / ML Engineer

Responsible for:

- Transaction classification
- Financial metrics
- Health score
- Forecasting
- Recommendation logic

## AI Engineer

Responsible for:

- LLM integration
- Insight generation
- Prompt design
- AI response validation

## Designer / Presenter

Responsible for:

- Visual identity
- UX
- Presentation
- Demo polish

One person can own multiple roles.

---

# PHASE 24 — Definition of Done

NaijaBiz IQ is ready for judging when:

- [ ] User can create a business profile
- [ ] User can connect a simulated Wema account
- [ ] Transaction dataset loads successfully
- [ ] Transactions are categorized
- [ ] Low-confidence transactions are identifiable
- [ ] Revenue is calculated correctly
- [ ] Expenses are calculated correctly
- [ ] Net cash flow is calculated correctly
- [ ] Monthly trends are displayed
- [ ] Business Health Score works
- [ ] AI insights are generated from verified metrics
- [ ] Forecast is displayed
- [ ] Recommendations are displayed
- [ ] "Can I Afford This?" works
- [ ] Financial Readiness profile works
- [ ] Dashboard is polished
- [ ] Application is deployed
- [ ] Demo data is stable
- [ ] Demo flow has been rehearsed
- [ ] Pitch is prepared
- [ ] Backup demo exists

---

# PHASE 25 — Final Quality Checklist

Before submission, verify:

### Product

- [ ] Does the product solve a real problem?
- [ ] Can an ordinary SME owner understand it?
- [ ] Is the value obvious within 30 seconds?
- [ ] Does every major feature support the core story?

### Data

- [ ] Are the calculations correct?
- [ ] Are transaction categories believable?
- [ ] Are ambiguous transactions represented?
- [ ] Does the six-month dataset tell a coherent story?

### AI

- [ ] Does AI interpret verified data?
- [ ] Does AI avoid inventing numbers?
- [ ] Are insights understandable?
- [ ] Are recommendations grounded in actual metrics?

### Wema

- [ ] Is the Wema connection visible?
- [ ] Is the ecosystem value clear?
- [ ] Are simulated integrations clearly treated as prototypes?
- [ ] Are we avoiding claims about unavailable APIs or actual loan approval?

### Demo

- [ ] Is Aisha introduced?
- [ ] Is the problem obvious?
- [ ] Is the dashboard understandable?
- [ ] Is the forecast meaningful?
- [ ] Is "Can I Afford This?" demonstrated?
- [ ] Is the final Wema connection explained?

---

# PHASE 26 — Priority Order

If time becomes limited, build in this exact priority order.

## Tier 1 — Must Have

1. Transaction ingestion
2. Transaction categorization
3. Revenue calculation
4. Expense calculation
5. Cash-flow calculation
6. Dashboard
7. Business Health Score
8. AI insights
9. "Can I Afford This?"

## Tier 2 — Strongly Recommended

10. Forecast
11. Recommendations
12. Financial Readiness
13. Wema connection simulation

## Tier 3 — Only If Time Allows

14. Conversational AI assistant
15. Advanced charts
16. More sophisticated forecasting
17. Automated learning from user corrections
18. Additional scenario simulations

---

# PHASE 27 — Core Product Architecture

The complete conceptual architecture is:

```text
                    WEMA
                     │
                     ▼
              Transaction Data
                     │
                     ▼
        ┌────────────────────────┐
        │ Transaction Intelligence│
        └────────────────────────┘
                     │
                     ▼
          Categorized Transactions
                     │
                     ▼
        ┌────────────────────────┐
        │ Financial Engine       │
        │                        │
        │ Revenue                │
        │ Expenses               │
        │ Cash Flow              │
        │ Trends                 │
        └────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Intelligence Layer     │
        │                        │
        │ Health Score            │
        │ Forecast                │
        │ Risk Detection          │
        │ Recommendations         │
        └────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │ Decision Support       │
        │                        │
        │ Can I Afford This?      │
        │ Financial Readiness     │
        └────────────────────────┘
                     │
                     ▼
             SME BUSINESS OWNER
```

---

# PHASE 28 — The Fundamental Product Principle

Everything should reinforce one idea:

> **NaijaBiz IQ does not merely show a business owner their transactions. It helps them understand what those transactions mean.**

The product transforms:

```text
DATA
↓
INFORMATION
↓
INTELLIGENCE
↓
DECISION
```

That transformation is the reason the product deserves to exist.

---

# IMMEDIATE NEXT TASK

Do NOT start building all the screens yet.

The immediate next task is:

## **Generate Aisha's realistic six-month transaction dataset.**

Target:

**~250 transactions**

Period:

**April–September 2026**

The dataset should include:

- Clear descriptions
- Poor descriptions
- Missing descriptions
- Transfers
- POS transactions
- Recurring payments
- Supplier payments
- Customer payments
- Salaries
- Utilities
- Rent
- Transport
- Withdrawals
- Ambiguous transactions
- Hidden ground-truth categories
- Classification confidence

Once that dataset exists, use it to derive and test:

1. Revenue
2. Expenses
3. Net cash flow
4. Expense ratio
5. Revenue growth
6. Expense growth
7. Cash reserve
8. Business Health Score
9. Forecasting logic
10. Recommendation rules
11. "Can I Afford This?" logic
12. Financial Readiness logic

**This dataset becomes the foundation for the rest of the application.**
