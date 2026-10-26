"use client";

import { createContext, useContext } from "react";
import { translator, type T } from "./i18n";
import type { Locale } from "./types";

const LocaleContext = createContext<Locale>("ar");

/** Gives client components the language the server chose for this page. */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): { locale: Locale; t: T } {
  const locale = useContext(LocaleContext);
  return { locale, t: translator(locale) };
}
