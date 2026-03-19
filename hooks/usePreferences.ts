'use client';

import { useState, useEffect, useCallback } from 'react';

export type FontFamily = 'fraunces' | 'inter';
export type ContentWidth = 'narrow' | 'medium' | 'wide';
export type ColorTheme = 'light' | 'dark' | 'sepia';

export interface Preferences {
  font: FontFamily;
  width: ContentWidth;
  theme: ColorTheme;
}

const PREFS_KEY = 'notes_preferences';

const CONTENT_WIDTH_MAP: Record<ContentWidth, string> = {
  narrow: '720px',
  medium: '960px',
  wide: '1200px',
};

const FONT_CSS_MAP: Record<FontFamily, string> = {
  fraunces: "'Fraunces', serif",
  inter: "'Inter', sans-serif",
};

function getSystemTheme(): ColorTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function loadPreferences(): Preferences {
  if (typeof window === 'undefined') {
    return { font: 'fraunces', width: 'medium', theme: 'light' };
  }
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        font: parsed.font ?? 'fraunces',
        width: parsed.width ?? 'medium',
        theme: parsed.theme ?? getSystemTheme(),
      };
    }
  } catch {
    // ignore
  }
  return { font: 'fraunces', width: 'medium', theme: getSystemTheme() };
}

export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>({
    font: 'fraunces',
    width: 'medium',
    theme: 'light',
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const prefs = loadPreferences();
    setPreferences(prefs);
    applyPreferences(prefs);
    setIsLoaded(true);

    // Listen for system theme changes
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setPreferences((prev) => {
        // Only auto-switch if user hasn't overridden
        const stored = loadPreferences();
        if (!localStorage.getItem(PREFS_KEY)) {
          const next = { ...prev, theme: e.matches ? ('dark' as ColorTheme) : ('light' as ColorTheme) };
          applyPreferences(next);
          return next;
        }
        return prev;
      });
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function applyPreferences(prefs: Preferences) {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;
    root.setAttribute('data-theme', prefs.theme);
    root.style.setProperty('--font-editor', FONT_CSS_MAP[prefs.font]);
    root.style.setProperty('--content-width', CONTENT_WIDTH_MAP[prefs.width]);
  }

  const updatePreferences = useCallback((updates: Partial<Preferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...updates };
      applyPreferences(next);
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return {
    preferences,
    isLoaded,
    updatePreferences,
    contentWidthPx: CONTENT_WIDTH_MAP[preferences.width],
    fontCss: FONT_CSS_MAP[preferences.font],
  };
}