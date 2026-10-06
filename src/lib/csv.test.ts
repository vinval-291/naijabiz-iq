import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import accountJson from "../data/account.json";
import transactionsJson from "../data/transactions.json";
import { parseTransactionsCsv } from "./csv";

const sample = readFileSync(join(__dirname, "../../public/sample/aisha-mini-mart-transactions.csv"), "utf8");

describe("parseTransactionsCsv", () => {
  it("reads the sample CSV back into exactly the demo transactions", () => {
    const result = parseTransactionsCsv(sample, accountJson.accountId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.transactions).toEqual(transactionsJson);
    expect(result.openingBalance).toBe(accountJson.openingBalance);
  });

  it("handles quoted cells with commas and quotes", () => {
    const csv = 'date,amount,direction,description,counterparty,channel,balanceAfter\n2026-09-01,1000,debit,"PAYMENT, ""URGENT""",X,TRANSFER,5000\n';
    const result = parseTransactionsCsv(csv, "acc");
    expect(result.ok && result.transactions[0].description).toBe('PAYMENT, "URGENT"');
    expect(result.ok && result.openingBalance).toBe(6000);
  });

  it("explains what's wrong with a bad file", () => {
    expect(parseTransactionsCsv("", "acc")).toMatchObject({ ok: false, error: expect.stringMatching(/no transactions/) });
    expect(parseTransactionsCsv("date,amount\n2026-09-01,5", "acc")).toMatchObject({ ok: false, error: expect.stringMatching(/missing these columns/) });
    const badRow = "date,amount,direction,description,counterparty,channel,balanceAfter\n30/09/2026,1000,debit,X,,TRANSFER,5000";
    expect(parseTransactionsCsv(badRow, "acc")).toMatchObject({ ok: false, error: "Row 2: the date must look like 2026-09-30." });
  });
});
