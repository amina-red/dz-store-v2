import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { fetchCategories, fetchProducts } from "@/lib/api-server";
import { pick, translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

export const metadata: Metadata = { title: "Products" };

type Search = { category?: string; q?: string; sort?: string; page?: string };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const locale = await getLocale();
  const t = translator(locale);
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);
  const sort = ["new", "price_asc", "price_desc"].includes(params.sort ?? "") ? params.sort! : "new";

  const [categories, result] = await Promise.all([
    fetchCategories(),
    fetchProducts({ category: params.category, q: params.q, sort, page }),
  ]);
  const current = categories.find((c) => c.slug === params.category);

  /** Builds a link to this page with some parameters changed. */
  const href = (change: Partial<Search>) => {
    const next = new URLSearchParams();
    const merged = { category: params.category, q: params.q, sort, page: String(page), ...change };
    for (const [key, value] of Object.entries(merged)) {
      if (value && !(key === "page" && value === "1") && !(key === "sort" && value === "new")) next.set(key, value);
    }
    const qs = next.toString();
    return `/products${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold">{current ? pick(current.name, locale) : t("allProducts")}</h1>
      {params.q && <p className="mt-1 text-ink-soft">“{params.q}”</p>}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <nav aria-label={t("byCategory")} className="flex flex-wrap gap-2">
          <Link
            href={href({ category: undefined, page: "1" })}
            aria-current={!current ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-bold ${!current ? "bg-ink text-white" : "bg-muted hover:bg-line"}`}
          >
            {t("allProducts")}
          </Link>
          {categories.map((category) => (
            <Link
              key={category.id}
              href={href({ category: category.slug, page: "1" })}
              aria-current={current?.id === category.id ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-bold ${current?.id === category.id ? "bg-ink text-white" : "bg-muted hover:bg-line"}`}
            >
              {pick(category.name, locale)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold">{t("sortBy")}:</span>
          {(
            [
              ["new", t("sortNew")],
              ["price_asc", t("sortPriceAsc")],
              ["price_desc", t("sortPriceDesc")],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={href({ sort: value, page: "1" })}
              aria-current={sort === value ? "true" : undefined}
              className={`rounded-lg px-3 py-2 font-semibold ${sort === value ? "bg-brand-tint text-brand" : "hover:bg-muted"}`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        {result.total} {t("results")}
      </p>

      {result.items.length === 0 ? (
        <p className="card mt-4 p-10 text-center text-ink-soft">{t("noResults")}</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {result.items.map((product) => (
            <ProductCard key={product.id} product={product} locale={locale} t={t} />
          ))}
        </div>
      )}

      {result.pages > 1 && (
        <nav aria-label={t("page")} className="mt-8 flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={href({ page: String(page - 1) })} className="btn-quiet">
              {t("previous")}
            </Link>
          )}
          <span className="text-sm font-semibold">
            {t("page")} {page} / {result.pages}
          </span>
          {page < result.pages && (
            <Link href={href({ page: String(page + 1) })} className="btn-quiet">
              {t("next")}
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
