import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchProduct, NotFoundError } from "@/lib/api-server";
import { pick, translator } from "@/lib/i18n";
import { getLocale } from "@/lib/locale-server";
import type { Product } from "@/lib/types";
import { ProductView } from "./ProductView";

async function load(slug: string): Promise<Product> {
  try {
    return await fetchProduct(slug);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [product, locale] = await Promise.all([load(slug), getLocale()]);
  return {
    title: pick(product.name, locale),
    description: pick(product.description, locale).slice(0, 160),
    openGraph: product.images[0] ? { images: [product.images[0]] } : undefined,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, locale] = await Promise.all([load(slug), getLocale()]);
  const t = translator(locale);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-ink-soft">
        <Link href="/" className="hover:text-brand">
          {t("home")}
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={`/products?category=${product.category.slug}`} className="hover:text-brand">
          {pick(product.category.name, locale)}
        </Link>
      </nav>
      <ProductView product={product} />
    </div>
  );
}
