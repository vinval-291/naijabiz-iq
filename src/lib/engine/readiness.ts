// Financial Readiness Profile (SPEC.md §10). Shows healthy financial behaviour — never loan eligibility.

import { formatNairaCompact } from "../format";
import type { Account, ClassifiedTransaction, ReadinessProfile, ScoreComponent } from "../types";
import { addDays, daysBetween } from "./dates";
import {
  cashFlowStabilityScore, cashReserveScore, healthSignals, revenueConsistencyScore,
} from "./health";
import { cashPosition } from "./metrics";
import { clamp01 } from "./stats";

const STRENGTH = 80;
const IMPROVE = 65;
const WEEKS = 13;

export function readinessProfile(transactions: ClassifiedTransaction[], account: Account, asOf: string): ReadinessProfile {
  const history = transactions.filter((t) => t.date <= asOf);
  const s = healthSignals(history, account, asOf);
  const cash = cashPosition(history, account, asOf);

  // Weeks (last 13) with at least 2 sales inflows.
  const start = addDays(asOf, -(WEEKS * 7 - 1));
  const salesPerWeek = new Array<number>(WEEKS).fill(0);
  for (const t of history) {
    if (t.category !== "SALES" || t.date < start) continue;
    salesPerWeek[Math.floor(daysBetween(start, t.date) / 7)]++;
  }
  const weeksWithSales = salesPerWeek.filter((n) => n >= 2).length;

  const pct = (x: number) => `${Math.round(x * 100)}%`;
  const indicators: ScoreComponent[] = [
    {
      key: "activity", label: "Consistent activity", weight: 0.1, score: Math.round(100 * s.activeDayRatio90),
      explanation: `Your account was active on ${pct(s.activeDayRatio90)} of the last 90 days.`,
    },
    {
      key: "revenueStability", label: "Revenue stability", weight: 0.1, score: revenueConsistencyScore(s),
      explanation: s.revenueCV < 0.1 ? "Your monthly sales are steady." : "Your monthly sales vary a lot from month to month.",
    },
    {
      key: "revenueGrowth", label: "Revenue growth", weight: 0.1,
      score: s.revenueGrowth3m === null ? 50 : Math.round(100 * clamp01((s.revenueGrowth3m + 5) / 20)),
      explanation: s.revenueGrowth3m === null
        ? "Not enough history yet to measure growth."
        : `Your sales ${s.revenueGrowth3m >= 0 ? "grew" : "fell"} ${Math.abs(Math.round(s.revenueGrowth3m))}% over the last 3 months.`,
    },
    {
      key: "cashFlowHistory", label: "Positive cash-flow history", weight: 0.2, score: cashFlowStabilityScore(s),
      explanation: `More money came in than went out in ${s.positiveMonths} of the last ${s.months} months.`,
    },
    {
      key: "cashReserve", label: "Cash reserve", weight: 0.2, score: cashReserveScore(s),
      explanation: `Your balance covers about ${Math.floor(s.daysOfCashCover)} days of spending. Ten days or more is a healthy cushion.`,
    },
    {
      key: "predictableExpenses", label: "Predictable expenses", weight: 0.1,
      score: Math.round(Math.max(0, 100 - 2 * s.operatingCostCV * 100)),
      explanation: s.operatingCostCV < 0.1 ? "Your running costs are predictable from month to month." : "Your running costs change a lot from month to month.",
    },
    {
      key: "recordQuality", label: "Record quality", weight: 0.1, score: Math.round(100 * s.confidentShare),
      explanation: `${pct(s.confidentShare)} of your transactions are clearly identified.`,
    },
    {
      key: "recurringIncome", label: "Recurring income", weight: 0.1, score: Math.round((100 * weeksWithSales) / WEEKS),
      explanation: `You received regular customer payments in ${weeksWithSales} of the last ${WEEKS} weeks.`,
    },
  ];

  const score = Math.round(indicators.reduce((total, i) => total + i.weight * i.score, 0));
  const improvements = indicators.filter((i) => i.score < IMPROVE);

  const nextSteps: string[] = [];
  const weak = new Set(improvements.map((i) => i.key));
  if (weak.has("cashReserve")) {
    nextSteps.push(`Build your cash reserve to at least ${formatNairaCompact(cash.minimumReserve)} (about 10 days of running costs) before taking on larger financial commitments.`);
  }
  if (weak.has("cashFlowHistory")) {
    nextSteps.push("Keep stock purchases in line with sales for the next 2–3 months so more money comes in than goes out.");
  }
  if (weak.has("recordQuality")) nextSteps.push("Review your unidentified transactions so your records are complete.");
  if (weak.has("activity") || weak.has("recurringIncome")) nextSteps.push("Receive more of your customer payments into your Wema account so your records show your full business activity.");
  if (!nextSteps.length) nextSteps.push("Keep up your current habits. Your records show healthy financial behaviour.");

  return {
    asOf,
    score,
    band: readinessBand(score),
    indicators,
    strengths: indicators.filter((i) => i.score >= STRENGTH).map((i) => i.label),
    improvements: improvements.map((i) => i.label),
    nextSteps,
  };
}

export function readinessBand(score: number): ReadinessProfile["band"] {
  if (score >= 85) return "Strong";
  if (score >= 65) return "Developing";
  if (score >= 45) return "Emerging";
  return "Early stage";
}
