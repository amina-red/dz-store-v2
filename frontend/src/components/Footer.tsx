import Link from "next/link";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";

// Replace the placeholders with the shop's real contact details (or load them from the API).
const SHOP_PHONE = process.env.NEXT_PUBLIC_SHOP_PHONE ?? "";
const SHOP_WHATSAPP = process.env.NEXT_PUBLIC_SHOP_WHATSAPP ?? "";

export async function Footer() {
  const locale = await getLocale();
  const t = translator(locale);

  return (
    <footer className="mt-16 bg-ink text-line">
      <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-8 px-4 py-10 sm:px-6">
        <div className="max-w-sm">
          <p dir="ltr" className="text-xl font-extrabold text-white [font-family:var(--font-jakarta)] rtl:text-right">
            DZ<span className="text-accent">Store</span>
          </p>
          <p className="mt-2 text-sm text-[#c9c2b6]">{t("footerAbout")}</p>
          {SHOP_PHONE && (
            <p className="mt-2 text-sm" dir="ltr">
              {SHOP_PHONE}
            </p>
          )}
        </div>
        <nav aria-label={t("allProducts")} className="flex flex-wrap gap-5 text-sm">
          <Link href="/products" className="hover:text-white">
            {t("allProducts")}
          </Link>
          <Link href="/track" className="hover:text-white">
            {t("track")}
          </Link>
          {SHOP_WHATSAPP && (
            <a href={`https://wa.me/${SHOP_WHATSAPP}`} className="hover:text-white" rel="noopener">
              WhatsApp
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
