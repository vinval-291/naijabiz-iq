"use client";

// Phase 7 placeholder: proves the pipeline (connect → engine → screen). Phase 8 builds the real dashboard.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppState } from "@/components/app-state";
import { Logo } from "@/components/logo";
import { formatMonthName, formatNairaCompact, formatPercent } from "@/lib/format";

export default function DashboardPage() {
  const router = useRouter();
  const { hydrated, analysis, profile, reset } = useAppState();

  useEffect(() => {
    if (hydrated && !analysis) router.replace("/connect");
  }, [hydrated, analysis, router]);

  if (!analysis) return null;

  const month = analysis.months.at(-1)!;
  const g = analysis.growth;
  const key = analysis.insights[0];
  const tiles = [
    { label: `Sales (${formatMonthName(month.period)})`, value: formatNairaCompact(month.revenue) },
    { label: `Spending (${formatMonthName(month.period)})`, value: formatNairaCompact(month.expenses) },
    { label: "Cash balance", value: formatNairaCompact(analysis.cash.cashBalance) },
    { label: "Business Health", value: `${analysis.health.score} · ${analysis.health.band}` },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-8">
      <header className="flex items-center justify-between">
        <Logo size={28} />
        <button className="text-sm text-muted underline-offset-2 hover:underline" onClick={() => { reset(); router.push("/"); }}>
          Start over
        </button>
      </header>

      <h1 className="mt-8 font-display text-3xl font-semibold tracking-tight">{profile?.businessName ?? "Your business"}</h1>
      <p className="text-muted">
        Sales {g.revenueGrowth === null ? "—" : formatPercent(g.revenueGrowth)} over the last 3 months
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-card bg-surface p-4">
            <dt className="text-sm text-muted">{t.label}</dt>
            <dd className="tabular mt-1 font-display text-2xl font-semibold">{t.value}</dd>
          </div>
        ))}
      </dl>

      {key && (
        <section className="mt-6 rounded-card border border-line p-5">
          <p className="text-sm font-semibold text-brand">Key insight</p>
          <h2 className="mt-1 font-display text-xl font-semibold">{key.title}</h2>
          <p className="mt-2 text-muted">{key.body}</p>
        </section>
      )}

      <p className="mt-8 rounded-input bg-tint px-4 py-3 text-sm text-ink">
        The full dashboard, transactions, forecast and &quot;Can I afford this?&quot; screens are built in Phase 8.{" "}
        <Link href="/connect" className="font-medium text-brand">Back to connect</Link>
      </p>
    </main>
  );
}
