import { describe, expect, it } from "vitest";
import { affordAlert, createRateLimiter, forecastAlert, parseAlertRequest, weeklyAlert, writeAlert } from "./alerts";
import { DEMO_ACCOUNT, DEMO_AS_OF, DEMO_TRANSACTIONS } from "./demo";
import { analyze } from "./engine";
import { NO_CONFIRMATIONS, classifyTransactions, confirmCategory, needsReview } from "./engine/classify";

const a = analyze(DEMO_TRANSACTIONS, DEMO_ACCOUNT, DEMO_AS_OF);
const ids = new Set(DEMO_TRANSACTIONS.map((t) => t.id));

describe("alert messages (written from engine numbers)", () => {
  it("forecast alert", () => {
    const m = forecastAlert(a);
    expect(m).toContain("*NaijaBiz IQ · Cash alert*");
    expect(m).toContain("Aisha Mini Mart");
    expect(m).toContain("Medium cash pressure");
    expect(m).toContain("about ₦393K around 12 Oct");
    expect(m).toContain("Keep at least ₦180K");
  });

  it("affordability alert: ₦300,000 of stock", () => {
    const m = affordAlert(a, 300_000, "Stock");
    expect(m).toContain("₦300,000 for stock: *You can, but be careful.*");
    expect(m).toContain("= ₦93,038 left");
    expect(m).toContain("Safer amount right now: ₦180,000 – ₦210,000");
  });

  it("affordability alert: comfortable and cannot", () => {
    expect(affordAlert(a, 100_000)).toContain("Yes, you can afford this comfortably.");
    expect(affordAlert(a, 100_000)).not.toContain("Safer amount");
    expect(affordAlert(a, 500_000)).toContain("Not right now");
  });

  it("weekly summary", () => {
    const m = weeklyAlert(a);
    expect(m).toContain("September: sales ₦2.76M, spending ₦2.92M.");
    expect(m).toContain("Cash today ₦580K (−22% since end of August).");
    expect(m).toContain("Business Health 66 (Healthy), down from 84 on 30 Jun.");
    expect(m).toContain("7 transactions need your input.");
  });

  it("weekly summary reflects the user's answers", () => {
    const fuel = classifyTransactions(DEMO_TRANSACTIONS).find((t) => needsReview(t) && t.description === "POS PURCHASE")!;
    const after = analyze(DEMO_TRANSACTIONS, DEMO_ACCOUNT, DEMO_AS_OF,
      confirmCategory(NO_CONFIRMATIONS, DEMO_TRANSACTIONS.find((t) => t.id === fuel.id)!, "GENERATOR_FUEL"));
    expect(weeklyAlert(after)).toContain("2 transactions need your input.");
  });

  it("stays well within WhatsApp's message length", () => {
    for (const kind of ["forecast", "weekly"] as const) expect(writeAlert(a, { kind }).length).toBeLessThan(700);
    expect(writeAlert(a, { kind: "afford", amount: 300_000, purpose: "Stock" }).length).toBeLessThan(700);
  });
});

describe("parseAlertRequest", () => {
  it("accepts the three alert kinds", () => {
    expect(parseAlertRequest({ kind: "forecast" }, ids)).toMatchObject({ ok: true, value: { kind: "forecast" } });
    expect(parseAlertRequest({ kind: "weekly" }, ids)).toMatchObject({ ok: true });
    expect(parseAlertRequest({ kind: "afford", amount: 300000.4, purpose: "Stock" }, ids)).toMatchObject({
      ok: true, value: { amount: 300000, purpose: "Stock" },
    });
  });

  it("rejects anything else", () => {
    expect(parseAlertRequest(null, ids).ok).toBe(false);
    expect(parseAlertRequest({ kind: "sms" }, ids).ok).toBe(false);
    expect(parseAlertRequest({ kind: "afford" }, ids).ok).toBe(false);
    expect(parseAlertRequest({ kind: "afford", amount: -5 }, ids).ok).toBe(false);
    expect(parseAlertRequest({ kind: "afford", amount: "300000" }, ids).ok).toBe(false);
    expect(parseAlertRequest({ kind: "afford", amount: 1e12 }, ids).ok).toBe(false);
    expect(parseAlertRequest({ kind: "afford", amount: 1000, purpose: "Holiday" }, ids).ok).toBe(false);
  });

  it("never lets the browser choose the recipient or the text", () => {
    const r = parseAlertRequest({ kind: "forecast", to: "whatsapp:+15550001111", message: "spam", body: "spam" }, ids);
    expect(r.ok && Object.keys(r.value).sort()).toEqual(["amount", "confirmations", "kind", "purpose"]);
  });

  it("keeps only valid confirmations", () => {
    const r = parseAlertRequest({
      kind: "weekly",
      confirmations: {
        byTransaction: { txn_001: "SALES", nope: "SALES", txn_002: "NOT_A_CATEGORY" },
        byCounterparty: { "MUSA IBRAHIM": "TRANSPORT", ["x".repeat(500)]: "MISC" },
        byPattern: { "debit|CARD|POS PURCHASE": { category: "GENERATOR_FUEL", amount: 29700 }, bad: { category: "MISC", amount: -1 } },
      },
    }, ids);
    expect(r.ok && r.value.confirmations).toEqual({
      byTransaction: { txn_001: "SALES" },
      byCounterparty: { "MUSA IBRAHIM": "TRANSPORT" },
      byPattern: { "debit|CARD|POS PURCHASE": { category: "GENERATOR_FUEL", amount: 29700 } },
    });
  });
});

describe("createRateLimiter", () => {
  it("allows one action per interval and says how long to wait", () => {
    const limit = createRateLimiter(20_000);
    expect(limit(1_000)).toBe(0);
    expect(limit(6_000)).toBe(15);
    expect(limit(21_000)).toBe(0);
  });
});
