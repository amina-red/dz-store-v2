import type { Locale } from "./types";

/** 8650 -> "8 650 DA" (or "8 650 دج" in Arabic). Digits stay Western: that is what Algerian shops use. */
export function money(amount: number, locale: Locale): string {
  const digits = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${digits} ${locale === "ar" ? "دج" : "DA"}`;
}

export function dateTime(iso: string, locale: Locale): string {
  const tag = locale === "ar" ? "ar-DZ-u-nu-latn" : locale === "fr" ? "fr-DZ" : "en-GB";
  return new Intl.DateTimeFormat(tag, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Algiers",
  }).format(new Date(iso));
}
