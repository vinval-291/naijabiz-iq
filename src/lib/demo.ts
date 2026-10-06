// The demo business and its simulated Wema feed.

import accountJson from "@/data/account.json";
import transactionsJson from "@/data/transactions.json";
import type { Account, RawTransaction } from "./types";

/** The app's "today". It never reads the system clock (SPEC.md §1). */
export const DEMO_AS_OF = "2026-09-30";

export const DEMO_ACCOUNT = accountJson as Account;
export const DEMO_TRANSACTIONS = transactionsJson as RawTransaction[];
