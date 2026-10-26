"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CartLines } from "@/components/CartLines";
import { CashIcon } from "@/components/Icons";
import { ApiError, api } from "@/lib/api-client";
import { LAST_ORDER_KEY, useCart } from "@/lib/cart";
import { money } from "@/lib/format";
import { pick } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-client";
import type { DeliveryType, Wilaya } from "@/lib/types";
import { useQuote } from "@/lib/useQuote";

type Placed = { number: string; total: number };

export function CheckoutForm({ wilayas }: { wilayas: Wilaya[] }) {
  const { locale, t } = useLocale();
  const cart = useCart();
  const router = useRouter();

  const [form, setForm] = useState({ customerName: "", phone: "", commune: "", address: "", note: "" });
  const [wilayaCode, setWilayaCode] = useState<number | null>(null);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("home");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const wilaya = wilayas.find((w) => w.code === wilayaCode) ?? null;
  const { quote } = useQuote(cart.lines, wilayaCode, deliveryType);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  function chooseWilaya(code: number) {
    setWilayaCode(code);
    const next = wilayas.find((w) => w.code === code);
    if (next && next.deskFee === null) setDeliveryType("home");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErrors({});
    setMessage(null);
    try {
      const placed = await api<Placed>("/api/orders", {
        body: {
          ...form,
          wilayaCode,
          deliveryType,
          locale,
          items: cart.lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })),
        },
      });
      // Kept for this tab only, so the tracking page can show the order without asking again.
      try {
        sessionStorage.setItem(LAST_ORDER_KEY, JSON.stringify({ number: placed.number, phone: form.phone, name: form.customerName }));
      } catch {
        /* storage blocked: the tracking page will ask for the number */
      }
      cart.clear();
      router.push(`/track?number=${placed.number}&placed=1`);
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields);
        setMessage(error.status === 409 ? t("fixCart") : error.message);
      } else {
        setMessage(t("errorGeneric"));
      }
      setSending(false);
    }
  }

  if (cart.ready && cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <p className="text-ink-soft">{t("cartEmpty")}</p>
        <Link href="/products" className="btn-primary mt-6">
          {t("shopNow")}
        </Link>
      </div>
    );
  }

  const homeFee = wilaya?.homeFee;
  const deskFee = wilaya?.deskFee;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-3xl font-extrabold">{t("checkout")}</h1>

      <form onSubmit={submit} noValidate className="mt-6 grid gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-3">
          <section className="card space-y-4 p-5">
            <h2 className="text-lg font-extrabold">{t("deliveryInfo")}</h2>
            <Field id="customerName" label={t("fullName")} error={errors.customerName}>
              <input id="customerName" autoComplete="name" required value={form.customerName} onChange={set("customerName")} className="input" />
            </Field>
            <Field id="phone" label={t("phone")} error={errors.phone} help={t("phoneHelp")}>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                required
                placeholder="05 / 06 / 07 …"
                value={form.phone}
                onChange={set("phone")}
                className="input rtl:text-right"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="wilaya" label={t("wilaya")} error={errors.wilayaCode}>
                <select
                  id="wilaya"
                  required
                  value={wilayaCode ?? ""}
                  onChange={(e) => chooseWilaya(Number(e.target.value))}
                  className="input"
                >
                  <option value="" disabled>
                    {t("chooseWilaya")}
                  </option>
                  {wilayas.map((w) => (
                    <option key={w.code} value={w.code}>
                      {String(w.code).padStart(2, "0")} — {pick(w.name, locale)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field id="commune" label={t("commune")} error={errors.commune}>
                <input id="commune" required value={form.commune} onChange={set("commune")} className="input" />
              </Field>
            </div>
          </section>

          <fieldset className="card space-y-3 p-5">
            <legend className="float-start mb-2 w-full text-lg font-extrabold">{t("deliveryMode")}</legend>
            <DeliveryOption
              checked={deliveryType === "home"}
              onChange={() => setDeliveryType("home")}
              title={t("home_delivery")}
              fee={homeFee !== undefined ? money(homeFee, locale) : ""}
            />
            <DeliveryOption
              checked={deliveryType === "desk"}
              onChange={() => setDeliveryType("desk")}
              disabled={wilaya !== null && deskFee === null}
              title={t("desk_delivery")}
              sub={wilaya !== null && deskFee === null ? t("noDesk") : t("deskHelp")}
              fee={deskFee != null ? money(deskFee, locale) : ""}
            />
            {errors.deliveryType && <p className="field-error">{errors.deliveryType}</p>}
            {deliveryType === "home" && (
              <Field id="address" label={t("address")} error={errors.address}>
                <textarea
                  id="address"
                  rows={2}
                  required
                  placeholder={t("addressPlaceholder")}
                  value={form.address}
                  onChange={set("address")}
                  className="input py-3"
                />
              </Field>
            )}
          </fieldset>

          <div className="flex items-center gap-3 rounded-2xl border-2 border-brand bg-brand-tint p-4">
            <CashIcon className="text-brand" />
            <div>
              <p className="font-extrabold">{t("payment")}</p>
              <p className="text-sm">{t("paymentText")}</p>
            </div>
          </div>

          <Field id="note" label={t("note")} error={errors.note}>
            <input id="note" placeholder={t("notePlaceholder")} value={form.note} onChange={set("note")} className="input" />
          </Field>
        </div>

        <aside className="lg:col-span-2">
          <div className="card sticky top-4 p-5">
            <CartLines quote={quote} editable={false} />
            <dl className="mt-3 space-y-2 border-t border-line pt-3">
              <div className="flex justify-between">
                <dt>{t("subtotal")}</dt>
                <dd>{quote ? money(quote.subtotal, locale) : "…"}</dd>
              </div>
              <div className="flex justify-between">
                <dt>
                  {t("delivery")}
                  {wilaya ? ` · ${pick(wilaya.name, locale)}` : ""}
                </dt>
                <dd>{quote?.deliveryFee == null ? "—" : quote.deliveryFee === 0 ? t("free") : money(quote.deliveryFee, locale)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-xl font-extrabold">
                <dt>{t("total")}</dt>
                <dd className="text-brand">{quote?.total != null ? money(quote.total, locale) : "—"}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-ink-soft">{t("serverPrices")}</p>

            {(message || (quote && !quote.ok && quote.lines.some((l) => l.problem))) && (
              <p role="alert" className="mt-3 rounded-xl bg-bad-tint p-3 text-sm font-semibold text-bad">
                {message ?? t("fixCart")}
              </p>
            )}

            <button type="submit" disabled={sending || !cart.ready} className="btn-primary mt-4 w-full text-lg">
              {sending ? t("sending") : t("confirmOrder")}
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({
  id,
  label,
  error,
  help,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label}
      </label>
      {children}
      {help && !error && <p className="mt-1 text-[13px] text-ink-soft">{help}</p>}
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
    </div>
  );
}

function DeliveryOption(props: {
  checked: boolean;
  onChange: () => void;
  title: string;
  fee: string;
  sub?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl px-4 py-3 ${
        props.checked ? "border-2 border-brand bg-brand-tint" : "border border-line-strong bg-surface"
      } ${props.disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <input
        type="radio"
        name="deliveryType"
        checked={props.checked}
        disabled={props.disabled}
        onChange={props.onChange}
        className="h-5 w-5 accent-brand"
      />
      <span className="flex-1">
        <span className="block font-extrabold">{props.title}</span>
        {props.sub && <span className="block text-[13px] text-ink-soft">{props.sub}</span>}
      </span>
      <span className="font-extrabold">{props.fee}</span>
    </label>
  );
}
