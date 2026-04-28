'use client';

// M-L10.2 — Theme provider. Persists `paxio-theme` in localStorage,
// defaults to 'light', sets <html data-theme="..."> on mount + on toggle.
//
// Ported from docs/design/paxio-b5/EXTRACTED.md "Theme toggle script" — replaces
// the vanilla DOMContentLoaded handler with a React hook + provider so the rest
// of the landing app can consume `useTheme()` without imperative DOM access.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggleTheme: () => void;
}

const DEFAULT_THEME: Theme = 'light';

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  try {
    const raw = localStorage.getItem('paxio-theme');
    if (raw === 'dark' || raw === 'light') return raw;
  } catch {
    // localStorage may throw in SSR / sandboxed iframes — fall through.
  }
  return DEFAULT_THEME;
}

function applyTheme(next: Theme): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', next);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Server render uses default 'light' to keep markup stable; client
  // useEffect hydrates from localStorage. This avoids SSR/CSR hydration
  // mismatch on the <html> tag.
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('paxio-theme', next);
      } catch {
        // noop — storage quota / private mode
      }
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside <ThemeProvider>');
  }
  return ctx;
}
