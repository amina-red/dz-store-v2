"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { adminMoney } from "@/lib/admin";
import { api } from "@/lib/api-client";
import type { Paginated, ProductSummary } from "@/lib/types";

export default function ProductsAdminPage() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<ProductSummary> | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (search) params.set("q", search);
    api<Paginated<ProductSummary>>(`/api/admin/products?${params}`).then(setData, () => setData(null));
  }, [page, search]);

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Produits</h1>
        <div className="flex gap-2">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(1);
              setSearch(query.trim());
            }}
          >
            <label htmlFor="product-search" className="sr-only">
              Rechercher
            </label>
            <input id="product-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher" className="input w-56" />
          </form>
          <Link href="/admin/products/new" className="btn-primary">
            + Nouveau produit
          </Link>
        </div>
      </div>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-bg text-left text-xs text-ink-soft">
            <tr>
              <th scope="col" className="px-4 py-3">Produit</th>
              <th scope="col" className="px-4 py-3">Catégorie</th>
              <th scope="col" className="px-4 py-3">Prix</th>
              <th scope="col" className="px-4 py-3">Stock</th>
              <th scope="col" className="px-4 py-3">Visible</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((p) => (
              <tr key={p.id} className="border-t border-line hover:bg-bg">
                <td className="px-4 py-3">
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3 font-bold hover:text-brand">
                    <span className="h-12 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                      <ProductImage src={p.image} alt="" />
                    </span>
                    {p.name.fr || p.name.ar || p.name.en}
                  </Link>
                </td>
                <td className="px-4 py-3">{p.category.name.fr}</td>
                <td className="px-4 py-3">
                  {adminMoney(p.price)}
                  {p.salePrice !== null && <s className="ms-2 text-xs text-ink-soft">{adminMoney(p.basePrice)}</s>}
                </td>
                <td className={`px-4 py-3 font-bold ${(p.totalStock ?? 0) === 0 ? "text-bad" : (p.totalStock ?? 0) <= 5 ? "text-warn" : ""}`}>
                  {p.totalStock ?? 0}
                </td>
                <td className="px-4 py-3">{p.isActive ? "Oui" : <span className="font-bold text-warn">Caché</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && data.items.length === 0 && <p className="p-8 text-center text-ink-soft">Aucun produit.</p>}
      </div>

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-quiet min-h-9">
            Précédent
          </button>
          <span>
            {page} / {data.pages}
          </span>
          <button type="button" disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="btn-quiet min-h-9">
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
