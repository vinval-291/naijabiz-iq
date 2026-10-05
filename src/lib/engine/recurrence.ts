// Detects regular payment patterns (SPEC.md §7 step 1). Used by the classifier and the forecast.

import type { Direction, RawTransaction } from "../types";
import { daysBetween } from "./dates";
import { coefficientOfVariation, median } from "./stats";

export type Cadence = 7 | 14 | 30;

export interface RecurringSeries {
  key: string;               // normalized counterparty
  counterparty: string;
  direction: Direction;
  cadence: Cadence;
  transactionIds: string[];
  lastDate: string;
  typicalAmount: number;     // median of the last 3 amounts
}

const CADENCES: Cadence[] = [7, 14, 30];
const MIN_OCCURRENCES = 3;
const MAX_AMOUNT_CV = 0.25;

export function counterpartyKey(counterparty: string | null): string | null {
  const key = counterparty?.trim().toUpperCase().replace(/\s+/g, " ");
  return key || null;
}

/** The cadence closest to the median interval, if it's within ±20% (at least ±2 days). */
function matchCadence(intervals: number[]): Cadence | null {
  const m = median(intervals);
  const best = CADENCES.reduce((a, b) => (Math.abs(m - a) <= Math.abs(m - b) ? a : b));
  return Math.abs(m - best) <= Math.max(2, best * 0.2) ? best : null;
}

export function detectRecurringSeries(transactions: RawTransaction[]): RecurringSeries[] {
  const groups = new Map<string, RawTransaction[]>();
  for (const t of transactions) {
    const key = counterpartyKey(t.counterparty);
    if (!key) continue;
    const groupKey = `${t.direction}|${key}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), t]);
  }

  const series: RecurringSeries[] = [];
  for (const group of groups.values()) {
    if (group.length < MIN_OCCURRENCES) continue;
    const sorted = [...group].sort((a, b) => a.date.localeCompare(b.date));
    // Same-day payments (e.g. two staff on payday) count as one occurrence for the interval.
    const dates = [...new Set(sorted.map((t) => t.date))];
    if (dates.length < MIN_OCCURRENCES) continue;
    const intervals = dates.slice(1).map((d, i) => daysBetween(dates[i], d));
    const cadence = matchCadence(intervals);
    if (!cadence) continue;
    if (coefficientOfVariation(sorted.map((t) => t.amount)) > MAX_AMOUNT_CV) continue;

    series.push({
      key: counterpartyKey(sorted[0].counterparty)!,
      counterparty: sorted[0].counterparty!,
      direction: sorted[0].direction,
      cadence,
      transactionIds: sorted.map((t) => t.id),
      lastDate: dates[dates.length - 1],
      typicalAmount: median(sorted.slice(-3).map((t) => t.amount)),
    });
  }
  return series;
}
