"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_STORAGE_KEY = "theme";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark" || value === "system";
}

function applyTheme(theme: Theme, disableTransitions: boolean) {
  const resolvedTheme =
    theme === "system"
      ? window.matchMedia(SYSTEM_THEME_QUERY).matches
        ? "dark"
        : "light"
      : theme;
  const root = document.documentElement;

  let restoreTransitions: (() => void) | undefined;
  if (disableTransitions) {
    const style = document.createElement("style");
    style.textContent =
      "*,*::before,*::after{-webkit-transition:none!important;-moz-transition:none!important;-o-transition:none!important;-ms-transition:none!important;transition:none!important}";
    document.head.appendChild(style);
    restoreTransitions = () => {
      window.getComputedStyle(document.body);
      window.setTimeout(() => style.remove(), 1);
    };
  }

  root.classList.remove("light", "dark");
  root.classList.add(resolvedTheme);
  root.style.colorScheme = resolvedTheme;
  restoreTransitions?.();
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    try {
      const value = window.localStorage.getItem(THEME_STORAGE_KEY);
      return isTheme(value) ? value : "system";
    } catch (error) {
      console.warn("Could not read the saved theme preference.", error);
      return "system";
    }
  });
  const hasAppliedTheme = useRef(false);

  const setTheme = useCallback((nextTheme: Theme) => {
    setThemeState(nextTheme);
  }, []);

  useEffect(() => {
    applyTheme(theme, hasAppliedTheme.current);
    hasAppliedTheme.current = true;
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch (error) {
      console.warn("Could not save the theme preference.", error);
    }
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    const handleSystemThemeChange = () => {
      if (theme === "system") applyTheme("system", true);
    };

    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () => mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, [theme]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      setThemeState(isTheme(event.newValue) ? event.newValue : "system");
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
