import Link from "next/link";
import { money } from "@/lib/format";
import { pick, type T } from "@/lib/i18n";
import type { Locale, ProductSummary } from "@/lib/types";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product, locale, t }: { product: ProductSummary; locale: Locale; t: T }) {
  const name = pick(product.name, locale);
  const onSale = product.salePrice !== null;

  return (
    <Link href={`/products/${product.slug}`} className="card group block overflow-hidden transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/5] bg-muted">
        <ProductImage src={product.image} alt={name} />
        {!product.inStock ? (
          <span className="absolute start-3 top-3 rounded-full bg-ink px-2.5 py-1 text-xs font-bold text-white">{t("soldOut")}</span>
        ) : onSale ? (
          <span className="absolute start-3 top-3 rounded-full bg-accent px-2.5 py-1 text-xs font-extrabold text-ink">{t("sale")}</span>
        ) : null}
      </div>
      <div className="p-4">
        <p className="text-[13px] font-semibold text-ink-soft">{pick(product.category.name, locale)}</p>
        <h3 className="mt-1 font-bold group-hover:text-brand">{name}</h3>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-brand">{money(product.price, locale)}</span>
          {onSale && <s className="text-sm text-ink-soft">{money(product.basePrice, locale)}</s>}
        </p>
        {product.colors.length > 1 && (
          <p className="mt-1 text-[13px] text-ink-soft">
            {product.colors.length} {t("colors")}
            {product.sizes.length > 0 && ` · ${product.sizes[0]}–${product.sizes[product.sizes.length - 1]}`}
          </p>
        )}
      </div>
    </Link>
  );
}
