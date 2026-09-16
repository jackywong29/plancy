/**
 * The twelve colours a person can pick, and the maths that keeps every one of
 * them readable.
 *
 * Carried over from the web planner: the ink placed ON a filled accent follows
 * the accent's own brightness, not the light/dark setting, so amber gets dark
 * ink and navy gets white on either background.
 */

export type Swatch = { id: string; hex: string; name: string };

export const PALETTE: Swatch[] = [
  { id: 'violet', hex: '#6D5EF0', name: 'Violet' },
  { id: 'blue', hex: '#3E7BFA', name: 'Blue' },
  { id: 'teal', hex: '#1A9FC0', name: 'Teal' },
  { id: 'green', hex: '#2B9563', name: 'Green' },
  { id: 'olive', hex: '#6E8F24', name: 'Olive' },
  { id: 'amber', hex: '#C98B0B', name: 'Amber' },
  { id: 'orange', hex: '#E2702C', name: 'Orange' },
  { id: 'red', hex: '#DD434A', name: 'Red' },
  { id: 'pink', hex: '#D2437A', name: 'Pink' },
  { id: 'purple', hex: '#9F4FD3', name: 'Purple' },
  { id: 'stone', hex: '#7B6F63', name: 'Stone' },
  { id: 'slate', hex: '#4B5563', name: 'Slate' },
];

/** Clancy violet. */
export const DEFAULT_ACCENT = PALETTE[0].hex;

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

export function mix(hex: string, towards: string, amount: number): string {
  const a = channels(hex);
  const b = channels(towards);
  return toHex(...(a.map((v, i) => v + (b[i] - v) * amount) as [number, number, number]));
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const c = channels(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Text or icon colour to place on a filled accent surface. */
export function inkOn(accent: string, darkInk = '#1E1D21'): string {
  return contrast(accent, darkInk) > contrast(accent, '#FFFFFF') ? darkInk : '#FFFFFF';
}

/** Dark mode lifts every swatch, or the deep ones vanish into the charcoal. */
export function accentFor(hex: string, scheme: 'light' | 'dark'): string {
  if (scheme === 'light') return hex;
  return mix(hex, '#FFFFFF', luminance(hex) < 0.12 ? 0.38 : 0.2);
}

/**
 * Accent used for TEXT on a card. Some swatches (amber, olive) are fine as a
 * fill but too pale to read as a label, so they are darkened until they clear
 * 4.5:1 against the card behind them.
 */
export function accentTextFor(accent: string, card: string): string {
  let text = accent;
  const towards = luminance(card) > 0.5 ? '#000000' : '#FFFFFF';
  for (let i = 0; i < 12 && contrast(text, card) < 4.5; i += 1) {
    text = mix(text, towards, 0.1);
  }
  return text;
}
