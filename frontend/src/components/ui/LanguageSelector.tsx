/**
 * LanguageSelector — compact dropdown to switch application locale.
 *
 * Shows flag emoji + short locale code. On click opens a dropdown listing all
 * supported languages. Designed to sit beside the dark-mode toggle button.
 */

import { useRef, useState, useEffect } from 'react';
import { useI18n, LOCALE_OPTIONS } from '../../i18n';
import type { Locale } from '../../i18n';

interface LanguageSelectorProps {
  /** Extra CSS classes to apply to the trigger button */
  className?: string;
}

export function LanguageSelector({ className = '' }: LanguageSelectorProps) {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const current = LOCALE_OPTIONS.find((o) => o.code === locale) ?? LOCALE_OPTIONS[0];

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  function select(code: Locale) {
    setLocale(code);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-gray-500 dark:text-gray-400
                   hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm font-medium
                   border border-transparent hover:border-gray-200 dark:hover:border-gray-600"
        title={current.label}
      >
        <span className="text-base leading-none" aria-hidden="true">{current.flag}</span>
        <span className="text-xs font-semibold tracking-wide">{current.shortLabel}</span>
        <i
          className={`fa-solid fa-chevron-down text-[10px] transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown */}
      {open && (
        <ul
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full mt-1.5 z-50 w-44 bg-white dark:bg-gray-800
                     rounded-xl shadow-lg border border-gray-200 dark:border-gray-700
                     py-1 overflow-hidden"
        >
          {LOCALE_OPTIONS.map((opt) => {
            const isActive = opt.code === locale;
            return (
              <li key={opt.code} role="option" aria-selected={isActive}>
                <button
                  type="button"
                  onClick={() => select(opt.code)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors
                    ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <span className="text-base leading-none">{opt.flag}</span>
                  <span className="flex-1">{opt.label}</span>
                  {isActive && (
                    <i className="fa-solid fa-check text-xs text-indigo-500 dark:text-indigo-400" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
