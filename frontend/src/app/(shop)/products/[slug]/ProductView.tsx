"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CashIcon, CheckIcon, PhoneIcon, TruckIcon } from "@/components/Icons";
import { ProductImage } from "@/components/ProductImage";
import { useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-client";
import type { Product, Variant } from "@/lib/types";

export function ProductView({ product }: { product: Product }) {
  const { locale, t } = useLocale();
  const cart = useCart();
  const router = useRouter();
  const name = pick(product.name, locale);

  const colors = useMemo(() => unique(product.variants.map((v) => v.color)), [product.variants]);
  const sizes = useMemo(() => unique(product.variants.map((v) => v.size)), [product.variants]);
  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];

  const [color, setColor] = useState(firstInStock?.color ?? "");
  const [size, setSize] = useState(firstInStock?.size ?? "");
  const [quantity, setQuantity] = useState(1);
  const [photo, setPhoto] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  const variant: Variant | undefined = product.variants.find((v) => v.color === color && v.size === size);
  const stockOf = (c: string, s: string) => product.variants.find((v) => v.color === c && v.size === s)?.stock ?? 0;
  const left = variant?.stock ?? 0;
  const soldOut = left === 0;
  const price = variant?.price ?? product.price;

  function chooseColor(next: string) {
    setColor(next);
    setQuantity(1);
    // Keep the size if it exists in the new color, otherwise take the first available one.
    if (stockOf(next, size) === 0) {
      const available = sizes.find((s) => stockOf(next, s) > 0);
      if (available !== undefined) setSize(available);
    }
  }

  function addToCart(goToCheckout: boolean) {
    if (!variant || soldOut) return;
    cart.add({
      variantId: variant.id,
      quantity,
      slug: product.slug,
      name: product.name,
      variantLabel: variant.label,
      image: product.images[0] ?? null,
    });
    if (goToCheckout) {
      router.push("/checkout");
    } else {
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 2500);
    }
  }

  const images = product.images.length > 0 ? product.images : [null];

  return (
    <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-12">
      <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {images.length > 1 && (
          <div className="flex gap-2 sm:flex-col">
            {images.map((src, i) => (
              <button
                key={`${src}-${i}`}
                type="button"
                onClick={() => setPhoto(i)}
                aria-label={`${name} ${i + 1}`}
                aria-pressed={photo === i}
                className={`h-20 w-16 overflow-hidden rounded-xl border-2 bg-muted ${photo === i ? "border-brand" : "border-transparent"}`}
              >
                <ProductImage src={src} alt="" />
              </button>
            ))}
          </div>
        )}
        <div className="aspect-[4/5] flex-1 overflow-hidden rounded-3xl bg-muted">
          <ProductImage src={images[photo] ?? null} alt={name} eager />
        </div>
      </div>

      <div>
        <h1 className="text-3xl leading-tight font-extrabold sm:text-4xl">{name}</h1>
        <p className="mt-3 flex items-baseline gap-3">
          <span className="text-3xl font-extrabold text-brand">{money(price, locale)}</span>
          {product.salePrice !== null && variant?.priceOverride == null && (
            <s className="text-lg text-ink-soft">{money(product.basePrice, locale)}</s>
          )}
        </p>
        {pick(product.description, locale) && (
          <p className="mt-4 leading-relaxed whitespace-pre-line text-[#3f3830]">{pick(product.description, locale)}</p>
        )}

        {colors.some((c) => c !== "") && (
          <fieldset className="mt-6">
            <legend className="mb-2 font-bold">
              {t("color")}: <span className="font-semibold text-ink-soft">{color}</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => {
                const available = sizes.some((s) => stockOf(c, s) > 0);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => chooseColor(c)}
                    aria-pressed={color === c}
                    className={`min-h-11 rounded-xl border px-4 font-bold ${
                      color === c ? "border-2 border-brand bg-brand-tint" : "border-line-strong bg-surface hover:border-brand"
                    } ${available ? "" : "text-ink-soft line-through"}`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        {sizes.some((s) => s !== "") && (
          <fieldset className="mt-5">
            <legend className="mb-2 font-bold">{t("size")}</legend>
            <div className="flex flex-wrap gap-2">
              {sizes.map((s) => {
                const out = stockOf(color, s) === 0;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={out}
                    onClick={() => {
                      setSize(s);
                      setQuantity(1);
                    }}
                    aria-pressed={size === s}
                    className={`min-h-12 min-w-14 rounded-xl border px-3 font-bold ${
                      out
                        ? "cursor-not-allowed border-line-strong bg-muted text-ink-soft line-through"
                        : size === s
                          ? "border-2 border-brand bg-brand-tint"
                          : "border-line-strong bg-surface hover:border-brand"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <p className={`mt-3 text-sm font-semibold ${soldOut ? "text-bad" : left <= 2 ? "text-warn" : "text-ok"}`} aria-live="polite">
          {soldOut ? t("outOfStockSize") : left <= 2 ? t("onlyLeft", { n: left }) : t("inStock")}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <div role="group" aria-label={t("quantity")} className="flex items-center rounded-xl border border-line-strong bg-surface">
            <button type="button" aria-label={t("less")} onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="h-12 w-12 text-xl">
              −
            </button>
            <span className="min-w-8 text-center font-extrabold" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label={t("more")}
              onClick={() => setQuantity((q) => Math.min(Math.min(10, Math.max(1, left)), q + 1))}
              className="h-12 w-12 text-xl"
            >
              +
            </button>
          </div>
          <button type="button" disabled={soldOut} onClick={() => addToCart(false)} className="btn-primary min-w-48 flex-1 text-lg">
            {justAdded ? (
              <>
                <CheckIcon size={20} /> {t("added")}
              </>
            ) : soldOut ? (
              t("soldOut")
            ) : (
              t("addToCart")
            )}
          </button>
        </div>
        <button type="button" disabled={soldOut} onClick={() => addToCart(true)} className="btn-secondary mt-3 w-full text-lg">
          {t("orderNow")}
        </button>

        <ul className="mt-7 space-y-3 border-t border-line pt-5 text-[15px]">
          <li className="flex items-center gap-3">
            <CashIcon size={20} className="text-brand" /> {t("perkCod")} · {t("perkCodText")}
          </li>
          <li className="flex items-center gap-3">
            <TruckIcon size={20} className="text-brand" /> {t("perkDelivery")} · {t("perkDeliveryText")}
          </li>
          <li className="flex items-center gap-3">
            <PhoneIcon size={20} className="text-brand" /> {t("perkCall")}
          </li>
        </ul>
      </div>
    </div>
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
