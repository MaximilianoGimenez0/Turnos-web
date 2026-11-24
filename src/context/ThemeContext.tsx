import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DefaultThemeMode } from '../types';

export type ThemeMode = 'light' | 'dark';

export interface TenantModePolicy {
  tenantId: string;
  defaultMode: DefaultThemeMode;
  allowVisitorModeToggle: boolean;
}

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  canToggleTheme: boolean;
  applyTenantModePolicy: (policy: TenantModePolicy) => void;
  clearTenantModePolicy: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'turnos_web_theme_mode';

const readStoredMode = (key: string): ThemeMode | null => {
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Storage unavailable (private browsing or sandboxed context)
  }
  return null;
};

const writeStoredMode = (key: string, mode: ThemeMode): void => {
  try {
    localStorage.setItem(key, mode);
  } catch {
    // Ignore storage write failures
  }
};

const getSystemPrefersDark = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalTheme, setGlobalTheme] = useState<ThemeMode>(
    () => readStoredMode(STORAGE_KEY) ?? 'light'
  );
  const [tenantOverrides, setTenantOverrides] = useState<Record<string, ThemeMode>>({});
  const [policy, setPolicy] = useState<TenantModePolicy | null>(null);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(getSystemPrefersDark);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const canToggleTheme = policy ? policy.allowVisitorModeToggle : true;

  const theme = useMemo<ThemeMode>(() => {
    if (!policy) {
      return globalTheme;
    }

    const resolvedDefault: ThemeMode =
      policy.defaultMode === 'system'
        ? systemPrefersDark
          ? 'dark'
          : 'light'
        : policy.defaultMode;

    if (!policy.allowVisitorModeToggle) {
      return resolvedDefault;
    }

    const inMemory = tenantOverrides[policy.tenantId];
    if (inMemory === 'light' || inMemory === 'dark') {
      return inMemory;
    }

    const persisted = readStoredMode(`${STORAGE_KEY}:${policy.tenantId}`);
    return persisted ?? resolvedDefault;
  }, [globalTheme, policy, systemPrefersDark, tenantOverrides]);

  const setTheme = useCallback(
    (newTheme: ThemeMode) => {
      if (policy) {
        if (!policy.allowVisitorModeToggle) return;
        writeStoredMode(`${STORAGE_KEY}:${policy.tenantId}`, newTheme);
        setTenantOverrides((prev) =>
          prev[policy.tenantId] === newTheme ? prev : { ...prev, [policy.tenantId]: newTheme }
        );
        return;
      }

      writeStoredMode(STORAGE_KEY, newTheme);
      setGlobalTheme(newTheme);
    },
    [policy]
  );

  const toggleTheme = useCallback(() => {
    if (!canToggleTheme) return;
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [canToggleTheme, setTheme, theme]);

  const applyTenantModePolicy = useCallback((next: TenantModePolicy) => {
    setPolicy((prev) => {
      if (
        prev &&
        prev.tenantId === next.tenantId &&
        prev.defaultMode === next.defaultMode &&
        prev.allowVisitorModeToggle === next.allowVisitorModeToggle
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const clearTenantModePolicy = useCallback(() => {
    setPolicy((prev) => (prev === null ? prev : null));
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const contextValue = useMemo<ThemeContextType>(
    () => ({
      theme,
      toggleTheme,
      setTheme,
      isDark: theme === 'dark',
      canToggleTheme,
      applyTenantModePolicy,
      clearTenantModePolicy,
    }),
    [theme, toggleTheme, setTheme, canToggleTheme, applyTenantModePolicy, clearTenantModePolicy]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
