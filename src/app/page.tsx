import Link from "next/link";
import { BuiltForWema, Logo } from "@/components/logo";
import { StatementLine } from "@/components/statement-line";
import { DEMO_ACCOUNT } from "@/lib/demo";
import { heroExamples } from "@/lib/statement-examples";

export default function WelcomePage() {
  const examples = heroExamples();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 sm:px-8">
      <header className="py-6">
        <Logo />
      </header>

      <section className="grid flex-1 items-center gap-12 py-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-16">
        <div className="min-w-0">
          <h1 className="font-display text-[2.5rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">
            Understand your business.
            <span className="block text-brand">Make smarter decisions.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Your bank statement shows what happened. NaijaBiz IQ tells you what it means: where your money goes,
            what&apos;s coming next, and whether you can afford your next big purchase.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/setup"
              className="inline-flex h-13 items-center rounded-input bg-brand px-7 text-base font-semibold text-white transition-colors hover:bg-brand-500"
            >
              Get started
            </Link>
            <span className="text-sm text-muted">Takes about a minute. No paperwork.</span>
          </div>
        </div>

        <figure className="min-w-0 rounded-card border border-line bg-white p-5 shadow-[0_24px_60px_-30px_rgba(59,20,57,0.35)] sm:p-7">
          <figcaption className="mb-5 flex items-center justify-between border-b border-dashed border-line pb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            <span>Wema business account</span>
            <span>{DEMO_ACCOUNT.accountNumberMasked}</span>
          </figcaption>
          <ul className="divide-y divide-line/70">
            {examples.map((e, i) => (
              <StatementLine key={i} {...e} delayMs={400 + i * 350} />
            ))}
          </ul>
          <p className="mt-5 border-t border-dashed border-line pt-4 text-sm text-muted">
            Real lines from Aisha Mini Mart&apos;s statement, and what NaijaBiz IQ understood from each one.
          </p>
        </figure>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-5">
        <BuiltForWema />
        <span className="text-xs text-muted">Demo data: Aisha Mini Mart, Ibadan · April–September 2026</span>
      </footer>
    </main>
  );
}
