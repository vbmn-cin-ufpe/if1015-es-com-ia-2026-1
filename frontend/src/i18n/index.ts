/**
 * i18n — hook and Zustand store for locale management.
 *
 * Usage:
 *   const { t, locale, setLocale } = useI18n();
 *   t('nav_repository')  →  "Repositório" | "Repository" | "Repositorio"
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale, Translations } from './types';
import { ptBR } from './locales/pt-BR';
import { enUS } from './locales/en-US';
import { esMX } from './locales/es-MX';

// ── Locale registry ────────────────────────────────────────────────────────

const locales: Record<Locale, Translations> = {
  'pt-BR': ptBR,
  'en-US': enUS,
  'es-MX': esMX,
};

// ── Zustand store ──────────────────────────────────────────────────────────

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'en-US',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'cc-locale' },
  ),
);

// ── Hook ────────────────────────────────────────────────────────────────────

export function useI18n() {
  const { locale, setLocale } = useI18nStore();

  /**
   * Translate a key. Falls back to pt-BR if the key is missing in the
   * selected locale (should not happen, but safeguard for future keys).
   */
  function t(key: keyof Translations, vars?: Record<string, string>): string {
    const dict = locales[locale] ?? locales['pt-BR'];
    let text: string = (dict[key] as string) ?? (locales['pt-BR'][key] as string) ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        text = text.split(`{${k}}`).join(v);
      });
    }
    return text;
  }

  return { t, locale, setLocale };
}

// Re-export types for convenience
export type { Locale, Translations };
export { LOCALE_OPTIONS } from './types';
