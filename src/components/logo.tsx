// NaijaBiz IQ logo (brand/BRAND.md): mark + live-text wordmark in Outfit.

export function LogoMark({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true" className={className}>
      <rect width="48" height="48" rx="12" fill="#981D87" />
      <g stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round">
        <line x1="13" y1="35" x2="13" y2="28" />
        <line x1="21.5" y1="35" x2="21.5" y2="22" />
        <line x1="30" y1="35" x2="30" y2="16" />
      </g>
      <circle cx="37.5" cy="10.5" r="3.5" fill="#33CBB0" />
    </svg>
  );
}

export function Logo({ size = 32, onDark = false }: { size?: number; onDark?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" aria-label="NaijaBiz IQ">
      <LogoMark size={size} />
      <span className="font-display font-semibold tracking-tight" style={{ fontSize: size * 0.62 }} aria-hidden="true">
        <span className={onDark ? "text-white" : "text-ink"}>NaijaBiz</span>{" "}
        <span className={onDark ? "text-[#E7A6DD]" : "text-brand"}>IQ</span>
      </span>
    </span>
  );
}

/** "Built for Wema Bank" lockup. The Wema logo is used unmodified (brand/BRAND.md). */
export function BuiltForWema({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3 whitespace-nowrap text-xs text-muted">
      <span>Built for</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/wema-logo-full.svg" alt="Wema Bank" width={52} height={30} />
      {!compact && <span className="hidden sm:inline">· Hackaholics 7.0 prototype</span>}
    </span>
  );
}
