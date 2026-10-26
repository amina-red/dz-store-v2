"use client";

import { useEffect, useState } from "react";
import { api } from "./api-client";
import type { CartLine } from "./cart";
import type { DeliveryType, Quote } from "./types";

/**
 * Asks the API to price the cart whenever it changes (and the wilaya / delivery type,
 * on the checkout page). The page shows these server prices, never its own math.
 */
export function useQuote(lines: CartLine[], wilayaCode?: number | null, deliveryType?: DeliveryType) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify([lines.map((l) => [l.variantId, l.quantity]), wilayaCode ?? null, deliveryType ?? null]);

  useEffect(() => {
    if (lines.length === 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const body: Record<string, unknown> = { items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })) };
        if (wilayaCode && deliveryType) {
          body.wilayaCode = wilayaCode;
          body.deliveryType = deliveryType;
        }
        const result = await api<Quote>("/api/orders/quote", { body });
        if (!cancelled) {
          setQuote(result);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote, loading, error };
}
