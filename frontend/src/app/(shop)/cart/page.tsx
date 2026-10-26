"use client";

import Link from "next/link";
import { CartLines } from "@/components/CartLines";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { useLocale } from "@/lib/locale-client";
import { useQuote } from "@/lib/useQuote";

export default function CartPage() {
  const { lines, ready } = useCart();
  const { locale, t } = useLocale();
  const { quote } = useQuote(lines);

  if (!ready) return <div className="mx-auto max-w-3xl px-4 py-16" aria-busy="true" />;

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="text-2xl font-extrabold">{t("cart")}</h1>
        <p className="mt-3 text-ink-soft">{t("cartEmpty")}</p>
        <Link href="/products" className="btn-primary mt-6">
          {t("shopNow")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold">{t("cart")}</h1>
      <div className="card mt-5 px-4 sm:px-5">
        <CartLines quote={quote} />
      </div>
      <div className="card mt-4 p-5">
        <div className="flex justify-between text-lg font-extrabold">
          <span>{t("subtotal")}</span>
          <span>{quote ? money(quote.subtotal, locale) : "…"}</span>
        </div>
        {quote && quote.freeDeliveryFrom > 0 && (
          <p className="mt-1 text-sm text-ink-soft">{t("freeFrom", { amount: money(quote.freeDeliveryFrom, locale) })}</p>
        )}
        {quote && !quote.ok && <p className="mt-3 text-sm font-semibold text-bad">{t("fixCart")}</p>}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/checkout"
            aria-disabled={quote ? !quote.ok : true}
            className={`btn-primary flex-1 text-lg ${quote && !quote.ok ? "pointer-events-none opacity-50" : ""}`}
          >
            {t("checkout")}
          </Link>
          <Link href="/products" className="btn-quiet">
            {t("continueShopping")}
          </Link>
        </div>
      </div>
    </div>
  );
}
