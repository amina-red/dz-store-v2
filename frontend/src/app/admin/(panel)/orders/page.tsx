"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { adminDate, adminMoney, STATUS, STATUS_ORDER } from "@/lib/admin";
import { ApiError, api } from "@/lib/api-client";
import type { AdminOrder, AdminOrderRow, OrderStatus, Paginated } from "@/lib/types";

type OrderList = Paginated<AdminOrderRow> & { countsByStatus: Partial<Record<OrderStatus, number>> };

export default function OrdersPage() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}

function Orders() {
  const router = useRouter();
  const params = useSearchParams();
  const status = (params.get("status") as OrderStatus | null) ?? "new";
  const page = Number(params.get("page") ?? "1") || 1;
  const [search, setSearch] = useState(params.get("q") ?? "");
  const [list, setList] = useState<OrderList | null>(null);
  const [selected, setSelected] = useState<AdminOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const query = new URLSearchParams({ status, page: String(page) });
    const q = params.get("q");
    if (q) query.set("q", q);
    try {
      setList(await api<OrderList>(`/api/admin/orders?${query}`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }, [status, page, params]);

  useEffect(() => {
    void load();
  }, [load]);

  function go(change: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(change)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`/admin/orders?${next}`);
  }

  async function open(id: number) {
    try {
      setSelected(await api<AdminOrder>(`/api/admin/orders/${id}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold">Commandes</h1>
          <p className="text-ink-soft">Appelez chaque nouvelle commande avant de l&apos;expédier.</p>
        </div>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go({ q: search.trim() || null, page: null });
          }}
        >
          <label htmlFor="order-search" className="sr-only">
            Rechercher
          </label>
          <input
            id="order-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="N°, nom ou téléphone"
            className="input w-72"
          />
        </form>
      </div>

      <div role="tablist" aria-label="Statut" className="mt-5 flex flex-wrap gap-2">
        {STATUS_ORDER.map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={status === s}
            onClick={() => {
              setSelected(null);
              go({ status: s, page: null });
            }}
            className={`min-h-10 rounded-full px-4 text-sm font-bold ${status === s ? "bg-ink text-white" : "border border-line-strong bg-surface hover:bg-muted"}`}
          >
            {STATUS[s].label} · {list?.countsByStatus[s] ?? 0}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg bg-bad-tint p-3 font-semibold text-bad">{error}</p>}

      <div className="mt-5 flex flex-wrap items-start gap-5">
        <div className="card min-w-0 flex-[999_1_520px] overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-bg text-left text-xs text-ink-soft">
              <tr>
                <th scope="col" className="px-4 py-3">Commande</th>
                <th scope="col" className="px-4 py-3">Client</th>
                <th scope="col" className="px-4 py-3">Wilaya</th>
                <th scope="col" className="px-4 py-3">Total</th>
                <th scope="col" className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {list?.items.map((o) => (
                <tr key={o.id} className={`border-t border-line ${selected?.id === o.id ? "bg-brand-tint" : "hover:bg-bg"}`}>
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => open(o.id)} className="font-mono font-extrabold text-brand hover:underline">
                      {o.number}
                    </button>
                    <p className="text-xs text-ink-soft">{adminDate(o.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{o.customerName}</p>
                    <p className="text-xs text-ink-soft">{o.phone}</p>
                    {o.pastRefusals > 0 && (
                      <span className="mt-1 inline-block rounded-full bg-bad-tint px-2 py-0.5 text-xs font-bold text-bad">
                        {o.pastRefusals} refus
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {String(o.wilaya.code).padStart(2, "0")} {o.wilaya.name}
                    <p className="text-xs text-ink-soft">{o.deliveryType === "home" ? "Domicile" : "Stop desk"}</p>
                  </td>
                  <td className="px-4 py-3 font-bold">{adminMoney(o.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold whitespace-nowrap ${STATUS[o.status].badge}`}>
                      {STATUS[o.status].label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list && list.items.length === 0 && <p className="p-8 text-center text-ink-soft">Aucune commande ici.</p>}
          {list && list.pages > 1 && (
            <div className="flex items-center justify-center gap-3 border-t border-line p-3 text-sm">
              <button type="button" disabled={page <= 1} onClick={() => go({ page: String(page - 1) })} className="btn-quiet min-h-9">
                Précédent
              </button>
              <span>
                {page} / {list.pages}
              </span>
              <button
                type="button"
                disabled={page >= list.pages}
                onClick={() => go({ page: String(page + 1) })}
                className="btn-quiet min-h-9"
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        {selected && (
          <OrderPanel
            key={selected.id}
            order={selected}
            onChanged={(updated) => {
              setSelected(updated);
              void load();
            }}
          />
        )}
      </div>
    </div>
  );
}

function OrderPanel({ order, onChanged }: { order: AdminOrder; onChanged: (o: AdminOrder) => void }) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function move(to: OrderStatus) {
    if ((to === "cancelled" || to === "returned") && !window.confirm(`${STATUS[to].action} la commande ${order.number} ? Le stock sera remis.`)) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api<AdminOrder>(`/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        body: { status: to, note: note.trim() || null },
      });
      setNote("");
      onChanged(updated);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  const telHref = `tel:${order.phone.replace(/\s/g, "")}`;

  return (
    <section aria-label="Détail de la commande" className="card min-w-0 flex-[1_1_340px] p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-mono text-xl font-extrabold">{order.number}</h2>
        <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold ${STATUS[order.status].badge}`}>{STATUS[order.status].label}</span>
      </div>

      <div className="mt-4 space-y-1 text-sm">
        <p className="text-base font-extrabold">{order.customerName}</p>
        <a href={telHref} className="inline-flex min-h-9 items-center font-bold text-brand underline">
          {order.phone}
        </a>
        <p>
          {String(order.wilaya.code).padStart(2, "0")} {order.wilaya.name} · {order.commune}
        </p>
        {order.deliveryType === "home" ? <p>Domicile : {order.address}</p> : <p>Stop desk (point relais)</p>}
        {order.note && <p className="rounded-lg bg-warn-tint p-2 text-warn">Note du client : {order.note}</p>}
      </div>

      {order.pastRefusals > 0 && (
        <p className="mt-3 rounded-lg bg-bad-tint p-3 text-sm font-bold text-bad">
          Ce numéro a déjà refusé {order.pastRefusals} colis. Vérifiez bien avant d&apos;expédier.
        </p>
      )}

      <ul className="mt-4 space-y-1.5 border-t border-line pt-3 text-sm">
        {order.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span>
              {item.productName}
              {item.variantLabel && ` · ${item.variantLabel}`} × {item.quantity}
            </span>
            <span className="shrink-0">{adminMoney(item.lineTotal)}</span>
          </li>
        ))}
        <li className="flex justify-between text-ink-soft">
          <span>Livraison</span>
          <span>{adminMoney(order.deliveryFee)}</span>
        </li>
        <li className="flex justify-between border-t border-line pt-2 font-extrabold">
          <span>Total à encaisser</span>
          <span>{adminMoney(order.total)}</span>
        </li>
      </ul>

      {order.nextStatuses.length > 0 && (
        <div className="mt-4">
          <label htmlFor="status-note" className="label">
            Note (visible dans l&apos;historique)
          </label>
          <input
            id="status-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="Ex. : client confirme, livrer après 17 h"
            className="input"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {order.nextStatuses.map((to, i) => (
              <button
                key={to}
                type="button"
                disabled={busy}
                onClick={() => move(to)}
                className={`flex-1 ${i === 0 ? "btn-primary" : "btn border border-line-strong bg-surface hover:bg-muted"}`}
              >
                {STATUS[to].action}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm font-semibold text-bad">
          {error}
        </p>
      )}

      <h3 className="mt-5 text-sm font-extrabold">Historique</h3>
      <ol className="mt-2 space-y-1.5 text-xs text-[#3f3830]">
        {order.history.map((h, i) => (
          <li key={i}>
            <span className="font-semibold">{adminDate(h.at)}</span> · {STATUS[h.to].label} · {h.by}
            {h.note && <span className="block text-ink-soft">« {h.note} »</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
