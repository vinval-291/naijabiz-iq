// WhatsApp alerts: messages written by the engine from verified numbers, plus request validation.
// Pure functions (no network); the server route in src/app/api/alerts/whatsapp uses them.

import { CATEGORIES_BY_DIRECTION } from "./categories";
import { PURPOSES, assessAffordability, type Purpose } from "./engine/affordability";
import { NO_CONFIRMATIONS, type Confirmations } from "./engine/classify";
import type { Analysis } from "./engine";
import { formatDayMonth, formatMonthName, formatName, formatNaira, formatNairaCompact, formatPercent } from "./format";
import type { Category } from "./types";

export const ALERT_KINDS = ["forecast", "afford", "weekly"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

export interface AlertRequest {
  kind: AlertKind;
  amount?: number;
  purpose?: Purpose;
  confirmations: Confirmations;
}

/** What POST /api/alerts/whatsapp returns. `message` is always included so the app can show it. */
export type AlertResponse =
  | { sent: true; to: string; message: string; status: string }
  | { sent: false; reason: "not-configured" | "rate-limited" | "send-failed"; detail: string; message: string };

export interface AlertStatus {
  configured: boolean;
  to: string | null;
}

const MAX_AMOUNT = 100_000_000;
const MAX_ENTRIES = 300;
const VALID_CATEGORIES = new Set<Category>([...CATEGORIES_BY_DIRECTION.credit, ...CATEGORIES_BY_DIRECTION.debit]);

// ---------------------------------------------------------------------------
// Messages

function header(a: Analysis, title: string): string {
  return `*NaijaBiz IQ · ${title}*\n${formatName(a.account.accountName)}`;
}

export function forecastAlert(a: Analysis): string {
  const f = a.forecast;
  return [
    header(a, "Cash alert"),
    "",
    `${f.risk} cash pressure in the next 2 weeks. Your cash may fall to about ${formatNairaCompact(f.lowestBalance)} around ${formatDayMonth(f.lowestBalanceDate)}.`,
    f.reason,
    `Keep at least ${formatNairaCompact(a.cash.minimumReserve)} for running costs, and check big purchases in the app first.`,
  ].join("\n");
}

export function affordAlert(a: Analysis, amount: number, purpose?: Purpose): string {
  const r = assessAffordability(amount, a, purpose);
  const lines = [
    header(a, "Can I afford this?"),
    "",
    `${formatNaira(r.amount)}${r.purpose ? ` for ${r.purpose.toLowerCase()}` : ""}: *${r.message}*`,
    `Cash today ${formatNaira(r.currentCash)} − purchase ${formatNaira(r.amount)} − expected expenses ${formatNaira(r.upcomingExpenses)} = ${formatNaira(r.remainingBuffer)} left.`,
  ];
  if (r.verdict !== "Comfortable" && r.recommendedRange) {
    lines.push(`Safer amount right now: ${formatNaira(r.recommendedRange[0])} – ${formatNaira(r.recommendedRange[1])}.`);
  }
  if (r.verdict === "Comfortable") lines.push(`You'd still keep your ${formatNairaCompact(r.minimumReserve)} safety reserve.`);
  return lines.join("\n");
}

export function weeklyAlert(a: Analysis): string {
  const month = a.months.at(-1);
  const prev = a.months.at(-2);
  const lines = [header(a, "Weekly summary"), ""];
  if (month) {
    lines.push(`${formatMonthName(month.period)}: sales ${formatNairaCompact(month.revenue)}, spending ${formatNairaCompact(month.expenses)}.`);
  }
  const change = prev && prev.closingBalance ? ((a.cash.cashBalance - prev.closingBalance) / prev.closingBalance) * 100 : null;
  lines.push(`Cash today ${formatNairaCompact(a.cash.cashBalance)}${change === null ? "" : ` (${formatPercent(change)} since end of ${formatMonthName(prev!.period)})`}.`);
  const prevHealth = a.previousHealth ? `, ${a.previousHealth.score > a.health.score ? "down" : "up"} from ${a.previousHealth.score} on ${formatDayMonth(a.previousHealth.asOf)}` : "";
  lines.push(`Business Health ${a.health.score} (${a.health.band})${prevHealth}.`);
  if (a.insights[0]) lines.push(`Key insight: ${a.insights[0].title}.`);
  if (a.flagged.length) lines.push(`${a.flagged.length} transaction${a.flagged.length === 1 ? "" : "s"} need${a.flagged.length === 1 ? "s" : ""} your input.`);
  return lines.join("\n");
}

export function writeAlert(a: Analysis, req: Pick<AlertRequest, "kind" | "amount" | "purpose">): string {
  switch (req.kind) {
    case "forecast": return forecastAlert(a);
    case "afford": return affordAlert(a, req.amount!, req.purpose);
    case "weekly": return weeklyAlert(a);
  }
}

// ---------------------------------------------------------------------------
// Request validation: the browser only chooses the alert type and amount — never the text or recipient.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

function sanitizeConfirmations(raw: unknown, transactionIds: Set<string>): Confirmations {
  if (!isRecord(raw)) return NO_CONFIRMATIONS;
  const out: Confirmations = { byTransaction: {}, byCounterparty: {}, byPattern: {} };
  const entries = (x: unknown) => (isRecord(x) ? Object.entries(x).slice(0, MAX_ENTRIES) : []);
  for (const [id, c] of entries(raw.byTransaction)) {
    if (transactionIds.has(id) && VALID_CATEGORIES.has(c as Category)) out.byTransaction[id] = c as Category;
  }
  for (const [key, c] of entries(raw.byCounterparty)) {
    if (key.length <= 100 && VALID_CATEGORIES.has(c as Category)) out.byCounterparty[key] = c as Category;
  }
  for (const [key, v] of entries(raw.byPattern)) {
    if (key.length <= 200 && isRecord(v) && VALID_CATEGORIES.has(v.category as Category) &&
        typeof v.amount === "number" && Number.isFinite(v.amount) && v.amount > 0) {
      out.byPattern[key] = { category: v.category as Category, amount: v.amount };
    }
  }
  return out;
}

export function parseAlertRequest(body: unknown, transactionIds: Set<string>): Result<AlertRequest> {
  if (!isRecord(body)) return { ok: false, error: "Expected a JSON object." };
  const kind = body.kind as AlertKind;
  if (!ALERT_KINDS.includes(kind)) return { ok: false, error: `kind must be one of ${ALERT_KINDS.join(", ")}.` };

  let amount: number | undefined;
  let purpose: Purpose | undefined;
  if (kind === "afford") {
    amount = typeof body.amount === "number" ? Math.round(body.amount) : NaN;
    if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_AMOUNT) return { ok: false, error: "amount must be a positive number of naira." };
    if (body.purpose !== undefined) {
      if (!PURPOSES.includes(body.purpose as Purpose)) return { ok: false, error: `purpose must be one of ${PURPOSES.join(", ")}.` };
      purpose = body.purpose as Purpose;
    }
  }
  return { ok: true, value: { kind, amount, purpose, confirmations: sanitizeConfirmations(body.confirmations, transactionIds) } };
}

/** Allows one action per `intervalMs`. Returns seconds to wait, or 0 when allowed. */
export function createRateLimiter(intervalMs: number) {
  let last = -Infinity;
  return (now: number): number => {
    if (now - last < intervalMs) return Math.ceil((intervalMs - (now - last)) / 1000);
    last = now;
    return 0;
  };
}
