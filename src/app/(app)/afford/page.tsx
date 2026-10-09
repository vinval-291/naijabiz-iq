"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAppState } from "@/components/app-state";
import { Card, PageHeader, StatusPill, type Status } from "@/components/ui";
import { WhatsAppAlertButton } from "@/components/whatsapp-alert";
import { PURPOSES, assessAffordability, type Purpose } from "@/lib/engine/affordability";
import { formatNaira, formatNairaCompact } from "@/lib/format";
import type { AffordabilityResult, Verdict } from "@/lib/types";

const VERDICT_STATUS: Record<Verdict, Status> = { Comfortable: "good", Careful: "warning", Cannot: "critical" };
const VERDICT_LABEL: Record<Verdict, string> = { Comfortable: "Comfortable", Careful: "Be careful", Cannot: "Not now" };

const digitsOnly = (s: string) => s.replace(/[^\d]/g, "").replace(/^0+/, "");
const withCommas = (digits: string) => (digits ? Number(digits).toLocaleString("en-NG") : "");

export default function AffordPage() {
  const { analysis } = useAppState();
  const [amountText, setAmountText] = useState("");
  const [purpose, setPurpose] = useState<Purpose | undefined>("Stock");
  const [result, setResult] = useState<AffordabilityResult | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // On a phone the answer appears below the form: bring it into view after each check.
  useEffect(() => {
    if (!result || window.matchMedia("(min-width: 1024px)").matches) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    resultRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }, [result]);

  if (!analysis) return null;

  const check = (amount: number) => {
    setAmountText(String(amount));
    setResult(assessAffordability(amount, analysis, purpose));
  };

  function submit(e: FormEvent) {
    e.preventDefault();
    const amount = Number(amountText);
    if (amount > 0) check(amount);
  }

  return (
    <>
      <PageHeader title="Can I afford this?" intro="Tell us what you want to spend. We'll check it against your cash and the bills coming up in the next two weeks." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <Card as="div">
          <form onSubmit={submit}>
            <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-ink">How much do you want to spend?</label>
            <div className="flex h-14 items-center rounded-input bg-surface px-4 ring-brand-magenta focus-within:ring-2">
              <span className="text-xl font-semibold text-muted" aria-hidden="true">₦</span>
              <input id="amount" inputMode="numeric" autoComplete="off" placeholder="300,000"
                className="tabular h-full w-full bg-transparent pl-2 text-xl font-semibold text-ink outline-none placeholder:font-normal placeholder:text-muted/60"
                value={withCommas(amountText)} onChange={(e) => setAmountText(digitsOnly(e.target.value))} />
            </div>

            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-medium text-ink">What is it for?</legend>
              <div className="flex flex-wrap gap-2">
                {PURPOSES.map((p) => (
                  <button key={p} type="button" aria-pressed={purpose === p}
                    onClick={() => {
                      const next = purpose === p ? undefined : p;
                      setPurpose(next);
                      if (result) setResult(assessAffordability(result.amount, analysis, next));
                    }}
                    className={`h-11 rounded-full border px-4 text-sm font-medium transition-colors ${purpose === p ? "border-brand bg-tint text-brand" : "border-line text-ink hover:border-brand"}`}>
                    {p}
                  </button>
                ))}
              </div>
            </fieldset>

            <button type="submit" disabled={!amountText}
              className="mt-6 inline-flex h-13 w-full items-center justify-center rounded-input bg-brand font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50">
              Check
            </button>
          </form>

          <p className="mt-5 text-sm text-muted">
            Cash today <strong className="font-semibold text-ink">{formatNairaCompact(analysis.cash.cashBalance)}</strong> · We suggest keeping at least{" "}
            <strong className="font-semibold text-ink">{formatNairaCompact(analysis.cash.minimumReserve)}</strong> for running costs (about 10 days).
          </p>
        </Card>

        <div ref={resultRef} aria-live="polite" className="min-w-0 scroll-mt-16">
          {result ? <Result result={result} onCheck={check} /> : (
            <div className="grid h-full min-h-56 place-items-center rounded-card border border-dashed border-line p-8 text-center text-muted">
              Enter an amount to see what it would do to your cash.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Result({ result: r, onCheck }: { result: AffordabilityResult; onCheck: (amount: number) => void }) {
  const status = VERDICT_STATUS[r.verdict];
  const rows: [string, number, "−" | "=" | ""][] = [
    ["Cash today", r.currentCash, ""],
    [`This purchase${r.purpose ? ` (${r.purpose.toLowerCase()})` : ""}`, r.amount, "−"],
    ["Expected expenses, next 2 weeks", r.upcomingExpenses, "−"],
  ];
  // Position of the left-over amount against the reserve, on a scale up to twice the reserve.
  const scaleMax = Math.max(r.minimumReserve * 2, r.remainingBuffer);
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / scaleMax) * 100))}%`;

  return (
    <Card as="div" className={status === "good" ? "border-positive/50" : status === "warning" ? "border-caution" : "border-danger/40"}>
      <StatusPill status={status} large>{VERDICT_LABEL[r.verdict]}</StatusPill>
      <h2 className="mt-3 font-display text-2xl font-semibold text-ink sm:text-3xl">{r.message}</h2>

      <dl className="mt-5 divide-y divide-line text-[15px]">
        {rows.map(([label, value, sign]) => (
          <div key={label} className="flex justify-between gap-4 py-2.5">
            <dt className="text-muted">{label}</dt>
            <dd className="tabular shrink-0 whitespace-nowrap font-medium text-ink">{sign ? `${sign} ` : ""}{formatNaira(value)}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 py-3">
          <dt className="font-semibold text-ink">Left over</dt>
          <dd className={`tabular shrink-0 whitespace-nowrap text-lg font-semibold ${r.remainingBuffer < 0 ? "text-danger-text" : "text-ink"}`}>{formatNaira(r.remainingBuffer)}</dd>
        </div>
      </dl>

      <div className="mt-2">
        <div className="relative h-2 rounded-full bg-surface" role="img"
          aria-label={`Left over ${formatNaira(r.remainingBuffer)} compared with a ${formatNaira(r.minimumReserve)} safety reserve`}>
          <div className={`absolute inset-y-0 left-0 rounded-full ${status === "good" ? "bg-positive" : status === "warning" ? "bg-caution" : "bg-danger"}`} style={{ width: pct(Math.max(0, r.remainingBuffer)) }} />
          <div className="absolute -inset-y-1.5 w-0.5 rounded bg-ink" style={{ left: pct(r.minimumReserve) }} aria-hidden="true" />
        </div>
        <p className="mt-2 text-xs text-muted">The black mark is your {formatNairaCompact(r.minimumReserve)} safety reserve.</p>
      </div>

      {r.recommendedRange && r.verdict !== "Comfortable" && (
        <div className="mt-5 rounded-input bg-tint p-4">
          <p className="text-sm text-muted">A safer amount right now</p>
          <p className="text-xl font-semibold text-ink">{formatNaira(r.recommendedRange[0])} – {formatNaira(r.recommendedRange[1])}</p>
          <button type="button" onClick={() => onCheck(r.recommendedRange![1])} className="mt-2 text-sm font-semibold text-brand underline-offset-2 hover:underline">
            Check {formatNairaCompact(r.recommendedRange[1])} instead
          </button>
        </div>
      )}

      {r.notes.length > 0 && (
        <ul className="mt-5 space-y-2 text-sm text-muted">
          {r.notes.map((n) => <li key={n} className="flex gap-2"><span aria-hidden="true" className="text-brand">•</span>{n}</li>)}
        </ul>
      )}

      <div className="mt-6 border-t border-line pt-5">
        {/* Keyed so a new check starts with a fresh button, not the previous send's result. */}
        <WhatsAppAlertButton key={`${r.amount}-${r.purpose ?? ""}`} kind="afford" amount={r.amount} purpose={r.purpose as Purpose | undefined}
          label="Send this answer to my WhatsApp" />
      </div>
    </Card>
  );
}
