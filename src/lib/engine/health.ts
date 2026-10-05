// Business Health Score (SPEC.md §6). Not a credit score.

import type { Account, ClassifiedTransaction, HealthScore, ScoreComponent } from "../types";
import { CONFIDENCE } from "./classify";
import { addDays } from "./dates";
import { cashPosition, monthlyMetrics, threeMonthGrowth } from "./metrics";
import { clamp01, coefficientOfVariation } from "./stats";

const LOOKBACK_DAYS = 90;
const MAX_MONTHS = 6;

/** Signals shared by the Health Score and the Financial Readiness profile. */
export interface HealthSignals {
  positiveMonths: number;
  months: number;
  netMargin3m: number;
  revenueCV: number;
  expenseRatio3m: number;
  growthGap: number | null;          // expense growth − revenue growth, percentage points
  daysOfCashCover: number;
  activeDayRatio90: number;
  confidentShare: number;
  operatingCostCV: number;
  revenueGrowth3m: number | null;
}

export function healthSignals(transactions: ClassifiedTransaction[], account: Account, asOf: string): HealthSignals {
  const upToAsOf = transactions.filter((t) => t.date <= asOf);
  const months = monthlyMetrics(upToAsOf, account, asOf).slice(-MAX_MONTHS);
  const g = threeMonthGrowth(upToAsOf, account, asOf);
  const cash = cashPosition(upToAsOf, account, asOf);

  const windowStart = addDays(asOf, -(LOOKBACK_DAYS - 1));
  const activeDays = new Set(upToAsOf.filter((t) => t.date >= windowStart).map((t) => t.date)).size;
  const confident = upToAsOf.filter((t) => t.userConfirmed || t.confidence >= CONFIDENCE.high).length;

  return {
    positiveMonths: months.filter((m) => m.netCashFlow > 0).length,
    months: months.length,
    netMargin3m: g.current.revenue ? g.current.netCashFlow / g.current.revenue : 0,
    revenueCV: coefficientOfVariation(months.map((m) => m.revenue)),
    expenseRatio3m: g.current.expenseRatio,
    growthGap: g.expenseGrowth !== null && g.revenueGrowth !== null ? g.expenseGrowth - g.revenueGrowth : null,
    daysOfCashCover: cash.daysOfCashCover,
    activeDayRatio90: activeDays / LOOKBACK_DAYS,
    confidentShare: upToAsOf.length ? confident / upToAsOf.length : 0,
    operatingCostCV: coefficientOfVariation(months.map((m) => m.operatingCosts)),
    revenueGrowth3m: g.revenueGrowth,
  };
}

// Component scores, 0–100. Each is reused by the Readiness profile.

export function cashFlowStabilityScore(s: HealthSignals): number {
  const share = s.months ? s.positiveMonths / s.months : 0;
  return Math.round(100 * (0.5 * share + 0.5 * clamp01((s.netMargin3m + 0.15) / 0.25)));
}

export function revenueConsistencyScore(s: HealthSignals): number {
  return Math.round(Math.max(0, 100 - 2 * s.revenueCV * 100));
}

export function expenseManagementScore(s: HealthSignals): number {
  const ratioPart = clamp01((1.3 - s.expenseRatio3m) / 0.6);
  if (s.growthGap === null) return Math.round(100 * ratioPart);
  const gapPart = s.growthGap <= 0 ? 1 : clamp01(1 - s.growthGap / 40);
  return Math.round(100 * (0.5 * ratioPart + 0.5 * gapPart));
}

export function cashReserveScore(s: HealthSignals): number {
  return Math.round(100 * clamp01(s.daysOfCashCover / 10));
}

export function transactionConsistencyScore(s: HealthSignals): number {
  return Math.round(100 * (0.5 * s.activeDayRatio90 + 0.5 * s.confidentShare));
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function healthScore(transactions: ClassifiedTransaction[], account: Account, asOf: string): HealthScore {
  const s = healthSignals(transactions, account, asOf);
  const spentVsEarned = s.expenseRatio3m > 1
    ? `you spent ₦${(s.expenseRatio3m).toFixed(2)} for every ₦1 you earned in the last 3 months`
    : `you spent ${pct(s.expenseRatio3m)} of what you earned in the last 3 months`;

  const components: ScoreComponent[] = [
    {
      key: "cashFlowStability", label: "Cash-flow stability", weight: 0.25, score: cashFlowStabilityScore(s),
      explanation: `More money came in than went out in ${s.positiveMonths} of the last ${s.months} months.`,
    },
    {
      key: "revenueConsistency", label: "Revenue consistency", weight: 0.2, score: revenueConsistencyScore(s),
      explanation: s.revenueCV < 0.1 ? "Your monthly sales are steady." : "Your monthly sales go up and down a lot.",
    },
    {
      key: "expenseManagement", label: "Expense management", weight: 0.2, score: expenseManagementScore(s),
      explanation:
        s.growthGap !== null && s.growthGap > 0
          ? `Your spending grew faster than your sales, and ${spentVsEarned}.`
          : `${spentVsEarned[0].toUpperCase()}${spentVsEarned.slice(1)}.`,
    },
    {
      key: "cashReserve", label: "Cash reserve", weight: 0.2, score: cashReserveScore(s),
      explanation: `Your balance would cover about ${Math.floor(s.daysOfCashCover)} days of your usual spending.`,
    },
    {
      key: "transactionConsistency", label: "Transaction consistency", weight: 0.15, score: transactionConsistencyScore(s),
      explanation: `Your account was active on ${pct(s.activeDayRatio90)} of the last 90 days, and ${pct(s.confidentShare)} of transactions are clearly identified.`,
    },
  ];

  const score = Math.round(components.reduce((total, c) => total + c.weight * c.score, 0));
  return { asOf, score, band: healthBand(score), components };
}

export function healthBand(score: number): HealthScore["band"] {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Healthy";
  if (score >= 40) return "Fair";
  return "Needs attention";
}
