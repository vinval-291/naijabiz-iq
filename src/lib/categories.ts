import type { Category, Direction } from "./types";

export const CATEGORY_LABELS: Record<Category, string> = {
  SALES: "Sales",
  OTHER_INFLOW: "Other income",
  INVENTORY: "Stock",
  SALARIES: "Salaries",
  RENT: "Rent",
  ELECTRICITY: "Electricity",
  GENERATOR_FUEL: "Generator fuel",
  INTERNET: "Internet & data",
  TRANSPORT: "Transport",
  BANK_CHARGES: "Bank charges",
  CASH_WITHDRAWAL: "Cash withdrawal",
  MISC: "Other expenses",
  UNCATEGORIZED: "Uncategorized",
};

export const CATEGORIES_BY_DIRECTION: Record<Direction, Category[]> = {
  credit: ["SALES", "OTHER_INFLOW"],
  debit: [
    "INVENTORY", "SALARIES", "RENT", "ELECTRICITY", "GENERATOR_FUEL", "INTERNET",
    "TRANSPORT", "BANK_CHARGES", "CASH_WITHDRAWAL", "MISC",
  ],
};

/** Choices offered when we ask "What was this for?" (SPEC.md §4). */
export const REVIEW_OPTIONS: Record<Direction, { category: Category; label: string }[]> = {
  credit: [
    { category: "SALES", label: "Sales" },
    { category: "OTHER_INFLOW", label: "Other income" },
  ],
  debit: [
    { category: "INVENTORY", label: "Stock" },
    { category: "SALARIES", label: "Salary" },
    { category: "RENT", label: "Rent" },
    { category: "ELECTRICITY", label: "Electricity" },
    { category: "GENERATOR_FUEL", label: "Generator fuel" },
    { category: "INTERNET", label: "Internet / data" },
    { category: "TRANSPORT", label: "Transport" },
    { category: "CASH_WITHDRAWAL", label: "Business withdrawal" },
    { category: "MISC", label: "Other" },
  ],
};
