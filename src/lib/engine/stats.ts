export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

export function mean(values: number[]): number {
  return values.length ? sum(values) / values.length : 0;
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Coefficient of variation (population standard deviation / mean). */
export function coefficientOfVariation(values: number[]): number {
  const m = mean(values);
  if (!m) return 0;
  return Math.sqrt(mean(values.map((v) => (v - m) ** 2))) / m;
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
