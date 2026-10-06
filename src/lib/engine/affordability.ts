// "Can I Afford This?" decision simulator (SPEC.md §8).

import { formatDayMonth, formatNairaCompact, formatPercent } from "../format";
import type { AffordabilityResult, Forecast, Verdict } from "../types";
import type { CashPosition, GrowthSummary } from "./metrics";

export const PURPOSES = ["Stock", "Equipment", "Personal", "Other"] as const;
export type Purpose = (typeof PURPOSES)[number];

const RANGE_LOW_FACTOR = 0.85;
const RANGE_STEP = 10_000;
const STOCK_GAP_POINTS = 10;

export interface AffordabilityContext {
  cash: CashPosition;
  forecast: Forecast;
  growth: GrowthSummary;
}

const MESSAGES: Record<Verdict, string> = {
  Comfortable: "Yes, you can afford this comfortably.",
  Careful: "You can, but be careful.",
  Cannot: "Not right now — this could leave you short.",
};

const floorToStep = (n: number) => Math.floor(n / RANGE_STEP) * RANGE_STEP;

export function assessAffordability(amount: number, ctx: AffordabilityContext, purpose?: Purpose): AffordabilityResult {
  if (!Number.isFinite(amount) || amount <= 0) throw new RangeError("Amount must be a positive number of naira");
  amount = Math.round(amount);

  const { cash, forecast, growth } = ctx;
  const currentCash = cash.cashBalance;
  const upcomingExpenses = Math.max(0, currentCash - forecast.lowestBalance);
  const minimumReserve = cash.minimumReserve;
  const remainingBuffer = currentCash - amount - upcomingExpenses;
  const maxSafeAmount = currentCash - upcomingExpenses - minimumReserve;
  const top = floorToStep(maxSafeAmount);
  const recommendedRange: [number, number] | null = top > 0 ? [floorToStep(RANGE_LOW_FACTOR * maxSafeAmount), top] : null;

  const verdict: Verdict = remainingBuffer >= minimumReserve ? "Comfortable" : remainingBuffer >= 0 ? "Careful" : "Cannot";

  const notes: string[] = [];
  const reserve = formatNairaCompact(minimumReserve);
  if (verdict === "Careful") {
    notes.push(
      `After this purchase and your expected expenses, you'd have about ${formatNairaCompact(remainingBuffer)} left. ` +
        `That's below the ${reserve} we suggest keeping for running costs.`,
    );
  } else if (verdict === "Cannot") {
    notes.push(`This could leave you about ${formatNairaCompact(-remainingBuffer)} short of your expected expenses over the next two weeks.`);
  }
  if (verdict !== "Comfortable") {
    notes.push(
      recommendedRange
        ? `Spending ${formatNairaCompact(recommendedRange[0])}–${formatNairaCompact(recommendedRange[1])} would keep your ${reserve} safety reserve intact.`
        : "Wait until your cash improves before making this purchase.",
    );
    if (forecast.lowestBalanceDate > forecast.asOf) {
      notes.push(`Your cash is expected to be lowest around ${formatDayMonth(forecast.lowestBalanceDate)}. Buying after then is safer.`);
    }
  }
  if (purpose === "Stock" && growth.inventoryGrowth !== null && growth.revenueGrowth !== null &&
      growth.inventoryGrowth - growth.revenueGrowth > STOCK_GAP_POINTS) {
    notes.push(
      `Your stock spending is already growing faster than your sales (${formatPercent(growth.inventoryGrowth)} vs ${formatPercent(growth.revenueGrowth)} over 3 months).`,
    );
  }
  if (purpose === "Personal") {
    notes.push("Money taken out for personal use reduces the cash your business runs on.");
  }

  return {
    amount,
    purpose,
    currentCash,
    upcomingExpenses,
    remainingBuffer,
    minimumReserve,
    maxSafeAmount,
    recommendedRange,
    verdict,
    message: MESSAGES[verdict],
    notes,
  };
}
