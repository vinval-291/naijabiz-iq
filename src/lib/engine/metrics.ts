// Financial engine (SPEC.md §5). The system calculates; the AI only interprets these numbers.
//
// Every function takes `asOf` (an ISO date, treated as end of day) and only looks at transactions
// on or before it, so the same code can compute past values (e.g. "as of June 30").

import type { Account, Category, ClassifiedTransaction, PeriodMetrics } from "../types";
import { addDays, monthKey } from "./dates";
import { sum } from "./stats";

export const MINIMUM_RESERVE_DAYS = 10;
const RESERVE_ROUNDING = 5_000;
const LOOKBACK_DAYS = 90;

export interface DateRange {
  from: string; // inclusive
  to: string;   // inclusive
}

function inRange(t: ClassifiedTransaction, range: DateRange) {
  return t.date >= range.from && t.date <= range.to;
}

export function periodMetrics(
  transactions: ClassifiedTransaction[],
  account: Account,
  range: DateRange,
  label: string,
): PeriodMetrics {
  const inPeriod = transactions.filter((t) => inRange(t, range));
  const credits = inPeriod.filter((t) => t.direction === "credit");
  const debits = inPeriod.filter((t) => t.direction === "debit");

  const revenue = sum(credits.filter((t) => t.category === "SALES").map((t) => t.amount));
  const otherInflows = sum(credits.map((t) => t.amount)) - revenue;
  const expenses = sum(debits.map((t) => t.amount));
  const byCategory: Partial<Record<Category, number>> = {};
  for (const t of debits) byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount;

  return {
    period: label,
    revenue,
    otherInflows,
    expenses,
    operatingCosts: expenses - (byCategory.INVENTORY ?? 0),
    netCashFlow: revenue + otherInflows - expenses,
    expenseRatio: revenue ? expenses / revenue : 0,
    closingBalance: balanceAt(transactions, account, range.to),
    byCategory,
  };
}

/** Account balance at the end of `date`. */
export function balanceAt(transactions: ClassifiedTransaction[], account: Account, date: string): number {
  return transactions
    .filter((t) => t.date <= date)
    .reduce((balance, t) => balance + (t.direction === "credit" ? t.amount : -t.amount), account.openingBalance);
}

// ---------------------------------------------------------------------------
// Months and comparison windows

function monthRange(month: string): DateRange {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { from: `${month}-01`, to: last };
}

function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** The most recent month that has fully ended by `asOf` (asOf's own month counts if asOf is its last day). */
export function lastCompleteMonth(asOf: string): string {
  return addDays(asOf, 1).slice(8, 10) === "01" ? monthKey(asOf) : shiftMonth(monthKey(asOf), -1);
}

/** Complete calendar months from the account's opening month up to `asOf`. */
export function completeMonths(account: Account, asOf: string): string[] {
  const months: string[] = [];
  for (let m = monthKey(account.openingDate); m <= lastCompleteMonth(asOf); m = shiftMonth(m, 1)) months.push(m);
  return months;
}

export function monthlyMetrics(transactions: ClassifiedTransaction[], account: Account, asOf: string): PeriodMetrics[] {
  return completeMonths(account, asOf).map((m) => periodMetrics(transactions, account, monthRange(m), m));
}

/** Last 3 complete months, and the 3 before them (SPEC §1 "headline growth period"). */
export function threeMonthWindows(asOf: string): { current: DateRange; previous: DateRange; label: string; previousLabel: string } {
  const end = lastCompleteMonth(asOf);
  const start = shiftMonth(end, -2);
  const prevEnd = shiftMonth(end, -3);
  const prevStart = shiftMonth(end, -5);
  return {
    current: { from: monthRange(start).from, to: monthRange(end).to },
    previous: { from: monthRange(prevStart).from, to: monthRange(prevEnd).to },
    label: `${start} to ${end}`,
    previousLabel: `${prevStart} to ${prevEnd}`,
  };
}

/** Percentage change, or null when there is no previous value to compare with. */
export function growth(current: number, previous: number): number | null {
  return previous ? ((current - previous) / previous) * 100 : null;
}

// ---------------------------------------------------------------------------
// Headline summary

export interface GrowthSummary {
  current: PeriodMetrics;
  previous: PeriodMetrics | null;   // null if the history doesn't cover the previous 3 months
  revenueGrowth: number | null;
  expenseGrowth: number | null;
  inventoryGrowth: number | null;
  operatingCostGrowth: number | null;
  categoryGrowth: Partial<Record<Category, number>>;
}

export function threeMonthGrowth(transactions: ClassifiedTransaction[], account: Account, asOf: string): GrowthSummary {
  const w = threeMonthWindows(asOf);
  const current = periodMetrics(transactions, account, w.current, w.label);
  const hasPrevious = w.previous.from >= account.openingDate;
  const previous = hasPrevious ? periodMetrics(transactions, account, w.previous, w.previousLabel) : null;

  const categoryGrowth: Partial<Record<Category, number>> = {};
  if (previous) {
    for (const [category, amount] of Object.entries(current.byCategory) as [Category, number][]) {
      const g = growth(amount, previous.byCategory[category] ?? 0);
      if (g !== null) categoryGrowth[category] = g;
    }
  }

  const g = (key: "revenue" | "expenses" | "operatingCosts") => (previous ? growth(current[key], previous[key]) : null);
  return {
    current,
    previous,
    revenueGrowth: g("revenue"),
    expenseGrowth: g("expenses"),
    operatingCostGrowth: g("operatingCosts"),
    inventoryGrowth: previous ? growth(current.byCategory.INVENTORY ?? 0, previous.byCategory.INVENTORY ?? 0) : null,
    categoryGrowth,
  };
}

// ---------------------------------------------------------------------------
// Cash position (SPEC §5 "Derived values")

export interface CashPosition {
  asOf: string;
  cashBalance: number;
  avgDailyOutflow90: number;
  avgDailyOperatingCost90: number;
  minimumReserve: number;
  daysOfCashCover: number;
}

export function cashPosition(transactions: ClassifiedTransaction[], account: Account, asOf: string): CashPosition {
  const window = { from: addDays(asOf, -(LOOKBACK_DAYS - 1)), to: asOf };
  const last90 = periodMetrics(transactions, account, window, "last-90-days");
  const avgDailyOutflow90 = last90.expenses / LOOKBACK_DAYS;
  const avgDailyOperatingCost90 = last90.operatingCosts / LOOKBACK_DAYS;
  const cashBalance = balanceAt(transactions, account, asOf);

  return {
    asOf,
    cashBalance,
    avgDailyOutflow90,
    avgDailyOperatingCost90,
    minimumReserve: Math.round((MINIMUM_RESERVE_DAYS * avgDailyOperatingCost90) / RESERVE_ROUNDING) * RESERVE_ROUNDING,
    daysOfCashCover: avgDailyOutflow90 ? cashBalance / avgDailyOutflow90 : Infinity,
  };
}
