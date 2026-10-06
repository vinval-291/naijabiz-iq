import Link from "next/link";
import type { ReactNode } from "react";
import { BuiltForWema, Logo } from "./logo";

const STEPS = ["Your business", "Your account"] as const;

/** Layout for the two onboarding steps. The step list is a real sequence, so it's numbered. */
export function OnboardingShell({ step, title, intro, children }: { step: 1 | 2; title: string; intro: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 sm:px-6">
      <header className="flex items-center justify-between py-6">
        <Link href="/" aria-label="NaijaBiz IQ home">
          <Logo size={28} />
        </Link>
        <ol className="flex items-center gap-3 text-xs font-medium" aria-label="Setup progress">
          {STEPS.map((label, i) => {
            const n = i + 1;
            const state = n < step ? "done" : n === step ? "current" : "todo";
            return (
              <li key={label} className="flex items-center gap-1.5" aria-current={state === "current" ? "step" : undefined}>
                <span
                  className={`grid size-5 place-items-center rounded-full text-[11px] ${
                    state === "todo" ? "border border-line text-muted" : "bg-brand text-white"
                  }`}
                >
                  {state === "done" ? "✓" : n}
                </span>
                <span className={`hidden sm:inline ${state === "todo" ? "text-muted" : "text-ink"}`}>{label}</span>
              </li>
            );
          })}
        </ol>
      </header>

      <div className="flex-1 py-6 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-muted">{intro}</p>
        <div className="mt-8">{children}</div>
      </div>

      <footer className="border-t border-line py-5">
        <BuiltForWema />
      </footer>
    </main>
  );
}

export const inputClass =
  "h-13 w-full rounded-input bg-surface px-4 text-[15px] text-ink outline-none ring-brand-magenta placeholder:text-muted focus-visible:ring-2";
export const labelClass = "mb-1.5 block text-sm font-medium text-ink";
export const primaryButtonClass =
  "inline-flex h-13 w-full items-center justify-center rounded-input bg-brand px-6 text-base font-semibold text-white transition-colors hover:bg-brand-500 disabled:opacity-60";
export const secondaryButtonClass =
  "inline-flex h-13 w-full items-center justify-center rounded-input border border-line bg-white px-6 text-base font-semibold text-ink transition-colors hover:border-brand hover:text-brand";
