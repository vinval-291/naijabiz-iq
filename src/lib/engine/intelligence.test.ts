// Phase 4: health score, forecast, recommendations, readiness (SPEC.md §6, §7, §9, §10, §13).

import { describe, expect, it } from "vitest";
import accountJson from "../../data/account.json";
import transactionsJson from "../../data/transactions.json";
import type { Account, RawTransaction } from "../types";
import { NO_CONFIRMATIONS, classifyTransactions, confirmCategory, needsReview } from "./classify";
import { scheduledPayments } from "./forecast";
import { healthBand } from "./health";
import { analyze } from "./index";
import { readinessBand } from "./readiness";

const account = accountJson as Account;
const raw = transactionsJson as RawTransaction[];
const ASOF = "2026-09-30";
const a = analyze(raw, account, ASOF);

function afterConfirmingFuel() {
  const fuel = classifyTransactions(raw).find((t) => needsReview(t) && t.description === "POS PURCHASE")!;
  return analyze(raw, account, ASOF, confirmCategory(NO_CONFIRMATIONS, raw.find((t) => t.id === fuel.id)!, "GENERATOR_FUEL"));
}

describe("Business Health Score", () => {
  it("is Healthy (64–72) on the demo date", () => {
    expect(a.health.score).toBeGreaterThanOrEqual(64);
    expect(a.health.score).toBeLessThanOrEqual(72);
    expect(a.health.band).toBe("Healthy");
  });

  it("was Strong at the end of June", () => {
    expect(a.previousHealth?.asOf).toBe("2026-06-30");
    expect(a.previousHealth?.band).toBe("Strong");
    expect(a.previousHealth!.score - a.health.score).toBeGreaterThanOrEqual(15);
  });

  it("names expense management and cash-flow stability as the weakest areas", () => {
    const weakest = [...a.health.components].sort((x, y) => x.score - y.score).slice(0, 2).map((c) => c.key);
    expect(weakest.sort()).toEqual(["cashFlowStability", "expenseManagement"]);
  });

  it("has weights that sum to 100% and explains every component", () => {
    expect(a.health.components.reduce((s, c) => s + c.weight, 0)).toBeCloseTo(1, 10);
    for (const c of a.health.components) expect(c.explanation.length).toBeGreaterThan(10);
  });

  it("uses the spec's bands", () => {
    expect([healthBand(80), healthBand(79), healthBand(60), healthBand(59), healthBand(39)]).toEqual([
      "Strong", "Healthy", "Healthy", "Fair", "Needs attention",
    ]);
  });
});

describe("Cash-flow forecast", () => {
  const f = a.forecast;

  it("covers October 1–14", () => {
    expect(f.daily).toHaveLength(14);
    expect(f.daily[0].date).toBe("2026-10-01");
    expect(f.daily.at(-1)!.date).toBe("2026-10-14");
  });

  it("expects Medium risk with the lowest balance above the reserve", () => {
    expect(f.risk).toBe("Medium");
    expect(f.lowestBalance).toBeGreaterThanOrEqual(a.cash.minimumReserve);
    expect(f.lowestBalance).toBeGreaterThanOrEqual(350_000);
    expect(f.lowestBalance).toBeLessThanOrEqual(455_000);
  });

  it("schedules the known recurring payments", () => {
    const labels = f.scheduled.map((p) => `${p.date} ${p.label}`);
    expect(labels).toContain("2026-10-01 ALHAJI LATEEF RAHEEM");
    expect(labels).toContain("2026-10-05 ADEBAYO PROVISIONS LTD");
    expect(labels).toContain("2026-10-09 KOLAWOLE BEVERAGES DIST.");
    expect(labels).toContain("2026-10-12 ADEBAYO PROVISIONS LTD");
    // Monthly delivery from Mama Nkechi falls after the window.
    expect(labels.some((l) => l.includes("MAMA NKECHI"))).toBe(false);
  });

  it("only schedules future dates", () => {
    for (const p of scheduledPayments(a.transactions, ASOF)) expect(p.date > ASOF).toBe(true);
  });

  it("uses estimative wording", () => {
    expect(f.reason).toMatch(/Based on your recent patterns/);
    expect(f.reason).toMatch(/likely/);
  });
});

describe("Recommendations", () => {
  const ids = a.recommendations.map((r) => r.id);

  it("include the spec's key recommendations", () => {
    expect(a.recommendations.find((r) => r.id === "protect-reserve")?.priority).toBe("High");
    expect(a.recommendations.find((r) => r.id === "review-stock")?.priority).toBe("Medium");
    expect(ids).toContain("overspent-last-month");
  });

  it("are sorted by priority", () => {
    const order = ["High", "Medium", "Low", "Info"];
    const ranks = a.recommendations.map((r) => order.indexOf(r.priority));
    expect(ranks).toEqual([...ranks].sort((x, y) => x - y));
  });

  it("don't claim positive momentum while spending grows faster than sales", () => {
    expect(ids).not.toContain("momentum");
  });

  it("hold back category growth while uncategorized spending could distort it", () => {
    expect(ids.some((id) => id.startsWith("rising-"))).toBe(false);
    expect(a.recommendations.find((r) => r.id === "categorize")?.priority).toBe("Medium");
  });

  it("report rising fuel and transport costs once a diesel purchase is confirmed", () => {
    const after = afterConfirmingFuel();
    const afterIds = after.recommendations.map((r) => r.id);
    expect(after.flagged).toHaveLength(2);
    expect(afterIds).toContain("rising-generator_fuel");
    expect(afterIds).toContain("rising-transport");
    expect(after.growth.categoryGrowth.GENERATOR_FUEL).toBeCloseTo(58.3, 0);
    expect(after.recommendations.find((r) => r.id === "categorize")?.priority).toBe("Low");
  });

  it("back every recommendation with a metric", () => {
    for (const r of a.recommendations) {
      expect(r.supportingMetric.value).not.toBe("");
      expect(r.message).not.toMatch(/NaN|undefined|Infinity/);
    }
  });
});

describe("Financial Readiness", () => {
  const r = a.readiness;

  it("is Developing (72–82)", () => {
    expect(r.score).toBeGreaterThanOrEqual(72);
    expect(r.score).toBeLessThanOrEqual(82);
    expect(r.band).toBe("Developing");
  });

  it("lists strengths and areas to improve", () => {
    expect(r.strengths).toContain("Revenue stability");
    expect(r.improvements).toEqual(expect.arrayContaining(["Cash reserve", "Positive cash-flow history"]));
    expect(r.nextSteps[0]).toMatch(/cash reserve/i);
  });

  it("never talks about loans or approval", () => {
    const text = JSON.stringify(r).toLowerCase();
    expect(text).not.toMatch(/loan|approv|eligib|credit score/);
  });

  it("has weights that sum to 100%", () => {
    expect(r.indicators.reduce((s, i) => s + i.weight, 0)).toBeCloseTo(1, 10);
  });

  it("uses the spec's bands", () => {
    expect([readinessBand(85), readinessBand(84), readinessBand(65), readinessBand(64), readinessBand(44)]).toEqual([
      "Strong", "Developing", "Developing", "Emerging", "Early stage",
    ]);
  });
});

describe("analyze()", () => {
  it("ignores transactions after asOf", () => {
    const june = analyze(raw, account, "2026-06-30");
    expect(june.transactions.every((t) => t.date <= "2026-06-30")).toBe(true);
    expect(june.cash.cashBalance).toBe(850_000);
    expect(june.previousHealth).toBeNull();
  });

  it("is deterministic", () => {
    expect(analyze(raw, account, ASOF)).toEqual(a);
  });
});
