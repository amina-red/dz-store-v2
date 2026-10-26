"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminMoney } from "@/lib/admin";
import { api } from "@/lib/api-client";
import type { Stats } from "@/lib/types";

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Stats>("/api/admin/stats").then(setStats, (e: Error) => setError(e.message));
  }, []);

  if (error) return <p className="text-bad">{error}</p>;
  if (!stats) return <p className="text-ink-soft">Chargement…</p>;

  const rate = stats.last30Days.returnRate;
  const maxOrders = Math.max(1, ...stats.topWilayas.map((w) => w.orders));

  return (
    <div className="max-w-5xl">
      <h1 className="text-3xl font-extrabold">Tableau de bord</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/orders?status=new" className="card p-5 hover:border-brand">
          <p className="text-sm font-semibold text-ink-soft">À appeler</p>
          <p className="mt-1 text-4xl font-extrabold text-warn">{stats.waitingForCall}</p>
          <p className="mt-1 text-sm text-ink-soft">commandes nouvelles</p>
        </Link>
        <Link href="/admin/orders?status=confirmed" className="card p-5 hover:border-brand">
          <p className="text-sm font-semibold text-ink-soft">À expédier</p>
          <p className="mt-1 text-4xl font-extrabold text-info">{stats.toShip}</p>
          <p className="mt-1 text-sm text-ink-soft">commandes confirmées</p>
        </Link>
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink-soft">Aujourd&apos;hui</p>
          <p className="mt-1 text-4xl font-extrabold">{stats.ordersToday}</p>
          <p className="mt-1 text-sm text-ink-soft">commandes reçues</p>
        </div>
      </div>

      <h2 className="mt-8 text-lg font-extrabold">30 derniers jours</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink-soft">Encaissé (livrées)</p>
          <p className="mt-1 text-2xl font-extrabold text-ok">{adminMoney(stats.last30Days.revenue)}</p>
          <p className="mt-1 text-sm text-ink-soft">{stats.last30Days.delivered} commandes livrées</p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-ink-soft">Taux de retour</p>
          <p className={`mt-1 text-2xl font-extrabold ${rate !== null && rate > 0.15 ? "text-bad" : ""}`}>
            {rate === null ? "—" : `${Math.round(rate * 100)} %`}
          </p>
          <p className="mt-1 text-sm text-ink-soft">{stats.last30Days.returned} colis refusés</p>
        </div>
        <Link href="/admin/products" className="card p-5 hover:border-brand">
          <p className="text-sm font-semibold text-ink-soft">Stock faible</p>
          <p className={`mt-1 text-2xl font-extrabold ${stats.lowStockVariants > 0 ? "text-warn" : ""}`}>{stats.lowStockVariants}</p>
          <p className="mt-1 text-sm text-ink-soft">variantes à 2 pièces ou moins</p>
        </Link>
      </div>

      <section className="card mt-6 p-5">
        <h2 className="text-lg font-extrabold">Wilayas qui commandent le plus</h2>
        {stats.topWilayas.length === 0 ? (
          <p className="mt-3 text-ink-soft">Pas encore de commandes.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {stats.topWilayas.map((w) => (
              <li key={w.code} className="grid grid-cols-[10rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="truncate font-semibold">
                  {String(w.code).padStart(2, "0")} {w.name}
                </span>
                <span className="h-3 rounded-full bg-muted">
                  <span className="block h-3 rounded-full bg-brand" style={{ width: `${(w.orders / maxOrders) * 100}%` }} />
                </span>
                <span className="text-end font-bold">{w.orders}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
