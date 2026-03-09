"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
} from "react";
import { dictionaries, type Locale, type Dictionary } from "@/shared/i18n/dictionaries";

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextType | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "zh";
}

function getInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";

  try {
    const stored = localStorage.getItem("bird-lg-locale");
    if (isLocale(stored)) return stored;
  } catch {}

  try {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("zh")) return "zh";
  } catch {}

  return "en";
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem("bird-lg-locale", l);
    } catch {}
  }, []);

  const t = useMemo(() => dictionaries[locale], [locale]);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
