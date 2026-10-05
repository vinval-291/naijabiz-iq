// Checks the generated dataset against SPEC.md §3. Exits with code 1 if any check fails.
//
//   npm run data:validate

import account from "../src/data/account.json";
import transactionsJson from "../src/data/transactions.json";
import groundTruthJson from "../data/ground-truth.json";
import type { GroundTruth, RawTransaction } from "../src/lib/types";
import { EXPECTED, MONTH_TARGETS, MONTHLY_TOLERANCE, TOTAL_TRANSACTIONS } from "./targets";

const txns = transactionsJson as RawTransaction[];
const truth = groundTruthJson as Record<string, GroundTruth>;

let failures = 0;
function check(label: string, ok: boolean, detail: string) {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label.padEnd(44)} ${detail}`);
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString("en-NG")}`;
const k = (n: number) => `${(n / 1000).toFixed(0)}K`;
const pct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
const within = (actual: number, target: number, tol: number) => Math.abs(actual - target) <= Math.abs(target) * tol;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

// ---------------------------------------------------------------------------
console.log("\nStructure");

check("Transaction count", txns.length === TOTAL_TRANSACTIONS, `${txns.length} (target ${TOTAL_TRANSACTIONS})`);
check("Unique IDs", new Set(txns.map((t) => t.id)).size === txns.length, "");
check("Every transaction has ground truth", txns.every((t) => truth[t.id]), "");
check("No hidden fields in app data", txns.every((t) => !("trueCategory" in t) && !("descriptionLevel" in t)), "");
check("Amounts are positive integers", txns.every((t) => Number.isInteger(t.amount) && t.amount > 0), "");
check("Dates within Apr 1 – Sep 30, 2026", txns.every((t) => t.date >= "2026-04-01" && t.date <= "2026-09-30"), "");
check("Sorted by date", txns.every((t, i) => i === 0 || txns[i - 1].date <= t.date), "");

let running = account.openingBalance;
let chainOk = true;
let minBalance = { value: Infinity, date: "" };
for (const t of txns) {
  running += t.direction === "credit" ? t.amount : -t.amount;
  if (running !== t.balanceAfter) chainOk = false;
  if (running < minBalance.value) minBalance = { value: running, date: t.date };
}
check("Running balance is consistent", chainOk, "");
check("Balance never negative", minBalance.value >= 0, `lowest ${naira(minBalance.value)} on ${minBalance.date}`);
check(
  "Closing balance",
  Math.abs(running - EXPECTED.closingBalance) <= EXPECTED.closingBalanceTolerance,
  `${naira(running)} (target ${naira(EXPECTED.closingBalance)} ±${k(EXPECTED.closingBalanceTolerance)})`,
);

// ---------------------------------------------------------------------------
console.log("\nMonthly totals (from ground-truth categories)");

interface Totals { revenue: number; inventory: number; operating: number; expenses: number; net: number; closing: number; count: number }
const months = MONTH_TARGETS.map((target) => {
  const inMonth = txns.filter((t) => t.date.startsWith(target.month));
  const revenue = sum(inMonth.filter((t) => truth[t.id].trueCategory === "SALES").map((t) => t.amount));
  const credits = sum(inMonth.filter((t) => t.direction === "credit").map((t) => t.amount));
  const expenses = sum(inMonth.filter((t) => t.direction === "debit").map((t) => t.amount));
  const inventory = sum(inMonth.filter((t) => truth[t.id].trueCategory === "INVENTORY").map((t) => t.amount));
  const totals: Totals = {
    revenue, inventory, expenses, operating: expenses - inventory, net: credits - expenses,
    closing: inMonth[inMonth.length - 1].balanceAfter, count: inMonth.length,
  };
  return { target, totals };
});

console.log("  Month    Count  Revenue   Inventory  Operating  Expenses  Net     Closing");
for (const { target, totals: t } of months) {
  console.log(
    `  ${target.month}  ${String(t.count).padStart(5)}  ${k(t.revenue).padStart(7)}  ${k(t.inventory).padStart(9)}  ${k(t.operating).padStart(9)}  ` +
      `${k(t.expenses).padStart(8)}  ${k(t.net).padStart(6)}  ${k(t.closing).padStart(7)}`,
  );
}
for (const { target, totals: t } of months) {
  const ok =
    within(t.revenue, target.revenue, MONTHLY_TOLERANCE) &&
    within(t.inventory, target.inventory, MONTHLY_TOLERANCE) &&
    within(t.operating, target.operatingCosts, MONTHLY_TOLERANCE);
  check(`${target.month} within ±${MONTHLY_TOLERANCE * 100}% of targets`, ok, `rev ${k(t.revenue)} / inv ${k(t.inventory)} / ops ${k(t.operating)}`);
}

// ---------------------------------------------------------------------------
console.log("\nHeadline growth (Q3 vs Q2)");

const quarter = (key: keyof Totals, from: number) => sum(months.slice(from, from + 3).map((m) => m.totals[key]));
const growth = (key: keyof Totals) => (quarter(key, 3) / quarter(key, 0) - 1) * 100;
for (const [label, key, target] of [
  ["Revenue growth", "revenue", EXPECTED.revenueGrowth3m],
  ["Inventory growth", "inventory", EXPECTED.inventoryGrowth3m],
  ["Expense growth", "expenses", EXPECTED.expenseGrowth3m],
] as const) {
  const g = growth(key);
  check(label, Math.abs(g - target) <= EXPECTED.growthTolerancePts, `${pct(g)} (target ${pct(target)} ±${EXPECTED.growthTolerancePts}pts)`);
}
const aug = months[4].totals.closing;
console.log(`  Cash balance Sep vs Aug: ${pct((running / aug - 1) * 100)} (${naira(aug)} → ${naira(running)})`);

// ---------------------------------------------------------------------------
console.log("\nDescription quality");

for (const level of [1, 2, 3, 4] as const) {
  const share = txns.filter((t) => truth[t.id].descriptionLevel === level).length / txns.length;
  const target = EXPECTED.levelShares[level];
  check(
    `Level ${level} share`,
    Math.abs(share - target) <= EXPECTED.levelShareTolerance,
    `${(share * 100).toFixed(1)}% (target ~${target * 100}%)`,
  );
}

// ---------------------------------------------------------------------------
console.log("\nInfo (inputs to later phases; not pass/fail)");

const byCategory = new Map<string, number>();
for (const t of txns) byCategory.set(truth[t.id].trueCategory, (byCategory.get(truth[t.id].trueCategory) ?? 0) + 1);
console.log(`  Categories: ${[...byCategory].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${n}`).join(", ")}`);
console.log(`  POS settlements per month: ${MONTH_TARGETS.map((m) => txns.filter((t) => t.channel === "POS" && t.date.startsWith(m.month)).length).join(", ")}`);

// Monthly revenue CV over 6 months (Health "Revenue consistency" input).
const monthlyRevenue = months.map((m) => m.totals.revenue);
const mean = sum(monthlyRevenue) / monthlyRevenue.length;
const cv = Math.sqrt(sum(monthlyRevenue.map((r) => (r - mean) ** 2)) / monthlyRevenue.length) / mean;
console.log(`  Monthly revenue CV (6 months): ${(cv * 100).toFixed(1)}% → revenue consistency ≈ ${Math.max(0, Math.round(100 - 2 * cv * 100))}`);

// Weeks with at least 2 sales inflows, last 13 weeks (Readiness "Recurring income" input).
const asOf = Date.parse("2026-09-30");
const salesWeeks = Array.from({ length: 13 }, (_, w) =>
  txns.filter((t) => {
    const daysBack = (asOf - Date.parse(t.date)) / 86_400_000;
    return truth[t.id].trueCategory === "SALES" && daysBack >= w * 7 && daysBack < (w + 1) * 7;
  }).length,
);
console.log(`  Weeks with ≥ 2 sales inflows (last 13): ${salesWeeks.filter((n) => n >= 2).length}/13`);

const activeDays = new Set(txns.filter((t) => (asOf - Date.parse(t.date)) / 86_400_000 < 90).map((t) => t.date)).size;
console.log(`  Active days (last 90): ${activeDays}/90 = ${((activeDays / 90) * 100).toFixed(0)}%`);

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
