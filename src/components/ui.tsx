// Small shared building blocks for the app screens.

import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, intro, action }: { eyebrow?: string; title: string; intro?: ReactNode; action?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow && <p className="text-sm font-medium text-muted">{eyebrow}</p>}
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-tight text-ink sm:text-3xl">{title}</h1>
        {intro && <p className="mt-1.5 max-w-2xl text-muted">{intro}</p>}
      </div>
      {action}
    </header>
  );
}

export function Card({ children, className = "", as: Tag = "section" }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" }) {
  return <Tag className={`rounded-card border border-line bg-white p-5 sm:p-6 ${className}`}>{children}</Tag>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="font-display text-lg font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-sm font-medium text-brand underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

/** Stat tile (dataviz contract): label · value (proportional sans) · optional delta vs a named period. */
export function StatTile({ label, value, delta }: { label: string; value: string; delta?: { text: string; good: boolean | null } }) {
  const deltaClass = delta?.good === null || !delta ? "text-muted" : delta.good ? "text-positive-text" : "text-danger-text";
  return (
    <div className="rounded-card bg-surface p-4 sm:p-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold tracking-tight text-ink sm:text-[1.75rem]">{value}</dd>
      {delta && <dd className={`mt-0.5 text-sm font-medium ${deltaClass}`}>{delta.text}</dd>}
    </div>
  );
}

export type Status = "good" | "warning" | "critical" | "neutral";

const STATUS_STYLE: Record<Status, { pill: string; icon: string }> = {
  good: { pill: "bg-positive/15 text-positive-text", icon: "✓" },
  warning: { pill: "bg-caution/30 text-caution-text", icon: "!" },
  critical: { pill: "bg-danger/10 text-danger-text", icon: "✕" },
  neutral: { pill: "bg-surface text-muted", icon: "•" },
};

/** Status always ships with an icon and a word, never colour alone. */
export function StatusPill({ status, children, large = false }: { status: Status; children: ReactNode; large?: boolean }) {
  const s = STATUS_STYLE[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-semibold ${s.pill} ${large ? "px-3 py-1 text-sm" : "px-2.5 py-0.5 text-xs"}`}>
      <span aria-hidden="true" className={`grid place-items-center rounded-full bg-current/15 ${large ? "size-5 text-xs" : "size-4 text-[10px]"}`}>
        {s.icon}
      </span>
      {children}
    </span>
  );
}

/** Score meter: the fill carries severity; the track is a lighter step of the same hue. */
export function Meter({ score, label }: { score: number; label: string }) {
  const tone = score >= 60 ? { fill: "bg-brand", track: "bg-tint" } : score >= 40 ? { fill: "bg-caution", track: "bg-caution/20" } : { fill: "bg-danger", track: "bg-danger/15" };
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full ${tone.track}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={score} aria-label={label}>
      <div className={`h-full rounded-full ${tone.fill}`} style={{ width: `${Math.max(2, score)}%` }} />
    </div>
  );
}

export function scoreStatus(score: number): Status {
  return score >= 60 ? "good" : score >= 40 ? "warning" : "critical";
}
