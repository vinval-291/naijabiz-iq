"use client";

// Inline-SVG charts following the dataviz skill: thin marks, hairline solid grid, legend for 2+ series,
// hover + keyboard tooltips, and a table view for every chart.

import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatDayMonth, formatMonthName, formatMonthShort, formatNaira, formatNairaCompact } from "@/lib/format";
import type { Forecast, PeriodMetrics } from "@/lib/types";

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Clean ticks: 0, 1M, 2M, 3M … covering `max`. */
function niceTicks(max: number, count = 4): number[] {
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  return Array.from({ length: Math.ceil(max / step) + 1 }, (_, i) => i * step);
}

function ChartFrame({ legend, table, children }: { legend?: ReactNode; table: ReactNode; children: ReactNode }) {
  const [showTable, setShowTable] = useState(false);
  return (
    <div className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-sm text-ink">{legend}</div>
        <button type="button" onClick={() => setShowTable((v) => !v)} className="text-sm font-medium text-brand underline-offset-2 hover:underline" aria-pressed={showTable}>
          {showTable ? "Show as chart" : "Show as table"}
        </button>
      </div>
      {showTable ? <div className="overflow-x-auto">{table}</div> : children}
    </div>
  );
}

function LegendKey({ color, label, kind = "box" }: { color: string; label: string; kind?: "box" | "line" }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span aria-hidden="true" className={kind === "box" ? "size-2.5 rounded-sm" : "h-0.5 w-4 rounded-full"} style={{ background: color }} />
      {label}
    </span>
  );
}

function Tooltip({ x, width, children }: { x: number; width: number; children: ReactNode }) {
  const left = Math.min(Math.max(x, 90), width - 90);
  return (
    <div role="status" className="pointer-events-none absolute top-0 z-10 w-44 -translate-x-1/2 rounded-input border border-line bg-white px-3 py-2 text-xs shadow-lg" style={{ left }}>
      {children}
    </div>
  );
}

/** Below this chart width (px), use the compact phone layout. */
const NARROW = 420;

const thClass = "py-2 pr-4 text-left font-medium text-muted";
const tdClass = "tabular py-2 pr-4 text-ink";

// ---------------------------------------------------------------------------

const SALES = "var(--color-series-sales)";
const SPENDING = "var(--color-series-spending)";

/** Monthly sales vs spending as paired columns. */
export function MoneyInOutChart({ months }: { months: PeriodMetrics[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const narrow = width < NARROW;
  const height = narrow ? 200 : 240;
  const pad = { top: 16, right: 4, bottom: 28, left: 40 };
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(...months.flatMap((m) => [m.revenue, m.expenses])));
  const yMax = ticks[ticks.length - 1];
  const y = (v: number) => pad.top + plotH - (v / yMax) * plotH;
  const band = plotW / months.length;
  const bar = Math.max(4, Math.min(24, (band - (narrow ? 8 : 16)) / 2));

  const table = (
    <table className="w-full text-sm">
      <thead><tr><th className={thClass}>Month</th><th className={thClass}>Sales</th><th className={thClass}>Spending</th><th className={thClass}>Net</th></tr></thead>
      <tbody>
        {months.map((m) => (
          <tr key={m.period} className="border-t border-line">
            <td className="py-2 pr-4">{formatMonthName(m.period)}</td>
            <td className={tdClass}>{formatNaira(m.revenue)}</td>
            <td className={tdClass}>{formatNaira(m.expenses)}</td>
            <td className={tdClass}>{formatNaira(m.netCashFlow)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartFrame table={table} legend={<><LegendKey color={SALES} label="Sales" /><LegendKey color={SPENDING} label="Spending" /></>}>
      <div ref={ref} className="relative w-full min-w-0 overflow-hidden" onMouseLeave={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label="Monthly sales and spending, April to September">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-grid)" strokeWidth={1} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-muted text-[11px]">{t === 0 ? "₦0" : formatNairaCompact(t)}</text>
              </g>
            ))}
            {months.map((m, i) => {
              const cx = pad.left + band * i + band / 2;
              const isActive = active === i;
              return (
                <g key={m.period} tabIndex={0} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} onBlur={() => setActive(null)}
                  aria-label={`${formatMonthName(m.period)}: sales ${formatNaira(m.revenue)}, spending ${formatNaira(m.expenses)}`} className="outline-none">
                  <rect x={pad.left + band * i} y={pad.top} width={band} height={plotH} fill={isActive ? "var(--color-surface)" : "transparent"} />
                  <Column x={cx - bar - 1} y={y(m.revenue)} w={bar} h={y(0) - y(m.revenue)} color={SALES} />
                  <Column x={cx + 1} y={y(m.expenses)} w={bar} h={y(0) - y(m.expenses)} color={SPENDING} />
                  <text x={cx} y={height - 8} textAnchor="middle" className={`text-[12px] ${isActive ? "fill-ink font-semibold" : "fill-muted"}`}>{formatMonthShort(m.period)}</text>
                </g>
              );
            })}
          </svg>
        )}
        {active !== null && width > 0 && (
          <Tooltip x={pad.left + band * active + band / 2} width={width}>
            <p className="mb-1 font-semibold text-ink">{formatMonthName(months[active].period)}</p>
            <TooltipRow color={SALES} label="Sales" value={formatNaira(months[active].revenue)} />
            <TooltipRow color={SPENDING} label="Spending" value={formatNaira(months[active].expenses)} />
            <p className="mt-1 flex justify-between border-t border-line pt-1 text-muted">
              Net <span className="tabular font-medium text-ink">{formatNaira(months[active].netCashFlow)}</span>
            </p>
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  );
}

/** Column with a 4px rounded data-end and a square baseline. */
function Column({ x, y, w, h, color }: { x: number; y: number; w: number; h: number; color: string }) {
  const r = Math.min(4, h, w / 2);
  return <path d={`M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`} fill={color} />;
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <p className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-muted"><span className="size-2 rounded-sm" style={{ background: color }} aria-hidden="true" />{label}</span>
      <span className="tabular font-medium text-ink">{value}</span>
    </p>
  );
}

// ---------------------------------------------------------------------------

/** Projected daily balance for the next 14 days, with the minimum reserve and payment days marked. */
export function ForecastChart({ forecast, startBalance, minimumReserve }: { forecast: Forecast; startBalance: number; minimumReserve: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const points = [{ date: forecast.asOf, balance: startBalance }, ...forecast.daily];
  const narrow = width < NARROW;
  const height = narrow ? 220 : 260;
  const pad = { top: 28, right: 12, bottom: 28, left: 44 };
  // Fewer date labels on a phone so they never collide (Today · 7 Oct · 14 Oct).
  const labelEvery = narrow ? 7 : 2;
  const plotW = Math.max(0, width - pad.left - pad.right);
  const plotH = height - pad.top - pad.bottom;
  const ticks = niceTicks(Math.max(...points.map((p) => p.balance), minimumReserve) * 1.05);
  const yMax = ticks[ticks.length - 1];
  const x = (i: number) => pad.left + (i / (points.length - 1)) * plotW;
  const y = (v: number) => pad.top + plotH - (Math.max(0, v) / yMax) * plotH;
  const lowestIdx = points.findIndex((p) => p.date === forecast.lowestBalanceDate);
  const dueOn = (date: string) => forecast.scheduled.filter((p) => p.date === date);

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.balance)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;

  const table = (
    <table className="w-full text-sm">
      <thead><tr><th className={thClass}>Date</th><th className={thClass}>Expected balance</th><th className={thClass}>Payments due</th></tr></thead>
      <tbody>
        {points.map((p, i) => (
          <tr key={p.date} className="border-t border-line">
            <td className="py-2 pr-4">{i === 0 ? `${formatDayMonth(p.date)} (today)` : formatDayMonth(p.date)}</td>
            <td className={tdClass}>{formatNaira(p.balance)}</td>
            <td className="py-2 pr-4 text-muted">{dueOn(p.date).map((d) => `${d.label} ${formatNairaCompact(d.amount)}`).join(", ") || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const pick = (clientX: number) => {
    const rect = ref.current!.getBoundingClientRect();
    const i = Math.round(((clientX - rect.left - pad.left) / plotW) * (points.length - 1));
    setActive(Math.min(points.length - 1, Math.max(0, i)));
  };

  return (
    <ChartFrame table={table} legend={<><LegendKey color={SALES} label="Expected balance" kind="line" /><LegendKey color="var(--color-danger-text)" label="Minimum reserve" kind="line" /></>}>
      <div ref={ref} className="relative w-full min-w-0 touch-pan-y overflow-hidden" onMouseMove={(e) => pick(e.clientX)} onMouseLeave={() => setActive(null)}
        onTouchStart={(e) => pick(e.touches[0].clientX)} onTouchMove={(e) => pick(e.touches[0].clientX)}
        tabIndex={0} role="group" aria-label="Expected balance for the next 14 days. Use left and right arrow keys to move between days."
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((a) => Math.min(points.length - 1, (a ?? -1) + 1));
          if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? points.length) - 1));
        }}
        onBlur={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={height} aria-hidden="true">
            {ticks.map((t) => (
              <g key={t}>
                <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="var(--color-grid)" strokeWidth={1} />
                <text x={pad.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-muted text-[11px]">{t === 0 ? "₦0" : formatNairaCompact(t)}</text>
              </g>
            ))}
            <path d={area} fill={SALES} opacity={0.1} />
            <line x1={pad.left} x2={width - pad.right} y1={y(minimumReserve)} y2={y(minimumReserve)} stroke="var(--color-danger-text)" strokeWidth={1.5} strokeDasharray="5 4" />
            <text x={width - pad.right} y={y(minimumReserve) - 6} textAnchor="end" className="fill-muted text-[11px]">Minimum reserve {formatNairaCompact(minimumReserve)}</text>
            <path d={line} fill="none" stroke={SALES} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            {points.map((p, i) => dueOn(p.date).length > 0 && (
              <circle key={p.date} cx={x(i)} cy={y(p.balance)} r={4} fill={SALES} stroke="#fff" strokeWidth={2} />
            ))}
            {lowestIdx > 0 && (
              <g>
                <circle cx={x(lowestIdx)} cy={y(points[lowestIdx].balance)} r={6} fill="#fff" stroke={SALES} strokeWidth={2} />
                <text x={x(lowestIdx)} y={y(points[lowestIdx].balance) + 20} textAnchor="middle" className="fill-ink text-[12px] font-semibold">
                  Lowest {formatNairaCompact(points[lowestIdx].balance)}
                </text>
              </g>
            )}
            {active !== null && <line x1={x(active)} x2={x(active)} y1={pad.top} y2={y(0)} stroke="var(--color-line)" strokeWidth={1} />}
            {points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1) && (
              <text key={p.date} x={x(i)} y={height - 8} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} className="fill-muted text-[11px]">
                {i === 0 ? "Today" : formatDayMonth(p.date)}
              </text>
            ))}
          </svg>
        )}
        {active !== null && width > 0 && (
          <Tooltip x={x(active)} width={width}>
            <p className="font-semibold text-ink">{active === 0 ? `Today, ${formatDayMonth(points[0].date)}` : formatDayMonth(points[active].date)}</p>
            <p className="flex justify-between text-muted">Expected balance <span className="tabular font-medium text-ink">{formatNairaCompact(points[active].balance)}</span></p>
            {dueOn(points[active].date).map((d) => (
              <p key={d.label} className="mt-0.5 flex justify-between gap-2 text-muted"><span className="truncate">{d.label}</span><span className="tabular text-ink">−{formatNairaCompact(d.amount)}</span></p>
            ))}
          </Tooltip>
        )}
      </div>
    </ChartFrame>
  );
}
