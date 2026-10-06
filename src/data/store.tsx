/**
 * One store for the whole app.
 *
 * Rows are loaded from SQLite once at startup and held in memory; every change
 * writes straight through to the database, so nothing is ever only in RAM.
 * Same shape as the web planner's store, which keeps the iCloud sync work
 * ahead of us small.
 */
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { addDays, settingsDefaults, todayIso } from '@/lib/format';

import { carryOver } from './carry';
import {
  eraseAll,
  forgetTombstone,
  loadAll,
  loadGone,
  migrate,
  readSettings,
  removeRecord,
  saveEntry,
  saveIdea,
  saveMoney,
  saveSeries,
  saveTask,
  uid,
  writeSetting,
} from './db';
import { isAnytime, nextPosition } from './order';
import { endSeries, missingBills, missingSeries, seriesFrom, splitSeries, upcomingRepeats, type TaskFields } from './repeats';
import { seedIfEmpty, seedSample } from './seed';
import type { Idea, JournalEntry, Mood, MoneyEntry, Repeat, Series, Settings, Task } from './types';

migrate();
// Sample data in development only; a real install starts empty.
if (__DEV__) seedIfEmpty();

type Data = { tasks: Task[]; series: Series[]; journal: JournalEntry[]; ideas: Idea[]; money: MoneyEntry[] };

/** Which copies of a repeating task an edit or delete reaches. */
export type Scope = 'this' | 'future';

type Store = Omit<Data, 'series'> & {
  /** Today's date, kept current: it turns over at midnight and when plancy comes back to the front. */
  today: string;
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
  /**
   * Change a task. For a copy of a repeating task, 'future' changes it and
   * every later copy; changing the repeat rule itself always does.
   */
  editTask: (id: string, patch: Partial<TaskFields>, scope?: Scope) => void;
  /** Save a new order for a day's anytime tasks: `ids` top to bottom. */
  reorderTasks: (ids: string[]) => void;
  /**
   * Delete a task — or, with 'future', a repeating task's copy and every later
   * one, ending the series. Returns what Undo calls.
   */
  deleteTask: (id: string, scope?: Scope) => () => void;
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

const yesterday = () => addDays(todayIso(), -1);

/** Settings as stored. Carry-over starts from yesterday the first time it runs. */
function loadSettings(): Settings {
  const settings = readSettings(settingsDefaults());
  if (settings.carryOver && !settings.carrySince) {
    settings.carrySince = yesterday();
    writeSetting('carrySince', settings.carrySince);
  }
  return settings;
}

/** The coming week of repeating tasks, filled in, so tomorrow's run already exists tonight. */
function fill(d: Data, gone: ReadonlySet<string>, today = todayIso()): Data {
  const created = upcomingRepeats(d.tasks, d.series, gone, today, addDays(today, 7));
  if (created.length === 0) return d;
  for (const t of created) saveTask(t);
  return { ...d, tasks: [...d.tasks, ...created] };
}

/** A new day: unfinished tasks move up to it (if carry-over is on), and the week is filled. */
function roll(d: Data, today: string, settings: Settings, gone: ReadonlySet<string>): Data {
  if (!settings.carryOver) return fill(d, gone, today);
  const moved = carryOver(d.tasks, today, settings.carrySince);
  if (moved.length === 0) return fill(d, gone, today);
  for (const t of moved) saveTask(t);
  const byId = new Map(moved.map((t) => [t.id, t]));
  return fill({ ...d, tasks: d.tasks.map((t) => byId.get(t.id) ?? t) }, gone, today);
}

/** Everything in SQLite, rolled up to today. */
function loadFilled(settings: Settings, gone: ReadonlySet<string>): Data {
  const loaded = loadAll();
  // Repeating tasks from before series existed get one now.
  const found = missingSeries(loaded.tasks, loaded.series);
  for (const s of found) saveSeries(s);
  return roll({ ...loaded, series: [...loaded.series, ...found] }, todayIso(), settings, gone);
}

/**
 * Where a task lands when an edit brings it into a day's anytime list (it
 * lost its time, or changed day): at the end, not the top. Undefined when it
 * stays where it is.
 */
function placed(tasks: Task[], before: Task, after: Task): number | undefined {
  return isAnytime(after) && (!isAnytime(before) || after.date !== before.date)
    ? nextPosition(tasks.filter((o) => o.id !== before.id), after.date)
    : undefined;
}

/** Records `change` asks to save and remove, swapped into `d`. */
function swap(d: Data, change: { tasks?: Task[]; series?: Series[]; remove?: string[] }): Data {
  const out = new Set([...(change.remove ?? []), ...(change.tasks ?? []).map((t) => t.id)]);
  const replaced = new Set((change.series ?? []).map((s) => s.id));
  return {
    ...d,
    tasks: [...d.tasks.filter((t) => !out.has(t.id)), ...(change.tasks ?? [])],
    series: [...d.series.filter((s) => !replaced.has(s.id)), ...(change.series ?? [])],
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  // Ids of deleted tasks, so a deleted copy of a repeating task stays deleted.
  const [gone] = useState(() => ({ current: loadGone('tasks') }));
  const [data, setData] = useState<Data>(() => loadFilled(settings, gone.current));
  const [today, setToday] = useState(todayIso);
  // For the few changes that must answer straight away (Undo needs to know
  // what a delete took), the data as last drawn.
  const latest = useRef({ data, settings });
  latest.current = { data, settings };

  const stamp = () => Date.now();

  // Midnight, or back from the background on a later day: a new today.
  useEffect(() => {
    const check = () => setToday(todayIso());
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    let timer: ReturnType<typeof setTimeout>;
    const arm = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => {
        check();
        arm();
      }, next.getTime() - now.getTime());
    };
    arm();
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, []);

  // A new day, or carry-over just switched on: move what's left, fill the week.
  useEffect(() => {
    setData((d) => roll(d, today, latest.current.settings, gone.current));
  }, [today, settings.carryOver, settings.carrySince]);

  const setSetting = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    writeSetting(key, value);
    // Switched on, carry-over moves yesterday's leftovers, not every
    // unfinished task from before it was off.
    const since: Partial<Settings> = {};
    if (key === 'carryOver' && value === true) {
      since.carrySince = yesterday();
      writeSetting('carrySince', since.carrySince);
    }
    setSettings((s) => ({ ...s, [key]: value, ...since }));
  }, []);

  const addTask: Store['addTask'] = useCallback((input) => {
    const id = uid();
    setData((d) => {
      // A new anytime task goes to the bottom of that day's anytime list.
      const position = isAnytime(input) ? nextPosition(d.tasks, input.date) : 0;
      const task: Task = { id, seriesId: id, ...input, position, done: false, carriedFrom: [], createdAt: stamp(), syncedAt: stamp() };
      saveTask(task);
      const series = task.repeat ? [seriesFrom(task)] : [];
      for (const s of series) saveSeries(s);
      return fill(swap(d, { tasks: [task], series }), gone.current);
    });
  }, []);

  const ensureRepeats = useCallback((through: string) => {
    setData((d) => {
      const created = upcomingRepeats(d.tasks, d.series, gone.current, todayIso(), through);
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
        const position = patch.position === undefined ? placed(d.tasks, t, next) : undefined;
        if (position !== undefined) next.position = position;
        saveTask(next);
        return next;
      }),
    }));
  }, []);

  const editTask: Store['editTask'] = useCallback(
    (id, patch, scope = 'this') => {
      const { data: d } = latest.current;
      const task = d.tasks.find((t) => t.id === id);
      if (!task) return;
      const ruleChanged = patch.repeat !== undefined && patch.repeat !== task.repeat;
      if (!ruleChanged && (scope === 'this' || !task.repeat)) {
        patchTask(id, patch);
        return;
      }
      const position = placed(d.tasks, task, { ...task, ...patch });
      const change = splitSeries(
        d.series.find((s) => s.id === task.seriesId),
        d.tasks,
        task,
        position === undefined ? patch : { ...patch, position },
        uid,
      );
      for (const s of change.series) saveSeries(s);
      for (const t of change.remove) {
        removeRecord('tasks', t.id);
        gone.current.add(t.id);
      }
      saveTask(change.task);
      setData((prev) =>
        fill(swap(prev, { tasks: [change.task], series: change.series, remove: change.remove.map((t) => t.id) }), gone.current),
      );
    },
    [patchTask],
  );

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

  /** Undo for a delete: the tasks come back, tombstones forgotten, and the series as it was. */
  const restore = useCallback((tasks: Task[], series: Series[]) => {
    const now = stamp();
    const back = tasks.map((t) => ({ ...t, syncedAt: now }));
    const was = series.map((s) => ({ ...s, syncedAt: now }));
    for (const t of back) {
      forgetTombstone(t.id);
      gone.current.delete(t.id);
      saveTask(t);
    }
    for (const s of was) saveSeries(s);
    setData((d) => swap(d, { tasks: back, series: was }));
  }, []);

  const deleteTask: Store['deleteTask'] = useCallback(
    (id, scope = 'this') => {
      const { data: d } = latest.current;
      const task = d.tasks.find((t) => t.id === id);
      if (!task) return () => undefined;
      const s = scope === 'future' ? d.series.find((x) => x.id === task.seriesId) : undefined;
      const { series, remove } = s ? endSeries(s, d.tasks, task) : { series: undefined, remove: [task] };
      if (series) saveSeries(series);
      for (const t of remove) {
        removeRecord('tasks', t.id);
        gone.current.add(t.id);
      }
      setData((prev) => swap(prev, { series: series ? [series] : [], remove: remove.map((t) => t.id) }));
      return () => restore(remove, s ? [s] : []);
    },
    [restore],
  );

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
    gone.current = loadGone('tasks');
    setData(loadFilled(latest.current.settings, gone.current));
  }, []);

  const value = useMemo<Store>(
    () => ({
      tasks: data.tasks,
      journal: data.journal,
      ideas: data.ideas,
      money: data.money,
      today,
      settings,
      setSetting,
      addTask,
      ensureRepeats,
      ensureBills,
      toggleTask,
      setTasksDone,
      editTask,
      reorderTasks,
      deleteTask,
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
    [data, today, settings, setSetting, addTask, ensureRepeats, ensureBills, toggleTask, setTasksDone, editTask, reorderTasks, deleteTask, writeJournal, addIdea, toggleStar, toggleIdeaDone, deleteIdea, restoreIdea, toggleBillPaid, addMoney, editMoney, deleteMoney, restoreMoney, resetData],
  );

  return <StoreContext value={value}>{children}</StoreContext>;
}

export function useStore(): Store {
  const store = use(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
