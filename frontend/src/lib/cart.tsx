"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Translated } from "./types";

/**
 * The cart lives in the browser (localStorage). It only remembers what was chosen and
 * a few display details; prices and stock always come fresh from the API quote.
 */
export type CartLine = {
  variantId: number;
  quantity: number;
  slug: string;
  name: Translated;
  variantLabel: string;
  image: string | null;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (line: CartLine) => void;
  setQuantity: (variantId: number, quantity: number) => void;
  remove: (variantId: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "dzs_cart_v1";
/** sessionStorage key: the order just placed, so the tracking page can show it right away. */
export const LAST_ORDER_KEY = "dzs_last_order";
const MAX_QUANTITY = 10;
const CartContext = createContext<CartContextValue | null>(null);

function load(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? (parsed as CartLine[]).filter((l) => Number.isInteger(l?.variantId)) : [];
  } catch {
    return []; // private mode or blocked storage: start with an empty cart
  }
}

function save(lines: CartLine[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Storage unavailable: the cart still works until the tab closes.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(load());
    setReady(true);
    // Keep several open tabs in sync.
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setLines(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback((change: (current: CartLine[]) => CartLine[]) => {
    setLines((current) => {
      const next = change(current);
      save(next);
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      add: (line) =>
        update((current) => {
          const existing = current.find((l) => l.variantId === line.variantId);
          if (existing) {
            return current.map((l) =>
              l.variantId === line.variantId ? { ...l, quantity: Math.min(MAX_QUANTITY, l.quantity + line.quantity) } : l,
            );
          }
          return [...current, { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity) }];
        }),
      setQuantity: (variantId, quantity) =>
        update((current) =>
          current.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.max(1, Math.min(MAX_QUANTITY, quantity)) } : l)),
        ),
      remove: (variantId) => update((current) => current.filter((l) => l.variantId !== variantId)),
      clear: () => update(() => []),
    }),
    [lines, ready, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
