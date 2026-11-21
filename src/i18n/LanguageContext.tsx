/// <reference types="vite/client" />
import { createContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DEFAULT_LANG, LANG_META, LANG_STORAGE_KEY } from './types';
import type { Lang } from './types';
import { EN_MESSAGES, MESSAGES } from './messages';
import type { MessageKey } from './messages';

export type TranslateFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

const warnedKeys = new Set<string>();

export function translate(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const localized: string | undefined = MESSAGES[lang][key];
  if (localized === undefined && lang !== 'en' && import.meta.env.DEV && !warnedKeys.has(`${lang}:${key}`)) {
    warnedKeys.add(`${lang}:${key}`);
    console.warn(`[i18n] missing "${key}" for "${lang}", using English`);
  }
  const raw: string = localized ?? EN_MESSAGES[key];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match: string, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}


/** Pure: maps a raw stored value to a supported language. Unknown or missing values fall back to English. */
export function getStoredLang(raw: string | null): Lang {
  if (raw === 'te' || raw === 'hi') return raw;
  return DEFAULT_LANG;
}

function readStoredLang(): Lang {
  try {
    return getStoredLang(window.localStorage.getItem(LANG_STORAGE_KEY));
  } catch {
    // localStorage unavailable (private mode): fall back to default
    return DEFAULT_LANG;
  }
}

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: TranslateFn;
}

export const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
  t: (key, vars) => translate(DEFAULT_LANG, key, vars),
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang);

  const setLang = (next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage failures
    }
  };

  useEffect(() => {
    document.documentElement.lang = LANG_META[lang].htmlLang;
  }, [lang]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
