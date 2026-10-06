"use client";

import Link from "next/link";
import { useAppState } from "@/components/app-state";
import { PageHeader } from "@/components/ui";
import type { Recommendation } from "@/lib/types";

const GROUPS: { priority: Recommendation["priority"]; label: string; dot: string }[] = [
  { priority: "High", label: "Do this now", dot: "bg-danger" },
  { priority: "Medium", label: "This week", dot: "bg-caution" },
  { priority: "Low", label: "When you can", dot: "bg-line" },
  { priority: "Info", label: "Good to know", dot: "bg-brand" },
];

/** Where each recommendation can be acted on. */
const ACTIONS: Record<string, { href: string; label: string }> = {
  "protect-reserve": { href: "/afford", label: "Check a purchase first" },
  "cash-below-reserve": { href: "/forecast", label: "See the forecast" },
  "overspent-last-month": { href: "/transactions?view=all", label: "Review spending" },
  "review-stock": { href: "/transactions?view=all", label: "See stock payments" },
  categorize: { href: "/transactions?view=review", label: "Answer now" },
};

export default function AdvicePage() {
  const { analysis } = useAppState();
  if (!analysis) return null;
  const recs = analysis.recommendations;

  return (
    <>
      <PageHeader title="Recommendations" intro="What to do next, most important first. Each one is based on a number from your records." />

      {GROUPS.map(({ priority, label, dot }) => {
        const items = recs.filter((r) => r.priority === priority);
        if (!items.length) return null;
        return (
          <section key={priority} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted">
              <span className={`size-2.5 rounded-full ${dot}`} aria-hidden="true" />
              {label}
              <span className="sr-only">({priority} priority)</span>
            </h2>
            <ul className="space-y-3">
              {items.map((r) => (
                <li key={r.id} className="rounded-card border border-line p-5">
                  <h3 className="font-display text-lg font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1.5 text-muted">{r.message}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <details className="text-sm">
                      <summary className="cursor-pointer font-medium text-muted hover:text-ink">Why am I seeing this?</summary>
                      <p className="mt-1.5 text-ink">
                        {r.supportingMetric.label}: <strong className="font-semibold">{r.supportingMetric.value}</strong>
                      </p>
                    </details>
                    {ACTIONS[r.id] && (
                      <Link href={ACTIONS[r.id].href} className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
                        {ACTIONS[r.id].label} →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
