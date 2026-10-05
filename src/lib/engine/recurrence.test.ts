import { describe, expect, it } from "vitest";
import transactionsJson from "../../data/transactions.json";
import type { RawTransaction } from "../types";
import { detectRecurringSeries } from "./recurrence";

const series = detectRecurringSeries(transactionsJson as RawTransaction[]);
const find = (counterparty: string) => series.find((s) => s.counterparty === counterparty);

describe("detectRecurringSeries on Aisha's dataset", () => {
  it.each([
    ["ADEBAYO PROVISIONS LTD", 7],
    ["KOLAWOLE BEVERAGES DIST.", 14],
    ["MAMA NKECHI WHOLESALE BODIJA", 30],
    ["ALHAJI LATEEF RAHEEM", 30],
    ["TUNDE BALOGUN", 30],
    ["BLESSING OKON", 30],
    ["MTN NIGERIA", 30],
  ])("finds %s every %i days", (counterparty, cadence) => {
    expect(find(counterparty)?.cadence).toBe(cadence);
  });

  it("knows when the bi-weekly supplier was last paid", () => {
    expect(find("KOLAWOLE BEVERAGES DIST.")?.lastDate).toBe("2026-09-25");
  });

  it("does not treat irregular payments as recurring", () => {
    expect(find("MUSA IBRAHIM")).toBeUndefined();
    // Settlements every 2–3 days aren't a weekly/bi-weekly/monthly bill; the forecast treats them as daily inflow.
    expect(find("WEMA POS SETTLEMENT")).toBeUndefined();
  });
});
