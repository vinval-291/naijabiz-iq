// Phase 6: insight layer (SPEC.md §11).

import { describe, expect, it } from "vitest";
import accountJson from "../../data/account.json";
import transactionsJson from "../../data/transactions.json";
import type { Account, RawTransaction } from "../types";
import { NO_CONFIRMATIONS, classifyTransactions, confirmCategory, needsReview } from "./classify";
import { analyze } from "./index";
import { checkNumbers, writeInsights } from "./insights";

const account = accountJson as Account;
const raw = transactionsJson as RawTransaction[];
const a = analyze(raw, account, "2026-09-30");
const ids = a.insights.map((i) => i.id);

function afterConfirmingFuel() {
  const fuel = classifyTransactions(raw).find((t) => needsReview(t) && t.description === "POS PURCHASE")!;
  return analyze(raw, account, "2026-09-30", confirmCategory(NO_CONFIRMATIONS, raw.find((t) => t.id === fuel.id)!, "GENERATOR_FUEL"));
}

describe("insight facts", () => {
  it("carry the verified demo numbers", () => {
    expect(a.insightFacts).toMatchObject({
      lastMonth: "2026-09",
      lastMonthRevenue: 2_760_000,
      lastMonthExpenses: 2_920_000,
      cashBalance: 580_000,
      previousMonthBalance: 740_000,
      minimumReserve: 180_000,
      healthScore: 66,
      healthScorePrev: 84,
      forecastRisk: "Medium",
      lowestBalanceDate: "2026-10-12",
      flaggedCount: 7,
      topRisingCost: null, // held back while uncategorized spending could distort it
    });
    expect(a.insightFacts.cashBalanceChangeMoM).toBeCloseTo(-21.6, 1);
  });
});

describe("writeInsights on the demo date", () => {
  it("leads with sales vs stock (the dashboard's key insight)", () => {
    expect(a.insights[0]).toMatchObject({ id: "growth-vs-stock", tone: "warning" });
    expect(a.insights[0].body).toContain("rose 12%");
    expect(a.insights[0].body).toContain("rose 31%");
  });

  it("covers the story: overspending, shrinking cash, tighter forecast, falling health, items to review", () => {
    expect(ids).toEqual(["growth-vs-stock", "spent-vs-earned", "cash-trend", "forecast", "health-trend", "uncategorized"]);
    const text = a.insights.map((i) => i.body).join(" ");
    expect(text).toContain("from ₦740K to ₦580K");
    expect(text).toContain("lowest around 12 Oct, at about ₦393K");
    expect(text).toContain("fell from 84 on 30 Jun to 66 today");
  });

  it("only uses numbers that come from the facts", () => {
    for (const i of a.insights) {
      expect(checkNumbers(`${i.title} ${i.body}`, a.insightFacts), i.id).toEqual({ ok: true, unmatched: [] });
    }
  });

  it("uses estimative wording for the forecast", () => {
    expect(a.insights.find((i) => i.id === "forecast")!.body).toMatch(/^Based on your recent patterns/);
  });

  it("mentions rising fuel costs once a diesel purchase is confirmed", () => {
    const after = afterConfirmingFuel();
    const rising = after.insights.find((i) => i.id === "rising-cost");
    expect(rising?.title).toBe("Generator fuel costs are rising");
    expect(rising?.body).toContain("58%");
    for (const i of after.insights) expect(checkNumbers(i.body, after.insightFacts).ok).toBe(true);
  });

  it("stays sensible when there's no previous period (June 30)", () => {
    const june = analyze(raw, account, "2026-06-30");
    expect(june.insights.map((i) => i.id)).not.toContain("growth-vs-stock");
    for (const i of june.insights) expect(checkNumbers(i.body, june.insightFacts).ok).toBe(true);
  });

  it("praises growth when spending keeps pace", () => {
    const calm = writeInsights({ ...a.insightFacts, inventoryGrowth3m: 10, lastMonthExpenses: 2_000_000, cashBalanceChangeMoM: 2 });
    expect(calm[0]).toMatchObject({ id: "sales-growth", tone: "positive" });
    expect(calm.find((i) => i.id === "spent-vs-earned")?.tone).toBe("positive");
    expect(calm.map((i) => i.id)).not.toContain("cash-trend");
  });
});

describe("checkNumbers", () => {
  const f = a.insightFacts;

  it("accepts display-rounded facts", () => {
    expect(checkNumbers("Sales rose 12%; stock rose 30.9%; balance ₦580K (₦580,000); revenue ₦2.76M.", f).ok).toBe(true);
    expect(checkNumbers("Lowest around 12 Oct at about ₦393K, keep ₦180K, about 10 days of costs.", f).ok).toBe(true);
  });

  it("rejects invented numbers", () => {
    expect(checkNumbers("Sales rose 45% this quarter.", f)).toEqual({ ok: false, unmatched: ["45%"] });
    expect(checkNumbers("You could spend ₦750K safely.", f)).toEqual({ ok: false, unmatched: ["₦750K"] });
    expect(checkNumbers("Your score is 91.", f)).toEqual({ ok: false, unmatched: ["91"] });
  });

  it("ignores small wording numbers like '3 months'", () => {
    expect(checkNumbers("Over the last 3 months, 2 suppliers…", f).ok).toBe(true);
  });
});
