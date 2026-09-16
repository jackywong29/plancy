/**
 * Sample rows, used only while developing so the simulator shows a real day
 * instead of empty screens. A real install starts empty.
 */
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
  for (const [offset, time, title, repeat, done] of tasks) {
    saveTask({ id: uid(), date: iso(offset), time, title, repeat, done, createdAt: now, syncedAt: now });
  }

  const entries: [number, string, string][] = [
    [0, 'good', 'Slow start, but the run helped. Paid the internet bill before I forgot again.\n\nStill waiting on the contractor. If the quote lands under twelve thousand we start the kitchen in October.'],
    [-1, 'great', 'Long day, but the invoice finally went out. Mei called about lunch tomorrow and I said yes instead of pushing it to next week.'],
    [-2, 'okay', 'Quiet Sunday. Cleaned the balcony, cooked, watched half a film and fell asleep.'],
  ];
  for (const [offset, mood, body] of entries) {
    saveEntry({ id: uid(), date: iso(offset), body, mood: mood as never, updatedAt: now, syncedAt: now });
  }

  const ideas: [string, string, boolean][] = [
    ['Weekend market stall for handmade candles', 'business', true],
    ['Learn to make kaya at home', 'food', false],
    ['Photo book of the Penang trip, before the pictures disappear into the camera roll forever', 'home', false],
    ['Offer booking reminders over WhatsApp for salons', 'business', true],
    ['Cameron Highlands in December', 'travel', false],
  ];
  ideas.forEach(([text, tag, starred], i) => {
    saveIdea({ id: uid(), text, tag, starred, createdAt: now - i * 86400000, syncedAt: now });
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
  money.forEach(([kind, label, amountMinor, dueDay, paid], i) => {
    saveMoney({
      id: uid(),
      month,
      kind,
      label,
      amountMinor,
      dueDay,
      paid,
      repeatMonthly: kind === 'bill',
      createdAt: now + i,
      syncedAt: now,
    });
  });
}
