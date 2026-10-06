// Picks real rows from the demo data to illustrate "raw statement line → meaning".

import { CATEGORY_LABELS } from "./categories";
import { DEMO_AS_OF, DEMO_TRANSACTIONS } from "./demo";
import { classifyTransactions, needsReview } from "./engine/classify";
import { formatName } from "./format";
import type { ClassifiedTransaction } from "./types";
import type { StatementLineProps } from "@/components/statement-line";

export function toStatementLine(t: ClassifiedTransaction): Omit<StatementLineProps, "delayMs"> {
  const flagged = needsReview(t);
  const who = t.counterparty ? formatName(t.counterparty) : null;
  const pattern = t.reasons.find((r) => r.startsWith("Regular payment"));
  let detail: string;
  if (flagged) detail = "We'll ask you what this was";
  else if (t.channel === "POS" && t.direction === "credit") detail = "Customer card payments";
  else detail = [who, pattern?.replace("Regular payment ", "paid ").replace(", similar amount", "")].filter(Boolean).join(" · ");

  return {
    narration: t.description,
    amount: t.amount,
    direction: t.direction,
    meaning: flagged ? "Not sure yet" : CATEGORY_LABELS[t.category],
    detail,
    certain: !flagged,
  };
}

/** Three September lines: a reference-only supplier payment, a POS settlement, and one we can't identify. */
export function heroExamples(): Omit<StatementLineProps, "delayMs">[] {
  const september = classifyTransactions(DEMO_TRANSACTIONS).filter((t) => t.date.startsWith(DEMO_AS_OF.slice(0, 7)));
  const all = classifyTransactions(DEMO_TRANSACTIONS);
  const picks: (ClassifiedTransaction | undefined)[] = [
    september.find((t) => t.description.startsWith("TRF/") && t.category === "INVENTORY" && t.reasons.some((r) => r.includes("every week"))),
    september.find((t) => t.channel === "POS" && t.direction === "credit"),
    [...all].reverse().find((t) => needsReview(t)),
  ];
  return picks.filter((t): t is ClassifiedTransaction => Boolean(t)).map(toStatementLine);
}
