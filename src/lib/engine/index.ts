// One call that produces everything the app shows for a given date.

import type {
  Account, ClassifiedTransaction, Forecast, HealthScore, PeriodMetrics, RawTransaction, ReadinessProfile, Recommendation,
} from "../types";
import { NO_CONFIRMATIONS, classifyTransactions, needsReview, type Confirmations } from "./classify";
import { forecastCash } from "./forecast";
import { healthScore } from "./health";
import { cashPosition, monthlyMetrics, threeMonthGrowth, threeMonthWindows, type CashPosition, type GrowthSummary } from "./metrics";
import { readinessProfile } from "./readiness";
import { recommendations } from "./recommendations";

export interface Analysis {
  asOf: string;
  account: Account;
  transactions: ClassifiedTransaction[];
  flagged: ClassifiedTransaction[];
  months: PeriodMetrics[];
  growth: GrowthSummary;
  cash: CashPosition;
  health: HealthScore;
  /** Health at the end of the previous 3-month period (e.g. June 30), for the trend. */
  previousHealth: HealthScore | null;
  forecast: Forecast;
  recommendations: Recommendation[];
  readiness: ReadinessProfile;
}

export function analyze(
  raw: RawTransaction[],
  account: Account,
  asOf: string,
  confirmations: Confirmations = NO_CONFIRMATIONS,
): Analysis {
  const transactions = classifyTransactions(raw.filter((t) => t.date <= asOf), confirmations);
  const forecast = forecastCash(transactions, account, asOf);

  const previousEnd = threeMonthWindows(asOf).previous.to;
  const previousHealth =
    previousEnd >= account.openingDate && threeMonthWindows(previousEnd).current.from >= account.openingDate
      ? healthScore(classifyTransactions(raw.filter((t) => t.date <= previousEnd), confirmations), account, previousEnd)
      : null;

  return {
    asOf,
    account,
    transactions,
    flagged: transactions.filter(needsReview),
    months: monthlyMetrics(transactions, account, asOf),
    growth: threeMonthGrowth(transactions, account, asOf),
    cash: cashPosition(transactions, account, asOf),
    health: healthScore(transactions, account, asOf),
    previousHealth,
    forecast,
    recommendations: recommendations(transactions, account, asOf, forecast),
    readiness: readinessProfile(transactions, account, asOf),
  };
}
