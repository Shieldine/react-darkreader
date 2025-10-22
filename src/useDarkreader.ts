import { useEffect, useMemo, useState } from 'react';
import {
  auto as followSystemColorScheme,
  disable as disableDarkMode,
  DynamicThemeFix,
  enable as enableDarkMode,
  exportGeneratedCSS as collectCSS,
  setFetchMethod,
  Theme,
} from 'darkreader';

export type Mode = 'system' | 'light' | 'dark';

export type Action = {
  setMode: (mode: Mode) => void;
  toggle: () => void;
  collectCSS: () => Promise<string>;
};

export type Result = [boolean, Action, Mode];

const defaultTheme = {
  brightness: 100,
  contrast: 90,
  sepia: 10,
};

const defaultFixes = {
  invert: [],
  css: '',
  ignoreInlineStyle: ['.react-switch-handle'],
  ignoreImageAnalysis: [],
};

const isValidMode = (value: string | null): value is Mode => {
  return value === 'system' || value === 'light' || value === 'dark';
};

export default function useDarkreader(
  defaultDarken: boolean = false,
  theme?: Partial<Theme>,
  fixes?: DynamicThemeFix,
  allowSystem: boolean = true,
): Result {
  const STORAGE_KEY = 'darkreader-mode';

  const getInitialMode = (): Mode => {
    const storedValue = localStorage.getItem(STORAGE_KEY);
    if (isValidMode(storedValue)) {
      if (storedValue === 'system' && !allowSystem) {
        return defaultDarken ? 'dark' : 'light';
      }
      return storedValue;
    }
    return allowSystem ? 'system' : defaultDarken ? 'dark' : 'light';
  };

  const [mode, setMode] = useState<Mode>(getInitialMode);

  const isDark =
    mode === 'dark' ||
    (mode === 'system' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    setFetchMethod(window.fetch);

    if (mode === 'system' && !allowSystem) {
      setMode(defaultDarken ? 'dark' : 'light');
      return;
    }

    const applyMode = (selectedMode: Mode) => {
      if (selectedMode === 'system' && allowSystem) {
        followSystemColorScheme(
          { ...defaultTheme, ...theme },
          { ...defaultFixes, ...fixes },
        );
      } else if (selectedMode === 'dark') {
        enableDarkMode(
          { ...defaultTheme, ...theme },
          { ...defaultFixes, ...fixes },
        );
      } else {
        disableDarkMode();
      }
    };

    applyMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);

    if (mode === 'system' && allowSystem) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => {
        applyMode('system');
      };
      mediaQuery.addEventListener('change', handleChange);

      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [mode, allowSystem]);

  const action = useMemo<Action>(() => {
    const toggle = () => {
      setMode(prev => {
        if (prev === 'light') return 'dark';
        if (prev === 'dark') return allowSystem ? 'system' : 'light';
        return 'light';
      });
    };

    const setModeAndStore = (newMode: Mode) => {
      if (newMode === 'system' && !allowSystem) return;
      setMode(newMode);
    };

    return { toggle, setMode: setModeAndStore, collectCSS };
  }, [allowSystem]);

  return [isDark, action, mode];
}
