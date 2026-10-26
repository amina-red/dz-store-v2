"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api-client";
import type { Category, Translated } from "@/lib/types";

const EMPTY = { ar: "", fr: "", en: "" };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [names, setNames] = useState<Translated>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(() => api<Category[]>("/api/admin/categories").then(setCategories), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    try {
      if (editing === null) {
        await api("/api/admin/categories", { body: { name: names, position: categories.length } });
      } else {
        const current = categories.find((c) => c.id === editing);
        await api(`/api/admin/categories/${editing}`, { method: "PUT", body: { name: names, position: current?.position ?? 0 } });
      }
      setNames(EMPTY);
      setEditing(null);
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erreur");
    }
  }

  /** Swaps a category with its neighbour, then saves positions 0, 1, 2... for the ones that changed. */
  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const ordered = [...categories];
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    await Promise.all(
      ordered
        .map((c, position) => ({ c, position }))
        .filter(({ c, position }) => c.position !== position)
        .map(({ c, position }) => api(`/api/admin/categories/${c.id}`, { method: "PUT", body: { name: c.name, position } })),
    );
    await load();
  }

  async function remove(category: Category) {
    if (!window.confirm(`Supprimer la catégorie « ${category.name.fr || category.name.ar} » ?`)) return;
    try {
      await api(`/api/admin/categories/${category.id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Erreur");
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-extrabold">Catégories</h1>

      <form onSubmit={save} className="card mt-5 grid gap-3 p-5 sm:grid-cols-4">
        {(["ar", "fr", "en"] as const).map((lang) => (
          <div key={lang}>
            <label htmlFor={`cat-${lang}`} className="label">
              {lang === "ar" ? "Arabe" : lang === "fr" ? "Français" : "Anglais"}
            </label>
            <input
              id={`cat-${lang}`}
              dir={lang === "ar" ? "rtl" : "ltr"}
              value={names[lang]}
              onChange={(e) => setNames({ ...names, [lang]: e.target.value })}
              className="input"
            />
          </div>
        ))}
        <div className="flex items-end gap-2">
          <button type="submit" className="btn-primary flex-1">
            {editing === null ? "Ajouter" : "Enregistrer"}
          </button>
          {editing !== null && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setNames(EMPTY);
              }}
              className="btn-quiet"
            >
              ✕
            </button>
          )}
        </div>
      </form>
      {message && <p className="mt-3 rounded-lg bg-bad-tint p-3 font-semibold text-bad">{message}</p>}

      <ul className="card mt-5 divide-y divide-line">
        {categories.map((c, i) => (
          <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="font-bold">
                {c.name.fr} · <span dir="rtl">{c.name.ar}</span> · {c.name.en}
              </p>
              <p className="text-xs text-ink-soft">
                /{c.slug} · {c.productCount ?? 0} produits
              </p>
            </div>
            <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)} className="btn-quiet min-h-9 px-3">
              ↑
            </button>
            <button
              type="button"
              aria-label="Descendre"
              disabled={i === categories.length - 1}
              onClick={() => move(i, 1)}
              className="btn-quiet min-h-9 px-3"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(c.id);
                setNames(c.name);
              }}
              className="btn-quiet min-h-9"
            >
              Modifier
            </button>
            <button type="button" onClick={() => remove(c)} className="btn min-h-9 text-bad hover:bg-bad-tint">
              Supprimer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
