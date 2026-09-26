import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { THEME_STORAGE_KEY } from './themeScript';

export type ThemeMode = 'light' | 'system' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** The user's explicit preference: light, dark, or follow the OS (system). */
  mode: ThemeMode;
  /** What is actually painted right now after resolving `system`. */
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Cycles light → system → dark → light, for a compact icon button. */
  cycleMode: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

/** Reads the persisted preference, defaulting to `light`. */
const readStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'light';
  } catch {
    // Storage can throw in private-browsing / sandboxed iframes.
    return 'light';
  }
};

const getSystemTheme = (): ResolvedTheme =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';

const resolveTheme = (mode: ThemeMode): ResolvedTheme => (mode === 'system' ? getSystemTheme() : mode);

/**
 * Applies the theme to <html> and keeps it in sync with the OS.
 *
 * - `mode` drives a `.dark` class + `color-scheme` on the document root, which
 *   is what Tailwind's `dark:` variant (configured via `@custom-variant` in
 *   index.css) keys off.
 * - In `system` mode we subscribe to `matchMedia`, so the UI flips instantly
 *   when the OS switches appearance — no reload required.
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(getSystemTheme);

  // Track the OS preference continuously (also picks up live changes).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setSystemTheme(event.matches ? 'dark' : 'light');
    setSystemTheme(query.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  // Only follow the OS when the preference is `system`; an explicit
  // light/dark choice always wins, even if the OS changes.
  const resolvedTheme: ResolvedTheme = mode === 'system' ? systemTheme : mode;

  // Push the resolved theme onto <html>.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    // Drives native widgets (scrollbars, form controls, <input type=date>…).
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  // Enable cross-fade transitions only *after* the first commit, so the
  // initial paint is never animated. See `.gc-theme-transition` in index.css.
  useEffect(() => {
    const root = document.documentElement;
    const id = window.setTimeout(() => root.classList.add('gc-theme-transition'), 120);
    return () => {
      window.clearTimeout(id);
      root.classList.remove('gc-theme-transition');
    };
  }, []);

  // Keep other tabs/windows of the same app in sync.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      setModeState(isThemeMode(event.newValue) ? event.newValue : 'light');
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      // Persist even for `system` so the explicit choice survives a reload and
      // can be distinguished from "never configured" by the bootstrap script.
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Non-fatal: the session still works, it just won't persist.
    }
  }, []);

  const cycleMode = useCallback(() => {
    setModeState((prev) => {
      const next: ThemeMode = prev === 'light' ? 'system' : prev === 'system' ? 'dark' : 'light';
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolvedTheme, setMode, cycleMode }),
    [mode, resolvedTheme, setMode, cycleMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

/** Access the theme store. Throws when used outside of <ThemeProvider>. */
export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a <ThemeProvider>');
  return ctx;
};
