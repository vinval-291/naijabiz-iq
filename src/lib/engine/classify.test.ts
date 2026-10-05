import { describe, expect, it } from "vitest";
import groundTruthJson from "../../../data/ground-truth.json";
import transactionsJson from "../../data/transactions.json";
import { CATEGORIES_BY_DIRECTION } from "../categories";
import type { GroundTruth, RawTransaction } from "../types";
import { CONFIDENCE, NO_CONFIRMATIONS, classifyTransactions, confirmCategory, needsReview } from "./classify";

const transactions = transactionsJson as RawTransaction[];
const truth = groundTruthJson as Record<string, GroundTruth>;
const classified = classifyTransactions(transactions);
const byId = (id: string) => transactions.find((t) => t.id === id)!;

describe("classifyTransactions on Aisha's dataset", () => {
  it("meets the accuracy target (SPEC §4: ≥ 85%)", () => {
    const correct = classified.filter((t) => t.category === truth[t.id].trueCategory).length;
    expect(correct / classified.length).toBeGreaterThanOrEqual(0.85);
  });

  it("flags between 4 and 10 transactions for review", () => {
    const flagged = classified.filter(needsReview).length;
    expect(flagged).toBeGreaterThanOrEqual(4);
    expect(flagged).toBeLessThanOrEqual(10);
  });

  it("is right whenever it is confident", () => {
    const confident = classified.filter((t) => t.confidence >= CONFIDENCE.high);
    const wrong = confident.filter((t) => t.category !== truth[t.id].trueCategory);
    expect(wrong).toEqual([]);
  });

  it("only uses categories allowed for the transaction's direction", () => {
    for (const t of classified) {
      expect([...CATEGORIES_BY_DIRECTION[t.direction], "UNCATEGORIZED"]).toContain(t.category);
    }
  });

  it("recognizes POS settlements as sales with high confidence", () => {
    const pos = classified.filter((t) => t.channel === "POS" && t.direction === "credit");
    expect(pos.length).toBeGreaterThan(0);
    for (const t of pos) {
      expect(t.category).toBe("SALES");
      expect(t.confidence).toBeGreaterThanOrEqual(CONFIDENCE.high);
    }
  });

  it("identifies a reference-only supplier payment from its history", () => {
    const t = classified.find((x) => x.description.startsWith("TRF/") && x.counterparty === "ADEBAYO PROVISIONS LTD")!;
    expect(t.category).toBe("INVENTORY");
    expect(t.confidence).toBeGreaterThanOrEqual(CONFIDENCE.high);
    expect(t.reasons.join(" ")).toMatch(/every week/);
  });

  it("identifies a missing-description payment from its counterparty", () => {
    const t = classified.find((x) => x.description === "" && x.counterparty === "KOLAWOLE BEVERAGES DIST.")!;
    expect(t.category).toBe("INVENTORY");
    expect(needsReview(t)).toBe(false);
  });

  it("explains every categorized transaction", () => {
    for (const t of classified) expect(t.reasons.length).toBeGreaterThan(0);
  });

  it("is deterministic", () => {
    expect(classifyTransactions(transactions)).toEqual(classified);
  });
});

describe("learning from the user", () => {
  it("applies a confirmation to the confirmed transaction", () => {
    const flagged = classified.find(needsReview)!;
    const confirmations = confirmCategory(NO_CONFIRMATIONS, byId(flagged.id), "MISC");
    const after = classifyTransactions(transactions, confirmations).find((t) => t.id === flagged.id)!;
    expect(after).toMatchObject({ category: "MISC", confidence: 1, userConfirmed: true });
  });

  it("recognizes similar unlabelled card purchases after one is confirmed", () => {
    const fuel = classified.filter((t) => needsReview(t) && t.description === "POS PURCHASE");
    expect(fuel.length).toBeGreaterThanOrEqual(2);

    const confirmations = confirmCategory(NO_CONFIRMATIONS, byId(fuel[0].id), "GENERATOR_FUEL");
    const after = classifyTransactions(transactions, confirmations);
    for (const t of fuel.slice(1)) {
      const updated = after.find((x) => x.id === t.id)!;
      expect(updated.category).toBe("GENERATOR_FUEL");
      expect(needsReview(updated)).toBe(false);
    }
    expect(after.filter(needsReview).length).toBeLessThan(classified.filter(needsReview).length);
  });

  it("does not apply a pattern confirmation to very different amounts", () => {
    const t = byId(classified.find((x) => needsReview(x) && x.description === "POS PURCHASE")!.id);
    const confirmations = confirmCategory(NO_CONFIRMATIONS, t, "GENERATOR_FUEL");
    const bigPurchase: RawTransaction = { ...t, id: "txn_test", amount: t.amount * 5 };
    const [result] = classifyTransactions([bigPurchase], confirmations);
    expect(result.category).not.toBe("GENERATOR_FUEL");
  });

  it("remembers a confirmed counterparty for future transactions", () => {
    const t = byId(classified.find((x) => needsReview(x) && x.counterparty)!.id);
    const confirmations = confirmCategory(NO_CONFIRMATIONS, t, "MISC");
    const nextMonth: RawTransaction = { ...t, id: "txn_future", date: "2026-10-13", description: "" };
    const [result] = classifyTransactions([nextMonth], confirmations);
    expect(result.category).toBe("MISC");
    expect(result.confidence).toBeGreaterThanOrEqual(CONFIDENCE.high);
  });
});
