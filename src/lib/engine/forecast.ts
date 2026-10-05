// 14-day cash-flow forecast (SPEC.md §7). An estimate from recent patterns, never a promise.

import { CATEGORY_LABELS } from "../categories";
import type { Account, ClassifiedTransaction, Forecast, RiskLevel, ScheduledPayment } from "../types";
import { addDays } from "./dates";
import { balanceAt, cashPosition } from "./metrics";
import { detectRecurringSeries } from "./recurrence";
import { sum } from "./stats";

export const HORIZON_DAYS = 14;
const RECENT_DAYS = 28;
/** A drop larger than this share of today's balance is "Medium" risk even above the reserve. */
const MEDIUM_DROP = 0.15;

/** Recurring outflows (rent, salaries, suppliers…) expected to fall due within the horizon. */
export function scheduledPayments(transactions: ClassifiedTransaction[], asOf: string, horizonDays = HORIZON_DAYS): ScheduledPayment[] {
  const end = addDays(asOf, horizonDays);
  const byId = new Map(transactions.map((t) => [t.id, t]));
  const payments: ScheduledPayment[] = [];

  for (const series of detectRecurringSeries(transactions)) {
    if (series.direction !== "debit") continue;
    const last = byId.get(series.transactionIds[series.transactionIds.length - 1])!;
    let due = addDays(series.lastDate, series.cadence);
    while (due <= asOf) due = addDays(due, series.cadence); // skip anything already overdue
    for (; due <= end; due = addDays(due, series.cadence)) {
      payments.push({ date: due, label: series.counterparty, amount: series.typicalAmount, category: last.category });
    }
  }
  return payments.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
}

export function forecastCash(transactions: ClassifiedTransaction[], account: Account, asOf: string): Forecast {
  const history = transactions.filter((t) => t.date <= asOf);
  const recentStart = addDays(asOf, -(RECENT_DAYS - 1));
  const recent = history.filter((t) => t.date >= recentStart);

  const recurringIds = new Set(
    detectRecurringSeries(history).filter((s) => s.direction === "debit").flatMap((s) => s.transactionIds),
  );
  const dailyInflow = sum(recent.filter((t) => t.category === "SALES").map((t) => t.amount)) / RECENT_DAYS;
  const dailyVariableOutflow =
    sum(recent.filter((t) => t.direction === "debit" && !recurringIds.has(t.id)).map((t) => t.amount)) / RECENT_DAYS;
  const scheduled = scheduledPayments(history, asOf);

  const startBalance = balanceAt(history, account, asOf);
  let balance = startBalance;
  let lowest = { balance: startBalance, date: asOf };
  const daily: Forecast["daily"] = [];
  for (let d = 1; d <= HORIZON_DAYS; d++) {
    const date = addDays(asOf, d);
    const dueToday = sum(scheduled.filter((p) => p.date === date).map((p) => p.amount));
    balance += dailyInflow - dailyVariableOutflow - dueToday;
    daily.push({ date, balance: Math.round(balance) });
    if (balance < lowest.balance) lowest = { balance, date };
  }

  const { minimumReserve } = cashPosition(history, account, asOf);
  const drop = startBalance > 0 ? (startBalance - lowest.balance) / startBalance : 0;
  const risk: RiskLevel = lowest.balance < minimumReserve ? "High" : drop > MEDIUM_DROP ? "Medium" : "Low";

  return {
    asOf,
    horizonDays: HORIZON_DAYS,
    expectedInflow: Math.round(dailyInflow * HORIZON_DAYS),
    expectedOutflow: Math.round(dailyVariableOutflow * HORIZON_DAYS + sum(scheduled.map((p) => p.amount))),
    projectedEndBalance: Math.round(balance),
    lowestBalance: Math.round(lowest.balance),
    lowestBalanceDate: lowest.date,
    daily,
    scheduled,
    risk,
    reason: forecastReason(risk, scheduled, lowest.date),
  };
}

function forecastReason(risk: RiskLevel, scheduled: ScheduledPayment[], lowestDate: string): string {
  const before = scheduled.filter((p) => p.date <= lowestDate);
  const biggest = [...(before.length ? before : scheduled)].sort((a, b) => b.amount - a.amount).slice(0, 2);
  const names = biggest.map((p) => (p.category === "INVENTORY" ? `your payment to ${titleCase(p.label)}` : CATEGORY_LABELS[p.category].toLowerCase()));
  const drivers = names.length ? ` because ${names.join(" and ")} ${names.length > 1 ? "are" : "is"} due` : "";

  if (risk === "High") return `Based on your recent patterns, your cash may fall below your safety reserve${drivers}.`;
  if (risk === "Medium") return `Based on your recent patterns, your cash is likely to get tighter over the next two weeks${drivers}.`;
  return "Based on your recent patterns, your cash position should stay comfortable over the next two weeks.";
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}
