"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { CheckIcon } from "@/components/Icons";
import { ApiError, api } from "@/lib/api-client";
import { LAST_ORDER_KEY } from "@/lib/cart";
import { dateTime, money } from "@/lib/format";
import { pick, statusKey } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-client";
import type { OrderStatus, TrackedOrder } from "@/lib/types";

const HAPPY_PATH: OrderStatus[] = ["new", "confirmed", "shipped", "delivered"];

export default function TrackPage() {
  return (
    <Suspense>
      <Track />
    </Suspense>
  );
}

function Track() {
  const { locale, t } = useLocale();
  const params = useSearchParams();
  const [number, setNumber] = useState(params.get("number") ?? "");
  const [phone, setPhone] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const justPlaced = params.get("placed") === "1";

  const lookUp = useCallback(
    async (n: string, p: string) => {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ number: n, phone: p });
        setOrder(await api<TrackedOrder>(`/api/orders/track?${query}`));
      } catch (e) {
        setOrder(null);
        setError(e instanceof ApiError && e.status !== 0 ? e.message : t("errorGeneric"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  // Right after checkout: show the order without asking for the phone again.
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(LAST_ORDER_KEY) ?? "null") as { number: string; phone: string; name: string } | null;
      if (saved && saved.number === params.get("number")) {
        setPhone(saved.phone);
        setBuyerName(saved.name);
        void lookUp(saved.number, saved.phone);
      }
    } catch {
      /* nothing saved */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reached = order ? HAPPY_PATH.indexOf(order.status) : -1;
  // The sentence has the phone number in the middle; split it to show the number left-to-right.
  const [savedBefore, savedAfter = ""] = t("orderSaved", { phone: "\u0000" }).split("\u0000");
  const showConfirmation = justPlaced && order !== null;

  return (
    <div className="mx-auto max-w-xl px-4 py-8">
      {showConfirmation && (
        <section className="card p-6 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-ok-tint text-ok">
            <CheckIcon size={32} />
          </span>
          <h1 className="mt-4 text-2xl font-extrabold">{buyerName ? t("thanks", { name: buyerName.split(" ")[0] }) : t("orderNumber")}</h1>
          <p className="mt-2 leading-relaxed text-[#3f3830]">
            {savedBefore}
            <bdi dir="ltr" className="font-bold whitespace-nowrap">
              {phone}
            </bdi>
            {savedAfter}
          </p>
          <div className="mt-4 rounded-xl bg-muted p-3">
            <p className="text-[13px] font-semibold text-ink-soft">{t("orderNumber")}</p>
            <p dir="ltr" className="font-mono text-2xl font-bold tracking-widest">
              {order?.number}
            </p>
          </div>
          <p className="mt-3 text-[13px] text-ink-soft">{t("keepNumber")}</p>
        </section>
      )}

      {!showConfirmation && (
        <>
          <h1 className="text-3xl font-extrabold">{t("trackTitle")}</h1>
          <p className="mt-2 text-ink-soft">{t("trackText")}</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void lookUp(number, phone);
            }}
            className="card mt-5 space-y-4 p-5"
          >
            <div>
              <label htmlFor="track-number" className="label">
                {t("orderNumber")}
              </label>
              <input
                id="track-number"
                dir="ltr"
                required
                placeholder="DZ…"
                value={number}
                onChange={(e) => setNumber(e.target.value.toUpperCase())}
                className="input font-mono rtl:text-right"
              />
            </div>
            <div>
              <label htmlFor="track-phone" className="label">
                {t("phone")}
              </label>
              <input
                id="track-phone"
                type="tel"
                dir="ltr"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input rtl:text-right"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? "…" : t("seeStatus")}
            </button>
          </form>
        </>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-bad-tint p-3 font-semibold text-bad">
          {error}
        </p>
      )}

      {order && (
        <>
          <section aria-label={t("trackTitle")} className="card mt-5 p-5">
            <h2 className="mb-4 text-lg font-extrabold">{t("trackTitle")}</h2>
            {order.status === "cancelled" || order.status === "returned" ? (
              <p className="rounded-xl bg-muted p-3 font-bold">{t(statusKey(order.status))}</p>
            ) : (
              <ol>
                {HAPPY_PATH.map((status, i) => {
                  const done = i <= reached;
                  const at = order.history.find((h) => h.status === status)?.at;
                  return (
                    <li key={status} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`flex h-7 w-7 items-center justify-center rounded-full ${done ? "bg-brand text-white" : "border-2 border-line-strong bg-surface"}`}
                        >
                          {done && <CheckIcon size={15} />}
                        </span>
                        {i < HAPPY_PATH.length - 1 && <span className={`h-9 w-0.5 ${i < reached ? "bg-brand" : "bg-line"}`} />}
                      </div>
                      <div className="pb-3">
                        <p className={`font-extrabold ${done ? "" : "text-ink-soft"}`}>{t(statusKey(status))}</p>
                        {at && <p className="text-[13px] text-ink-soft">{dateTime(at, locale)}</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section className="card mt-4 p-5">
            <ul className="space-y-2 text-[15px]">
              {order.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {item.productName}
                    {item.variantLabel && <span className="text-ink-soft"> · {item.variantLabel}</span>} × {item.quantity}
                  </span>
                  <span className="shrink-0">{money(item.lineTotal, locale)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex justify-between border-t border-line pt-3">
              <span>
                {t("delivery")} · {order.deliveryType === "home" ? t("home_delivery") : t("desk_delivery")} · {pick(order.wilaya, locale)}
              </span>
              <span>{order.deliveryFee === 0 ? t("free") : money(order.deliveryFee, locale)}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-extrabold">
              <span>{t("orderTotal")}</span>
              <span className="text-brand">{money(order.total, locale)}</span>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
