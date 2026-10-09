"use client";

import { useAppState } from "@/components/app-state";
import { InDepthLink, InDepthOnly, SimpleOnly } from "@/components/depth";
import { InsightCard } from "@/components/insight-card";
import { Card, CardTitle, Meter, PageHeader, StatusPill, scoreStatus } from "@/components/ui";
import { formatDayMonth } from "@/lib/format";

export default function InsightsPage() {
  const { analysis } = useAppState();
  if (!analysis) return null;
  const { insights, health, previousHealth } = analysis;
  const weakest = [...health.components].sort((a, b) => a.score - b.score).slice(0, 2);

  return (
    <>
      <PageHeader title="Insights" intro="What your transactions say about your business, in plain words. Every number here comes from your own records." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-4">
          {insights.map((i, n) => <InsightCard key={i.id} insight={i} featured={n === 0} />)}
        </div>

        <Card className="self-start">
          <CardTitle>Business Health Score</CardTitle>
          <div className="flex items-end gap-3">
            <span className="text-5xl font-semibold tracking-tight text-ink">{health.score}</span>
            <span className="mb-1.5 text-muted">/ 100</span>
            <span className="mb-1.5 ml-auto"><StatusPill status={scoreStatus(health.score)}>{health.band}</StatusPill></span>
          </div>
          {previousHealth && (
            <p className="mt-2 text-sm text-muted">
              {previousHealth.score > health.score ? "Down" : "Up"} from {previousHealth.score} on {formatDayMonth(previousHealth.asOf)}
            </p>
          )}
          <SimpleOnly>
            <p className="mt-5 text-sm font-medium text-ink">What&apos;s holding it back</p>
            <ul className="mt-2 space-y-2 text-[15px] text-ink">
              {weakest.map((c) => <li key={c.key} className="flex gap-2"><span aria-hidden="true" className="text-brand">•</span>{c.explanation}</li>)}
            </ul>
            <div className="mt-4"><InDepthLink>See all five parts of the score</InDepthLink></div>
          </SimpleOnly>
          <InDepthOnly>
            <ul className="mt-5 space-y-4">
              {health.components.map((c) => (
                <li key={c.key}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="font-medium text-ink">{c.label} <span className="font-normal text-muted">· {Math.round(c.weight * 100)}%</span></span>
                    <span className="font-semibold text-ink">{c.score}</span>
                  </div>
                  <Meter score={c.score} label={c.label} />
                  <p className="mt-1.5 text-sm text-muted">{c.explanation}</p>
                </li>
              ))}
            </ul>
          </InDepthOnly>
          <p className="mt-5 text-xs text-muted">
            The Business Health Score summarizes your records. It is not a credit score or a loan decision.
          </p>
        </Card>
      </div>
    </>
  );
}
