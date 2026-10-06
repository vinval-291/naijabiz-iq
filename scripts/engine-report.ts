// Prints the numbers the app will show for a date (SPEC.md §13 acceptance checklist).
//
//   npm run engine:report                         as of 2026-09-30
//   npm run engine:report 2026-06-30              as of another date
//   npm run engine:report -- --confirm-fuel       after Aisha marks one bare "POS PURCHASE" as generator fuel

import accountJson from "../src/data/account.json";
import transactionsJson from "../src/data/transactions.json";
import { CATEGORY_LABELS } from "../src/lib/categories";
import { NO_CONFIRMATIONS, classifyTransactions, confirmCategory, needsReview } from "../src/lib/engine/classify";
import { analyze } from "../src/lib/engine";
import { assessAffordability } from "../src/lib/engine/affordability";
import { checkNumbers } from "../src/lib/engine/insights";
import { MINIMUM_RESERVE_DAYS } from "../src/lib/engine/metrics";
import { formatNaira } from "../src/lib/format";
import type { Account, Category, RawTransaction } from "../src/lib/types";

const args = process.argv.slice(2);
const ASOF = args.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? "2026-09-30";
const account = accountJson as Account;
const raw = transactionsJson as RawTransaction[];

let confirmations = NO_CONFIRMATIONS;
if (args.includes("--confirm-fuel")) {
  const fuel = classifyTransactions(raw).find((t) => needsReview(t) && t.description === "POS PURCHASE")!;
  confirmations = confirmCategory(confirmations, raw.find((t) => t.id === fuel.id)!, "GENERATOR_FUEL");
}

const a = analyze(raw, account, ASOF, confirmations);
const naira = formatNaira;
const k = (n: number) => `${(n / 1000).toFixed(0)}K`.padStart(7);
const pct = (n: number | null) => (n === null ? "n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`);

console.log(`\nNaijaBiz IQ engine report — as of ${ASOF}${args.includes("--confirm-fuel") ? " (after confirming one fuel purchase)" : ""}`);
console.log(`Transactions: ${a.transactions.length}, flagged for review: ${a.flagged.length}`);

console.log("\nMonthly");
console.log("  Month      Revenue  Expenses  Stock    Running   Net      Balance");
for (const m of a.months) {
  console.log(`  ${m.period}  ${k(m.revenue)}  ${k(m.expenses)}  ${k(m.byCategory.INVENTORY ?? 0)}  ${k(m.operatingCosts)}  ${k(m.netCashFlow)}  ${k(m.closingBalance)}`);
}

const g = a.growth;
console.log(`\nLast 3 months (${g.current.period}) vs previous (${g.previous?.period ?? "none"})`);
console.log(`  Revenue ${pct(g.revenueGrowth)} · Expenses ${pct(g.expenseGrowth)} · Stock ${pct(g.inventoryGrowth)} · Running costs ${pct(g.operatingCostGrowth)}`);
const rising = (Object.entries(g.categoryGrowth) as [Category, number][]).sort((x, y) => y[1] - x[1]);
console.log(`  By category: ${rising.map(([c, v]) => `${CATEGORY_LABELS[c]} ${pct(v)}`).join(", ")}`);

console.log("\nCash position");
console.log(`  Balance ${naira(a.cash.cashBalance)} · ${a.cash.daysOfCashCover.toFixed(1)} days of cover`);
console.log(`  Avg daily outflow (90d) ${naira(a.cash.avgDailyOutflow90)} · running costs ${naira(a.cash.avgDailyOperatingCost90)}`);
console.log(`  Minimum reserve (${MINIMUM_RESERVE_DAYS} days of running costs): ${naira(a.cash.minimumReserve)}`);

const prev = a.previousHealth ? ` (was ${a.previousHealth.score} — ${a.previousHealth.band} on ${a.previousHealth.asOf})` : "";
console.log(`\nBusiness Health Score: ${a.health.score} — ${a.health.band}${prev}`);
for (const c of a.health.components) console.log(`  ${c.label.padEnd(24)} ${String(c.score).padStart(3)}  ${c.explanation}`);

const f = a.forecast;
console.log(`\nForecast (${f.horizonDays} days): risk ${f.risk}`);
console.log(`  ${f.reason}`);
console.log(`  Expected in ${naira(f.expectedInflow)} · out ${naira(f.expectedOutflow)} · end balance ${naira(f.projectedEndBalance)}`);
console.log(`  Lowest ${naira(f.lowestBalance)} on ${f.lowestBalanceDate} (a drop of ${naira(a.cash.cashBalance - f.lowestBalance)})`);
console.log(`  Scheduled: ${f.scheduled.map((p) => `${p.date.slice(5)} ${p.label} ${k(p.amount).trim()}`).join(" · ")}`);

console.log("\nInsights (first = dashboard key insight)");
for (const i of a.insights) {
  const check = checkNumbers(`${i.title} ${i.body}`, a.insightFacts);
  console.log(`  [${i.tone}] ${i.title}${check.ok ? "" : `  ⚠ unverified: ${check.unmatched.join(", ")}`}`);
  console.log(`         ${i.body}`);
}

console.log("\nRecommendations");
for (const r of a.recommendations) {
  console.log(`  [${r.priority}] ${r.title}`);
  console.log(`         ${r.message}`);
  console.log(`         Why: ${r.supportingMetric.label} = ${r.supportingMetric.value}`);
}

console.log("\nCan I Afford This?");
for (const [amount, purpose] of [[100_000, undefined], [300_000, "Stock"], [500_000, undefined]] as const) {
  const r = assessAffordability(amount, a, purpose);
  const range = r.recommendedRange ? `${naira(r.recommendedRange[0])}–${naira(r.recommendedRange[1])}` : "none";
  console.log(`  ${naira(amount)}${purpose ? ` (${purpose})` : ""}: ${r.verdict} — "${r.message}"`);
  console.log(`         cash ${naira(r.currentCash)} − purchase − upcoming ${naira(r.upcomingExpenses)} = buffer ${naira(r.remainingBuffer)} · reserve ${naira(r.minimumReserve)} · range ${range}`);
  r.notes.forEach((n) => console.log(`         • ${n}`));
}

const rd = a.readiness;
console.log(`\nFinancial Readiness: ${rd.score} — ${rd.band}`);
for (const i of rd.indicators) console.log(`  ${i.label.padEnd(28)} ${String(i.score).padStart(3)}  ${i.explanation}`);
console.log(`  Strengths: ${rd.strengths.join(", ") || "—"}`);
console.log(`  To improve: ${rd.improvements.join(", ") || "—"}`);
rd.nextSteps.forEach((s) => console.log(`  → ${s}`));
console.log("");
