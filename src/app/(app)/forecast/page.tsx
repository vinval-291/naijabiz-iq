"use client";

import { useAppState } from "@/components/app-state";
import { ForecastChart } from "@/components/charts";
import { Card, CardTitle, PageHeader, StatTile, StatusPill } from "@/components/ui";
import { WhatsAppAlertButton } from "@/components/whatsapp-alert";
import { CATEGORY_LABELS } from "@/lib/categories";
import { formatDayMonth, formatName, formatNaira, formatNairaCompact } from "@/lib/format";

const RISK_STATUS = { Low: "good", Medium: "warning", High: "critical" } as const;

export default function ForecastPage() {
  const { analysis } = useAppState();
  if (!analysis) return null;
  const { forecast: f, cash } = analysis;

  return (
    <>
      <PageHeader
        title="Cash forecast"
        intro={`What your cash is likely to do over the next ${f.horizonDays} days, based on your recent sales, spending and regular payments.`}
      />

      <Card className="mb-6">
        <StatusPill status={RISK_STATUS[f.risk]} large>{f.risk} cash pressure</StatusPill>
        <p className="mt-3 max-w-3xl text-lg text-ink">{f.reason}</p>
        <div className="mt-4"><WhatsAppAlertButton kind="forecast" label="Send this alert to my WhatsApp" /></div>
        <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile label="Cash today" value={formatNairaCompact(cash.cashBalance)} />
          <StatTile label={`Lowest, around ${formatDayMonth(f.lowestBalanceDate)}`} value={formatNairaCompact(f.lowestBalance)}
            delta={{ text: f.lowestBalance >= cash.minimumReserve ? `Above your ${formatNairaCompact(cash.minimumReserve)} reserve` : `Below your ${formatNairaCompact(cash.minimumReserve)} reserve`, good: f.lowestBalance >= cash.minimumReserve }} />
          <StatTile label="Expected money in" value={formatNairaCompact(f.expectedInflow)} />
          <StatTile label="Expected money out" value={formatNairaCompact(f.expectedOutflow)} />
        </dl>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Expected balance, day by day</CardTitle>
          <ForecastChart forecast={f} startBalance={cash.cashBalance} minimumReserve={cash.minimumReserve} />
        </Card>

        <Card>
          <CardTitle>Regular payments due</CardTitle>
          {f.scheduled.length === 0 ? <p className="text-muted">No regular payments expected in the next two weeks.</p> : (
            <ul className="divide-y divide-line">
              {f.scheduled.map((p) => (
                <li key={`${p.date}-${p.label}`} className="flex items-baseline justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{formatName(p.label)}</span>
                    <span className="text-sm text-muted">{formatDayMonth(p.date)} · {CATEGORY_LABELS[p.category]}</span>
                  </span>
                  <span className="tabular shrink-0 text-ink">{formatNaira(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted">
            Estimated from your payment history. Daily sales and other spending are averaged over the last 4 weeks. This is an estimate, not a guarantee.
          </p>
        </Card>
      </div>
    </>
  );
}
