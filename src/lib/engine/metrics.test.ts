import { describe, expect, it } from "vitest";
import { EXPECTED, MONTH_TARGETS } from "../../../scripts/targets";
import accountJson from "../../data/account.json";
import transactionsJson from "../../data/transactions.json";
import type { Account, RawTransaction } from "../types";
import { classifyTransactions } from "./classify";
import {
  balanceAt, cashPosition, completeMonths, growth, lastCompleteMonth, monthlyMetrics, threeMonthGrowth, threeMonthWindows,
} from "./metrics";

const account = accountJson as Account;
const raw = transactionsJson as RawTransaction[];
const transactions = classifyTransactions(raw);
const ASOF = "2026-09-30";

describe("monthly metrics (from classifier categories)", () => {
  const months = monthlyMetrics(transactions, account, ASOF);

  it("covers April to September", () => {
    expect(months.map((m) => m.period)).toEqual(MONTH_TARGETS.map((t) => t.month));
  });

  it.each(MONTH_TARGETS.map((t, i) => [t.month, i] as const))("%s matches the dataset targets exactly", (_, i) => {
    const m = months[i];
    const t = MONTH_TARGETS[i];
    expect(m.revenue).toBe(t.revenue);
    expect(m.byCategory.INVENTORY).toBe(t.inventory);
    expect(m.operatingCosts).toBe(t.operatingCosts);
    expect(m.expenses).toBe(t.inventory + t.operatingCosts);
    expect(m.netCashFlow).toBe(t.revenue - t.inventory - t.operatingCosts);
    expect(m.otherInflows).toBe(0);
  });

  it("closing balances agree with the bank's running balance", () => {
    for (const m of months) {
      const lastInMonth = raw.filter((t) => t.date.startsWith(m.period)).at(-1)!;
      expect(m.closingBalance).toBe(lastInMonth.balanceAfter);
    }
  });

  it("computes September's expense ratio above 1 (spent more than earned)", () => {
    expect(months[5].expenseRatio).toBeCloseTo(2_920_000 / 2_760_000, 6);
  });
});

describe("three-month growth (SPEC §1 headline period)", () => {
  const g = threeMonthGrowth(transactions, account, ASOF);

  it("compares Jul–Sep with Apr–Jun", () => {
    expect(threeMonthWindows(ASOF)).toMatchObject({
      current: { from: "2026-07-01", to: "2026-09-30" },
      previous: { from: "2026-04-01", to: "2026-06-30" },
    });
  });

  it("matches the story numbers", () => {
    expect(g.revenueGrowth).toBeCloseTo(EXPECTED.revenueGrowth3m, 1);
    expect(g.inventoryGrowth).toBeCloseTo(EXPECTED.inventoryGrowth3m, 1);
    expect(g.expenseGrowth).toBeCloseTo(EXPECTED.expenseGrowth3m, 1);
  });

  it("reports rising running costs by category", () => {
    expect(g.categoryGrowth.TRANSPORT).toBeCloseTo(50, 0);
    expect(g.categoryGrowth.SALARIES).toBeCloseTo(0, 6);
  });

  it("has no previous period before six months of history exist", () => {
    const early = threeMonthGrowth(transactions, account, "2026-06-30");
    expect(early.previous).toBeNull();
    expect(early.revenueGrowth).toBeNull();
    expect(early.current.revenue).toBe(7_200_000);
  });
});

describe("cash position (SPEC §5 derived values)", () => {
  const cash = cashPosition(transactions, account, ASOF);

  it("has the demo cash balance", () => {
    expect(cash.cashBalance).toBe(EXPECTED.closingBalance);
  });

  it("sets the minimum reserve at about 10 days of running costs", () => {
    expect(cash.minimumReserve % 5_000).toBe(0);
    expect(cash.minimumReserve).toBeGreaterThanOrEqual(180_000);
    expect(cash.minimumReserve).toBeLessThanOrEqual(200_000);
  });

  it("has about 6 days of cash cover", () => {
    expect(cash.daysOfCashCover).toBeGreaterThan(5.5);
    expect(cash.daysOfCashCover).toBeLessThan(7.5);
  });

  it("was healthier at the end of June", () => {
    const june = cashPosition(transactions, account, "2026-06-30");
    expect(june.cashBalance).toBe(850_000);
    expect(june.daysOfCashCover).toBeGreaterThan(cash.daysOfCashCover);
  });
});

describe("helpers", () => {
  it("treats the last day of a month as completing it", () => {
    expect(lastCompleteMonth("2026-09-30")).toBe("2026-09");
    expect(lastCompleteMonth("2026-09-29")).toBe("2026-08");
    expect(lastCompleteMonth("2026-02-28")).toBe("2026-02");
  });

  it("lists complete months only", () => {
    expect(completeMonths(account, "2026-07-15")).toEqual(["2026-04", "2026-05", "2026-06"]);
  });

  it("returns null growth when there is nothing to compare with", () => {
    expect(growth(100, 0)).toBeNull();
    expect(growth(150, 100)).toBe(50);
  });

  it("balance before any transactions is the opening balance", () => {
    expect(balanceAt(transactions, account, "2026-03-31")).toBe(account.openingBalance);
  });
});
