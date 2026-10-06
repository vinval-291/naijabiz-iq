"use client";

// App-wide state: business profile, account connection and the user's category answers.
// Persisted in localStorage (per browser) so a refresh doesn't lose the demo; every read and
// write is guarded so the app still works when storage is blocked.

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { accountForUpload } from "@/lib/csv";
import { DEMO_ACCOUNT, DEMO_AS_OF, DEMO_TRANSACTIONS } from "@/lib/demo";
import { analyze, type Analysis } from "@/lib/engine";
import { NO_CONFIRMATIONS, confirmCategory, type Confirmations } from "@/lib/engine/classify";
import type { Category, RawTransaction } from "@/lib/types";

export interface BusinessProfile {
  businessName: string;
  businessType: string;
  revenueRange: string;
  employees: number;
  location: string;
}

export type Connection =
  | { source: "wema"; connectedAt: string }
  | { source: "csv"; connectedAt: string; fileName: string; openingBalance: number };

interface StoredState {
  profile: BusinessProfile | null;
  connection: Connection | null;
  uploaded: RawTransaction[] | null;
  confirmations: Confirmations;
}

const STORAGE_KEY = "naijabiz-iq:v1";
const EMPTY: StoredState = { profile: null, connection: null, uploaded: null, confirmations: NO_CONFIRMATIONS };

function load(): StoredState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return { ...EMPTY, ...parsed, confirmations: { ...NO_CONFIRMATIONS, ...parsed.confirmations } };
  } catch {
    return EMPTY;
  }
}

function save(state: StoredState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the session still works, it just won't survive a refresh.
  }
}

interface AppState extends StoredState {
  /** False until localStorage has been read on the client. Pages wait for it before redirecting. */
  hydrated: boolean;
  /** Everything the screens show; null until an account is connected. */
  analysis: Analysis | null;
  saveProfile: (profile: BusinessProfile) => void;
  connectWema: () => void;
  connectCsv: (fileName: string, transactions: RawTransaction[], openingBalance: number) => void;
  confirm: (transactionId: string, category: Category) => void;
  reset: () => void;
}

const AppStateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StoredState>(EMPTY);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Reading localStorage must happen after mount to match the server-rendered HTML.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setHydrated(true);
  }, []);

  const update = useCallback((change: (s: StoredState) => StoredState) => {
    setState((s) => {
      const next = change(s);
      save(next);
      return next;
    });
  }, []);

  const transactions = state.connection?.source === "csv" && state.uploaded ? state.uploaded : DEMO_TRANSACTIONS;
  const account =
    state.connection?.source === "csv" && state.uploaded
      ? accountForUpload(DEMO_ACCOUNT, state.uploaded, state.connection.openingBalance)
      : DEMO_ACCOUNT;

  const analysis = useMemo(
    () => (state.connection ? analyze(transactions, account, DEMO_AS_OF, state.confirmations) : null),
    // `account` is derived from the same inputs as `transactions`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.connection, transactions, state.confirmations],
  );

  const value: AppState = {
    ...state,
    hydrated,
    analysis,
    saveProfile: (profile) => update((s) => ({ ...s, profile })),
    connectWema: () =>
      update((s) => ({ ...s, connection: { source: "wema", connectedAt: new Date().toISOString() }, uploaded: null, confirmations: NO_CONFIRMATIONS })),
    connectCsv: (fileName, uploaded, openingBalance) =>
      update((s) => ({
        ...s,
        connection: { source: "csv", connectedAt: new Date().toISOString(), fileName, openingBalance },
        uploaded,
        confirmations: NO_CONFIRMATIONS,
      })),
    confirm: (transactionId, category) =>
      update((s) => {
        const t = transactions.find((x) => x.id === transactionId);
        return t ? { ...s, confirmations: confirmCategory(s.confirmations, t, category) } : s;
      }),
    reset: () => update(() => EMPTY),
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppState {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error("useAppState must be used inside <AppStateProvider>");
  return ctx;
}
