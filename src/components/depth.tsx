"use client";

// Simple / in-depth mode. Simple (the default) leads with plain sentences; in-depth shows every
// statistic, chart and breakdown. The numbers are the same either way — only what's shown changes.

import type { ReactNode } from "react";
import { useAppState } from "./app-state";

/** Segmented switch between the two modes. */
export function ModeSwitch({ className = "" }: { className?: string }) {
  const { inDepth, setInDepth } = useAppState();
  const option = (value: boolean, label: string) => (
    <button
      type="button"
      aria-pressed={inDepth === value}
      onClick={() => setInDepth(value)}
      className={`h-9 flex-1 rounded-full px-3 text-xs font-semibold transition-colors ${
        inDepth === value ? "bg-white text-brand shadow-sm" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label="How much detail to show" className={`flex rounded-full bg-surface p-1 ${className}`}>
      {option(false, "Simple")}
      {option(true, "In-depth")}
    </div>
  );
}

/** Shown in simple mode under a simplified section: switches to the full analysis. */
export function InDepthLink({ children = "View in-depth analysis" }: { children?: ReactNode }) {
  const { inDepth, setInDepth } = useAppState();
  if (inDepth) return null;
  return (
    <button type="button" onClick={() => setInDepth(true)} className="text-sm font-semibold text-brand underline-offset-2 hover:underline">
      {children} →
    </button>
  );
}

export function InDepthOnly({ children }: { children: ReactNode }) {
  return useAppState().inDepth ? <>{children}</> : null;
}

export function SimpleOnly({ children }: { children: ReactNode }) {
  return useAppState().inDepth ? null : <>{children}</>;
}
