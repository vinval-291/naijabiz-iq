// Display formatting (SPEC.md §1 "Display rounding"). Shared by the engine's messages and the UI.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** ₦2,760,000 */
export function formatNaira(n: number): string {
  const sign = n < 0 ? "−" : "";
  return `${sign}₦${Math.abs(Math.round(n)).toLocaleString("en-NG")}`;
}

/** ₦2.76M, ₦580K, ₦950 */
export function formatNairaCompact(n: number): string {
  const sign = n < 0 ? "−" : "";
  const a = Math.abs(n);
  if (a >= 1_000_000) return `${sign}₦${(a / 1_000_000).toFixed(2).replace(/\.?0+$/, "")}M`;
  if (a >= 1_000) return `${sign}₦${Math.round(a / 1_000)}K`;
  return `${sign}₦${Math.round(a)}`;
}

/** +12%, −4% (whole numbers in the UI) */
export function formatPercent(n: number, decimals = 0): string {
  const rounded = n.toFixed(decimals);
  if (Number(rounded) === 0) return `0%`;
  return `${n > 0 ? "+" : "−"}${Math.abs(Number(rounded)).toFixed(decimals)}%`;
}

/** "12 Oct" */
export function formatDayMonth(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;
}

/** "30 September 2026" */
export function formatLongDate(date: string): string {
  return `${Number(date.slice(8, 10))} ${MONTHS_LONG[Number(date.slice(5, 7)) - 1]} ${date.slice(0, 4)}`;
}

/** "Sep" from "2026-09" */
export function formatMonthShort(date: string): string {
  return MONTHS[Number(date.slice(5, 7)) - 1];
}

/** "September" from "2026-09" or "2026-09-30" */
export function formatMonthName(date: string): string {
  return MONTHS_LONG[Number(date.slice(5, 7)) - 1];
}

/** Acronyms that stay upper-case in names. */
const ACRONYMS = new Set(["IBEDC", "MTN", "PSP", "LG", "POS", "ATM", "EMTL", "SMS"]);

/** "Adebayo Provisions Ltd" from "ADEBAYO PROVISIONS LTD"; acronyms like "IBEDC" are kept. */
export function formatName(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s(&.-])([a-z])/g, (_, sep: string, c: string) => sep + c.toUpperCase())
    .replace(/\b[A-Za-z]+\b/g, (w) => (ACRONYMS.has(w.toUpperCase()) ? w.toUpperCase() : w));
}
