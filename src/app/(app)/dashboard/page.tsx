"use client";

import Link from "next/link";
import { useAppState } from "@/components/app-state";
import { MoneyInOutChart } from "@/components/charts";
import { InsightCard } from "@/components/insight-card";
import { Card, CardTitle, Meter, PageHeader, StatTile, StatusPill, TextLink, scoreStatus } from "@/components/ui";
import { growth } from "@/lib/engine/metrics";
import { formatDayMonth, formatLongDate, formatMonthName, formatNairaCompact, formatPercent } from "@/lib/format";

const RISK_STATUS = { Low: "good", Medium: "warning", High: "critical" } as const;

export default function DashboardPage() {
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

  return (
    <>
      <PageHeader
        eyebrow={`As of ${formatLongDate(analysis.asOf)}`}
        title={profile?.businessName ?? "Your business"}
        intro="Here's how your business is doing, and what needs your attention."
      />

      {insights[0] && (
        <div className="mb-6">
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

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
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

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
    </>
  );
}
