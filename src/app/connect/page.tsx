"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { useAppState } from "@/components/app-state";
import { OnboardingShell, primaryButtonClass, secondaryButtonClass } from "@/components/onboarding-shell";
import { StatementLine } from "@/components/statement-line";
import { parseTransactionsCsv } from "@/lib/csv";
import { DEMO_ACCOUNT } from "@/lib/demo";
import { formatDayMonth } from "@/lib/format";
import { toStatementLine } from "@/lib/statement-examples";

type Step = "choose" | "consent" | "importing" | "done";

const IMPORT_MS = 3200;
const VISIBLE_ROWS = 5;
/** How often the visible statement lines refresh, so each one stays long enough to read. */
const ROWS_REFRESH_MS = 500;

export default function ConnectPage() {
  const { analysis, connectWema, connectCsv, profile } = useAppState();
  const [step, setStep] = useState<Step>("choose");
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const finishImport = useCallback(() => setStep("done"), []);

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = parseTransactionsCsv(await file.text(), DEMO_ACCOUNT.accountId);
    if (!result.ok) {
      setCsvError(result.error);
      return;
    }
    setCsvError(null);
    connectCsv(file.name, result.transactions, result.openingBalance);
    setStep("importing");
  }

  if (step === "consent") {
    return (
      <OnboardingShell step={2} title="Connect your Wema account" intro="You stay in control. You can disconnect at any time.">
        <div className="rounded-card border border-line p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b border-line pb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/wema-mark.svg" alt="" width={36} height={29} />
            <div>
              <p className="font-semibold text-ink">{DEMO_ACCOUNT.accountName}</p>
              <p className="font-mono text-xs text-muted">Wema business account {DEMO_ACCOUNT.accountNumberMasked}</p>
            </div>
          </div>
          <div className="grid gap-5 pt-5 sm:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-ink">NaijaBiz IQ will be able to</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                <li><span className="mr-2 text-positive-text" aria-hidden="true">✓</span>Read your transactions</li>
                <li><span className="mr-2 text-positive-text" aria-hidden="true">✓</span>Read your account balance</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">It will never</p>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                <li><span className="mr-2 text-danger-text" aria-hidden="true">✕</span>Move money or make payments</li>
                <li><span className="mr-2 text-danger-text" aria-hidden="true">✕</span>See your PIN or password</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-4 rounded-input bg-surface px-4 py-3 text-xs text-muted">
          <strong className="font-semibold text-ink">Prototype:</strong> this connection is simulated with demo data for Wema
          Hackaholics 7.0. No real account is accessed.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <button className={primaryButtonClass} onClick={() => { connectWema(); setStep("importing"); }}>
            Allow and connect
          </button>
          <button className={`${secondaryButtonClass} sm:w-auto`} onClick={() => setStep("choose")}>Back</button>
        </div>
      </OnboardingShell>
    );
  }

  if ((step === "importing" || step === "done") && analysis) {
    return <ImportProgress done={step === "done"} onDone={finishImport} />;
  }

  return (
    <OnboardingShell
      step={2}
      title="Bring in your transactions"
      intro={`Connect ${profile?.businessName ?? "your business"}'s Wema account once, and NaijaBiz IQ keeps your numbers up to date.`}
    >
      <div className="space-y-3">
        <button className={primaryButtonClass} onClick={() => setStep("consent")}>
          Connect Wema account
        </button>
        <button className={secondaryButtonClass} onClick={() => fileInput.current?.click()}>
          Upload a statement (CSV)
        </button>
        <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} aria-label="Upload a statement (CSV)" />
      </div>
      {csvError && (
        <p role="alert" className="mt-4 rounded-input border border-danger/40 bg-danger/5 px-4 py-3 text-sm text-danger-text">
          {csvError}
        </p>
      )}
      <p className="mt-6 text-sm text-muted">
        No CSV to hand?{" "}
        <a href="/sample/aisha-mini-mart-transactions.csv" download className="font-medium text-brand underline-offset-2 hover:underline">
          Download the sample statement
        </a>
        .
      </p>
    </OnboardingShell>
  );
}

function ImportProgress({ done, onDone }: { done: boolean; onDone: () => void }) {
  const { analysis, connection } = useAppState();
  const transactions = analysis!.transactions;
  const total = transactions.length;
  const [count, setCount] = useState(done ? total : 0);
  const [rowsEnd, setRowsEnd] = useState(VISIBLE_ROWS);

  useEffect(() => {
    if (done) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDone();
      return;
    }
    const start = performance.now();
    let lastRefresh = -1;
    let frame = requestAnimationFrame(function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / IMPORT_MS);
      const n = Math.round(total * progress * (2 - progress)); // ease-out
      setCount(n);
      const refresh = Math.floor(elapsed / ROWS_REFRESH_MS);
      if (refresh !== lastRefresh) {
        lastRefresh = refresh;
        setRowsEnd(Math.max(VISIBLE_ROWS, n));
      }
      if (progress < 1) frame = requestAnimationFrame(tick);
      else onDone();
    });
    return () => cancelAnimationFrame(frame);
  }, [done, onDone, total]);

  const shown = done ? total : count;
  const visible = transactions.slice(Math.max(0, rowsEnd - VISIBLE_ROWS), rowsEnd).reverse();
  const flagged = analysis!.flagged.length;
  const first = transactions[0]?.date;
  const last = transactions[total - 1]?.date;
  const source = connection?.source === "csv" ? connection.fileName : `Wema ${DEMO_ACCOUNT.accountNumberMasked}`;

  return (
    <OnboardingShell
      step={2}
      title={done ? `${total} transactions imported` : "Reading your transactions…"}
      intro={done ? `From ${source}, ${first ? formatDayMonth(first) : ""} to ${last ? formatDayMonth(last) : ""} ${last?.slice(0, 4) ?? ""}.` : `From ${source}`}
    >
      <div aria-live="polite" className="sr-only">{done ? `${total} transactions imported` : ""}</div>

      {done ? (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-card bg-tint p-5">
              <dt className="text-sm text-muted">Understood automatically</dt>
              <dd className="tabular mt-1 font-display text-3xl font-semibold text-brand">{total - flagged}</dd>
            </div>
            <div className="rounded-card bg-surface p-5">
              <dt className="text-sm text-muted">Need your input</dt>
              <dd className="tabular mt-1 font-display text-3xl font-semibold text-ink">{flagged}</dd>
            </div>
          </dl>
          <p className="text-sm text-muted">
            We&apos;ll ask you about the {flagged} we couldn&apos;t identify. Every answer helps NaijaBiz IQ learn how your business works.
          </p>
          <Link href="/dashboard" className={primaryButtonClass}>See my business</Link>
        </div>
      ) : (
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="text-muted">Understanding each transaction</span>
            <span className="tabular font-medium text-ink">{shown} / {total}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={shown}>
            <div className="h-full rounded-full bg-brand" style={{ width: `${(shown / total) * 100}%` }} />
          </div>
          <ul className="mt-6 min-h-[22rem] divide-y divide-line/70 rounded-card border border-line p-5">
            {visible.map((t, i) => <StatementLine key={t.id} {...toStatementLine(t)} delayMs={120 + (VISIBLE_ROWS - 1 - i) * 40} />)}
          </ul>
        </div>
      )}
    </OnboardingShell>
  );
}
