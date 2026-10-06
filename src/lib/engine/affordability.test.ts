// Phase 5: "Can I Afford This?" (SPEC.md §8, master plan Phase 19 affordability tests).

import { describe, expect, it } from "vitest";
import accountJson from "../../data/account.json";
import transactionsJson from "../../data/transactions.json";
import type { Account, RawTransaction } from "../types";
import { assessAffordability, type AffordabilityContext } from "./affordability";
import { analyze } from "./index";

const ctx: AffordabilityContext = analyze(transactionsJson as RawTransaction[], accountJson as Account, "2026-09-30");

describe("demo scenarios on September 30", () => {
  it("₦300,000 of stock: 'You can, but be careful'", () => {
    const r = assessAffordability(300_000, ctx, "Stock");
    expect(r).toMatchObject({
      currentCash: 580_000,
      upcomingExpenses: 186_962,
      remainingBuffer: 93_038,
      minimumReserve: 180_000,
      maxSafeAmount: 213_038,
      recommendedRange: [180_000, 210_000],
      verdict: "Careful",
      message: "You can, but be careful.",
    });
    expect(r.notes.join(" ")).toMatch(/₦180K–₦210K/);
    expect(r.notes.join(" ")).toMatch(/stock spending is already growing faster than your sales/);
  });

  it("₦100,000 (small): Comfortable", () => {
    const r = assessAffordability(100_000, ctx);
    expect(r.verdict).toBe("Comfortable");
    expect(r.remainingBuffer).toBe(293_038);
    expect(r.notes).toEqual([]);
  });

  it("₦500,000 (large): Cannot", () => {
    const r = assessAffordability(500_000, ctx);
    expect(r.verdict).toBe("Cannot");
    expect(r.remainingBuffer).toBe(-106_962);
    expect(r.notes[0]).toMatch(/₦107K short/);
  });

  it("buying the maximum safe amount keeps exactly the reserve", () => {
    const r = assessAffordability(ctx.cash.cashBalance - (ctx.cash.cashBalance - ctx.forecast.lowestBalance) - ctx.cash.minimumReserve, ctx);
    expect(r.remainingBuffer).toBe(r.minimumReserve);
    expect(r.verdict).toBe("Comfortable");
  });

  it("points out the low-cash date when the answer isn't 'Comfortable'", () => {
    expect(assessAffordability(300_000, ctx).notes.join(" ")).toMatch(/lowest around 12 Oct/);
  });
});

describe("edge cases", () => {
  it("offers no range when there is nothing safe to spend", () => {
    const tight: AffordabilityContext = {
      ...ctx,
      cash: { ...ctx.cash, cashBalance: 250_000 },
      forecast: { ...ctx.forecast, lowestBalance: 100_000 },
    };
    const r = assessAffordability(50_000, tight);
    expect(r.recommendedRange).toBeNull();
    expect(r.notes.join(" ")).toMatch(/Wait until your cash improves/);
  });

  it("never treats a rising forecast as negative expenses", () => {
    const rising: AffordabilityContext = { ...ctx, forecast: { ...ctx.forecast, lowestBalance: ctx.cash.cashBalance } };
    expect(assessAffordability(100_000, rising).upcomingExpenses).toBe(0);
  });

  it("rejects amounts that aren't positive numbers", () => {
    expect(() => assessAffordability(0, ctx)).toThrow(RangeError);
    expect(() => assessAffordability(-5, ctx)).toThrow(RangeError);
    expect(() => assessAffordability(Number.NaN, ctx)).toThrow(RangeError);
  });

  it("rounds to whole naira", () => {
    expect(assessAffordability(1234.6, ctx).amount).toBe(1235);
  });

  it("adds a gentle note for personal spending", () => {
    expect(assessAffordability(50_000, ctx, "Personal").notes.join(" ")).toMatch(/personal use/);
  });
});
