// Shared types for the NaijaBiz IQ engine and UI. Source of truth: SPEC.md §12.

export type Direction = "credit" | "debit";
export type Channel = "POS" | "TRANSFER" | "ATM" | "USSD" | "CARD" | "BANK";

export type Category =
  | "SALES" | "OTHER_INFLOW"
  | "INVENTORY" | "SALARIES" | "RENT" | "ELECTRICITY" | "GENERATOR_FUEL"
  | "INTERNET" | "TRANSPORT" | "BANK_CHARGES" | "CASH_WITHDRAWAL" | "MISC"
  | "UNCATEGORIZED";

export interface Account {
  accountId: string;
  provider: string;
  accountName: string;
  accountNumberMasked: string;
  openingBalance: number;
  openingDate: string;
}

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
  reasons: string[];
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

export interface ScoreComponent {
  key: string;
  label: string;
  weight: number;
  score: number;
  explanation: string;
}

export interface HealthScore {
  asOf: string;
  score: number;
  band: "Strong" | "Healthy" | "Fair" | "Needs attention";
  components: ScoreComponent[];
}

export type RiskLevel = "Low" | "Medium" | "High";

export interface ScheduledPayment {
  date: string;
  label: string;
  amount: number;
  category: Category;
}

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
