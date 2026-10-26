import Link from "next/link";
import { CashIcon, PhoneIcon, TruckIcon } from "@/components/Icons";
import { ProductCard } from "@/components/ProductCard";
import { fetchCategories, fetchProducts } from "@/lib/api-server";
import { pick, translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

const CATEGORY_TINTS = ["#F2DCD6", "#DCE3EC", "#E4E1F0", "#E9DCCB", "#D8E4DD", "#EFE6CF"];

export default async function HomePage() {
  const locale = await getLocale();
  const t = translator(locale);
  const [categories, latest] = await Promise.all([fetchCategories(), fetchProducts({ sort: "new" })]);

  const perks = [
    { icon: <CashIcon />, title: t("perkCod"), text: t("perkCodText") },
    { icon: <TruckIcon />, title: t("perkDelivery"), text: t("perkDeliveryText") },
    { icon: <PhoneIcon />, title: t("perkCall"), text: t("perkCallText") },
  ];
  const steps = [
    [t("step1"), t("step1Text")],
    [t("step2"), t("step2Text")],
    [t("step3"), t("step3Text")],
    [t("step4"), t("step4Text")],
  ];

  return (
    <>
      <section className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
        <div className="rounded-3xl bg-brand px-6 py-10 text-white sm:px-12 sm:py-14">
          <span className="inline-block rounded-full bg-accent px-3 py-1 text-[13px] font-extrabold text-ink">{t("heroBadge")}</span>
          <h1 className="mt-4 max-w-2xl text-4xl leading-tight font-extrabold sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#d3e6e4]">{t("heroText")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/products" className="btn min-h-13 bg-white text-brand hover:bg-brand-tint">
              {t("shopNow")}
            </Link>
            <Link href="/track" className="btn min-h-13 border border-[#6fa3a0] text-white hover:bg-brand-dark">
              {t("track")}
            </Link>
          </div>
        </div>
      </section>

      <section aria-label={t("perkCod")} className="mx-auto grid max-w-6xl gap-4 px-4 pt-6 sm:grid-cols-3 sm:px-6">
        {perks.map((perk) => (
          <div key={perk.title} className="card flex items-center gap-4 p-5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand">{perk.icon}</span>
            <div>
              <p className="font-extrabold">{perk.title}</p>
              <p className="text-sm text-ink-soft">{perk.text}</p>
            </div>
          </div>
        ))}
      </section>

      {categories.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
          <h2 className="text-2xl font-extrabold">{t("byCategory")}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category, i) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                style={{ background: CATEGORY_TINTS[i % CATEGORY_TINTS.length] }}
                className="flex h-28 items-end rounded-2xl p-4 text-lg font-extrabold transition-transform hover:-translate-y-0.5"
              >
                {pick(category.name, locale)}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-extrabold">{t("newArrivals")}</h2>
          <Link href="/products" className="font-bold text-brand hover:underline">
            {t("seeAll")}
          </Link>
        </div>
        {latest.items.length === 0 ? (
          <p className="mt-6 text-ink-soft">{t("noResults")}</p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            {latest.items.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} locale={locale} t={t} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <div className="card p-6 sm:p-8">
          <h2 className="text-2xl font-extrabold">{t("howTo")}</h2>
          <ol className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, text], i) => (
              <li key={title} className="flex items-start gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-extrabold ${i === 3 ? "bg-accent text-ink" : "bg-brand text-white"}`}
                >
                  {i + 1}
                </span>
                <div>
                  <p className="font-extrabold">{title}</p>
                  <p className="text-sm text-ink-soft">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
