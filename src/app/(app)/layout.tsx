"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAppState } from "@/components/app-state";
import {
  BadgeIcon, BulbIcon, CheckListIcon, HomeIcon, ListIcon, MoreIcon, ScaleIcon, TrendIcon,
} from "@/components/icons";
import { BuiltForWema, Logo, LogoMark } from "@/components/logo";

const NAV = [
  { href: "/dashboard", label: "Home", icon: HomeIcon, mobile: true },
  { href: "/transactions", label: "Transactions", short: "Money", icon: ListIcon, mobile: true },
  { href: "/afford", label: "Can I afford this?", short: "Afford", icon: ScaleIcon, mobile: true },
  { href: "/forecast", label: "Forecast", icon: TrendIcon, mobile: true },
  { href: "/insights", label: "Insights", icon: BulbIcon, mobile: false },
  { href: "/advice", label: "Recommendations", icon: CheckListIcon, mobile: false },
  { href: "/readiness", label: "Financial readiness", icon: BadgeIcon, mobile: false },
] as const;

const MORE_PATHS = ["/more", "/insights", "/advice", "/readiness"];

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { hydrated, analysis, profile } = useAppState();

  useEffect(() => {
    if (hydrated && !analysis) router.replace("/connect");
  }, [hydrated, analysis, router]);

  if (!analysis) {
    return (
      <div className="grid flex-1 place-items-center px-4" role="status" aria-live="polite">
        <div className="flex flex-col items-center gap-4 text-muted">
          <LogoMark size={40} className="motion-safe:animate-pulse" />
          <span className="text-sm">{hydrated ? "Taking you to connect your account…" : "Loading your business…"}</span>
        </div>
      </div>
    );
  }
  const flagged = analysis.flagged.length;

  return (
    <div className="flex min-h-full flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line px-4 py-6 lg:flex">
        <Link href="/dashboard" className="px-2" aria-label="NaijaBiz IQ home"><Logo size={28} /></Link>
        <p className="mt-6 truncate px-3 text-xs font-medium uppercase tracking-wider text-muted">{profile?.businessName ?? "Your business"}</p>
        <nav className="mt-2 flex flex-col gap-0.5" aria-label="Main">
          {NAV.map(({ href, label, icon: I }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-input px-3 py-2.5 text-[15px] transition-colors ${active ? "bg-tint font-semibold text-brand" : "text-ink hover:bg-surface"}`}>
                <I />
                <span className="flex-1">{label}</span>
                {href === "/transactions" && flagged > 0 && (
                  <span className="rounded-full bg-caution/40 px-2 text-xs font-semibold text-caution-text" aria-label={`${flagged} need review`}>{flagged}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto px-2"><BuiltForWema compact /></div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex h-13 items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
          <Link href="/dashboard" aria-label="NaijaBiz IQ home"><Logo size={26} /></Link>
          <span className="truncate pl-4 text-sm text-muted">{profile?.businessName}</span>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-8 lg:pb-12 lg:pt-10">{children}</main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden" aria-label="Main">
          {[...NAV.filter((n) => n.mobile), { href: "/more", label: "More", short: "More", icon: MoreIcon }].map((item) => {
            const { href, icon: I } = item;
            const short = "short" in item && item.short ? item.short : item.label;
            const active = href === "/more" ? MORE_PATHS.includes(pathname) : pathname === href;
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active ? "text-brand" : "text-muted"}`}>
                <I />
                {short}
                {href === "/transactions" && flagged > 0 && (
                  <span className="absolute right-[22%] top-1.5 size-2 rounded-full bg-caution" aria-label={`${flagged} need review`} />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
