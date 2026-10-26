"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/cart";
import { LOCALE_COOKIE } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-client";
import type { Locale } from "@/lib/types";
import { BagIcon } from "./Icons";

const LANGUAGES: { code: Locale; label: string; aria: string }[] = [
  { code: "ar", label: "ع", aria: "العربية" },
  { code: "fr", label: "FR", aria: "Français" },
  { code: "en", label: "EN", aria: "English" },
];

export function Header() {
  const { locale, t } = useLocale();
  const { count, ready } = useCart();
  const router = useRouter();

  function switchLanguage(code: Locale) {
    // One year; the server reads it to render the next pages in this language.
    document.cookie = `${LOCALE_COOKIE}=${code}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-surface">
      <p className="bg-brand px-4 py-2 text-center text-sm font-semibold text-white">{t("topBar")}</p>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" dir="ltr" className="text-2xl font-extrabold tracking-tight text-brand [font-family:var(--font-jakarta)]">
          DZ<span className="text-accent">Store</span>
        </Link>

        <nav aria-label={t("home")} className="hidden gap-5 text-[15px] font-semibold md:flex">
          <Link href="/products" className="hover:text-brand">
            {t("allProducts")}
          </Link>
          <Link href="/track" className="hover:text-brand">
            {t("track")}
          </Link>
        </nav>

        <form action="/products" role="search" className="order-last min-w-0 basis-full sm:order-none sm:basis-auto sm:flex-1">
          <label htmlFor="header-search" className="sr-only">
            {t("searchLabel")}
          </label>
          <input id="header-search" name="q" type="search" placeholder={t("search")} className="input bg-bg" />
        </form>

        <div className="ms-auto flex items-center gap-2">
          <div role="group" aria-label={t("language")} dir="ltr" className="flex overflow-hidden rounded-full border border-line-strong text-sm font-bold">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                aria-label={lang.aria}
                aria-pressed={locale === lang.code}
                onClick={() => switchLanguage(lang.code)}
                className={`min-h-10 px-3 ${locale === lang.code ? "bg-ink text-white" : "bg-surface hover:bg-muted"}`}
              >
                {lang.label}
              </button>
            ))}
          </div>
          <Link href="/cart" className="btn-primary min-h-11 px-4" aria-label={`${t("cart")}: ${ready ? count : 0}`}>
            <BagIcon size={20} />
            <span>{ready ? count : 0}</span>
          </Link>
        </div>
      </div>
      <nav aria-label={t("allProducts")} className="flex gap-5 border-t border-line px-4 py-2 text-sm font-semibold md:hidden">
        <Link href="/products">{t("allProducts")}</Link>
        <Link href="/track">{t("track")}</Link>
      </nav>
    </header>
  );
}
