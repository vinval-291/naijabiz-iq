// A raw bank-statement line and what NaijaBiz IQ understood from it — the product's signature.

import { formatNaira } from "@/lib/format";

export interface StatementLineProps {
  narration: string;          // "" shows as "(no description)"
  amount: number;
  direction: "credit" | "debit";
  meaning: string;            // "Stock" / "Not sure yet"
  detail: string;             // "Adebayo Provisions · paid every week"
  certain: boolean;
  delayMs?: number;
}

export function StatementLine({ narration, amount, direction, meaning, detail, certain, delayMs = 0 }: StatementLineProps) {
  return (
    <li className="py-3.5 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-4 font-mono text-[13px] text-ink/80">
        <span className={`truncate ${narration ? "" : "italic text-muted"}`}>{narration || "(no description)"}</span>
        <span className={`tabular shrink-0 ${direction === "credit" ? "text-positive-text" : ""}`}>
          {direction === "credit" ? "+" : "−"}
          {formatNaira(amount)}
        </span>
      </div>
      <div className="reveal mt-1.5 flex items-center gap-2 text-sm" style={{ animationDelay: `${delayMs}ms` }}>
        <span aria-hidden="true" className="text-brand">↳</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            certain ? "bg-tint text-brand" : "bg-caution/25 text-caution-text"
          }`}
        >
          {meaning}
        </span>
        <span className="truncate text-muted">{detail}</span>
      </div>
    </li>
  );
}
