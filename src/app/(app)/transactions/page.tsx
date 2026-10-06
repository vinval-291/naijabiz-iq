"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/app-state";
import { PageHeader } from "@/components/ui";
import { CATEGORY_LABELS, REVIEW_OPTIONS } from "@/lib/categories";
import { CONFIDENCE, needsReview } from "@/lib/engine/classify";
import { formatDayMonth, formatMonthName, formatName, formatNaira } from "@/lib/format";
import type { Category, Channel, ClassifiedTransaction } from "@/lib/types";

type View = "review" | "all" | "in" | "out";

/** What to show when the bank gives no counterparty name. */
const NO_COUNTERPARTY: Record<Channel, string> = {
  CARD: "Card purchase", ATM: "ATM", POS: "POS", BANK: "Wema Bank", TRANSFER: "Transfer, no name given", USSD: "USSD payment",
};

export default function TransactionsPage() {
  return (
    <Suspense>
      <Transactions />
    </Suspense>
  );
}

function Transactions() {
  const params = useSearchParams();
  const { analysis, confirm } = useAppState();
  const [view, setView] = useState<View>(params.get("view") === "review" ? "review" : "all");
  const [open, setOpen] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const pending = useRef<{ label: string; before: number } | null>(null);
  const flaggedCount = analysis?.flagged.length ?? 0;

  // After a confirmation, report how many similar transactions were recognized too.
  useEffect(() => {
    const p = pending.current;
    if (!p) return;
    pending.current = null;
    const alsoRecognized = p.before - flaggedCount - 1;
    // The toast depends on the recomputed analysis, which only exists after the confirmation re-renders.
    setToast(`Saved as ${p.label}.${alsoRecognized > 0 ? ` We also recognized ${alsoRecognized} similar transaction${alsoRecognized === 1 ? "" : "s"}.` : ""}`);
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [flaggedCount]);

  if (!analysis) return null;
  const all = analysis.transactions;

  const filtered = all.filter((t) =>
    view === "review" ? needsReview(t) : view === "in" ? t.direction === "credit" : view === "out" ? t.direction === "debit" : true,
  );
  const byMonth = new Map<string, ClassifiedTransaction[]>();
  for (const t of [...filtered].reverse()) byMonth.set(t.date.slice(0, 7), [...(byMonth.get(t.date.slice(0, 7)) ?? []), t]);

  const tabs: { id: View; label: string }[] = [
    { id: "review", label: `Needs your input (${flaggedCount})` },
    { id: "all", label: "All" },
    { id: "in", label: "Money in" },
    { id: "out", label: "Money out" },
  ];

  function answer(t: ClassifiedTransaction, category: Category) {
    pending.current = { label: CATEGORY_LABELS[category], before: flaggedCount };
    confirm(t.id, category);
    setOpen(null);
  }

  return (
    <>
      <PageHeader
        title="Transactions"
        intro={`${all.length} transactions from your Wema account. NaijaBiz IQ works out what each one was for, and asks you when it isn't sure.`}
      />

      <div role="tablist" aria-label="Filter transactions" className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button key={tab.id} role="tab" aria-selected={view === tab.id} onClick={() => setView(tab.id)}
            className={`h-11 shrink-0 rounded-full border px-4 text-sm font-medium transition-colors ${
              view === tab.id ? "border-brand bg-tint text-brand" : "border-line text-ink hover:border-brand"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {view === "review" && flaggedCount === 0 && (
        <p className="rounded-card bg-tint p-6 text-ink">All caught up. Every transaction is identified.</p>
      )}

      {[...byMonth].map(([month, rows]) => (
        <section key={month} className="mb-6">
          <h2 className="sticky top-13 z-10 bg-white/95 py-2 lg:top-0 text-sm font-semibold uppercase tracking-wider text-muted backdrop-blur">
            {formatMonthName(month)} {month.slice(0, 4)}
          </h2>
          <ul className="divide-y divide-line rounded-card border border-line">
            {rows.map((t) => (
              <Row key={t.id} t={t} expanded={open === t.id} onToggle={() => setOpen(open === t.id ? null : t.id)} onAnswer={(c) => answer(t, c)} />
            ))}
          </ul>
        </section>
      ))}

      {toast && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-30 mx-auto max-w-md rounded-input bg-ink px-4 py-3 text-sm text-white shadow-xl lg:bottom-8">
          {toast}
        </div>
      )}
    </>
  );
}

function CategoryChip({ t }: { t: ClassifiedTransaction }) {
  if (needsReview(t)) return <span className="rounded-full bg-caution/30 px-2.5 py-0.5 text-xs font-semibold text-caution-text">Needs your input</span>;
  const likely = !t.userConfirmed && t.confidence < CONFIDENCE.high;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="rounded-full bg-tint px-2.5 py-0.5 text-xs font-semibold text-brand">
        {likely ? "Likely " : ""}{CATEGORY_LABELS[t.category]}
      </span>
      <span className="text-xs text-muted">{t.userConfirmed ? "Confirmed by you" : `${Math.round(t.confidence * 100)}%`}</span>
    </span>
  );
}

function Row({ t, expanded, onToggle, onAnswer }: { t: ClassifiedTransaction; expanded: boolean; onToggle: () => void; onAnswer: (c: Category) => void }) {
  const flagged = needsReview(t);
  return (
    <li className={flagged ? "bg-caution/5" : ""}>
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-start gap-2.5 px-3 py-3.5 text-left hover:bg-surface/70 sm:gap-4 sm:px-4">
        <span className="w-14 shrink-0 whitespace-nowrap pt-0.5 text-sm text-muted">{formatDayMonth(t.date)}</span>
        <span className="min-w-0 flex-1">
          <span className={`block truncate font-mono text-[13px] ${t.description ? "text-ink" : "italic text-muted"}`}>{t.description || "(no description)"}</span>
          <span className="mt-0.5 block truncate text-sm text-muted">{t.counterparty ? formatName(t.counterparty) : NO_COUNTERPARTY[t.channel]}</span>
          <span className="mt-1.5 block"><CategoryChip t={t} /></span>
        </span>
        <span className={`tabular shrink-0 pt-0.5 text-[15px] font-semibold ${t.direction === "credit" ? "text-positive-text" : "text-ink"}`}>
          {t.direction === "credit" ? "+" : "−"}{formatNaira(t.amount)}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-4 sm:px-4 sm:pl-20">
          {flagged ? (
            <div className="rounded-input bg-white p-4 ring-1 ring-caution">
              <p className="font-medium text-ink">We couldn&apos;t confidently identify this transaction. What was this for?</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {REVIEW_OPTIONS[t.direction].map((o) => (
                  <button key={o.category} type="button" onClick={() => onAnswer(o.category)}
                    className="h-10 rounded-full border border-line px-3.5 text-sm font-medium text-ink hover:border-brand hover:bg-tint hover:text-brand">
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-input bg-surface p-4 text-sm">
              <p className="font-medium text-ink">Why we think this is {CATEGORY_LABELS[t.category].toLowerCase()}</p>
              <ul className="mt-1.5 space-y-1 text-muted">
                {t.reasons.map((r) => <li key={r} className="flex gap-2"><span aria-hidden="true">•</span>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
