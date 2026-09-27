import { accentFor, accentTextFor, contrast, inkOn, luminance, mix, PALETTE } from './palette';
import { buildTheme } from './theme';

/** What a reader actually sees: the accent as the theme builds it, as text on a card. */
function accentTextContrast(hex: string, scheme: 'light' | 'dark'): number {
  const theme = buildTheme(scheme, hex);
  return contrast(theme.accentText, theme.card);
}

describe('accent text stays readable', () => {
  it.each(PALETTE)('$name reaches 4.5:1 on a light and a dark card', ({ hex }) => {
    expect(accentTextContrast(hex, 'light')).toBeGreaterThanOrEqual(4.5);
    expect(accentTextContrast(hex, 'dark')).toBeGreaterThanOrEqual(4.5);
  });

  it.each(['#FFFFFF', '#000000', '#FFFF00', '#00FFFF', '#FF0000', '#0000FF', '#808080'])(
    'so does the extreme custom colour %s',
    (hex) => {
      expect(accentTextContrast(hex, 'light')).toBeGreaterThanOrEqual(4.5);
      expect(accentTextContrast(hex, 'dark')).toBeGreaterThanOrEqual(4.5);
    },
  );

  it('so does every colour the custom picker can make, sampled across the whole range', () => {
    const steps = [0, 51, 102, 153, 204, 255].map((v) => v.toString(16).padStart(2, '0'));
    const failures: string[] = [];
    for (const r of steps) {
      for (const g of steps) {
        for (const b of steps) {
          const hex = `#${r}${g}${b}`;
          for (const scheme of ['light', 'dark'] as const) {
            if (accentTextContrast(hex, scheme) < 4.5) failures.push(`${hex} ${scheme}`);
          }
        }
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('ink on a filled accent', () => {
  it('is dark on amber and white on slate', () => {
    expect(inkOn('#C98B0B')).toBe('#1E1D21');
    expect(inkOn('#4B5563')).toBe('#FFFFFF');
  });

  it.each(PALETTE)('is the more readable of the two on $name', ({ hex }) => {
    const ink = inkOn(hex);
    const other = ink === '#FFFFFF' ? '#1E1D21' : '#FFFFFF';
    expect(contrast(hex, ink)).toBeGreaterThanOrEqual(contrast(hex, other));
  });
});

describe('accentFor', () => {
  it('leaves light mode alone', () => {
    for (const { hex } of PALETTE) expect(accentFor(hex, 'light')).toBe(hex);
  });

  it('lifts every swatch in dark mode', () => {
    for (const { hex } of PALETTE) expect(luminance(accentFor(hex, 'dark'))).toBeGreaterThan(luminance(hex));
  });
});

describe('mix', () => {
  it('returns the first colour at 0 and the second at 1', () => {
    expect(mix('#6d5ef0', '#ffffff', 0)).toBe('#6d5ef0');
    expect(mix('#6d5ef0', '#ffffff', 1)).toBe('#ffffff');
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });
});

describe('accentTextFor', () => {
  it('leaves an accent that already reads alone', () => {
    expect(accentTextFor('#4B5563', '#FFFFFF')).toBe('#4B5563');
  });
});
