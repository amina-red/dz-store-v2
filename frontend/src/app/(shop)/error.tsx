"use client";

import { useLocale } from "@/lib/locale-client";

/** Shown when the API is down or a page fails; the header and footer stay. */
export default function ShopError({ reset }: { error: Error; reset: () => void }) {
  const { t } = useLocale();
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="text-lg">{t("errorGeneric")}</p>
      <button type="button" onClick={reset} className="btn-primary mt-6">
        ↻
      </button>
    </div>
  );
}
