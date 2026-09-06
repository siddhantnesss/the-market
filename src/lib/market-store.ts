/**
 * Local persistence layer for THE MARKET (demo).
 *
 * Everything here is intentionally isolated behind a small API so it can be
 * swapped for a real backend + real payments later without touching the UI.
 */

export type Message = {
  id: string;
  from: string;
  text: string;
  at: number;
};

export type MarketState = {
  name: string | null;
  balance: number;
  publicMessages: Message[];
  /** keyed by the other participant's name */
  privateMessages: Record<string, Message[]>;
};

export const START_BALANCE = 5;
export const PUBLIC_PRICE = 1;
export const PRIVATE_PRICE = 5;

const KEY = "the-market:v1";

const empty: MarketState = {
  name: null,
  balance: START_BALANCE,
  publicMessages: [],
  privateMessages: {},
};

export function loadState(): MarketState {
  if (typeof window === "undefined") return empty;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<MarketState>;
    return {
      name: parsed.name ?? null,
      balance: typeof parsed.balance === "number" ? parsed.balance : START_BALANCE,
      publicMessages: parsed.publicMessages ?? [],
      privateMessages: parsed.privateMessages ?? {},
    };
  } catch {
    return empty;
  }
}

export function saveState(state: MarketState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatTime(at: number) {
  return new Date(at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
