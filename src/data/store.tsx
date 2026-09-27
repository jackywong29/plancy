/**
 * One store for the whole app.
 *
 * Rows are loaded from SQLite once at startup and held in memory; every change
 * writes straight through to the database, so nothing is ever only in RAM.
 * Same shape as the web planner's store, which keeps the iCloud sync work
 * ahead of us small.
 */
import { createContext, use, useCallback, useMemo, useState, type ReactNode } from 'react';

import { addDays, settingsDefaults, todayIso } from '@/lib/format';

import {
  eraseAll,
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
import { isAnytime, nextPosition } from './order';
import { missingBills, upcomingRepeats } from './repeats';
import { seedIfEmpty, seedSample } from './seed';
import type { Idea, JournalEntry, Mood, MoneyEntry, Repeat, Settings, Task } from './types';

migrate();
// Sample data in development only; a real install starts empty.
if (__DEV__) seedIfEmpty();

type Data = { tasks: Task[]; journal: JournalEntry[]; ideas: Idea[]; money: MoneyEntry[] };

type Store = Data & {
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  addTask: (input: { date: string; time: string; title: string; notes: string; remind: boolean; repeat: Repeat }) => void;
  /** Create the next instances of repeating tasks up to and including `through`. */
  ensureRepeats: (through: string) => void;
  /** Copy last month's recurring bills into `month` if they are not there yet. */
  ensureBills: (month: string) => void;
  toggleTask: (id: string) => void;
  /** Apply done states decided elsewhere (ticks made on the widget). */
  setTasksDone: (changes: { id: string; done: boolean }[]) => void;
  moveTask: (id: string, date: string) => void;
  editTask: (id: string, patch: Partial<Pick<Task, 'title' | 'notes' | 'time' | 'remind' | 'repeat'>>) => void;
  /** Save a new order for a day's anytime tasks: `ids` top to bottom. */
  reorderTasks: (ids: string[]) => void;
  deleteTask: (id: string) => void;
  restoreTask: (task: Task) => void;
  writeJournal: (date: string, patch: { body?: string; mood?: Mood }) => void;
  addIdea: (raw: string) => void;
  toggleStar: (id: string) => void;
  toggleIdeaDone: (id: string) => void;
  deleteIdea: (id: string) => void;
  restoreIdea: (idea: Idea) => void;
  toggleBillPaid: (id: string) => void;
  addMoney: (input: Omit<MoneyEntry, 'id' | 'seriesId' | 'createdAt' | 'syncedAt'>) => void;
  editMoney: (id: string, patch: Partial<MoneyEntry>) => void;
  deleteMoney: (id: string) => void;
  restoreMoney: (entry: MoneyEntry) => void;
  /** Test builds: erase every record, then optionally load the sample rows. */
  resetData: (withSample: boolean) => void;
};

const StoreContext = createContext<Store | null>(null);

/** Everything in SQLite, with the coming week of repeating tasks filled in. */
function loadFilled(): Data {
  const loaded = loadAll();
  // Keep the coming week filled in, so tomorrow's run already exists tonight.
  const today = todayIso();
  const created = upcomingRepeats(loaded.tasks, today, addDays(today, 7)).map((t) => ({ id: uid(), ...t }));
  for (const t of created) saveTask(t);
  return { ...loaded, tasks: [...loaded.tasks, ...created] };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data>(loadFilled);
  const [settings, setSettings] = useState<Settings>(() => readSettings(settingsDefaults()));

  const stamp = () => Date.now();

  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    writeSetting(key, value);
    setSettings((s) => ({ ...s, [key]: value }));
  }, []);

  const addTask: Store['addTask'] = useCallback((input) => {
    const id = uid();
    setData((d) => {
      // A new anytime task goes to the bottom of that day's anytime list.
      const position = isAnytime(input) ? nextPosition(d.tasks, input.date) : 0;
      const task: Task = { id, seriesId: id, ...input, position, done: false, createdAt: stamp(), syncedAt: stamp() };
      saveTask(task);
      const tasks = [...d.tasks, task];
      const today = todayIso();
      const created = upcomingRepeats(tasks, today, addDays(today, 7)).map((t) => ({ id: uid(), ...t }));
      for (const t of created) saveTask(t);
      return { ...d, tasks: [...tasks, ...created] };
    });
  }, []);

  const ensureRepeats = useCallback((through: string) => {
    setData((d) => {
      const created = upcomingRepeats(d.tasks, todayIso(), through).map((t) => ({ id: uid(), ...t }));
      if (created.length === 0) return d;
      for (const t of created) saveTask(t);
      return { ...d, tasks: [...d.tasks, ...created] };
    });
  }, []);

  const ensureBills = useCallback((month: string) => {
    setData((d) => {
      const created = missingBills(d.money, month).map((m) => ({ id: uid(), ...m }));
      if (created.length === 0) return d;
      for (const m of created) saveMoney(m);
      return { ...d, money: [...d.money, ...created] };
    });
  }, []);

  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        if (t.id !== id) return t;
        const next = { ...t, ...patch, syncedAt: stamp() };
        // Arriving in a day's anytime list — by losing its time or changing
        // day — a task joins the end of it rather than jumping to the top.
        const joined = isAnytime(next) && (!isAnytime(t) || next.date !== t.date);
        if (joined && patch.position === undefined) {
          next.position = nextPosition(d.tasks.filter((o) => o.id !== id), next.date);
        }
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

  const setTasksDone = useCallback((changes: { id: string; done: boolean }[]) => {
    const wanted = new Map(changes.map((c) => [c.id, c.done]));
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        const done = wanted.get(t.id);
        if (done === undefined || done === t.done) return t;
        const next = { ...t, done, syncedAt: stamp() };
        saveTask(next);
        return next;
      }),
    }));
  }, []);

  const reorderTasks = useCallback((ids: string[]) => {
    const at = new Map(ids.map((id, i) => [id, i]));
    setData((d) => ({
      ...d,
      tasks: d.tasks.map((t) => {
        const position = at.get(t.id);
        if (position === undefined || position === t.position) return t;
        const next = { ...t, position, syncedAt: stamp() };
        saveTask(next);
        return next;
      }),
    }));
  }, []);

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
      done: false,
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

  const toggleIdeaDone = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      ideas: d.ideas.map((i) => {
        if (i.id !== id) return i;
        const next = { ...i, done: !i.done, syncedAt: stamp() };
        saveIdea(next);
        return next;
      }),
    }));
  }, []);

  const deleteIdea = useCallback((id: string) => {
    removeRecord('ideas', id);
    setData((d) => ({ ...d, ideas: d.ideas.filter((i) => i.id !== id) }));
  }, []);

  const restoreIdea = useCallback((idea: Idea) => {
    forgetTombstone(idea.id);
    const next = { ...idea, syncedAt: stamp() };
    saveIdea(next);
    setData((d) => ({ ...d, ideas: [next, ...d.ideas.filter((i) => i.id !== idea.id)] }));
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
    const id = uid();
    const entry: MoneyEntry = { id, seriesId: id, ...input, createdAt: stamp(), syncedAt: stamp() };
    saveMoney(entry);
    setData((d) => ({ ...d, money: [...d.money, entry] }));
  }, []);

  const editMoney = useCallback((id: string, patch: Partial<MoneyEntry>) => {
    setData((d) => ({
      ...d,
      money: d.money.map((m) => {
        if (m.id !== id) return m;
        const next = { ...m, ...patch, syncedAt: stamp() };
        saveMoney(next);
        return next;
      }),
    }));
  }, []);

  const deleteMoney = useCallback((id: string) => {
    removeRecord('money', id);
    setData((d) => ({ ...d, money: d.money.filter((m) => m.id !== id) }));
  }, []);

  const restoreMoney = useCallback((entry: MoneyEntry) => {
    forgetTombstone(entry.id);
    const next = { ...entry, syncedAt: stamp() };
    saveMoney(next);
    setData((d) => ({ ...d, money: [...d.money.filter((m) => m.id !== entry.id), next] }));
  }, []);

  const resetData = useCallback((withSample: boolean) => {
    eraseAll();
    if (withSample) seedSample();
    setData(loadFilled());
  }, []);

  const value = useMemo<Store>(
    () => ({
      ...data,
      settings,
      setSetting,
      addTask,
      ensureRepeats,
      ensureBills,
      toggleTask,
      setTasksDone,
      moveTask: (id, date) => patchTask(id, { date }),
      editTask: (id, patch) => patchTask(id, patch),
      reorderTasks,
      deleteTask,
      restoreTask,
      writeJournal,
      addIdea,
      toggleStar,
      toggleIdeaDone,
      deleteIdea,
      restoreIdea,
      toggleBillPaid,
      addMoney,
      editMoney,
      deleteMoney,
      restoreMoney,
      resetData,
    }),
    [data, settings, setSetting, addTask, ensureRepeats, ensureBills, toggleTask, setTasksDone, patchTask, reorderTasks, deleteTask, restoreTask, writeJournal, addIdea, toggleStar, toggleIdeaDone, deleteIdea, restoreIdea, toggleBillPaid, addMoney, editMoney, deleteMoney, restoreMoney, resetData],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
