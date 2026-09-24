/**
 * Sample rows, so a screen can be tried with a real-looking day instead of an
 * empty one. Loaded automatically in development, and from Settings in test
 * builds. A real install starts empty.
 */
import { addMonths } from '@/lib/format';

import { db, saveEntry, saveIdea, saveMoney, saveTask, uid } from './db';
import type { MoneyKind, Repeat } from './types';

function iso(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function seedIfEmpty(): void {
  const count = db.getFirstSync<{ n: number }>('SELECT COUNT(*) AS n FROM tasks');
  if ((count?.n ?? 0) > 0) return;
  seedSample();
}

/** Adds the sample rows alongside whatever is there. */
export function seedSample(): void {
  const now = Date.now();
  const tasks: [number, string, string, Repeat, boolean][] = [
    [0, '07:00', 'Morning run', 'daily', true],
    [0, '09:00', 'Pay internet bill', 'monthly', true],
    [0, '10:30', 'Call the contractor about the kitchen quote', '', false],
    [0, '13:00', 'Lunch with Mei', '', false],
    [0, '21:00', 'Read 20 pages', 'daily', false],
    [-1, '07:00', 'Morning run', 'daily', true],
    [-1, '15:00', 'Send invoice to Harbour Studio', '', true],
    [1, '07:00', 'Morning run', 'daily', false],
    [1, '11:00', 'Dentist', '', false],
    [2, '19:30', 'Badminton', 'weekly', false],
  ];
  // Repeating tasks with the same title belong to one series.
  const series = new Map<string, string>();
  for (const [offset, time, title, repeat, done] of tasks) {
    const id = uid();
    const seriesId = repeat ? (series.get(title) ?? (series.set(title, id), id)) : id;
    saveTask({ id, date: iso(offset), time, title, notes: '', position: 0, repeat, seriesId, done, createdAt: now, syncedAt: now });
  }

  const entries: [number, string, string][] = [
    [0, 'good', 'Slow start, but the run helped. Paid the internet bill before I forgot again.\n\nStill waiting on the contractor. If the quote lands under twelve thousand we start the kitchen in October.'],
    [-1, 'great', 'Long day, but the invoice finally went out. Mei called about lunch tomorrow and I said yes instead of pushing it to next week.'],
    [-2, 'okay', 'Quiet Sunday. Cleaned the balcony, cooked, watched half a film and fell asleep.'],
  ];
  for (const [offset, mood, body] of entries) {
    saveEntry({ id: uid(), date: iso(offset), body, mood: mood as never, updatedAt: now, syncedAt: now });
  }

  const ideas: [string, string, boolean, boolean][] = [
    ['Weekend market stall for handmade candles', 'business', true, false],
    ['Learn to make kaya at home', 'food', false, false],
    ['Photo book of the Penang trip, before the pictures disappear into the camera roll forever', 'home', false, false],
    ['Offer booking reminders over WhatsApp for salons', 'business', true, false],
    ['Cameron Highlands in December', 'travel', false, false],
    ['Try the new ramen place in Bangsar', 'food', false, true],
  ];
  ideas.forEach(([text, tag, starred, done], i) => {
    saveIdea({ id: uid(), text, tag, starred, done, createdAt: now - i * 86400000, syncedAt: now });
  });

  const month = iso(0).slice(0, 7);
  const money: [MoneyKind, string, number, number | null, boolean][] = [
    ['income', 'Salary', 850000, null, false],
    ['income', 'Freelance design', 120000, null, false],
    ['saving', 'Emergency fund', 150000, null, false],
    ['saving', 'ASB', 50000, null, false],
    ['spending', 'Groceries', 62040, null, false],
    ['spending', 'Petrol', 28000, null, false],
    ['spending', 'Eating out', 34000, null, false],
    ['bill', 'Rent', 180000, 1, true],
    ['bill', 'Electricity', 14235, 10, true],
    ['bill', 'Internet', 14900, 15, true],
    ['bill', 'Phone', 8800, 20, false],
    ['bill', 'Car insurance', 31000, 28, false],
  ];
  // This month in full, and four earlier months with the totals nudged about
  // so the cash flow chart has a shape.
  // A recurring bill keeps one seriesId across months, or the roll-forward
  // would copy every past month's version into this one.
  const billSeries = new Map<string, string>();
  for (let back = 4; back >= 0; back -= 1) {
    const m = addMonths(month, -back);
    const drift = back === 0 ? 1 : 0.8 + ((back * 37) % 50) / 100;
    money.forEach(([kind, label, amountMinor, dueDay, paid], i) => {
      const id = uid();
      const seriesId = kind === 'bill' ? (billSeries.get(label) ?? (billSeries.set(label, id), id)) : id;
      const scaled = kind === 'income' || kind === 'bill' ? amountMinor : Math.round(amountMinor * drift);
      saveMoney({
        id,
        seriesId,
        month: m,
        kind,
        label,
        amountMinor: scaled,
        dueDay,
        paid: back > 0 ? true : paid,
        repeatMonthly: kind === 'bill',
        createdAt: now + i - back * 1000,
        syncedAt: now,
      });
    });
  }
}
