// Parses an uploaded transaction CSV (the upload fallback in SPEC.md / PHASES.md Phase 7).
// Expected columns match public/sample/aisha-mini-mart-transactions.csv.

import type { Account, Channel, Direction, RawTransaction } from "./types";

const REQUIRED = ["date", "amount", "direction", "description", "counterparty", "channel", "balanceAfter"] as const;
const CHANNELS: Channel[] = ["POS", "TRANSFER", "ATM", "USSD", "CARD", "BANK"];

export type CsvResult =
  | { ok: true; transactions: RawTransaction[]; openingBalance: number }
  | { ok: false; error: string };

/** Splits one CSV line, honouring double-quoted cells with "" escapes. */
function splitLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { cells.push(cell); cell = ""; }
    else cell += c;
  }
  cells.push(cell);
  return cells;
}

export function parseTransactionsCsv(text: string, accountId: string): CsvResult {
  const lines = text.replace(/^﻿/, "").split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return { ok: false, error: "The file has no transactions. Check that it has a header row and at least one transaction." };

  const header = splitLine(lines[0]).map((h) => h.trim());
  const missing = REQUIRED.filter((col) => !header.includes(col));
  if (missing.length) return { ok: false, error: `The file is missing these columns: ${missing.join(", ")}.` };
  const col = (name: string) => header.indexOf(name);

  const transactions: RawTransaction[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    const row = i + 1;
    const date = cells[col("date")]?.trim();
    const amount = Number(cells[col("amount")]);
    const direction = cells[col("direction")]?.trim() as Direction;
    const channel = cells[col("channel")]?.trim() as Channel;
    const balanceAfter = Number(cells[col("balanceAfter")]);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date ?? "")) return { ok: false, error: `Row ${row}: the date must look like 2026-09-30.` };
    if (!Number.isFinite(amount) || amount <= 0) return { ok: false, error: `Row ${row}: the amount must be a positive number.` };
    if (direction !== "credit" && direction !== "debit") return { ok: false, error: `Row ${row}: direction must be "credit" or "debit".` };
    if (!CHANNELS.includes(channel)) return { ok: false, error: `Row ${row}: channel must be one of ${CHANNELS.join(", ")}.` };
    if (!Number.isFinite(balanceAfter)) return { ok: false, error: `Row ${row}: balanceAfter must be a number.` };

    const counterparty = cells[col("counterparty")]?.trim() || null;
    transactions.push({
      id: col("id") >= 0 && cells[col("id")]?.trim() ? cells[col("id")].trim() : `csv_${String(i).padStart(4, "0")}`,
      date,
      amount: Math.round(amount),
      direction,
      description: cells[col("description")] ?? "",
      counterparty,
      channel,
      rawReference: col("rawReference") >= 0 ? cells[col("rawReference")] ?? "" : "",
      accountId,
      balanceAfter: Math.round(balanceAfter),
    });
  }

  transactions.sort((a, b) => a.date.localeCompare(b.date));
  const first = transactions[0];
  const openingBalance = first.balanceAfter - (first.direction === "credit" ? first.amount : -first.amount);
  return { ok: true, transactions, openingBalance };
}

/** The demo account, with the opening balance and start date taken from an uploaded file. */
export function accountForUpload(base: Account, transactions: RawTransaction[], openingBalance: number): Account {
  return { ...base, openingBalance, openingDate: `${transactions[0].date.slice(0, 7)}-01` };
}
