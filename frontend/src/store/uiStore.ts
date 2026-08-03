/**
 * UI Preferences store — persists dark mode and is accessible from any
 * component (AuthPage, AppShell) without prop drilling.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  darkMode: boolean;
  toggleDark: () => void;
  setDark: (v: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDark: () =>
        set((s) => {
          const next = !s.darkMode;
          applyDark(next);
          return { darkMode: next };
        }),
      setDark: (v) =>
        set(() => {
          applyDark(v);
          return { darkMode: v };
        }),
    }),
    { name: 'cc-dark-mode' },
  ),
);

function applyDark(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/** Call once at app boot to sync the DOM class with the persisted value. */
export function initDarkMode() {
  const stored = localStorage.getItem('cc-dark-mode');
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as { state?: { darkMode?: boolean } };
      applyDark(parsed?.state?.darkMode ?? false);
    } catch {
      // ignore corrupt storage
    }
  }
}
