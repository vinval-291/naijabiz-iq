"use client";

import { useAppState } from "@/components/app-state";
import { Card, CardTitle, Meter, PageHeader, StatusPill } from "@/components/ui";

const BAND_STATUS = { Strong: "good", Developing: "good", Emerging: "warning", "Early stage": "critical" } as const;

export default function ReadinessPage() {
  const { analysis } = useAppState();
  if (!analysis) return null;
  const r = analysis.readiness;

  return (
    <>
      <PageHeader
        title="Financial readiness"
        intro="How well your records show healthy financial habits: the kind that matter when your business is ready for bigger commitments."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="space-y-6">
          <Card>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-semibold tracking-tight text-ink">{r.score}</span>
              <span className="mb-1.5 text-muted">/ 100</span>
              <span className="mb-1.5 ml-auto"><StatusPill status={BAND_STATUS[r.band]}>{r.band}</StatusPill></span>
            </div>
            <div className="mt-3"><Meter score={r.score} label="Financial readiness" /></div>
            <p className="mt-4 rounded-input bg-surface px-4 py-3 text-sm text-muted">
              This is <strong className="font-semibold text-ink">not</strong> a loan approval or a credit score. It shows the habits your records demonstrate today.
            </p>
          </Card>

          <Card>
            <CardTitle>Next steps</CardTitle>
            <ol className="space-y-3">
              {r.nextSteps.map((s, i) => (
                <li key={s} className="flex gap-3 text-ink">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-tint text-xs font-semibold text-brand">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <Card as="div">
              <h2 className="font-semibold text-ink">Strengths</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                {r.strengths.map((s) => <li key={s}><span className="mr-2 text-positive-text" aria-hidden="true">✓</span>{s}</li>)}
              </ul>
            </Card>
            <Card as="div">
              <h2 className="font-semibold text-ink">To improve</h2>
              <ul className="mt-2 space-y-1.5 text-sm text-muted">
                {r.improvements.length ? r.improvements.map((s) => <li key={s}><span className="mr-2 text-caution-text" aria-hidden="true">!</span>{s}</li>) : <li>Nothing urgent.</li>}
              </ul>
            </Card>
          </div>
        </div>

        <Card className="self-start">
          <CardTitle>What we looked at</CardTitle>
          <ul className="space-y-4">
            {r.indicators.map((i) => (
              <li key={i.key}>
                <div className="mb-1 flex justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{i.label}</span>
                  <span className="font-semibold text-ink">{i.score}</span>
                </div>
                <Meter score={i.score} label={i.label} />
                <p className="mt-1.5 text-sm text-muted">{i.explanation}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
