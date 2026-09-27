import {
  addDays,
  addMonths,
  formatAmount,
  formatMoney,
  isoDate,
  minorUnits,
  monthGrid,
  parseMoney,
  splitTime,
  todayIso,
  weekdayInitials,
  weekOf,
} from './format';
import { days } from '../../test/make';
import { setPhone } from '../../test/locale';

afterEach(() => jest.useRealTimers());

describe('the time zone every test runs in', () => {
  it('is Sydney, which is ahead of UTC and has daylight saving', () => {
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('Australia/Sydney');
    // Daylight saving starts on 4 Oct 2026, so the offset changes across it.
    expect(new Date(2026, 9, 3, 12).getTimezoneOffset()).not.toBe(new Date(2026, 9, 5, 12).getTimezoneOffset());
  });
});

describe('dates are local, never UTC', () => {
  it('isoDate keeps an early-morning time on its own day', () => {
    const morning = new Date(2026, 5, 15, 7, 30); // 15 Jun, 7:30 am in Sydney
    // What the web planner's bug did: in UTC it is still the 14th.
    expect(morning.toISOString().slice(0, 10)).toBe('2026-06-14');
    expect(isoDate(morning)).toBe('2026-06-15');
  });

  it('isoDate keeps a late-night time on its own day', () => {
    expect(isoDate(new Date(2026, 8, 24, 23, 30))).toBe('2026-09-24');
  });

  it('todayIso just after midnight is the new day', () => {
    jest.useFakeTimers({ now: new Date(2026, 8, 24, 0, 30) });
    expect(todayIso()).toBe('2026-09-24');
  });
});

describe('addDays', () => {
  it('crosses month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2026-09-24', 0)).toBe('2026-09-24');
  });

  it('crosses both daylight-saving changes without slipping a day', () => {
    // Clocks go back on 5 Apr 2026 and forward on 4 Oct 2026 in Sydney.
    expect(addDays('2026-04-04', 1)).toBe('2026-04-05');
    expect(addDays('2026-04-05', 1)).toBe('2026-04-06');
    expect(addDays('2026-10-03', 1)).toBe('2026-10-04');
    expect(addDays('2026-10-04', 1)).toBe('2026-10-05');
    expect(addDays('2026-10-05', -2)).toBe('2026-10-03');
  });

  it('walks two whole years one day at a time and never skips or repeats', () => {
    const calendar = days('2026-01-01', '2027-12-31');
    expect(calendar).toHaveLength(365 + 365);
    for (let i = 1; i < calendar.length; i += 1) {
      expect(addDays(calendar[i - 1], 1)).toBe(calendar[i]);
    }
    expect(addDays('2026-01-01', 729)).toBe('2027-12-31');
  });
});

describe('addMonths', () => {
  it('crosses year ends both ways', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-09', 12)).toBe('2027-09');
  });
});

describe('weekOf', () => {
  // 27 Sep 2026 is a Sunday.
  it('starts on Monday when the week starts on Monday', () => {
    expect(weekOf('2026-09-27', 1)).toEqual(days('2026-09-21', '2026-09-27'));
    expect(weekOf('2026-09-21', 1)).toEqual(days('2026-09-21', '2026-09-27'));
  });

  it('starts on Sunday when the week starts on Sunday', () => {
    expect(weekOf('2026-09-27', 7)).toEqual(days('2026-09-27', '2026-10-03'));
    expect(weekOf('2026-09-26', 7)).toEqual(days('2026-09-20', '2026-09-26'));
  });

  it('holds seven days across a daylight-saving change', () => {
    expect(weekOf('2026-10-04', 1)).toEqual(days('2026-09-28', '2026-10-04'));
    expect(weekOf('2026-10-05', 1)).toEqual(days('2026-10-05', '2026-10-11'));
  });
});

describe('monthGrid', () => {
  const blanks = (grid: (string | null)[]) => grid.findIndex((c) => c !== null);
  const real = (grid: (string | null)[]) => grid.filter((c) => c !== null);

  it('pads the right number of blanks before the 1st for each week start', () => {
    // 1 Sep 2026 is a Tuesday; 1 Feb 2026 is a Sunday.
    expect(blanks(monthGrid('2026-09', 1))).toBe(1);
    expect(blanks(monthGrid('2026-09', 7))).toBe(2);
    expect(blanks(monthGrid('2026-02', 1))).toBe(6);
    expect(blanks(monthGrid('2026-02', 7))).toBe(0);
  });

  it('has one cell for every day of the month, in order', () => {
    expect(real(monthGrid('2026-02', 1))).toEqual(days('2026-02-01', '2026-02-28'));
    expect(real(monthGrid('2028-02', 1))).toEqual(days('2028-02-01', '2028-02-29'));
    expect(real(monthGrid('2026-04', 7))).toEqual(days('2026-04-01', '2026-04-30'));
    expect(real(monthGrid('2026-10', 1))).toEqual(days('2026-10-01', '2026-10-31'));
  });
});

describe('weekdayInitials', () => {
  it('follows the week start', () => {
    expect(weekdayInitials(1)).toEqual(['M', 'T', 'W', 'T', 'F', 'S', 'S']);
    expect(weekdayInitials(7)).toEqual(['S', 'M', 'T', 'W', 'T', 'F', 'S']);
  });
});

describe('splitTime', () => {
  it('reads the 12-hour clock the way people say it', () => {
    expect(splitTime('00:00', true)).toEqual({ time: '12:00', suffix: 'am' });
    expect(splitTime('07:05', true)).toEqual({ time: '7:05', suffix: 'am' });
    expect(splitTime('12:00', true)).toEqual({ time: '12:00', suffix: 'pm' });
    expect(splitTime('13:05', true)).toEqual({ time: '1:05', suffix: 'pm' });
    expect(splitTime('23:59', true)).toEqual({ time: '11:59', suffix: 'pm' });
  });

  it('leaves the 24-hour clock alone', () => {
    expect(splitTime('07:00', false)).toEqual({ time: '07:00', suffix: '' });
    expect(splitTime('13:05', false)).toEqual({ time: '13:05', suffix: '' });
  });
});

describe('parseMoney', () => {
  it('reads plain amounts', () => {
    expect(parseMoney('12.50', 'MYR')).toBe(1250);
    expect(parseMoney('12', 'MYR')).toBe(1200);
    expect(parseMoney('0.05', 'MYR')).toBe(5);
    expect(parseMoney('1000', 'MYR')).toBe(100000);
  });

  it('reads a comma as thousands, not cents (KNOWN-2)', () => {
    expect(parseMoney('1,000', 'MYR')).toBe(100000);
    expect(parseMoney('1,234.56', 'MYR')).toBe(123456);
    expect(parseMoney('1,000,000', 'MYR')).toBe(100000000);
  });

  it('reads German numbers on a German phone (KNOWN-2)', () => {
    setPhone({ languageTag: 'de-DE', currencyCode: 'EUR' });
    expect(parseMoney('1.000,50', 'EUR')).toBe(100050);
    expect(parseMoney('1.000', 'EUR')).toBe(100000);
    expect(parseMoney('12,50', 'EUR')).toBe(1250);
  });

  it('ignores currency marks and spaces', () => {
    expect(parseMoney('RM 12.50', 'MYR')).toBe(1250);
    expect(parseMoney('$1,000', 'USD')).toBe(100000);
    expect(parseMoney('12,50 €', 'EUR')).toBe(1250);
  });

  it('returns null when there is no number', () => {
    for (const nothing of ['', ' ', '-', '.', ',', 'abc', 'RM']) {
      expect(parseMoney(nothing, 'MYR')).toBeNull();
    }
  });

  it('reads zero as zero; rejecting it is the caller’s job', () => {
    expect(parseMoney('0', 'MYR')).toBe(0);
    expect(parseMoney('0.00', 'MYR')).toBe(0);
  });

  it('treats a minus sign as nothing: the kind says which way money went', () => {
    expect(parseMoney('-12.50', 'MYR')).toBe(1250);
  });

  it('never returns a fraction of a sen', () => {
    for (const input of ['12.345', '0.001', '1.999', '33.33', '0.1', '0.2', '19.99']) {
      const value = parseMoney(input, 'MYR');
      expect(Number.isInteger(value)).toBe(true);
    }
    // Floats would make 0.1 + 0.2 trouble; minor units never do.
    expect(parseMoney('0.1', 'MYR')! + parseMoney('0.2', 'MYR')!).toBe(parseMoney('0.3', 'MYR'));
  });

  it('reads yen, which has no cents', () => {
    expect(parseMoney('1,000', 'JPY')).toBe(1000);
    expect(parseMoney('500', 'JPY')).toBe(500);
  });
});

describe('formatMoney and parseMoney agree', () => {
  const amounts = [0, 1, 5, 10, 99, 100, 999, 1000, 1250, 99999, 100000, 123456, 100000000, 123456789];
  const phones = [
    { languageTag: 'en-MY', currency: 'MYR' },
    { languageTag: 'en-US', currency: 'USD' },
    { languageTag: 'de-DE', currency: 'EUR' },
    { languageTag: 'fr-FR', currency: 'EUR' },
    { languageTag: 'de-CH', currency: 'CHF' },
    { languageTag: 'en-IN', currency: 'INR' },
    { languageTag: 'ja-JP', currency: 'JPY' },
    { languageTag: 'en-MY', currency: 'JPY' },
    { languageTag: 'en-US', currency: 'KWD' },
    { languageTag: 'de-DE', currency: 'KWD' },
  ];

  it.each(phones)('round-trips every amount on a $languageTag phone in $currency', ({ languageTag, currency }) => {
    setPhone({ languageTag, currencyCode: currency });
    for (const minor of amounts) {
      expect({ minor, back: parseMoney(formatMoney(minor, currency), currency) }).toEqual({ minor, back: minor });
      expect({ minor, back: parseMoney(formatAmount(minor, currency), currency) }).toEqual({ minor, back: minor });
    }
  });

  it('writes yen with no decimal point', () => {
    setPhone({ languageTag: 'en-US', currencyCode: 'USD' });
    expect(formatMoney(1000, 'JPY')).toBe('¥1,000');
    expect(formatAmount(1000, 'JPY')).toBe('1,000');
  });

  it('writes ringgit to the sen', () => {
    // Intl puts a non-breaking space after "RM", so the mark never wraps alone.
    expect(formatMoney(123456, 'MYR')).toBe('RM 1,234.56');
    expect(formatAmount(5, 'MYR')).toBe('0.05');
  });
});

describe('minorUnits', () => {
  it('knows how many minor units make one unit', () => {
    expect(minorUnits('MYR')).toBe(100);
    expect(minorUnits('USD')).toBe(100);
    expect(minorUnits('JPY')).toBe(1);
    expect(minorUnits('KWD')).toBe(1000);
  });
});
