// Transaction intelligence (SPEC.md §4): rule-based evidence scoring with confidence.
//
// Pass 1 scores each transaction on its own (description, counterparty name, channel, amount, timing).
// Pass 2 adds what the history says: how this counterparty's confident transactions were categorized,
// whether payments to them are regular, and anything the user has confirmed.

import { CATEGORIES_BY_DIRECTION, CATEGORY_LABELS } from "../categories";
import type { Category, ClassifiedTransaction, RawTransaction } from "../types";
import { dayOfMonth } from "./dates";
import { counterpartyKey, detectRecurringSeries, type Cadence } from "./recurrence";

export const CONFIDENCE = {
  /** At or above: shown as a normal category. */
  high: 0.8,
  /** Below: we ask the user "What was this for?". Between the two: "Likely …". */
  review: 0.6,
} as const;

export const WEIGHTS = {
  descriptionKeyword: 0.8,
  counterpartyKeyword: 0.5,
  counterpartyHistory: 0.6,
  userConfirmedCounterparty: 0.9,
  userConfirmedPattern: 0.7,
  channel: 0.4,
  creditIsSales: 0.6,
  recurrence: 0.2,
  amountBand: 0.15,
  timing: 0.15,
} as const;

/**
 * What the user has told us. Counterparty keys are normalized with `counterpartyKey`.
 * `byPattern` covers transactions with no counterparty (e.g. a bare "POS PURCHASE"), keyed by
 * channel + description, and only applies to similar amounts.
 */
export interface Confirmations {
  byTransaction: Record<string, Category>;
  byCounterparty: Record<string, Category>;
  byPattern: Record<string, { category: Category; amount: number }>;
}

export const NO_CONFIRMATIONS: Confirmations = { byTransaction: {}, byCounterparty: {}, byPattern: {} };

/** Amounts within this ratio count as "similar" for pattern confirmations. */
const PATTERN_AMOUNT_TOLERANCE = 0.3;

function patternKey(t: RawTransaction): string | null {
  const description = t.description.trim().toUpperCase();
  return t.counterparty || !description ? null : `${t.direction}|${t.channel}|${description}`;
}

const KEYWORDS: { category: Category; pattern: RegExp }[] = [
  { category: "SALES", pattern: /POS SETTLEMENT|\bSETTLEMENT\b/ },
  { category: "OTHER_INFLOW", pattern: /REVERSAL|REFUND|\bRVSL\b/ },
  { category: "INVENTORY", pattern: /STOCK|GOODS|PROVISIONS|WHOLESALE|SUPPLIES|BEVERAGE|FOODSTUFF|DETERGENT|PLASTIC|TRADERS/ },
  { category: "SALARIES", pattern: /SALARY|WAGES|STAFF PAY/ },
  { category: "RENT", pattern: /\bRENT\b|LANDLORD/ },
  { category: "ELECTRICITY", pattern: /IBEDC|PREPAID|TOKEN|NEPA|ELECTRIC|BUYPOWER/ },
  { category: "GENERATOR_FUEL", pattern: /DIESEL|\bFUEL\b|FILLING (STN|STATION)|PETROL/ },
  { category: "INTERNET", pattern: /\bDATA\b|AIRTIME|\bMTN\b|AIRTEL|\bGLO\b|9MOBILE|INTERNET|WIFI/ },
  { category: "TRANSPORT", pattern: /TRANSPORT|DELIVERY|LOGISTICS|\bKEKE\b|OKADA|LOADING/ },
  { category: "BANK_CHARGES", pattern: /CHARGE|\bFEE\b|MAINT|SMS ALERT|\bEMTL\b|STAMP DUTY/ },
  { category: "CASH_WITHDRAWAL", pattern: /\bATM\b|\bWDL\b|WITHDRAWAL|CASH ?OUT/ },
  { category: "MISC", pattern: /\bLEVY\b|WASTE|\bPSP\b|REPAIR|CLEAN|FUMIGATION|GUARD|SECURITY|SIGNBOARD/ },
];

const CADENCE_LABEL: Record<Cadence, string> = { 7: "every week", 14: "every two weeks", 30: "every month" };

type Evidence = Map<Category, { score: number; reasons: string[] }>;

function addEvidence(evidence: Evidence, category: Category, points: number, reason: string) {
  const entry = evidence.get(category) ?? { score: 0, reasons: [] };
  entry.score += points;
  entry.reasons.push(reason);
  evidence.set(category, entry);
}

function keywordMatches(text: string): Category[] {
  const upper = text.toUpperCase();
  return [...new Set(KEYWORDS.filter((k) => k.pattern.test(upper)).map((k) => k.category))];
}

/** Evidence from the transaction alone. `sameDayDebits` supports the payday check. */
function ownEvidence(t: RawTransaction, sameDayDebits: RawTransaction[]): Evidence {
  const evidence: Evidence = new Map();
  const allowed = new Set(CATEGORIES_BY_DIRECTION[t.direction]);

  const fromDescription = keywordMatches(t.description).filter((c) => allowed.has(c));
  for (const c of fromDescription) addEvidence(evidence, c, WEIGHTS.descriptionKeyword, `Description says "${t.description}"`);

  if (t.counterparty) {
    for (const c of keywordMatches(t.counterparty).filter((c) => allowed.has(c) && !fromDescription.includes(c))) {
      addEvidence(evidence, c, WEIGHTS.counterpartyKeyword, `${t.direction === "credit" ? "From" : "Paid to"} ${t.counterparty}`);
    }
  }

  if (t.direction === "credit") {
    addEvidence(evidence, "SALES", WEIGHTS.creditIsSales, "Money coming into the business");
    if (t.channel === "POS") addEvidence(evidence, "SALES", WEIGHTS.channel, "Card payments from customers (POS)");
  } else {
    if (t.channel === "ATM") addEvidence(evidence, "CASH_WITHDRAWAL", WEIGHTS.channel, "ATM transaction");
    if (t.channel === "BANK") addEvidence(evidence, "BANK_CHARGES", WEIGHTS.channel, "Posted by the bank");

    const day = dayOfMonth(t.date);
    if (t.channel === "TRANSFER" && t.amount >= 80_000 && t.amount <= 600_000) {
      addEvidence(evidence, "INVENTORY", WEIGHTS.amountBand, "Amount is typical of a stock purchase");
    }
    if (t.channel === "TRANSFER" && day <= 5 && t.amount >= 100_000 && t.amount <= 200_000) {
      addEvidence(evidence, "RENT", WEIGHTS.timing, "Paid at the start of the month");
    }
    const isWageSized = (x: RawTransaction) => x.amount >= 30_000 && x.amount <= 200_000;
    const hasPayrollTwin = sameDayDebits.some(
      (o) => o.id !== t.id && isWageSized(o) && Math.abs(o.amount - t.amount) <= 0.1 * Math.max(o.amount, t.amount),
    );
    if (t.channel === "TRANSFER" && day >= 25 && isWageSized(t) && hasPayrollTwin) {
      addEvidence(evidence, "SALARIES", WEIGHTS.timing, "Similar payments on the same day near month end");
    }
  }
  return evidence;
}

function resolve(t: RawTransaction, evidence: Evidence): Pick<ClassifiedTransaction, "category" | "confidence" | "reasons"> {
  const ranked = CATEGORIES_BY_DIRECTION[t.direction]
    .map((category) => ({ category, ...(evidence.get(category) ?? { score: 0, reasons: [] }) }))
    .sort((a, b) => b.score - a.score);
  const [top, second] = ranked;
  if (top.score <= 0) return { category: "UNCATEGORIZED", confidence: 0, reasons: ["No clear signals"] };
  const confidence = Math.min(0.98, top.score) * (top.score / (top.score + second.score));
  return { category: top.category, confidence: Math.round(confidence * 100) / 100, reasons: top.reasons };
}

function dominantCategory(counts: Map<Category, number> | undefined): Category | null {
  if (!counts) return null;
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const [category, count] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return total >= 2 && count / total >= 0.6 ? category : null;
}

export function classifyTransactions(
  transactions: RawTransaction[],
  confirmations: Confirmations = NO_CONFIRMATIONS,
): ClassifiedTransaction[] {
  const debitsByDate = new Map<string, RawTransaction[]>();
  for (const t of transactions) {
    if (t.direction === "debit") debitsByDate.set(t.date, [...(debitsByDate.get(t.date) ?? []), t]);
  }

  // Pass 1
  const own = transactions.map((t) => ownEvidence(t, debitsByDate.get(t.date) ?? []));

  // Counterparty profiles from confident pass-1 results and user confirmations.
  const profiles = new Map<string, Map<Category, number>>();
  const countFor = (key: string, category: Category) => {
    const counts = profiles.get(key) ?? new Map<Category, number>();
    counts.set(category, (counts.get(category) ?? 0) + 1);
    profiles.set(key, counts);
  };
  transactions.forEach((t, i) => {
    const key = counterpartyKey(t.counterparty);
    if (!key) return;
    const confirmed = confirmations.byTransaction[t.id];
    if (confirmed) return countFor(key, confirmed);
    const first = resolve(t, own[i]);
    if (first.confidence >= CONFIDENCE.high) countFor(key, first.category);
  });

  const seriesByTransaction = new Map(
    detectRecurringSeries(transactions).flatMap((s) => s.transactionIds.map((id) => [id, s] as const)),
  );

  // Pass 2
  return transactions.map((t, i) => {
    const confirmed = confirmations.byTransaction[t.id];
    if (confirmed) return { ...t, category: confirmed, confidence: 1, userConfirmed: true, reasons: ["Confirmed by you"] };

    const evidence: Evidence = new Map([...own[i]].map(([c, e]) => [c, { score: e.score, reasons: [...e.reasons] }]));
    const key = counterpartyKey(t.counterparty);
    const allowed = new Set(CATEGORIES_BY_DIRECTION[t.direction]);
    let known: Category | null = null;

    const confirmedForCounterparty = key ? confirmations.byCounterparty[key] : undefined;
    const pattern = patternKey(t);
    const confirmedPattern = pattern ? confirmations.byPattern[pattern] : undefined;
    if (confirmedForCounterparty && allowed.has(confirmedForCounterparty)) {
      known = confirmedForCounterparty;
      addEvidence(evidence, known, WEIGHTS.userConfirmedCounterparty, `You told us payments to ${t.counterparty} are ${CATEGORY_LABELS[known]}`);
    } else if (key) {
      const fromHistory = dominantCategory(profiles.get(key));
      if (fromHistory && allowed.has(fromHistory)) {
        known = fromHistory;
        const verb = t.direction === "credit" ? "from" : "to";
        addEvidence(evidence, known, WEIGHTS.counterpartyHistory, `Earlier transactions ${verb} ${t.counterparty} were ${CATEGORY_LABELS[known]}`);
      }
    } else if (
      confirmedPattern &&
      allowed.has(confirmedPattern.category) &&
      Math.abs(t.amount - confirmedPattern.amount) <= PATTERN_AMOUNT_TOLERANCE * confirmedPattern.amount
    ) {
      addEvidence(
        evidence, confirmedPattern.category, WEIGHTS.userConfirmedPattern,
        `You told us a similar "${t.description}" was ${CATEGORY_LABELS[confirmedPattern.category]}`,
      );
    }

    const series = seriesByTransaction.get(t.id);
    if (series && known) {
      addEvidence(evidence, known, WEIGHTS.recurrence, `Regular payment ${CADENCE_LABEL[series.cadence]}, similar amount`);
    }

    return { ...t, ...resolve(t, evidence), userConfirmed: false };
  });
}

export function needsReview(t: ClassifiedTransaction): boolean {
  return !t.userConfirmed && t.confidence < CONFIDENCE.review;
}

/**
 * Records the user's answer for a transaction. Also remembers the counterparty (or, when there is
 * none, the description pattern), so similar transactions are recognized (SPEC.md §4 "User confirmation").
 */
export function confirmCategory(confirmations: Confirmations, t: RawTransaction, category: Category): Confirmations {
  const key = counterpartyKey(t.counterparty);
  const pattern = patternKey(t);
  return {
    byTransaction: { ...confirmations.byTransaction, [t.id]: category },
    byCounterparty: key ? { ...confirmations.byCounterparty, [key]: category } : confirmations.byCounterparty,
    byPattern: pattern ? { ...confirmations.byPattern, [pattern]: { category, amount: t.amount } } : confirmations.byPattern,
  };
}
