// Dataset targets from SPEC.md §3. The generator hits these exactly; the validator checks them.
import type { Account } from "../src/lib/types";

export const SEED = 20260930;
export const TOTAL_TRANSACTIONS = 247;

export const ACCOUNT: Account = {
  accountId: "acc_wema_aisha_01",
  provider: "Wema Bank",
  accountName: "AISHA MINI MART",
  accountNumberMasked: "******4821",
  openingBalance: 250_000,
  openingDate: "2026-04-01",
};

export interface MonthTarget {
  month: string; // "2026-04"
  revenue: number;
  inventory: number;
  operatingCosts: number;
}

export const MONTH_TARGETS: MonthTarget[] = [
  { month: "2026-04", revenue: 2_200_000, inventory: 1_500_000, operatingCosts: 530_000 },
  { month: "2026-05", revenue: 2_400_000, inventory: 1_640_000, operatingCosts: 530_000 },
  { month: "2026-06", revenue: 2_600_000, inventory: 1_870_000, operatingCosts: 530_000 },
  { month: "2026-07", revenue: 2_620_000, inventory: 2_020_000, operatingCosts: 590_000 },
  { month: "2026-08", revenue: 2_680_000, inventory: 2_210_000, operatingCosts: 590_000 },
  { month: "2026-09", revenue: 2_760_000, inventory: 2_330_000, operatingCosts: 590_000 },
];

export const MONTHLY_TOLERANCE = 0.03;

export const EXPECTED = {
  closingBalance: 580_000,
  closingBalanceTolerance: 10_000,
  revenueGrowth3m: 11.9,
  inventoryGrowth3m: 30.9,
  expenseGrowth3m: 26.2,
  growthTolerancePts: 2,
  // Share of transactions per description level (SPEC §3), ± tolerance.
  levelShares: { 1: 0.65, 2: 0.2, 3: 0.1, 4: 0.05 } as Record<1 | 2 | 3 | 4, number>,
  levelShareTolerance: 0.04,
};
