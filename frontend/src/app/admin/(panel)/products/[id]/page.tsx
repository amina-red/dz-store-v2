"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { ApiError, api } from "@/lib/api-client";
import type { Category, Locale, Product, Translated } from "@/lib/types";

type VariantRow = { key: string; id: number | null; color: string; size: string; sku: string; stock: string; priceOverride: string };

type Draft = {
  name: Translated;
  description: Translated;
  basePrice: string;
  salePrice: string;
  categoryId: string;
  isActive: boolean;
  images: string[];
  variants: VariantRow[];
};

const EMPTY: Draft = {
  name: { ar: "", fr: "", en: "" },
  description: { ar: "", fr: "", en: "" },
  basePrice: "",
  salePrice: "",
  categoryId: "",
  isActive: true,
  images: [],
  variants: [{ key: "n0", id: null, color: "", size: "", sku: "", stock: "0", priceOverride: "" }],
};

const LANGS: { code: Locale; label: string }[] = [
  { code: "ar", label: "العربية" },
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
];

let rowCounter = 1;
const newKey = () => `n${rowCounter++}`;

/** "1 200" or "1200" -> 1200; "" -> null */
const toInt = (value: string): number | null => {
  const digits = value.replace(/[\s ]/g, "");
  return digits === "" ? null : Number.parseInt(digits, 10);
};

export default function ProductEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === "new";
  const router = useRouter();

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [categories, setCategories] = useState<Category[]>([]);
  const [lang, setLang] = useState<Locale>("fr");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(isNew);
  const [generator, setGenerator] = useState({ colors: "", sizes: "", stock: "0" });

  useEffect(() => {
    api<Category[]>("/api/admin/categories").then((cats) => {
      setCategories(cats);
      if (isNew && cats[0]) setDraft((d) => ({ ...d, categoryId: d.categoryId || String(cats[0].id) }));
    });
    if (!isNew) {
      api<Product>(`/api/admin/products/${id}`).then((p) => {
        setDraft({
          name: p.name,
          description: p.description,
          basePrice: String(p.basePrice),
          salePrice: p.salePrice === null ? "" : String(p.salePrice),
          categoryId: String(p.category.id),
          isActive: p.isActive,
          images: p.images,
          variants: p.variants.map((v) => ({
            key: `v${v.id}`,
            id: v.id,
            color: v.color,
            size: v.size,
            sku: v.sku ?? "",
            stock: String(v.stock),
            priceOverride: v.priceOverride === null ? "" : String(v.priceOverride),
          })),
        });
        setLoaded(true);
      });
    }
  }, [id, isNew]);

  const setVariant = (key: string, field: keyof VariantRow, value: string) =>
    setDraft((d) => ({ ...d, variants: d.variants.map((v) => (v.key === key ? { ...v, [field]: value } : v)) }));

  /** "Beige, Noir" × "S, M, L" -> 6 rows; rows that already exist are kept. */
  function generateVariants() {
    const split = (s: string) => {
      const parts = s.split(",").map((p) => p.trim()).filter(Boolean);
      return parts.length ? parts : [""];
    };
    setDraft((d) => {
      const rows = d.variants.filter((v) => v.color || v.size || v.id);
      for (const color of split(generator.colors)) {
        for (const size of split(generator.sizes)) {
          if (!rows.some((r) => r.color.toLowerCase() === color.toLowerCase() && r.size.toLowerCase() === size.toLowerCase())) {
            rows.push({ key: newKey(), id: null, color, size, sku: "", stock: generator.stock, priceOverride: "" });
          }
        }
      }
      return { ...d, variants: rows.length ? rows : d.variants };
    });
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMessage(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const { url } = await api<{ url: string }>("/api/admin/uploads", { form });
        setDraft((d) => ({ ...d, images: [...d.images, url] }));
      }
    } catch (e) {
      setMessage(e instanceof ApiError ? (e.fields.file ?? e.message) : "Envoi impossible.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setErrors({});
    setMessage(null);
    const body = {
      name: draft.name,
      description: draft.description,
      basePrice: toInt(draft.basePrice),
      salePrice: toInt(draft.salePrice),
      categoryId: toInt(draft.categoryId),
      isActive: draft.isActive,
      images: draft.images,
      variants: draft.variants.map((v) => ({
        id: v.id,
        color: v.color,
        size: v.size,
        sku: v.sku || null,
        stock: toInt(v.stock) ?? 0,
        priceOverride: toInt(v.priceOverride),
      })),
    };
    try {
      const saved = await api<Product>(isNew ? "/api/admin/products" : `/api/admin/products/${id}`, {
        method: isNew ? "POST" : "PUT",
        body,
      });
      setMessage("Enregistré.");
      if (isNew) router.replace(`/admin/products/${saved.id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fields);
        setMessage(e.message);
      } else {
        setMessage("Enregistrement impossible.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm("Supprimer ce produit ? Les anciennes commandes restent intactes. Pour arrêter de le vendre un moment, décochez plutôt « Visible ».")) return;
    await api(`/api/admin/products/${id}`, { method: "DELETE" });
    router.replace("/admin/products");
  }

  if (!loaded) return <p className="text-ink-soft">Chargement…</p>;

  const totalStock = draft.variants.reduce((s, v) => s + (toInt(v.stock) ?? 0), 0);
  const err = (key: string) => errors[key] && <p className="field-error">{errors[key]}</p>;

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{isNew ? "Nouveau produit" : draft.name.fr || draft.name.ar || "Produit"}</h1>
        <div className="flex gap-2">
          {!isNew && (
            <button type="button" onClick={remove} className="btn border border-line-strong bg-surface text-bad hover:bg-bad-tint">
              Supprimer
            </button>
          )}
          <button type="button" onClick={save} disabled={saving} className="btn-primary">
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
      {message && (
        <p role="status" className={`mt-4 rounded-lg p-3 font-semibold ${message === "Enregistré." ? "bg-ok-tint text-ok" : "bg-bad-tint text-bad"}`}>
          {message}
        </p>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-extrabold">Textes</h2>
              <div role="tablist" aria-label="Langue" className="flex overflow-hidden rounded-full border border-line-strong">
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    role="tab"
                    aria-selected={lang === l.code}
                    onClick={() => setLang(l.code)}
                    className={`min-h-9 px-4 text-sm font-bold ${lang === l.code ? "bg-ink text-white" : "bg-surface"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
            <div dir={lang === "ar" ? "rtl" : "ltr"} className={`mt-4 space-y-3 ${lang === "ar" ? "[font-family:var(--font-cairo)]" : ""}`}>
              <div>
                <label htmlFor="p-name" className="label">
                  Nom ({lang})
                </label>
                <input
                  id="p-name"
                  value={draft.name[lang]}
                  onChange={(e) => setDraft((d) => ({ ...d, name: { ...d.name, [lang]: e.target.value } }))}
                  className="input"
                />
                {err("name")}
                {err(`name.${lang}`)}
              </div>
              <div>
                <label htmlFor="p-desc" className="label">
                  Description ({lang})
                </label>
                <textarea
                  id="p-desc"
                  rows={4}
                  value={draft.description[lang]}
                  onChange={(e) => setDraft((d) => ({ ...d, description: { ...d.description, [lang]: e.target.value } }))}
                  className="input py-3"
                />
              </div>
            </div>
            <p className="mt-2 text-xs text-ink-soft">Une langue vide affiche le français, puis l&apos;arabe.</p>
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-extrabold">Photos</h2>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {draft.images.map((url, i) => (
                <div key={url} className="relative aspect-[4/5] overflow-hidden rounded-xl bg-muted">
                  <ProductImage src={url} alt={`Photo ${i + 1}`} />
                  {i === 0 && <span className="absolute bottom-1 left-1 rounded-full bg-ink px-2 text-[11px] font-bold text-white">Principale</span>}
                  <div className="absolute top-1 right-1 flex gap-1">
                    {i > 0 && (
                      <button
                        type="button"
                        aria-label="Mettre en principale"
                        onClick={() => setDraft((d) => ({ ...d, images: [url, ...d.images.filter((x) => x !== url)] }))}
                        className="h-7 w-7 rounded-full bg-white/90 text-xs font-bold"
                      >
                        ★
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Retirer la photo"
                      onClick={() => setDraft((d) => ({ ...d, images: d.images.filter((x) => x !== url) }))}
                      className="h-7 w-7 rounded-full bg-white/90 text-xs font-bold text-bad"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {draft.images.length < 10 && (
                <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-line-strong bg-bg p-2 text-center text-sm font-bold text-ink-soft hover:border-brand">
                  {uploading ? "Envoi…" : "+ Ajouter"}
                  <span className="text-[11px] font-medium">JPEG, PNG, WebP · 5 Mo</span>
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => upload(e.target.files)} />
                </label>
              )}
            </div>
            {err("images")}
          </section>

          <section className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-extrabold">Variantes et stock</h2>
              <span className="text-sm text-ink-soft">
                Total en stock : <strong className="text-ink">{totalStock}</strong>
              </span>
            </div>
            {err("variants")}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-left text-xs text-ink-soft">
                  <tr>
                    <th scope="col" className="p-2">Couleur</th>
                    <th scope="col" className="p-2">Taille</th>
                    <th scope="col" className="p-2">SKU</th>
                    <th scope="col" className="p-2">Prix spécial (DA)</th>
                    <th scope="col" className="p-2">Stock</th>
                    <th scope="col" className="p-2"><span className="sr-only">Retirer</span></th>
                  </tr>
                </thead>
                <tbody>
                  {draft.variants.map((v, i) => (
                    <tr key={v.key} className="border-t border-line align-top">
                      {(["color", "size", "sku", "priceOverride", "stock"] as const).map((field) => (
                        <td key={field} className="p-1.5">
                          <input
                            aria-label={`${field} ligne ${i + 1}`}
                            value={v[field]}
                            inputMode={field === "stock" || field === "priceOverride" ? "numeric" : undefined}
                            onChange={(e) => setVariant(v.key, field, e.target.value)}
                            className="input min-h-10"
                          />
                          {field === "stock" && errors[`variants.${i}.stock`] && <p className="field-error">{errors[`variants.${i}.stock`]}</p>}
                        </td>
                      ))}
                      <td className="p-1.5">
                        <button
                          type="button"
                          aria-label={`Retirer la ligne ${i + 1}`}
                          disabled={draft.variants.length === 1}
                          onClick={() => setDraft((d) => ({ ...d, variants: d.variants.filter((x) => x.key !== v.key) }))}
                          className="h-10 w-10 rounded-lg text-bad hover:bg-bad-tint disabled:opacity-30"
                        >
                          ✕
                        </button>
                        {errors[`variants.${i}`] && <p className="field-error">{errors[`variants.${i}`]}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button
              type="button"
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  variants: [...d.variants, { key: newKey(), id: null, color: "", size: "", sku: "", stock: "0", priceOverride: "" }],
                }))
              }
              className="btn-quiet mt-3 min-h-10"
            >
              + Ajouter une ligne
            </button>

            <details className="mt-4 rounded-xl bg-bg p-4">
              <summary className="cursor-pointer font-bold">Générer les variantes (couleurs × tailles)</summary>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="g-colors" className="label">
                    Couleurs, séparées par des virgules
                  </label>
                  <input id="g-colors" placeholder="Beige, Noir" value={generator.colors} onChange={(e) => setGenerator({ ...generator, colors: e.target.value })} className="input" />
                </div>
                <div>
                  <label htmlFor="g-sizes" className="label">
                    Tailles
                  </label>
                  <input id="g-sizes" placeholder="S, M, L, XL" value={generator.sizes} onChange={(e) => setGenerator({ ...generator, sizes: e.target.value })} className="input" />
                </div>
                <div>
                  <label htmlFor="g-stock" className="label">
                    Stock de chaque
                  </label>
                  <input id="g-stock" inputMode="numeric" value={generator.stock} onChange={(e) => setGenerator({ ...generator, stock: e.target.value })} className="input" />
                </div>
              </div>
              <button type="button" onClick={generateVariants} className="btn-secondary mt-3 min-h-10">
                Générer
              </button>
            </details>
          </section>
        </div>

        <div className="space-y-5">
          <section className="card space-y-3 p-5">
            <h2 className="text-lg font-extrabold">Prix</h2>
            <div>
              <label htmlFor="p-base" className="label">
                Prix normal (DA)
              </label>
              <input id="p-base" inputMode="numeric" value={draft.basePrice} onChange={(e) => setDraft({ ...draft, basePrice: e.target.value })} className="input" />
              {err("basePrice")}
            </div>
            <div>
              <label htmlFor="p-sale" className="label">
                Prix soldé (DA, facultatif)
              </label>
              <input id="p-sale" inputMode="numeric" value={draft.salePrice} onChange={(e) => setDraft({ ...draft, salePrice: e.target.value })} className="input" />
              {err("salePrice")}
            </div>
          </section>

          <section className="card space-y-3 p-5">
            <h2 className="text-lg font-extrabold">Organisation</h2>
            <div>
              <label htmlFor="p-cat" className="label">
                Catégorie
              </label>
              <select id="p-cat" value={draft.categoryId} onChange={(e) => setDraft({ ...draft, categoryId: e.target.value })} className="input">
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.fr || c.name.ar}
                  </option>
                ))}
              </select>
              {err("categoryId")}
            </div>
            <label className="flex min-h-11 items-center gap-3 font-bold">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
                className="h-5 w-5 accent-brand"
              />
              Visible en boutique
            </label>
          </section>
        </div>
      </div>
    </div>
  );
}
