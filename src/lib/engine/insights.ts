// Insight layer (SPEC.md §11): turns verified metrics into plain-language explanations.
//
// The engine calculates; this module only explains. It is template-based (no paid API):
// every number in an insight comes from `InsightFacts`, and `checkNumbers` verifies that,
// so the same guard works for any language model added later.

import { CATEGORY_LABELS } from "../categories";
import { formatDayMonth, formatMonthName, formatNairaCompact } from "../format";
import type { Analysis } from "./index";
import type { Insight, InsightFacts } from "../types";
import { MINIMUM_RESERVE_DAYS, growth } from "./metrics";
import { risingCosts } from "./recommendations";

const STOCK_GAP_POINTS = 10;
const CASH_CHANGE_PCT = 5;
const HEALTH_CHANGE_POINTS = 5;

export function buildInsightFacts(a: Omit<Analysis, "insightFacts" | "insights">): InsightFacts {
  const last = a.months.at(-1) ?? null;
  const previousMonthBalance = a.months.at(-2)?.closingBalance ?? null;
  const weakest = [...a.health.components].sort((x, y) => x.score - y.score).slice(0, 2);
  const flagged = a.flagged;
  const topRising = risingCosts(a.growth)[0] ?? null;

  return {
    asOf: a.asOf,
    lastMonth: last?.period ?? null,
    lastMonthRevenue: last?.revenue ?? 0,
    lastMonthExpenses: last?.expenses ?? 0,
    revenueGrowth3m: a.growth.revenueGrowth,
    expenseGrowth3m: a.growth.expenseGrowth,
    inventoryGrowth3m: a.growth.inventoryGrowth,
    cashBalance: a.cash.cashBalance,
    previousMonthBalance,
    cashBalanceChangeMoM: previousMonthBalance === null ? null : growth(a.cash.cashBalance, previousMonthBalance),
    minimumReserve: a.cash.minimumReserve,
    healthScore: a.health.score,
    healthBand: a.health.band,
    healthScorePrev: a.previousHealth?.score ?? null,
    healthPrevDate: a.previousHealth?.asOf ?? null,
    weakestHealthComponents: weakest.map((c) => c.label),
    forecastRisk: a.forecast.risk,
    lowestBalance: a.forecast.lowestBalance,
    lowestBalanceDate: a.forecast.lowestBalanceDate,
    horizonDays: a.forecast.horizonDays,
    flaggedCount: flagged.length,
    flaggedTotal: flagged.reduce((s, t) => s + t.amount, 0),
    topRisingCost: topRising,
  };
}

const pct = (n: number) => `${Math.round(Math.abs(n))}%`;
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Plain-language insights, most important first. The first one is the dashboard's key insight. */
export function writeInsights(f: InsightFacts): Insight[] {
  const out: Insight[] = [];
  const month = f.lastMonth ? formatMonthName(f.lastMonth) : null;

  // Sales vs stock
  if (f.revenueGrowth3m !== null) {
    if (f.inventoryGrowth3m !== null && f.inventoryGrowth3m - f.revenueGrowth3m > STOCK_GAP_POINTS && f.revenueGrowth3m > 0) {
      out.push({
        id: "growth-vs-stock", tone: "warning",
        title: "Sales are growing, but stock spending is growing faster",
        body:
          `Over the last 3 months your sales rose ${pct(f.revenueGrowth3m)}, but your stock purchases rose ${pct(f.inventoryGrowth3m)}. ` +
          "If this continues, more of your cash will be tied up in stock and less will be free for running costs.",
      });
    } else if (f.revenueGrowth3m >= 0) {
      out.push({
        id: "sales-growth", tone: "positive", title: "Your sales are growing",
        body: `Your sales rose ${pct(f.revenueGrowth3m)} over the last 3 months compared with the 3 months before.`,
      });
    } else {
      out.push({
        id: "sales-falling", tone: "warning", title: "Your sales are falling",
        body: `Your sales fell ${pct(f.revenueGrowth3m)} over the last 3 months compared with the 3 months before.`,
      });
    }
  }

  // Last month: earned vs spent
  if (month && f.lastMonthRevenue > 0) {
    const overspent = f.lastMonthExpenses > f.lastMonthRevenue;
    out.push({
      id: "spent-vs-earned", tone: overspent ? "warning" : "positive",
      title: overspent ? `You spent more than you earned in ${month}` : `You earned more than you spent in ${month}`,
      body:
        `You earned ${formatNairaCompact(f.lastMonthRevenue)} from sales and spent ${formatNairaCompact(f.lastMonthExpenses)}` +
        (overspent ? ", so your cash went down." : ", so your cash went up."),
    });
  }

  // Cash balance trend
  if (month && f.cashBalanceChangeMoM !== null && f.previousMonthBalance !== null && Math.abs(f.cashBalanceChangeMoM) >= CASH_CHANGE_PCT) {
    const falling = f.cashBalanceChangeMoM < 0;
    out.push({
      id: "cash-trend", tone: falling ? "warning" : "positive",
      title: falling ? "Your cash balance is shrinking" : "Your cash balance is growing",
      body:
        `Your balance ${falling ? "fell" : "rose"} ${pct(f.cashBalanceChangeMoM)} during ${month}, ` +
        `from ${formatNairaCompact(f.previousMonthBalance)} to ${formatNairaCompact(f.cashBalance)}.`,
    });
  }

  // Forecast
  const low = formatNairaCompact(f.lowestBalance);
  const lowDate = formatDayMonth(f.lowestBalanceDate);
  const reserve = formatNairaCompact(f.minimumReserve);
  if (f.forecastRisk === "High") {
    out.push({
      id: "forecast", tone: "warning", title: "You may run short of cash in the next two weeks",
      body:
        `Based on your recent patterns, your balance could drop to about ${low} around ${lowDate}. ` +
        `That's below the ${reserve} we suggest keeping for running costs.`,
    });
  } else if (f.forecastRisk === "Medium") {
    out.push({
      id: "forecast", tone: "warning", title: "Cash may get tighter in the next two weeks",
      body:
        `Based on your recent patterns, your balance is likely to be lowest around ${lowDate}, at about ${low}, as supplier payments fall due. ` +
        `That's still above the ${reserve} we suggest keeping, but there's less room for extra spending.`,
    });
  } else {
    out.push({
      id: "forecast", tone: "positive", title: "Your cash looks comfortable for the next two weeks",
      body: `Based on your recent patterns, your balance is likely to stay above ${low} over the next two weeks.`,
    });
  }

  // Health score trend
  const weakest = f.weakestHealthComponents.map(lower).join(" and ");
  if (f.healthScorePrev !== null && f.healthPrevDate && Math.abs(f.healthScore - f.healthScorePrev) >= HEALTH_CHANGE_POINTS) {
    const fell = f.healthScore < f.healthScorePrev;
    out.push({
      id: "health-trend", tone: fell ? "warning" : "positive",
      title: fell ? "Your Business Health Score has dropped" : "Your Business Health Score has improved",
      body:
        `It ${fell ? "fell" : "rose"} from ${f.healthScorePrev} on ${formatDayMonth(f.healthPrevDate)} to ${f.healthScore} today.` +
        (fell && weakest ? ` The weakest areas are ${weakest}.` : ""),
    });
  } else {
    out.push({
      id: "health-trend", tone: "neutral", title: `Your Business Health Score is ${f.healthScore} (${f.healthBand})`,
      body: weakest ? `The areas with the most room to improve are ${weakest}.` : "Keep up your current habits.",
    });
  }

  // Rising running cost
  if (f.topRisingCost) {
    const label = CATEGORY_LABELS[f.topRisingCost.category];
    out.push({
      id: "rising-cost", tone: "warning", title: `${label} costs are rising`,
      body: `You spent ${pct(f.topRisingCost.growth)} more on ${lower(label)} over the last 3 months than in the 3 months before.`,
    });
  }

  // Waiting for the user
  if (f.flaggedCount > 0) {
    const n = f.flaggedCount;
    out.push({
      id: "uncategorized", tone: "neutral",
      title: `${n} transaction${n === 1 ? "" : "s"} still need${n === 1 ? "s" : ""} your input`,
      body:
        `We couldn't confidently identify ${n} transaction${n === 1 ? "" : "s"} worth ${formatNairaCompact(f.flaggedTotal)} in total. ` +
        "Telling us what they were makes your numbers more accurate.",
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Number checker

export interface NumberCheck {
  ok: boolean;
  unmatched: string[];
}

const MONEY = /₦\s?(\d[\d,]*(?:\.\d+)?)\s?([KM])?/g;
const PERCENT = /[+−-]?(\d+(?:\.\d+)?)\s?%/g;
const PLAIN = /\b\d+(?:\.\d+)?\b/g;
/** Plain numbers below this (e.g. "3 months") are wording, not facts. */
const PLAIN_MIN = 10;

/**
 * Checks that every ₦ amount, percentage and number ≥ 10 in `text` matches a fact,
 * allowing for display rounding. Used on templated insights and on any model output.
 */
export function checkNumbers(text: string, f: InsightFacts): NumberCheck {
  const money = [
    f.lastMonthRevenue, f.lastMonthExpenses, f.cashBalance, f.previousMonthBalance, f.minimumReserve, f.lowestBalance, f.flaggedTotal,
  ].filter((v): v is number => v !== null);
  const percents = [f.revenueGrowth3m, f.expenseGrowth3m, f.inventoryGrowth3m, f.cashBalanceChangeMoM, f.topRisingCost?.growth ?? null]
    .filter((v): v is number => v !== null)
    .map(Math.abs);
  const dates = [f.asOf, f.lowestBalanceDate, f.healthPrevDate].filter((d): d is string => d !== null);
  const plain = [
    f.healthScore, f.healthScorePrev, f.flaggedCount, f.horizonDays, MINIMUM_RESERVE_DAYS,
    ...dates.flatMap((d) => [Number(d.slice(0, 4)), Number(d.slice(8, 10))]),
  ].filter((v): v is number => v !== null);

  const unmatched: string[] = [];
  let rest = text;

  for (const m of text.matchAll(MONEY)) {
    const value = Number(m[1].replace(/,/g, "")) * (m[2] === "M" ? 1_000_000 : m[2] === "K" ? 1_000 : 1);
    const tolerance = m[2] === "M" ? 5_000 : m[2] === "K" ? 500 : 1;
    if (!money.some((v) => Math.abs(v - value) <= tolerance)) unmatched.push(m[0]);
    rest = rest.replace(m[0], " ");
  }
  for (const m of rest.matchAll(PERCENT)) {
    const value = Number(m[1]);
    const tolerance = m[1].includes(".") ? 0.05 : 0.5;
    if (!percents.some((v) => Math.abs(v - value) <= tolerance)) unmatched.push(m[0]);
    rest = rest.replace(m[0], " ");
  }
  for (const m of rest.matchAll(PLAIN)) {
    const value = Number(m[0]);
    if (value >= PLAIN_MIN && !plain.includes(value)) unmatched.push(m[0]);
  }
  return { ok: unmatched.length === 0, unmatched };
}
