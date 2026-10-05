// Prints the numbers the app will show for the demo date (SPEC.md §13 acceptance checklist).
// Grows as each engine phase lands.
//
//   npm run engine:report

import accountJson from "../src/data/account.json";
import transactionsJson from "../src/data/transactions.json";
import { CATEGORY_LABELS } from "../src/lib/categories";
import { classifyTransactions, needsReview } from "../src/lib/engine/classify";
import { MINIMUM_RESERVE_DAYS, cashPosition, monthlyMetrics, threeMonthGrowth } from "../src/lib/engine/metrics";
import type { Account, Category, RawTransaction } from "../src/lib/types";

const ASOF = process.argv[2] ?? "2026-09-30";
const account = accountJson as Account;
const transactions = classifyTransactions(transactionsJson as RawTransaction[]);

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const k = (n: number) => `${(n / 1000).toFixed(0)}K`.padStart(7);
const pct = (n: number | null) => (n === null ? "  n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);

console.log(`\nNaijaBiz IQ engine report — as of ${ASOF}`);
console.log(`Transactions: ${transactions.filter((t) => t.date <= ASOF).length}, flagged for review: ${transactions.filter((t) => t.date <= ASOF && needsReview(t)).length}`);

console.log("\nMonthly");
console.log("  Month      Revenue  Expenses  Stock    Running   Net      Balance");
for (const m of monthlyMetrics(transactions, account, ASOF)) {
  console.log(`  ${m.period}  ${k(m.revenue)}  ${k(m.expenses)}  ${k(m.byCategory.INVENTORY ?? 0)}  ${k(m.operatingCosts)}  ${k(m.netCashFlow)}  ${k(m.closingBalance)}`);
}

const g = threeMonthGrowth(transactions, account, ASOF);
console.log(`\nLast 3 months (${g.current.period}) vs previous (${g.previous?.period ?? "none"})`);
console.log(`  Revenue ${pct(g.revenueGrowth)} · Expenses ${pct(g.expenseGrowth)} · Stock ${pct(g.inventoryGrowth)} · Running costs ${pct(g.operatingCostGrowth)}`);
const rising = (Object.entries(g.categoryGrowth) as [Category, number][]).sort((a, b) => b[1] - a[1]);
console.log(`  By category: ${rising.map(([c, v]) => `${CATEGORY_LABELS[c]} ${pct(v)}`).join(", ")}`);

const cash = cashPosition(transactions, account, ASOF);
console.log("\nCash position");
console.log(`  Balance ${naira(cash.cashBalance)} · ${cash.daysOfCashCover.toFixed(1)} days of cover`);
console.log(`  Avg daily outflow (90d) ${naira(cash.avgDailyOutflow90)} · running costs ${naira(cash.avgDailyOperatingCost90)}`);
console.log(`  Minimum reserve (${MINIMUM_RESERVE_DAYS} days of running costs): ${naira(cash.minimumReserve)}\n`);
