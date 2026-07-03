'use client';

/**
 * Contexte de langue FR/EN de la landing — FR par défaut, persisté en
 * localStorage. Fournit aussi les formateurs Intl.NumberFormat par langue
 * (compteurs, prix) pour ne jamais formater un chiffre à la main.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { DICTS, type Dict, type Lang } from './dictionary';

const STORAGE_KEY = 'gryd_lang';

type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  copy: Dict;
  locale: string;
  formatInt: (n: number) => string;
  formatDecimal: (n: number, digits?: number) => string;
  formatEur: (n: number) => string;
};

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // FR par défaut (rendu serveur) ; la préférence stockée est appliquée après montage.
  const [lang, setLangState] = useState<Lang>('fr');

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === 'fr' || stored === 'en') setLangState(stored);
    } catch {
      // localStorage indisponible (navigation privée…) : on reste en FR.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const value = useMemo<LangContextValue>(() => {
    const locale = lang === 'fr' ? 'fr-FR' : 'en-GB';
    return {
      lang,
      setLang: (next) => {
        setLangState(next);
        try {
          window.localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Pas bloquant : la langue reste active pour la session.
        }
      },
      copy: DICTS[lang],
      locale,
      formatInt: (n) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n),
      formatDecimal: (n, digits = 1) =>
        new Intl.NumberFormat(locale, {
          minimumFractionDigits: digits,
          maximumFractionDigits: digits,
        }).format(n),
      formatEur: (n) =>
        new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(n),
    };
  }, [lang]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang doit être appelé sous <LangProvider>.');
  return ctx;
}
