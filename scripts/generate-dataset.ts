// Generates Aisha Mini Mart's six-month Wema transaction history (SPEC.md §3).
// Deterministic: the same seed always produces the same file.
//
//   npm run data:generate
//
// Outputs:
//   src/data/account.json            account metadata (bundled with the app)
//   src/data/transactions.json       raw transactions, no hidden fields (bundled with the app)
//   data/ground-truth.json           hidden true categories + description levels (tests only)
//   public/sample/aisha-mini-mart-transactions.csv   CSV for the upload fallback

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Category, Channel, Direction, GroundTruth, RawTransaction } from "../src/lib/types";
import { ACCOUNT, EXPECTED, MONTH_TARGETS, SEED, TOTAL_TRANSACTIONS } from "./targets";

type Level = 1 | 2 | 3 | 4;

interface Draft {
  date: string;
  amount: number;
  direction: Direction;
  description: string;
  counterparty: string | null;
  channel: Channel;
  trueCategory: Category;
  level: Level;
}

// ---------------------------------------------------------------------------
// Deterministic randomness

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rand = mulberry32(SEED);
const between = (min: number, max: number) => min + rand() * (max - min);
const int = (min: number, max: number) => Math.floor(between(min, max + 1));
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const jitter = (value: number, pct: number) => value * (1 + between(-pct, pct));
const roundTo = (value: number, step: number) => Math.round(value / step) * step;
const digits = (n: number) => Array.from({ length: n }, () => int(0, 9)).join("");

/** Picks a description level using weights for levels 1–4. */
function chooseLevel(weights: [number, number, number, number]): Level {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < 4; i++) {
    r -= weights[i];
    if (r < 0) return (i + 1) as Level;
  }
  return 4;
}

/** Description text for a level: 1 = clear, 2 = reference only, 3 = vague, 4 = empty. */
function describe(level: Level, clear: string): string {
  switch (level) {
    case 1: return clear;
    case 2: return `TRF/${digits(9)}`;
    case 3: return pick(["TRANSFER", "PAYMENT", "TRF", "FT"]);
    case 4: return "";
  }
}

/** Splits `total` into amounts proportional to `weights`, rounded to `step`; the last item absorbs rounding. */
function allocate(total: number, weights: number[], step: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const amounts = weights.slice(0, -1).map((w) => roundTo((total * w) / sum, step));
  amounts.push(total - amounts.reduce((a, b) => a + b, 0));
  if (amounts.some((a) => a <= 0)) throw new Error(`allocate produced a non-positive amount for ${total}`);
  return amounts;
}

// ---------------------------------------------------------------------------
// Dates (UTC, so the output never depends on the machine's timezone)

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function parseMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return { year: y, monthIndex: m - 1, days: new Date(Date.UTC(y, m, 0)).getUTCDate() };
}

function iso(year: number, monthIndex: number, day: number) {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function weekday(date: string) {
  return new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
}

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Moves weekend dates back to the preceding Friday (for end-of-month payments). */
function toWeekday(date: string) {
  const wd = weekday(date);
  return wd === 6 ? addDays(date, -1) : wd === 0 ? addDays(date, -2) : date;
}

/** Moves weekend dates forward to the following Monday (for start-of-month payments). */
function toNextWeekday(date: string) {
  const wd = weekday(date);
  return wd === 6 ? addDays(date, 2) : wd === 0 ? addDays(date, 1) : date;
}

function datesInMonth(month: string, predicate: (date: string) => boolean) {
  const { year, monthIndex, days } = parseMonth(month);
  const out: string[] = [];
  for (let d = 1; d <= days; d++) {
    const date = iso(year, monthIndex, d);
    if (predicate(date)) out.push(date);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Business cast (fictional)

const STAFF = [
  { name: "TUNDE BALOGUN", short: "TUNDE" },
  { name: "BLESSING OKON", short: "BLESSING" },
];
const LANDLORD = "ALHAJI LATEEF RAHEEM";
const SUPPLIER_WEEKLY = { name: "ADEBAYO PROVISIONS LTD", short: "ADEBAYO PROVISIONS" };
const SUPPLIER_BIWEEKLY = { name: "KOLAWOLE BEVERAGES DIST.", short: "KOLAWOLE BEV" };
const SUPPLIER_MONTHLY = { name: "MAMA NKECHI WHOLESALE BODIJA", short: "MAMA NKECHI" };
const ONE_OFF_SUPPLIERS = ["OJA OBA TRADERS", "GBADEBO PLASTICS & NYLON", "IYA BASIRAT FOODSTUFF", "SANNI & SONS DETERGENTS"];
const CUSTOMERS = [
  "BOLA ADEWALE", "IBUKUN ADEYEMI", "CHIDI OKAFOR", "FUNMI STORES AGODI", "HALIMA BELLO",
  "EMEKA NWOSU", "ST. ANNE'S SCHOOL CANTEEN", "SEGUN OJO", "GRACE EVENTS & CATERING",
];
const DRIVER = "MUSA IBRAHIM";
const FUEL_STATION = "OLUYOLE FILLING STATION";
const BIWEEKLY_ANCHOR = "2026-04-10"; // Kolawole is paid every second Friday from this date
const MISC_ITEMS = [
  { desc: "LG LEVY - IBADAN NORTH", counterparty: "IBADAN NORTH LG" },
  { desc: "WASTE DISPOSAL - PSP", counterparty: "OYO STATE PSP OPERATOR" },
  { desc: "GENERATOR REPAIR", counterparty: "KUNLE GEN REPAIRS" },
  { desc: "SHOP CLEANING & FUMIGATION", counterparty: "CLEANWAY SERVICES" },
  { desc: "NIGHT GUARD - MONTHLY", counterparty: "MALLAM SANI" },
  { desc: "SIGNBOARD REPAIR", counterparty: "ADE SIGNS & PRINTS" },
];

// ---------------------------------------------------------------------------
// Per-month builders

function buildOperatingCosts(month: string, monthNo: number, target: number): Draft[] {
  const { year, monthIndex, days } = parseMonth(month);
  const mon = MONTH_ABBR[monthIndex];
  const q3 = monthNo >= 3;
  const out: Draft[] = [];
  const debit = (d: Omit<Draft, "direction">) => out.push({ ...d, direction: "debit" });

  // Salaries: two staff, paid on the 27th (or the Friday before).
  const payday = toWeekday(iso(year, monthIndex, 27));
  for (const s of STAFF) {
    const level = chooseLevel([0.7, 0.3, 0, 0]);
    debit({
      date: payday, amount: 65_000, channel: "TRANSFER", counterparty: s.name, trueCategory: "SALARIES", level,
      description: describe(level, `SALARY ${mon} 2026 - ${s.short}`),
    });
  }

  // Rent: monthly, 1st–3rd. June's narration is vague on purpose.
  const rentLevel: Level = monthNo === 2 ? 3 : 1;
  debit({
    date: toNextWeekday(iso(year, monthIndex, int(1, 3))), amount: 120_000, channel: "TRANSFER", counterparty: LANDLORD,
    trueCategory: "RENT", level: rentLevel, description: describe(rentLevel, `SHOP RENT ${mon} 2026`),
  });

  // Electricity: two prepaid token purchases.
  const [e1, e2] = allocate(q3 ? 50_000 : 45_000, [jitter(0.45, 0.1), 0.55], 500);
  for (const [amount, day] of [[e1, int(3, 8)], [e2, int(16, 22)]]) {
    const level = chooseLevel([0.85, 0, 0, 0.15]);
    debit({
      date: iso(year, monthIndex, day), amount, channel: "USSD", counterparty: "IBEDC", trueCategory: "ELECTRICITY", level,
      description: describe(level, `IBEDC PREPAID TOKEN ${digits(11)}`),
    });
  }

  // Generator diesel: card purchases; more frequent and pricier in Q3.
  const fuelCount = q3 ? 3 : 2;
  const fuel = allocate(q3 ? 95_000 : 60_000, Array.from({ length: fuelCount }, () => jitter(1, 0.15)), 100);
  fuel.forEach((amount, i) => {
    const level = chooseLevel([0.7, 0, 0.3, 0]);
    const day = Math.min(days, Math.floor((i * days) / fuelCount) + int(2, 8));
    debit({
      date: iso(year, monthIndex, day), amount, channel: "CARD", counterparty: level === 1 ? FUEL_STATION : null,
      trueCategory: "GENERATOR_FUEL", level, description: level === 1 ? "POS PURCHASE - OLUYOLE FILLING STN" : "POS PURCHASE",
    });
  });

  // Internet: monthly data bundle around the 5th.
  debit({
    date: iso(year, monthIndex, int(4, 6)), amount: 15_000, channel: "USSD", counterparty: "MTN NIGERIA",
    trueCategory: "INTERNET", level: 1, description: "MTN DATA BUNDLE 100GB - 30 DAYS",
  });

  // Transport / deliveries: paid to the same keke driver.
  const tripCount = q3 ? 3 : 2;
  const trips = allocate(q3 ? 60_000 : 40_000, Array.from({ length: tripCount }, () => jitter(1, 0.3)), 500);
  for (const amount of trips) {
    const level = chooseLevel([0.3, 0.2, 0.35, 0.15]);
    debit({
      date: iso(year, monthIndex, int(1, days)), amount, channel: "TRANSFER", counterparty: DRIVER,
      trueCategory: "TRANSPORT", level, description: describe(level, "DELIVERY/TRANSPORT - MUSA"),
    });
  }

  // Bank charges: posted at month end by Wema.
  const monthEnd = iso(year, monthIndex, days);
  const charges: [string, number][] = [
    [`SMS ALERT CHARGES ${mon} 2026`, int(1_050, 1_350)],
    [monthNo % 2 === 0 ? "ACCOUNT MAINTENANCE FEE" : "ACCT MAINT FEE + EMTL", int(3_000, 4_200)],
    ["POS MSC CHARGES", int(8_500, 10_500)],
  ];
  for (const [description, amount] of charges) {
    debit({
      date: monthEnd, amount, channel: "BANK", counterparty: "WEMA BANK", trueCategory: "BANK_CHARGES", level: 1, description,
    });
  }

  // Cash withdrawals for petty business spending.
  for (let i = 0; i < 2; i++) {
    debit({
      date: iso(year, monthIndex, int(1, days)), amount: roundTo(jitter(40_000, 0.25), 1_000), channel: "ATM",
      counterparty: null, trueCategory: "CASH_WITHDRAWAL", level: 1, description: `ATM WDL WEMA BODIJA ${digits(4)}`,
    });
  }

  // Misc absorbs the remainder (rounded, like a real bill) so operating costs hit the target;
  // the few leftover naira go into the POS charges line, where odd amounts are normal.
  const remainder = target - out.reduce((a, t) => a + t.amount, 0);
  const misc = roundTo(remainder, 500);
  out.find((t) => t.description === "POS MSC CHARGES")!.amount += remainder - misc;
  if (misc < 3_000) throw new Error(`${month}: misc remainder too small (${misc})`);
  const item = MISC_ITEMS[monthNo % MISC_ITEMS.length];
  const level = chooseLevel([0.5, 0, 0.3, 0.2]);
  debit({
    date: iso(year, monthIndex, int(8, 25)), amount: misc, channel: "TRANSFER",
    counterparty: level === 4 ? null : item.counterparty, trueCategory: "MISC", level, description: describe(level, item.desc),
  });

  return out;
}

function supplierPayment(date: string, amount: number, supplier: { name: string; short: string }, levels: [number, number, number, number]): Draft {
  const level = chooseLevel(levels);
  const clear = `${pick(["NIP TRF TO", "ALAT TRF TO"])} ${supplier.short} - STOCK`;
  return {
    date, amount, direction: "debit", channel: "TRANSFER", counterparty: supplier.name,
    trueCategory: "INVENTORY", level, description: describe(level, clear),
  };
}

function buildInventory(month: string, target: number): Draft[] {
  const { year, monthIndex } = parseMonth(month);
  const recurringLevels: [number, number, number, number] = [0.2, 0.65, 0.1, 0.05];
  const out: Draft[] = [];

  // Weekly supplier every Monday (~40%), bi-weekly every second Friday (~30%), monthly around the 18th (~10%).
  // The monthly delivery date sets how tight the Oct 1–14 forecast is (SPEC §7).
  const mondays = datesInMonth(month, (d) => weekday(d) === 1);
  const fridays = datesInMonth(month, (d) => {
    const diff = (Date.parse(d) - Date.parse(BIWEEKLY_ANCHOR)) / 86_400_000;
    return diff >= 0 && diff % 14 === 0;
  });
  for (const date of mondays) {
    out.push(supplierPayment(date, roundTo(jitter((0.4 * target) / 4.33, 0.05), 500), SUPPLIER_WEEKLY, recurringLevels));
  }
  for (const date of fridays) {
    out.push(supplierPayment(date, roundTo(jitter((0.3 * target) / 2.17, 0.05), 500), SUPPLIER_BIWEEKLY, recurringLevels));
  }
  out.push(supplierPayment(toWeekday(iso(year, monthIndex, int(17, 19))), roundTo(jitter(0.1 * target, 0.05), 500), SUPPLIER_MONTHLY, recurringLevels));

  // One-off suppliers absorb the remainder so inventory hits the target exactly.
  const remainder = target - out.reduce((a, t) => a + t.amount, 0);
  if (remainder < 20_000) throw new Error(`${month}: one-off inventory remainder too small (${remainder})`);
  const parts = remainder > 300_000 ? allocate(remainder, [jitter(1, 0.3), 1], 500) : [remainder];
  for (const amount of parts) {
    const supplier = pick(ONE_OFF_SUPPLIERS);
    const level = chooseLevel([0.6, 0, 0.25, 0.15]);
    out.push({
      date: iso(year, monthIndex, int(10, 26)), amount, direction: "debit", channel: "TRANSFER", counterparty: supplier,
      trueCategory: "INVENTORY", level, description: describe(level, `PAYMENT FOR GOODS - ${supplier}`),
    });
  }
  return out;
}

function buildRevenue(month: string, target: number, transferCount: number, posCount: number): Draft[] {
  const { year, monthIndex, days } = parseMonth(month);
  const out: Draft[] = [];

  // ~25% from customer transfers (wholesale buyers, regulars), ~75% from POS settlements.
  const transferTotal = roundTo(target * jitter(0.25, 0.08), 50);
  const transferAmounts = allocate(transferTotal, Array.from({ length: transferCount }, () => jitter(1, 0.4)), 50);
  transferAmounts.forEach((amount, i) => {
    const customer = pick(CUSTOMERS);
    const level = chooseLevel([0.4, 0.45, 0.1, 0.05]);
    const clear = `${pick(["TRF FROM", "NIP TRF FROM", "ALAT TRF FROM"])} ${customer}`;
    // Spread evenly through the month, with a little noise.
    const day = Math.max(1, Math.min(days, Math.round(((i + 0.5) * days) / transferCount) + int(-2, 2)));
    out.push({
      date: iso(year, monthIndex, day), amount, direction: "credit", channel: "TRANSFER", counterparty: customer,
      trueCategory: "SALES", level, description: level === 2 ? `NIP/${digits(10)}` : describe(level, clear),
    });
  });

  // POS settlements, spread evenly through the month.
  const posAmounts = allocate(target - transferTotal, Array.from({ length: posCount }, () => jitter(1, 0.2)), 1);
  posAmounts.forEach((amount, i) => {
    const day = Math.max(1, Math.min(days, Math.round(((i + 0.5) * days) / posCount) + int(-1, 1)));
    const date = iso(year, monthIndex, day);
    out.push({
      date, amount, direction: "credit", channel: "POS", counterparty: "WEMA POS SETTLEMENT", trueCategory: "SALES", level: 1,
      description: `POS SETTLEMENT ${date.slice(8, 10)}/${date.slice(5, 7)} TID 2058${digits(4)}`,
    });
  });
  return out;
}

// ---------------------------------------------------------------------------
// Assemble

const refPrefix: Record<Channel, string> = { POS: "POS", TRANSFER: "NIP", ATM: "ATM", USSD: "USSD", CARD: "CRD", BANK: "CHG" };

function generate(seed: number) {
  rand = mulberry32(seed);

  // Everything except POS settlements is decided first; POS settlements fill the remaining rows
  // so the total is exactly TOTAL_TRANSACTIONS.
  const nonPos = MONTH_TARGETS.map((t, i) => [...buildOperatingCosts(t.month, i, t.operatingCosts), ...buildInventory(t.month, t.inventory)]);
  const transferCounts = MONTH_TARGETS.map(() => int(5, 6));
  const posBudget = TOTAL_TRANSACTIONS - nonPos.reduce((a, m) => a + m.length, 0) - transferCounts.reduce((a, b) => a + b, 0);
  const posPerMonth = MONTH_TARGETS.map((_, i) => Math.floor(posBudget / MONTH_TARGETS.length) + (i < posBudget % MONTH_TARGETS.length ? 1 : 0));

  const drafts: Draft[] = MONTH_TARGETS.flatMap((t, i) => [...nonPos[i], ...buildRevenue(t.month, t.revenue, transferCounts[i], posPerMonth[i])]);
  if (drafts.length !== TOTAL_TRANSACTIONS) throw new Error(`Expected ${TOTAL_TRANSACTIONS} transactions, built ${drafts.length}`);

  // Order: by date; within a day, settlements and credits post before debits.
  const ordered = drafts
    .map((d) => ({ d, k: rand() }))
    .sort((x, y) => x.d.date.localeCompare(y.d.date) || (x.d.direction === y.d.direction ? x.k - y.k : x.d.direction === "credit" ? -1 : 1))
    .map((x) => x.d);

  let balance = ACCOUNT.openingBalance;
  let minBalance = balance;
  const transactions: RawTransaction[] = [];
  const groundTruth: Record<string, GroundTruth> = {};

  ordered.forEach((d, i) => {
    const id = `txn_${String(i + 1).padStart(3, "0")}`;
    balance += d.direction === "credit" ? d.amount : -d.amount;
    minBalance = Math.min(minBalance, balance);
    transactions.push({
      id, date: d.date, amount: d.amount, direction: d.direction, description: d.description, counterparty: d.counterparty,
      channel: d.channel, rawReference: `${refPrefix[d.channel]}${d.date.replace(/-/g, "").slice(2)}${digits(10)}`,
      accountId: ACCOUNT.accountId, balanceAfter: balance,
    });
    groundTruth[id] = { trueCategory: d.trueCategory, descriptionLevel: d.level };
  });

  const levelSharesOk = ([1, 2, 3, 4] as const).every((level) => {
    const share = ordered.filter((d) => d.level === level).length / ordered.length;
    return Math.abs(share - EXPECTED.levelShares[level]) <= EXPECTED.levelShareTolerance;
  });
  return { transactions, groundTruth, balance, valid: minBalance >= MIN_BALANCE_FLOOR && levelSharesOk };
}

// Try seed variations in a fixed order until the history is realistic
// (never close to overdrawn, description mix on target). Same result on every run.
const MIN_BALANCE_FLOOR = 50_000;
let attempt = 0;
let result = generate(SEED);
while (!result.valid) {
  if (++attempt > 500) throw new Error("No valid dataset found within 500 seed variations");
  result = generate(SEED + attempt);
}
const { transactions, groundTruth, balance } = result;

// ---------------------------------------------------------------------------
// Write

const root = join(__dirname, "..");
function write(rel: string, content: string) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

const csvCell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csvColumns: (keyof RawTransaction)[] = ["id", "date", "amount", "direction", "description", "counterparty", "channel", "rawReference", "accountId", "balanceAfter"];

write("src/data/account.json", JSON.stringify(ACCOUNT, null, 2) + "\n");
write("src/data/transactions.json", JSON.stringify(transactions, null, 2) + "\n");
write("data/ground-truth.json", JSON.stringify(groundTruth, null, 2) + "\n");
write(
  "public/sample/aisha-mini-mart-transactions.csv",
  [csvColumns.join(","), ...transactions.map((t) => csvColumns.map((c) => csvCell(t[c])).join(","))].join("\n") + "\n",
);

console.log(`Generated ${transactions.length} transactions (seed ${SEED + attempt}). Closing balance: ₦${balance.toLocaleString("en-NG")}`);
