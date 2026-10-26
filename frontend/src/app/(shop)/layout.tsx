import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { CartProvider } from "@/lib/cart";
import { LocaleProvider } from "@/lib/locale-client";
import { getLocale } from "@/lib/locale-server";

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <LocaleProvider locale={locale}>
      <CartProvider>
        <Header />
        <main className="min-h-[60vh]">{children}</main>
        <Footer />
      </CartProvider>
    </LocaleProvider>
  );
}
