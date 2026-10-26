"use client";

import { useCallback, useEffect, useState } from "react";
import { adminDate } from "@/lib/admin";
import { ApiError, api } from "@/lib/api-client";

type Blocked = { phone: string; formatted: string; reason: string; createdAt: string };

export default function BlockedPhonesPage() {
  const [list, setList] = useState<Blocked[]>([]);
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => api<Blocked[]>("/api/admin/blocked-phones").then(setList), []);
  useEffect(() => {
    void load();
  }, [load]);

  async function block(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api("/api/admin/blocked-phones", { body: { phone, reason } });
      setPhone("");
      setReason("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? (err.fields.phone ?? err.message) : "Erreur");
    }
  }

  async function unblock(item: Blocked) {
    await api(`/api/admin/blocked-phones/${item.phone}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-extrabold">Numéros bloqués</h1>
      <p className="mt-1 text-ink-soft">
        Les commandes de ces numéros sont refusées. Le client voit seulement « contactez la boutique ».
      </p>

      <form onSubmit={block} className="card mt-5 flex flex-wrap items-end gap-3 p-5">
        <div className="flex-1">
          <label htmlFor="b-phone" className="label">
            Téléphone
          </label>
          <input id="b-phone" type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input" />
        </div>
        <div className="flex-[2]">
          <label htmlFor="b-reason" className="label">
            Raison
          </label>
          <input id="b-reason" placeholder="Ex. : a refusé 3 colis" value={reason} onChange={(e) => setReason(e.target.value)} className="input" />
        </div>
        <button type="submit" className="btn-primary">
          Bloquer
        </button>
      </form>
      {error && <p className="mt-3 rounded-lg bg-bad-tint p-3 font-semibold text-bad">{error}</p>}

      <ul className="card mt-5 divide-y divide-line">
        {list.length === 0 && <li className="p-6 text-center text-ink-soft">Aucun numéro bloqué.</li>}
        {list.map((item) => (
          <li key={item.phone} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="flex-1">
              <p className="font-mono font-bold">{item.formatted}</p>
              <p className="text-xs text-ink-soft">
                {item.reason || "Sans raison"} · {adminDate(item.createdAt)}
              </p>
            </div>
            <button type="button" onClick={() => unblock(item)} className="btn-quiet min-h-9">
              Débloquer
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
