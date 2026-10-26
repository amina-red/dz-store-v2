"use client";

import { useEffect, useState } from "react";
import { ApiError, api } from "@/lib/api-client";
import type { Wilaya } from "@/lib/types";

type Row = { home: string; desk: string; active: boolean; saved: boolean; error?: string };

export default function WilayasPage() {
  const [wilayas, setWilayas] = useState<Wilaya[]>([]);
  const [rows, setRows] = useState<Record<number, Row>>({});

  useEffect(() => {
    api<Wilaya[]>("/api/admin/wilayas").then((list) => {
      setWilayas(list);
      setRows(
        Object.fromEntries(
          list.map((w) => [w.code, { home: String(w.homeFee), desk: w.deskFee === null ? "" : String(w.deskFee), active: w.isActive, saved: true }]),
        ),
      );
    });
  }, []);

  const update = (code: number, change: Partial<Row>) => setRows((r) => ({ ...r, [code]: { ...r[code], ...change, saved: false, error: undefined } }));

  async function save(code: number) {
    const row = rows[code];
    try {
      await api(`/api/admin/wilayas/${code}`, {
        method: "PUT",
        body: {
          homeFee: Number.parseInt(row.home, 10),
          deskFee: row.desk.trim() === "" ? null : Number.parseInt(row.desk, 10),
          isActive: row.active,
        },
      });
      setRows((r) => ({ ...r, [code]: { ...r[code], saved: true } }));
    } catch (e) {
      setRows((r) => ({ ...r, [code]: { ...r[code], error: e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : "Erreur" } }));
    }
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-extrabold">Livraison par wilaya</h1>
      <p className="mt-1 text-ink-soft">
        Les prix de départ sont des exemples : mettez ceux de votre société de livraison. Laissez « Stop desk » vide s&apos;il n&apos;y a pas de bureau.
      </p>

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-bg text-left text-xs text-ink-soft">
            <tr>
              <th scope="col" className="px-4 py-3">Wilaya</th>
              <th scope="col" className="px-4 py-3">Domicile (DA)</th>
              <th scope="col" className="px-4 py-3">Stop desk (DA)</th>
              <th scope="col" className="px-4 py-3">Livrée</th>
              <th scope="col" className="px-4 py-3"><span className="sr-only">Enregistrer</span></th>
            </tr>
          </thead>
          <tbody>
            {wilayas.map((w) => {
              const row = rows[w.code];
              if (!row) return null;
              return (
                <tr key={w.code} className="border-t border-line">
                  <td className="px-4 py-2 font-semibold">
                    {String(w.code).padStart(2, "0")} {w.name.fr} <span className="text-ink-soft" dir="rtl">{w.name.ar}</span>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      aria-label={`Domicile ${w.name.fr}`}
                      inputMode="numeric"
                      value={row.home}
                      onChange={(e) => update(w.code, { home: e.target.value })}
                      className="input min-h-10 w-28"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      aria-label={`Stop desk ${w.name.fr}`}
                      inputMode="numeric"
                      value={row.desk}
                      placeholder="—"
                      onChange={(e) => update(w.code, { desk: e.target.value })}
                      className="input min-h-10 w-28"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      aria-label={`Livrer à ${w.name.fr}`}
                      checked={row.active}
                      onChange={(e) => update(w.code, { active: e.target.checked })}
                      className="h-5 w-5 accent-brand"
                    />
                  </td>
                  <td className="px-4 py-2">
                    {row.saved ? (
                      <span className="text-xs text-ok">✓</span>
                    ) : (
                      <button type="button" onClick={() => save(w.code)} className="btn-primary min-h-9 px-3 text-sm">
                        Enregistrer
                      </button>
                    )}
                    {row.error && <p className="field-error">{row.error}</p>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
