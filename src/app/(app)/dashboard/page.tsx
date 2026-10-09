"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/app-state";
import { MoneyInOutChart } from "@/components/charts";
import { InsightCard } from "@/components/insight-card";
import { SparklesIcon } from "@/components/icons";
import { Card, CardTitle, Meter, PageHeader, StatTile, StatusPill, TextLink, scoreStatus } from "@/components/ui";

import { growth } from "@/lib/engine/metrics";
import { formatDayMonth, formatLongDate, formatMonthName, formatNaira, formatNairaCompact, formatPercent } from "@/lib/format";

const RISK_STATUS = { Low: "good", Medium: "warning", High: "critical" } as const;

export default function DashboardPage() {
  const [viewMode, setViewMode] = useState<"simple" | "indepth">("simple");
  const { analysis, profile } = useAppState();
  if (!analysis) return null;

  const { months, cash, health, previousHealth, forecast, recommendations, flagged, insights } = analysis;
  const month = months.at(-1)!;
  const prev = months.at(-2);
  const monthName = formatMonthName(month.period);
  const prevName = prev ? formatMonthName(prev.period) : null;
  const vs = (current: number, previous: number | undefined, upIsGood: boolean) => {
    const g = previous === undefined ? null : growth(current, previous);
    return g === null ? undefined : { text: `${formatPercent(g)} vs ${prevName}`, good: Math.round(g) === 0 ? null : (g > 0) === upIsGood };
  };
  const topRec = recommendations[0];
  const weakest = [...health.components].sort((a, b) => a.score - b.score).slice(0, 2);

  // Simple View computations
  const safeToSpend = Math.max(0, cash.cashBalance - cash.minimumReserve);
  const isHealthy = forecast.risk === "Low" && month.netCashFlow >= 0;
  const headlineStatus = isHealthy
    ? "You’re doing okay this week."
    : forecast.risk === "High"
    ? "Watch your expenses this week."
    : "Your business cash flow is steady.";

  // Single most important upcoming alert
  const upcomingAlert = forecast.scheduled[0]
    ? {
        title: "Upcoming payment",
        detail: `${forecast.scheduled[0].label} of ${formatNaira(forecast.scheduled[0].amount)} due ${formatDayMonth(forecast.scheduled[0].date)}`,
      }
    : forecast.risk === "High" || forecast.risk === "Medium"
    ? {
        title: "Cash buffer alert",
        detail: `Lowest balance expected around ${formatDayMonth(forecast.lowestBalanceDate)} (${formatNairaCompact(forecast.lowestBalance)})`,
      }
    : topRec
    ? {
        title: "Priority action",
        detail: topRec.message,
      }
    : {
        title: "Cash reserve check",
        detail: `Target reserve buffer is ${formatNaira(cash.minimumReserve)}`,
      };

  return (
    <>
      <PageHeader
        eyebrow={`As of ${formatLongDate(analysis.asOf)}`}
        title={profile?.businessName ?? "Your business"}
        intro={
          viewMode === "simple"
            ? "Here is your simple business summary."
            : "Detailed financial statistics and performance breakdown."
        }
      />

      {viewMode === "simple" ? (
        /* SIMPLE VIEW (DEFAULT) */
        <div className="space-y-6">
          {/* Main Headline Hero Card */}
          <section className="rounded-card border border-brand/20 bg-gradient-to-br from-plum via-aubergine to-brand p-6 text-white shadow-lg sm:p-8">
            <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-tint">
              Weekly Business Summary
            </span>
            <h2 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl text-white">
              {headlineStatus}{" "}
              <span className="text-positive">{formatNaira(safeToSpend)}</span> is safe to spend.
            </h2>
            <p className="mt-2 max-w-xl text-sm text-tint/90">
              This leaves your safety reserve of <strong className="font-semibold text-white">{formatNaira(cash.minimumReserve)}</strong> untouched to protect against sudden costs.
            </p>
          </section>

          {/* First Win Discovery Card */}
          <section className="rounded-card border border-brand/30 bg-tint/60 p-5 sm:p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand">
                    <SparklesIcon /> Something we noticed for {profile?.businessName ?? "Aisha Mini Mart"}
                  </span>
                </div>
                <h3 className="font-display text-lg font-bold text-ink">
                  You pay Adebayo Provisions Ltd ₦207,500 every week. That’s about 40% of your sales.
                </h3>
                <p className="text-sm text-muted">
                  This recurring inventory supply transfer is your single largest weekly cash outflow.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("naijabiz:open-chat", {
                      detail: { query: "Tell me more about my supplier spending ratio for Adebayo Provisions Ltd taking up 40% of sales" },
                    })
                  );
                }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-input bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow transition-all hover:bg-brand-500 hover:shadow-md cursor-pointer"
              >
                <SparklesIcon /> Tell me more
              </button>
            </div>
          </section>



          {/* Three Numbers Grid */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">
              Money Summary for {monthName}
            </h3>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-card border border-line bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">1. Money In</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-positive-text sm:text-3xl">
                  {formatNaira(month.revenue)}
                </p>
                <p className="mt-1 text-xs text-muted">Total sales & income received</p>
              </div>

              <div className="rounded-card border border-line bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">2. Money Out</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-danger-text sm:text-3xl">
                  {formatNaira(month.expenses)}
                </p>
                <p className="mt-1 text-xs text-muted">Total inventory & business expenses</p>
              </div>

              <div className="rounded-card border border-line bg-white p-5 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">3. Left Over</p>
                <p className={`mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${month.netCashFlow >= 0 ? "text-ink" : "text-danger-text"}`}>
                  {formatNaira(month.netCashFlow)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {month.netCashFlow >= 0 ? "Profit / surplus this month" : "Deficit this month"}
                </p>
              </div>
            </div>
          </section>

          {/* Single Alert Card */}
          <section className="rounded-card border border-caution/40 bg-caution/10 p-5">
            <div className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-caution/30 font-bold text-caution-text">
                !
              </span>
              <div>
                <h4 className="font-display text-base font-semibold text-ink">{upcomingAlert.title}</h4>
                <p className="mt-1 text-sm text-ink/90">{upcomingAlert.detail}</p>
              </div>
            </div>
          </section>

          {/* Primary Action Button */}
          <div className="flex flex-col items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setViewMode("indepth")}
              className="inline-flex h-12 w-full items-center justify-center rounded-input bg-brand px-6 font-display font-semibold text-white shadow-md transition-all hover:bg-brand-500 hover:shadow-lg sm:w-auto"
            >
              See full analysis →
            </button>
            <p className="text-xs text-muted">View detailed graphs, health scores, and 14-day forecasts</p>
          </div>
        </div>
      ) : (
        /* IN-DEPTH VIEW (FULL DASHBOARD) */
        <div className="space-y-6">
          {/* Back to Summary Header Bar */}
          <div className="flex items-center justify-between rounded-card border border-line bg-surface px-4 py-3">
            <span className="text-sm font-medium text-muted">Showing detailed dashboard analytics</span>
            <button
              type="button"
              onClick={() => setViewMode("simple")}
              className="inline-flex items-center gap-1.5 rounded-input bg-white px-3.5 py-1.5 text-sm font-semibold text-brand border border-brand/20 hover:bg-tint transition-colors"
            >
              ← Back to summary
            </button>
          </div>

          {insights[0] && (
            <div>
              <InsightCard insight={insights[0]} featured />
              <div className="mt-2 text-right"><TextLink href="/insights">See all insights →</TextLink></div>
            </div>
          )}

          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={`Sales in ${monthName}`} value={formatNairaCompact(month.revenue)} delta={vs(month.revenue, prev?.revenue, true)} />
            <StatTile label={`Spending in ${monthName}`} value={formatNairaCompact(month.expenses)} delta={vs(month.expenses, prev?.expenses, false)} />
            <StatTile
              label={`Net cash flow, ${monthName}`}
              value={formatNairaCompact(month.netCashFlow)}
              delta={{ text: month.netCashFlow >= 0 ? "Earned more than you spent" : "Spent more than you earned", good: month.netCashFlow >= 0 }}
            />
            <StatTile label="Cash balance" value={formatNairaCompact(cash.cashBalance)} delta={vs(cash.cashBalance, prev?.closingBalance, true)} />
          </dl>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardTitle>Money in vs money out</CardTitle>
              <MoneyInOutChart months={months} />
            </Card>

            <Card>
              <CardTitle action={<TextLink href="/insights">Details</TextLink>}>Business Health</CardTitle>
              <div className="flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-tight text-ink">{health.score}</span>
                <span className="mb-1.5 text-muted">/ 100</span>
                <span className="mb-1.5 ml-auto"><StatusPill status={scoreStatus(health.score)}>{health.band}</StatusPill></span>
              </div>
              <div className="mt-3"><Meter score={health.score} label="Business Health Score" /></div>
              {previousHealth && (
                <p className="mt-3 text-sm text-muted">
                  {previousHealth.score > health.score ? "Down" : "Up"} from <strong className="font-semibold text-ink">{previousHealth.score}</strong> on {formatDayMonth(previousHealth.asOf)}
                </p>
              )}
              <p className="mt-4 text-sm font-medium text-ink">Needs the most attention</p>
              <ul className="mt-2 space-y-2.5">
                {weakest.map((c) => (
                  <li key={c.key}>
                    <div className="mb-1 flex justify-between text-sm"><span className="text-muted">{c.label}</span><span className="font-medium text-ink">{c.score}</span></div>
                    <Meter score={c.score} label={c.label} />
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-xs text-muted">This is not a credit score or a loan decision.</p>
            </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardTitle action={<TextLink href="/forecast">Forecast</TextLink>}>Next two weeks</CardTitle>
              <StatusPill status={RISK_STATUS[forecast.risk]}>{forecast.risk} cash pressure</StatusPill>
              <p className="mt-3 text-sm text-muted">Lowest expected balance</p>
              <p className="text-2xl font-semibold text-ink">
                {formatNairaCompact(forecast.lowestBalance)} <span className="text-base font-normal text-muted">around {formatDayMonth(forecast.lowestBalanceDate)}</span>
              </p>
              <p className="mt-2 text-sm text-muted">{forecast.reason}</p>
            </Card>

            {topRec && (
              <Card>
                <CardTitle action={<TextLink href="/advice">All</TextLink>}>Do this first</CardTitle>
                <h3 className="font-semibold text-ink">{topRec.title}</h3>
                <p className="mt-2 text-sm text-muted">{topRec.message}</p>
              </Card>
            )}

            <Card className="flex flex-col">
              <CardTitle>Decide with confidence</CardTitle>
              <p className="text-sm text-muted">Planning a big purchase? Check what it would do to your cash before you spend.</p>
              <Link href="/afford" className="mt-4 inline-flex h-11 items-center justify-center rounded-input bg-brand px-5 font-semibold text-white hover:bg-brand-500">
                Can I afford this?
              </Link>
              {flagged.length > 0 && (
                <Link href="/transactions?view=review" className="mt-3 rounded-input bg-caution/20 px-4 py-3 text-sm text-caution-text hover:bg-caution/30">
                  <strong className="font-semibold">{flagged.length} transaction{flagged.length === 1 ? "" : "s"}</strong> need your input →
                </Link>
              )}
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
