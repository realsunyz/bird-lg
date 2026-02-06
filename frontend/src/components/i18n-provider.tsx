"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { dictionaries, type Locale, type Dictionary } from "@/lib/dictionaries";

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("bird-lg-locale") as Locale;
    if (stored && (stored === "en" || stored === "zh")) {
      setLocaleState(stored);
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("zh")) {
        setLocaleState("zh");
      }
    }
    setMounted(true);
  }, []);

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("bird-lg-locale", l);
  };

  const t = dictionaries[locale];

  if (!mounted) {
    return (
      <I18nContext.Provider
        value={{ locale: "en", setLocale, t: dictionaries.en }}
      >
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
