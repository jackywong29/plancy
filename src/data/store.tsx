/**
 * One store for the whole app.
 *
 * Rows are loaded from SQLite once at startup and held in memory; every change
 * writes straight through to the database, so nothing is ever only in RAM.
 * Same shape as the web planner's store, which keeps the iCloud sync work
 * ahead of us small.
 */
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import { settingsDefaults } from '@/lib/format';

import {
  forgetTombstone,
  loadAll,
  migrate,
  readSettings,
  removeRecord,
  saveEntry,
  saveIdea,
  saveMoney,
  saveTask,
  uid,
  writeSetting,
} from './db';
import { seedIfEmpty } from './seed';
import type { Idea, JournalEntry, Mood, MoneyEntry, Repeat, Settings, Task } from './types';

migrate();
// Sample data in development only; a real install starts empty.
if (__DEV__) seedIfEmpty();

type Data = { tasks: Task[]; journal: JournalEntry[]; ideas: Idea[]; money: MoneyEntry[] };

type Store = Data & {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  addTask: (input: { date: string; time: string; title: string; repeat: Repeat }) => void;
  toggleTask: (id: string) => void;
  moveTask: (id: string, date: string) => void;
  editTask: (id: string, patch: Partial<Pick<Task, 'title' | 'time' | 'repeat'>>) => void;
  deleteTask: (id: string) => void;
  restoreTask: (task: Task) => void;
  writeJournal: (date: string, patch: { body?: string; mood?: Mood }) => void;
  addIdea: (raw: string) => void;
  toggleStar: (id: string) => void;
  deleteIdea: (id: string) => void;
  toggleBillPaid: (id: string) => void;
  addMoney: (input: Omit<MoneyEntry, 'id' | 'createdAt' | 'syncedAt'>) => void;
  deleteMoney: (id: string) => void;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(() => loadAll());
  const [settings, setSettings] = useState<Settings>(() => readSettings(settingsDefaults()));

  const stamp = () => Date.now();

  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    writeSetting(key, value);
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const addTask: Store['addTask'] = useCallback((input) => {
    const task: Task = { id: uid(), ...input, done: false, createdAt: stamp(), syncedAt: stamp() };
    saveTask(task);
    setData((d) => ({ ...d, tasks: [...d.tasks, task] }));
  }, []);

  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch, syncedAt: stamp() };
        saveTask(next);
        return next;
      }),
    }));
  }, []);

  const toggleTask = useCallback(
    (id: string) => setData((d) => {
      const task = d.tasks.find((t) => t.id === id);
      if (!task) return d;
      const next = { ...task, done: !task.done, syncedAt: stamp() };
      saveTask(next);
      return { ...d, tasks: d.tasks.map((t) => (t.id === id ? next : t)) };
    }),
    [],
  );

  const deleteTask = useCallback((id: string) => {
    removeRecord('tasks', id);
    setData((d) => ({ ...d, tasks: d.tasks.filter((t) => t.id !== id) }));
  }, []);

  const restoreTask = useCallback((task: Task) => {
    forgetTombstone(task.id);
    const next = { ...task, syncedAt: stamp() };
    saveTask(next);
    setData((d) => ({ ...d, tasks: [...d.tasks.filter((t) => t.id !== task.id), next] }));
  }, []);

  const writeJournal: Store['writeJournal'] = useCallback((date, patch) => {
    setData((d) => {
      const existing = d.journal.find((e) => e.date === date);
      const next: JournalEntry = existing
        ? { ...existing, ...patch, updatedAt: stamp(), syncedAt: stamp() }
        : { id: uid(), date, body: '', mood: '', ...patch, updatedAt: stamp(), syncedAt: stamp() };
      // An entry with neither text nor mood is not worth keeping.
      if (!next.body.trim() && !next.mood) {
        if (existing) removeRecord('journal', existing.id);
        return { ...d, journal: d.journal.filter((e) => e.date !== date) };
      }
      saveEntry(next);
      const rest = d.journal.filter((e) => e.date !== date);
      return { ...d, journal: [next, ...rest].sort((a, b) => b.date.localeCompare(a.date)) };
    });
  }, []);

  const addIdea = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return;
    // A #tag typed inside the idea becomes its bucket, so there's no second field.
    const tag = text.match(/#([\p{L}\d-]+)/u)?.[1]?.toLowerCase() ?? '';
    const idea: Idea = {
      id: uid(),
      text: tag ? text.replace(/#[\p{L}\d-]+/u, '').replace(/\s{2,}/g, ' ').trim() || text : text,
      tag,
      starred: false,
      createdAt: stamp(),
      syncedAt: stamp(),
    };
    saveIdea(idea);
    setData((d) => ({ ...d, ideas: [idea, ...d.ideas] }));
  }, []);

  const toggleStar = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      ideas: d.ideas.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, starred: !i.starred, syncedAt: stamp() };
        saveIdea(next);
        return next;
      }),
    }));
  }, []);

  const deleteIdea = useCallback((id: string) => {
    removeRecord('ideas', id);
    setData((d) => ({ ...d, ideas: d.ideas.filter((i) => i.id !== id) }));
  }, []);

  const toggleBillPaid = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      money: d.money.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, paid: !m.paid, syncedAt: stamp() };
        saveMoney(next);
        return next;
      }),
    }));
  }, []);

  const addMoney: Store['addMoney'] = useCallback((input) => {
    const entry: MoneyEntry = { id: uid(), ...input, createdAt: stamp(), syncedAt: stamp() };
    saveMoney(entry);
    setData((d) => ({ ...d, money: [...d.money, entry] }));
  }, []);

  const deleteMoney = useCallback((id: string) => {
    removeRecord('money', id);
    setData((d) => ({ ...d, money: d.money.filter((m) => m.id !== id) }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...data,
      settings,
      setSetting,
      addTask,
      toggleTask,
      moveTask: (id, date) => patchTask(id, { date }),
      editTask: (id, patch) => patchTask(id, patch),
      deleteTask,
      restoreTask,
      writeJournal,
      addIdea,
      toggleStar,
      deleteIdea,
      toggleBillPaid,
      addMoney,
      deleteMoney,
    }),
    [data, settings, setSetting, addTask, toggleTask, patchTask, deleteTask, restoreTask, writeJournal, addIdea, toggleStar, deleteIdea, toggleBillPaid, addMoney, deleteMoney],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

/* ---------- selectors ---------- */

export function tasksForDay(tasks: Task[], date: string): Task[] {
  return tasks
    .filter((t) => t.date === date)
    .sort((a, b) => (a.time === b.time ? a.createdAt - b.createdAt : a.time.localeCompare(b.time)));
}

export function countsByDate(tasks: Task[]): Map<string, { total: number; done: number }> {
  const map = new Map<string, { total: number; done: number }>();
  for (const t of tasks) {
    const entry = map.get(t.date) ?? { total: 0, done: 0 };
    entry.total += 1;
    if (t.done) entry.done += 1;
    map.set(t.date, entry);
  }
  return map;
}

/** Days in a row, ending today, where everything planned was done. */
export function streak(tasks: Task[], today: string): number {
  const counts = countsByDate(tasks);
  let day = today;
  let days = 0;
  // Today only counts once it is actually finished; an unfinished today must
  // not wipe out a streak that is still alive.
  const todayCount = counts.get(today);
  if (!todayCount || todayCount.done < todayCount.total) day = addDay(today, -1);
  for (;;) {
    const count = counts.get(day);
    if (!count || count.total === 0 || count.done < count.total) break;
    days += 1;
    day = addDay(day, -1);
  }
  return days;
}

function addDay(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d + delta);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function moneyForMonth(money: MoneyEntry[], month: string): MoneyEntry[] {
  return money.filter((m) => m.month === month);
}

export function monthTotals(entries: MoneyEntry[]) {
  const sum = (kind: MoneyEntry['kind']) =>
    entries.filter((e) => e.kind === kind).reduce((acc, e) => acc + e.amountMinor, 0);
  const income = sum('income');
  const saving = sum('saving');
  const spending = sum('spending');
  const bills = sum('bill');
  return { income, saving, spending, bills, spent: spending + bills, left: income - saving - spending - bills };
}
