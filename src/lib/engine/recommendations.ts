// Recommendation rules (SPEC.md §9). Each rule fires on a verified metric and records it.

import { CATEGORY_LABELS } from "../categories";
import { formatDayMonth, formatMonthName, formatName, formatNaira, formatNairaCompact, formatPercent } from "../format";
import type { Account, Category, ClassifiedTransaction, Forecast, Recommendation } from "../types";
import { needsReview } from "./classify";
import { cashPosition, monthlyMetrics, threeMonthGrowth, threeMonthWindows, type GrowthSummary } from "./metrics";
import { sum } from "./stats";

const PRIORITY_ORDER: Recommendation["priority"][] = ["High", "Medium", "Low", "Info"];
const STOCK_GAP_POINTS = 10;
const RISING_COST_PCT = 25;
const MAX_RISING_COSTS = 2;
const SUPPLIER_SHARE = 0.4;
/** Above this share of running costs, uncategorized spending can distort category growth (SPEC §5). */
const UNCATEGORIZED_DISTORTION = 0.03;

export function isCategoryGrowthDistorted(g: GrowthSummary): boolean {
  const share = (p: GrowthSummary["current"] | null) =>
    p && p.operatingCosts ? (p.byCategory.UNCATEGORIZED ?? 0) / p.operatingCosts : 0;
  return share(g.current) > UNCATEGORIZED_DISTORTION || share(g.previous) > UNCATEGORIZED_DISTORTION;
}

/** Running-cost categories that grew more than 25% (3m), largest first. Empty when the comparison could be distorted. */
export function risingCosts(g: GrowthSummary): { category: Category; growth: number }[] {
  if (!g.previous || isCategoryGrowthDistorted(g)) return [];
  return (Object.entries(g.categoryGrowth) as [Category, number][])
    .filter(([c, v]) => c !== "INVENTORY" && c !== "UNCATEGORIZED" && v > RISING_COST_PCT)
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_RISING_COSTS)
    .map(([category, growth]) => ({ category, growth }));
}

export function recommendations(
  transactions: ClassifiedTransaction[],
  account: Account,
  asOf: string,
  forecast: Forecast,
): Recommendation[] {
  const history = transactions.filter((t) => t.date <= asOf);
  const g = threeMonthGrowth(history, account, asOf);
  const cash = cashPosition(history, account, asOf);
  const lastMonth = monthlyMetrics(history, account, asOf).at(-1);
  const flagged = history.filter(needsReview);
  const recs: Recommendation[] = [];

  // 1 & 2: forecast risk
  if (forecast.risk === "High") {
    recs.push({
      id: "cash-below-reserve", priority: "High",
      title: "Protect your cash: you may fall below your safety reserve",
      message:
        `Your cash could drop to about ${formatNairaCompact(forecast.lowestBalance)} around ${formatDayMonth(forecast.lowestBalanceDate)}, ` +
        `below the ${formatNairaCompact(cash.minimumReserve)} we suggest keeping for running costs. Delay non-essential purchases and new stock orders until more sales come in.`,
      supportingMetric: { label: "Lowest expected balance", value: formatNaira(forecast.lowestBalance) },
    });
  } else if (forecast.risk === "Medium") {
    recs.push({
      id: "protect-reserve", priority: "High",
      title: "Protect your operating cash reserve",
      message:
        `Your cash is expected to fall to about ${formatNairaCompact(forecast.lowestBalance)} by ${formatDayMonth(forecast.lowestBalanceDate)} as supplier payments fall due. ` +
        `Keep at least ${formatNairaCompact(cash.minimumReserve)} for running costs and avoid large non-essential purchases for the next two weeks.`,
      supportingMetric: { label: "Lowest expected balance", value: formatNaira(forecast.lowestBalance) },
    });
  }

  // 3: spent more than earned last month
  if (lastMonth && lastMonth.revenue > 0 && lastMonth.expenseRatio > 1) {
    const month = formatMonthName(lastMonth.period);
    recs.push({
      id: "overspent-last-month", priority: "High",
      title: "You spent more than you earned last month",
      message:
        `In ${month} you spent ${formatNairaCompact(lastMonth.expenses)} and earned ${formatNairaCompact(lastMonth.revenue)} from sales. ` +
        `Look at what you can delay or reduce this month.`,
      supportingMetric: { label: `Spent per ₦1 earned (${month})`, value: `₦${lastMonth.expenseRatio.toFixed(2)}` },
    });
  }

  // 4: stock growing faster than sales
  if (g.inventoryGrowth !== null && g.revenueGrowth !== null && g.inventoryGrowth - g.revenueGrowth > STOCK_GAP_POINTS) {
    recs.push({
      id: "review-stock", priority: "Medium",
      title: "Review your stock purchases",
      message:
        `Over the last 3 months your stock spending grew ${formatPercent(g.inventoryGrowth)} while your sales grew ${formatPercent(g.revenueGrowth)}. ` +
        `You may be buying more than you sell. Check for slow-moving items before your next order.`,
      supportingMetric: { label: "Stock vs sales growth", value: `${formatPercent(g.inventoryGrowth)} vs ${formatPercent(g.revenueGrowth)}` },
    });
  }

  // 5: rising running costs — only when uncategorized spending can't distort the comparison
  const distorted = isCategoryGrowthDistorted(g);
  if (g.previous) {
    for (const { category, growth: value } of risingCosts(g)) {
      const label = CATEGORY_LABELS[category];
      recs.push({
        id: `rising-${category.toLowerCase()}`, priority: "Medium",
        title: `${label} costs are rising`,
        message:
          `${label} cost ${formatNairaCompact(g.current.byCategory[category] ?? 0)} over the last 3 months, up ${formatPercent(value)} ` +
          `from ${formatNairaCompact(g.previous.byCategory[category] ?? 0)}. Check whether this is a price rise or extra use.`,
        supportingMetric: { label: `${label} growth (3 months)`, value: formatPercent(value) },
      });
    }
  }

  // 6: one supplier dominates stock spending
  const window = threeMonthWindows(asOf).current;
  const stock = history.filter((t) => t.category === "INVENTORY" && t.counterparty && t.date >= window.from && t.date <= window.to);
  const bySupplier = new Map<string, number>();
  for (const t of stock) bySupplier.set(t.counterparty!, (bySupplier.get(t.counterparty!) ?? 0) + t.amount);
  const stockTotal = sum([...bySupplier.values()]);
  const [topSupplier, topAmount] = [...bySupplier].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (topSupplier && stockTotal && topAmount / stockTotal > SUPPLIER_SHARE) {
    const name = formatName(topSupplier);
    const sharePct = `${Math.round((topAmount / stockTotal) * 100)}%`;
    recs.push({
      id: "supplier-terms", priority: "Low",
      title: `Consider negotiating payment timing with ${name}`,
      message:
        `${sharePct} of your stock spending in the last 3 months went to ${name}. ` +
        `Asking for a few extra days to pay could ease the pressure on your cash.`,
      supportingMetric: { label: "Share of stock spending", value: sharePct },
    });
  }

  // 7: transactions waiting for the user
  if (flagged.length) {
    const n = flagged.length;
    recs.push({
      id: "categorize", priority: distorted ? "Medium" : "Low",
      title: `Categorize ${n} unidentified transaction${n === 1 ? "" : "s"}`,
      message: distorted
        ? `We couldn't confidently identify ${n} transaction${n === 1 ? "" : "s"}, totalling ${formatNairaCompact(sum(flagged.map((t) => t.amount)))}. Tell us what they were for so we can measure your costs accurately.`
        : `We couldn't confidently identify ${n} transaction${n === 1 ? "" : "s"}. Tell us what they were for and NaijaBiz IQ will recognize similar ones next time.`,
      supportingMetric: { label: "Unidentified transactions", value: String(n) },
    });
  }

  // 8: positive momentum
  if (g.revenueGrowth !== null && g.expenseGrowth !== null && g.revenueGrowth > 0 && g.revenueGrowth > g.expenseGrowth) {
    recs.push({
      id: "momentum", priority: "Info",
      title: "Your sales momentum is positive",
      message: `Your sales grew ${formatPercent(g.revenueGrowth)} over the last 3 months, faster than your spending (${formatPercent(g.expenseGrowth)}). Keep it up.`,
      supportingMetric: { label: "Sales growth (3 months)", value: formatPercent(g.revenueGrowth) },
    });
  }

  // Stable sort keeps rule order within a priority.
  return recs.sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
}
