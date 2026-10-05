// Date helpers on ISO "YYYY-MM-DD" strings, always in UTC so results never depend on the machine's timezone.

const DAY_MS = 86_400_000;

export function toTime(date: string): number {
  return Date.parse(`${date}T00:00:00Z`);
}

export function addDays(date: string, n: number): string {
  return new Date(toTime(date) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toTime(to) - toTime(from)) / DAY_MS);
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}
