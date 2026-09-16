/**
 * Colour tokens for both appearances, plus the hook every screen reads.
 *
 * Screens never hardcode a colour; they take one from here, so Light, Dark and
 * all twelve accents stay consistent in one place.
 */
import { createContext, use, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';

import { accentFor, accentTextFor, inkOn, mix } from './palette';

export type Scheme = 'light' | 'dark';

const BASE = {
  light: {
    ground: '#F2F1F5',
    card: '#FFFFFF',
    ink: '#1E1D21',
    ink2: '#6E6C76',
    ink3: '#A3A1AB',
    line: '#E4E3E9',
    fill: '#E8E7ED',
    good: '#2B9563',
    bad: '#D9434A',
    warn: '#8A5A08',
    warnSoft: '#FBF0D9',
  },
  dark: {
    ground: '#111013',
    card: '#1E1D21',
    ink: '#F4EFE6',
    ink2: '#A7A2AB',
    ink3: '#6F6B74',
    line: '#2E2C33',
    fill: '#2A282E',
    good: '#4CC48A',
    bad: '#F0646A',
    warn: '#E9B04E',
    warnSoft: '#2F2615',
  },
} as const;

type BaseTokens = { [K in keyof (typeof BASE)['light']]: string };

export type Theme = BaseTokens & {
  scheme: Scheme;
  accent: string;
  accentText: string;
  accentSoft: string;
  onAccent: string;
};

export function buildTheme(scheme: Scheme, pick: string): Theme {
  const base = BASE[scheme];
  const accent = accentFor(pick, scheme);
  return {
    ...base,
    scheme,
    accent,
    accentText: accentTextFor(accent, base.card),
    accentSoft: mix(base.card, accent, scheme === 'dark' ? 0.24 : 0.14),
    onAccent: inkOn(accent),
  };
}

/** Type scale. Sizes are points; iOS still scales them with the reader's text size. */
export const Type = {
  /** Futura ships with iOS, so the wordmark face costs nothing to use. */
  display: 'Futura-Medium',
  title: 38,
  sectionTitle: 17,
  body: 16,
  callout: 15,
  footnote: 13,
  caption: 12,
} as const;

export const Space = { gutter: 16, gap: 12, radius: 14, row: 48 } as const;

const ThemeContext = createContext<Theme>(buildTheme('light', '#6D5EF0'));

export function ThemeProvider({
  appearance,
  accent,
  children,
}: {
  appearance: 'system' | Scheme;
  accent: string;
  children: ReactNode;
}) {
  const system = useColorScheme();
  const scheme: Scheme = appearance === 'system' ? (system === 'dark' ? 'dark' : 'light') : appearance;
  const theme = useMemo(() => buildTheme(scheme, accent), [scheme, accent]);
  return <ThemeContext value={theme}>{children}</ThemeContext>;
}

export function useTheme(): Theme {
  return use(ThemeContext);
}
