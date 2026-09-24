/**
 * The record types, carried over from the web planner.
 *
 * Every record keeps `syncedAt`, the moment it last changed on any device.
 * Nothing uses it yet, but iCloud sync will merge on it exactly as the web app
 * does today: latest change wins, and deletions are kept as tombstones so a
 * device that has been offline can't bring back something you deleted.
 */

export type Repeat = '' | 'daily' | 'weekly' | 'monthly';

export type Task = {
  id: string;
  /** YYYY-MM-DD, the day this task belongs to. */
  date: string;
  /** HH:MM in 24-hour time. Shown as 12-hour unless the reader says otherwise. */
  time: string;
  title: string;
  /** Free text under the title: details, a link, what to bring. Empty when there are none. */
  notes: string;
  repeat: Repeat;
  /** Groups the instances of one repeating task. Equals the first instance's id. */
  seriesId: string;
  done: boolean;
  createdAt: number;
  syncedAt: number;
};

export type Mood = '' | 'great' | 'good' | 'okay' | 'low' | 'rough';

export type JournalEntry = {
  id: string;
  /** YYYY-MM-DD. One entry per day. */
  date: string;
  body: string;
  mood: Mood;
  updatedAt: number;
  syncedAt: number;
};

export type Idea = {
  id: string;
  text: string;
  /** Free-form bucket, typed as #tag inside the idea itself. */
  tag: string;
  starred: boolean;
  /** Acted on or no longer needed; kept, dimmed, at the bottom of the list. */
  done: boolean;
  createdAt: number;
  syncedAt: number;
};

export type MoneyKind = 'income' | 'saving' | 'spending' | 'bill';

export type MoneyEntry = {
  id: string;
  /** YYYY-MM. */
  month: string;
  kind: MoneyKind;
  label: string;
  /**
   * Whole minor units (sen, cents). Integers only — floats drift, and a
   * planner that quietly loses a cent a month is worse than useless.
   */
  amountMinor: number;
  /** Bills only: day of the month it falls due. */
  dueDay: number | null;
  /** Bills only. */
  paid: boolean;
  /** Bills only: copy this into next month automatically. */
  repeatMonthly: boolean;
  /** Groups a recurring bill across months. */
  seriesId: string;
  createdAt: number;
  syncedAt: number;
};

export type Settings = {
  appearance: 'system' | 'light' | 'dark';
  accent: string;
  /** ISO 4217, e.g. MYR. Defaults to the phone's region. */
  currency: string;
  /** 1 = Monday, 7 = Sunday, following ISO. */
  weekStart: 1 | 7;
  hour12: boolean;
  remind: boolean;
  /** Minutes before a task's time to send the reminder. */
  leadMinutes: number;
  /** Taps and buzzes on actions and celebrations. */
  haptics: boolean;
  lockEnabled: boolean;
  /** Which parts Face ID protects. */
  lockScope: 'app' | 'private';
  /** Morning nudge: opt-in, one notification a day at nudgeHour (0-23). */
  nudge: boolean;
  nudgeHour: number;
  /** What the small home screen widget shows. */
  widgetStyle: 'progress' | 'streak' | 'tasks';
  /** Today's calendar: the week strip, or the whole month. Remembers the last choice. */
  calendar: 'week' | 'month';
  /** The first four screens have been through. False only on a fresh install. */
  onboarded: boolean;
};
