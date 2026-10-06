import type { Insight } from "@/lib/types";
import { StatusPill, type Status } from "./ui";

const TONE: Record<Insight["tone"], { status: Status; label: string }> = {
  warning: { status: "warning", label: "Watch" },
  positive: { status: "good", label: "Good news" },
  neutral: { status: "neutral", label: "Note" },
};

export function InsightCard({ insight, featured = false }: { insight: Insight; featured?: boolean }) {
  const tone = TONE[insight.tone];
  return (
    <article className={`rounded-card p-5 sm:p-6 ${featured ? "bg-tint" : "border border-line bg-white"}`}>
      <div className="flex items-center gap-2">
        {featured && <span className="text-sm font-semibold text-brand">Key insight</span>}
        <StatusPill status={tone.status}>{tone.label}</StatusPill>
      </div>
      <h2 className={`mt-2 font-display font-semibold leading-snug text-ink ${featured ? "text-xl sm:text-2xl" : "text-lg"}`}>{insight.title}</h2>
      <p className={`mt-2 leading-relaxed ${featured ? "text-ink/80 sm:text-lg" : "text-muted"}`}>{insight.body}</p>
    </article>
  );
}
