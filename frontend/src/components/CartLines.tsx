"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-client";
import type { Quote } from "@/lib/types";
import { TrashIcon } from "./Icons";
import { ProductImage } from "./ProductImage";

/** The list of cart items, with server prices and stock problems from the quote. */
export function CartLines({ quote, editable = true }: { quote: Quote | null; editable?: boolean }) {
  const { lines, setQuantity, remove } = useCart();
  const { locale, t } = useLocale();

  return (
    <ul className="divide-y divide-line">
      {lines.map((line) => {
        const priced = quote?.lines.find((q) => q.variantId === line.variantId);
        const name = pick(priced?.name ?? line.name, locale);
        const problem = priced?.problem;
        return (
          <li key={line.variantId} className="flex gap-3 py-3">
            <Link href={`/products/${line.slug}`} className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
              <ProductImage src={priced?.image ?? line.image} alt="" />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/products/${line.slug}`} className="font-bold hover:text-brand">
                {name}
              </Link>
              {line.variantLabel && <p className="text-sm text-ink-soft">{line.variantLabel}</p>}
              {problem && (
                <p className="text-sm font-semibold text-bad">
                  {problem === "not_enough_stock" ? t("notEnough", { n: priced?.stock ?? 0 }) : t("unavailable")}
                </p>
              )}
              {editable ? (
                <div className="mt-2 flex items-center gap-2">
                  <div role="group" aria-label={t("quantity")} className="flex items-center rounded-lg border border-line-strong">
                    <button
                      type="button"
                      aria-label={t("less")}
                      onClick={() => setQuantity(line.variantId, line.quantity - 1)}
                      className="h-10 w-10"
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center font-bold">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={t("more")}
                      onClick={() => setQuantity(line.variantId, line.quantity + 1)}
                      className="h-10 w-10"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(line.variantId)}
                    aria-label={`${t("remove")}: ${name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-ink-soft hover:bg-bad-tint hover:text-bad"
                  >
                    <TrashIcon size={18} />
                  </button>
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  {t("quantity")}: {line.quantity}
                </p>
              )}
            </div>
            <p className="shrink-0 font-extrabold">{priced?.lineTotal !== undefined ? money(priced.lineTotal, locale) : "…"}</p>
          </li>
        );
      })}
    </ul>
  );
}
