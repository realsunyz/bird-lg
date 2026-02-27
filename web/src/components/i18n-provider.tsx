"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { dictionaries, type Locale, type Dictionary } from "@/lib/dictionaries";

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dictionary;
};

const I18nContext = createContext<I18nContextType | null>(null);

function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "zh";
}

type I18nState = {
  locale: Locale;
  mounted: boolean;
};

type Action = { type: "INIT"; payload: Locale } | { type: "SET_LOCALE"; payload: Locale };

function i18nReducer(state: I18nState, action: Action): I18nState {
  switch (action.type) {
    case "INIT":
      return { ...state, locale: action.payload, mounted: true };
    case "SET_LOCALE":
      return { ...state, locale: action.payload };
    default:
      return state;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(i18nReducer, {
    locale: "en",
    mounted: false,
  });

  useEffect(() => {
    const stored = localStorage.getItem("bird-lg-locale");
    let initialLocale: Locale = "en";
    if (isLocale(stored)) {
      initialLocale = stored;
    } else {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("zh")) {
        initialLocale = "zh";
      }
    }
    dispatch({ type: "INIT", payload: initialLocale });
  }, []);

  const setLocale = useCallback((l: Locale) => {
    dispatch({ type: "SET_LOCALE", payload: l });
    if (typeof window !== "undefined") {
      localStorage.setItem("bird-lg-locale", l);
    }
  }, []);

  const t = useMemo(() => dictionaries[state.locale], [state.locale]);
  const value = useMemo(
    () => ({ locale: state.locale, setLocale, t }),
    [state.locale, setLocale, t],
  );
  const bootValue = useMemo(
    () => ({ locale: "en" as const, setLocale, t: dictionaries.en }),
    [setLocale],
  );

  if (!state.mounted) {
    return <I18nContext.Provider value={bootValue}>{children}</I18nContext.Provider>;
  }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
