/**
 * Dates, times and money.
 *
 * Two rules carried over from the web planner: dates are handled in local time
 * (never UTC, or a task slips a day), and money is stored in whole minor units
 * and only turned into text here.
 */
import { getCalendars, getLocales } from 'expo-localization';

import type { Settings } from '@/data/types';

/* ---------- dates ---------- */

export function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromIso(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export const todayIso = (): string => isoDate(new Date());

export const isoMonth = (iso: string): string => iso.slice(0, 7);

export function addDays(iso: string, delta: number): string {
  const d = fromIso(iso);
  d.setDate(d.getDate() + delta);
  return isoDate(d);
}

export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, (m ?? 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** The seven days of the week `iso` falls in, honouring the week-start setting. */
export function weekOf(iso: string, weekStart: 1 | 7): string[] {
  const d = fromIso(iso);
  const day = d.getDay(); // 0 = Sunday
  const offset = weekStart === 1 ? (day + 6) % 7 : day;
  const first = addDays(iso, -offset);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

/** Every cell of a month grid, padded with the blanks before the 1st. */
export function monthGrid(month: string, weekStart: 1 | 7): (string | null)[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const lead = weekStart === 1 ? (first.getDay() + 6) % 7 : first.getDay();
  const days = new Date(y, m, 0).getDate();
  return [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`),
  ];
}

export const dayOfMonth = (iso: string): number => Number(iso.slice(8, 10));

/* ---------- text ---------- */

/** The phone's own language, so dates read the way the reader expects. */
export const locale = (): string => getLocales()[0]?.languageTag ?? 'en-US';

export function formatDayLong(iso: string): string {
  return fromIso(iso).toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatDayShort(iso: string): string {
  return fromIso(iso).toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatMonthLong(month: string): string {
  return fromIso(`${month}-01`).toLocaleDateString(locale(), { month: 'long', year: 'numeric' });
}

export function weekdayInitials(weekStart: 1 | 7): string[] {
  // 4 Jan 2026 is a Sunday, which gives a stable week to read names from.
  const sunday = new Date(2026, 0, 4);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i + (weekStart === 1 ? 1 : 0));
    return d.toLocaleDateString(locale(), { weekday: 'narrow' });
  });
}

/** "07:00" -> { time: "7:00", suffix: "am" }, or 24-hour when that's the setting. */
export function splitTime(hhmm: string, hour12: boolean): { time: string; suffix: string } {
  const [h, m] = hhmm.split(':').map(Number);
  if (!hour12) return { time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, suffix: '' };
  const suffix = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 || 12;
  return { time: `${hour}:${String(m).padStart(2, '0')}`, suffix };
}

/** The phone's own clock setting, used the first time the app runs. */
export function deviceHour12(): boolean {
  const cal = getCalendars()[0];
  return cal?.uses24hourClock === true ? false : true;
}

/** The currency of the phone's region, e.g. MYR in Malaysia. */
export function deviceCurrency(): string {
  return getLocales()[0]?.currencyCode ?? 'USD';
}

/* ---------- money ---------- */

/** Decimal places this currency is written to: 2 for the ringgit, 0 for the yen. */
export function currencyDecimals(currency: string): number {
  return (
    new Intl.NumberFormat(locale(), { style: 'currency', currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}

/** How many minor units make one unit: 100 sen to the ringgit, 1 for the yen. */
export function minorUnits(currency: string): number {
  return Math.pow(10, currencyDecimals(currency));
}

/**
 * The number on its own — grouped, to the currency's own number of decimals,
 * and with no currency mark. For places that already say which currency it is.
 */
export function formatAmount(minor: number, currency: string): string {
  const digits = currencyDecimals(currency);
  return new Intl.NumberFormat(locale(), {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(minor / Math.pow(10, digits));
}

export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat(locale(), { style: 'currency', currency }).format(minor / minorUnits(currency));
}

/** The character this locale puts before the cents: "." here, "," in Germany. */
function decimalSeparator(): string {
  return (
    new Intl.NumberFormat(locale()).formatToParts(1.1).find((p) => p.type === 'decimal')?.value ?? '.'
  );
}

/**
 * "12.50", "RM 12.50", "1,234.56" and the German "1.000,50" all parse.
 * Returns null when they don't.
 *
 * Both "." and "," can mean either a decimal point or a thousands separator
 * depending on where you are, so guessing wrongly turns 1,000 into one ringgit.
 * When a number carries both, the LAST one is the decimal point and the other
 * groups. When it carries only one, it groups if it repeats or if exactly three
 * digits follow it, and otherwise it's the decimal point.
 */
export function parseMoney(input: string, currency: string): number | null {
  const cleaned = input.replace(/[^0-9.,]/g, '');
  if (!cleaned) return null;

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let decimal = '';
  if (lastDot >= 0 && lastComma >= 0) {
    decimal = lastDot > lastComma ? '.' : ',';
  } else if (lastDot >= 0 || lastComma >= 0) {
    const only = lastDot >= 0 ? '.' : ',';
    const at = Math.max(lastDot, lastComma);
    const repeated = cleaned.indexOf(only) !== at;
    const groupsThree = cleaned.length - at - 1 === 3;
    // Three trailing digits are a thousand unless this locale writes cents
    // that way, which none do.
    decimal = repeated || (groupsThree && only !== decimalSeparator()) ? '' : only;
  }

  // Split at the decimal point, then strip every grouping mark from each half.
  const cut = decimal ? cleaned.lastIndexOf(decimal) : -1;
  const whole = (cut < 0 ? cleaned : cleaned.slice(0, cut)).replace(/[.,]/g, '');
  const frac = cut < 0 ? '' : cleaned.slice(cut + 1).replace(/[.,]/g, '');
  const digits = frac ? `${whole}.${frac}` : whole;
  if (!digits) return null;

  const value = Number(digits);
  if (!Number.isFinite(value)) return null;
  return Math.round(value * minorUnits(currency));
}

export const settingsDefaults = (): Settings => ({
  appearance: 'system',
  accent: '#6D5EF0',
  currency: deviceCurrency(),
  weekStart: locale().startsWith('en-US') ? 7 : 1,
  hour12: deviceHour12(),
  remind: true,
  leadMinutes: 10,
  haptics: true,
  lockEnabled: false,
  lockScope: 'private',
  nudge: false,
  nudgeHour: 8,
  widgetStyle: 'progress',
  calendar: 'week',
  onboarded: false,
});
