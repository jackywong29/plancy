/**
 * One store for the whole app.
 *
 * Rows are loaded from SQLite once at startup and held in memory; every change
 * writes straight through to the database, so nothing is ever only in RAM.
 * Same shape as the web planner's store, which keeps the iCloud sync work
 * ahead of us small.
 *
 * Every change follows one pattern: read the data as last committed
 * (`live.current`), work out the change, write it to SQLite (several rows in
 * one `batch`), then `commit` the result. State updaters stay pure, so React
 * running one twice can't write twice.
 *
 * Actions and each slice of data have their own context, so a component that
 * reads only ideas (`useSlice('ideas')`) or only actions (`useStoreActions()`)
 * doesn't re-render for a journal keystroke. `useStore()` still hands over
 * everything.
 */
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type Context, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { addDays, settingsDefaults, todayIso } from '@/lib/format';

import { carryOver } from './carry';
import {
  batch,
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
import { emptied, endSeries, missingBills, missingSeries, seriesFrom, splitSeries, upcomingRepeats, type TaskFields } from './repeats';
import { seedIfEmpty, seedSample } from './seed';
import type { Idea, JournalEntry, Mood, MoneyEntry, Repeat, Series, Settings, Task } from './types';

migrate();
// Sample data in development only; a real install starts empty.
if (__DEV__) seedIfEmpty();

type Data = { tasks: Task[]; series: Series[]; journal: JournalEntry[]; ideas: Idea[]; money: MoneyEntry[] };

/** Which copies of a repeating task an edit or delete reaches. */
export type Scope = 'this' | 'future';

/** The data a screen can read, each slice with its own context. */
type Slices = Omit<Data, 'series'> & {
  /** Today's date, kept current: it turns over at midnight and when plancy comes back to the front. */
  today: string;
  settings: Settings;
};

/** Everything that changes the data. Stable: the same functions for the life of the store. */
type Actions = {
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

type Store = Slices & Actions;

const ActionsContext = createContext<Actions | null>(null);
const SliceContexts: { [K in keyof Slices]: Context<Slices[K] | null> } = {
  tasks: createContext<Task[] | null>(null),
  journal: createContext<JournalEntry[] | null>(null),
  ideas: createContext<Idea[] | null>(null),
  money: createContext<MoneyEntry[] | null>(null),
  today: createContext<string | null>(null),
  settings: createContext<Settings | null>(null),
};

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
  batch(() => {
    for (const t of created) saveTask(t);
  });
  return { ...d, tasks: [...d.tasks, ...created] };
}

/** A new day: unfinished tasks move up to it (if carry-over is on), and the week is filled. */
function roll(d: Data, today: string, settings: Settings, gone: ReadonlySet<string>): Data {
  if (!settings.carryOver) return fill(d, gone, today);
  const moved = carryOver(d.tasks, today, settings.carrySince);
  if (moved.length === 0) return fill(d, gone, today);
  return batch(() => {
    for (const t of moved) saveTask(t);
    const byId = new Map(moved.map((t) => [t.id, t]));
    return fill({ ...d, tasks: d.tasks.map((t) => byId.get(t.id) ?? t) }, gone, today);
  });
}

/** Everything in SQLite, rolled up to today. */
function loadFilled(settings: Settings, gone: ReadonlySet<string>): Data {
  const loaded = loadAll();
  // Repeating tasks from before series existed get one now.
  const found = missingSeries(loaded.tasks, loaded.series);
  return batch(() => {
    for (const s of found) saveSeries(s);
    return roll({ ...loaded, series: [...loaded.series, ...found] }, todayIso(), settings, gone);
  });
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
  // The data as last committed, which every action starts from: two changes
  // in one tick see each other, before React has drawn either.
  const live = useRef(data);
  const latestSettings = useRef(settings);
  latestSettings.current = settings;

  /** Hands a change, already written to SQLite, to React. */
  const commit = useCallback((next: Data) => {
    if (next === live.current) return;
    live.current = next;
    setData(next);
  }, []);

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
    commit(roll(live.current, today, latestSettings.current, gone.current));
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

  /** Saves, in one transaction, every task `change` hands back changed. */
  const changeTasks = useCallback((change: (t: Task) => Task) => {
    const d = live.current;
    const changed: Task[] = [];
    const tasks = d.tasks.map((t) => {
      const next = change(t);
      if (next !== t) changed.push(next);
      return next;
    });
    if (changed.length === 0) return;
    batch(() => {
      for (const t of changed) saveTask(t);
    });
    commit({ ...d, tasks });
  }, []);

  const addTask: Actions['addTask'] = useCallback((input) => {
    const d = live.current;
    const id = uid();
    const now = Date.now();
    // A new anytime task goes to the bottom of that day's anytime list.
    const position = isAnytime(input) ? nextPosition(d.tasks, input.date) : 0;
    const task: Task = { id, seriesId: id, ...input, position, done: false, carriedFrom: [], createdAt: now, syncedAt: now };
    const series = task.repeat ? [seriesFrom(task, now)] : [];
    commit(
      batch(() => {
        saveTask(task);
        for (const s of series) saveSeries(s);
        return fill(swap(d, { tasks: [task], series }), gone.current);
      }),
    );
  }, []);

  const ensureRepeats = useCallback((through: string) => {
    const d = live.current;
    const created = upcomingRepeats(d.tasks, d.series, gone.current, todayIso(), through);
    if (created.length === 0) return;
    batch(() => {
      for (const t of created) saveTask(t);
    });
    commit({ ...d, tasks: [...d.tasks, ...created] });
  }, []);

  const ensureBills = useCallback((month: string) => {
    const d = live.current;
    const created = missingBills(d.money, month).map((m) => ({ id: uid(), ...m }));
    if (created.length === 0) return;
    batch(() => {
      for (const m of created) saveMoney(m);
    });
    commit({ ...d, money: [...d.money, ...created] });
  }, []);

  const patchTask = useCallback((id: string, patch: Partial<Task>) => {
    const { tasks } = live.current;
    const now = Date.now();
    changeTasks((t) => {
      if (t.id !== id) return t;
      const next = { ...t, ...patch, syncedAt: now };
      const position = patch.position === undefined ? placed(tasks, t, next) : undefined;
      if (position !== undefined) next.position = position;
      return next;
    });
  }, []);

  const editTask: Actions['editTask'] = useCallback(
    (id, patch, scope = 'this') => {
      const d = live.current;
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
      commit(
        batch(() => {
          for (const s of change.series) saveSeries(s);
          for (const t of change.remove) {
            removeRecord('tasks', t.id);
            gone.current.add(t.id);
          }
          saveTask(change.task);
          return fill(swap(d, { tasks: [change.task], series: change.series, remove: change.remove.map((t) => t.id) }), gone.current);
        }),
      );
    },
    [patchTask],
  );

  const toggleTask = useCallback((id: string) => {
    const now = Date.now();
    changeTasks((t) => (t.id === id ? { ...t, done: !t.done, syncedAt: now } : t));
  }, []);

  const setTasksDone = useCallback((changes: { id: string; done: boolean }[]) => {
    const wanted = new Map(changes.map((c) => [c.id, c.done]));
    const now = Date.now();
    changeTasks((t) => {
      const done = wanted.get(t.id);
      return done === undefined || done === t.done ? t : { ...t, done, syncedAt: now };
    });
  }, []);

  const reorderTasks = useCallback((ids: string[]) => {
    const at = new Map(ids.map((id, i) => [id, i]));
    const now = Date.now();
    // Only rows whose place changed are saved.
    changeTasks((t) => {
      const position = at.get(t.id);
      return position === undefined || position === t.position ? t : { ...t, position, syncedAt: now };
    });
  }, []);

  /** Undo for a delete: the tasks come back, tombstones forgotten, and the series as it was. */
  const restore = useCallback((tasks: Task[], series: Series[]) => {
    const now = Date.now();
    const back = tasks.map((t) => ({ ...t, syncedAt: now }));
    const was = series.map((s) => ({ ...s, syncedAt: now }));
    batch(() => {
      for (const t of back) {
        forgetTombstone(t.id);
        gone.current.delete(t.id);
        saveTask(t);
      }
      for (const s of was) saveSeries(s);
    });
    commit(swap(live.current, { tasks: back, series: was }));
  }, []);

  const deleteTask: Actions['deleteTask'] = useCallback(
    (id, scope = 'this') => {
      const d = live.current;
      const task = d.tasks.find((t) => t.id === id);
      if (!task) return () => undefined;
      const s = d.series.find((x) => x.id === task.seriesId);
      // 'future' ends the series; deleting the last copy of one already
      // ended blanks its words. Either way the record stays.
      const { series, remove } =
        scope === 'future' && s
          ? endSeries(s, d.tasks, task)
          : { series: s && emptied(s, d.tasks.filter((t) => t.id !== id)), remove: [task] };
      batch(() => {
        if (series) saveSeries(series);
        for (const t of remove) {
          removeRecord('tasks', t.id);
          gone.current.add(t.id);
        }
      });
      commit(swap(d, { series: series ? [series] : [], remove: remove.map((t) => t.id) }));
      return () => restore(remove, series && s ? [s] : []);
    },
    [restore],
  );

  const writeJournal: Actions['writeJournal'] = useCallback((date, patch) => {
    const d = live.current;
    const existing = d.journal.find((e) => e.date === date);
    const now = Date.now();
    const next: JournalEntry = existing
      ? { ...existing, ...patch, updatedAt: now, syncedAt: now }
      : { id: uid(), date, body: '', mood: '', ...patch, updatedAt: now, syncedAt: now };
    const rest = d.journal.filter((e) => e.date !== date);
    // An entry with neither text nor mood is not worth keeping.
    if (!next.body.trim() && !next.mood) {
      if (!existing) return;
      removeRecord('journal', existing.id);
      commit({ ...d, journal: rest });
      return;
    }
    saveEntry(next);
    commit({ ...d, journal: [next, ...rest].sort((a, b) => b.date.localeCompare(a.date)) });
  }, []);

  const addIdea = useCallback((raw: string) => {
    const text = raw.trim();
    if (!text) return;
    // A #tag typed inside the idea becomes its bucket, so there's no second field.
    const tag = text.match(/#([\p{L}\d-]+)/u)?.[1]?.toLowerCase() ?? '';
    const now = Date.now();
    const idea: Idea = {
      id: uid(),
      text: tag ? text.replace(/#[\p{L}\d-]+/u, '').replace(/\s{2,}/g, ' ').trim() || text : text,
      tag,
      starred: false,
      done: false,
      createdAt: now,
      syncedAt: now,
    };
    saveIdea(idea);
    const d = live.current;
    commit({ ...d, ideas: [idea, ...d.ideas] });
  }, []);

  /** Saves the idea `id`, changed by `change`. */
  const changeIdea = useCallback((id: string, change: (i: Idea) => Partial<Idea>) => {
    const d = live.current;
    const idea = d.ideas.find((i) => i.id === id);
    if (!idea) return;
    const next = { ...idea, ...change(idea), syncedAt: Date.now() };
    saveIdea(next);
    commit({ ...d, ideas: d.ideas.map((i) => (i.id === id ? next : i)) });
  }, []);

  const toggleStar = useCallback((id: string) => changeIdea(id, (i) => ({ starred: !i.starred })), []);

  const toggleIdeaDone = useCallback((id: string) => changeIdea(id, (i) => ({ done: !i.done })), []);

  const deleteIdea = useCallback((id: string) => {
    removeRecord('ideas', id);
    const d = live.current;
    commit({ ...d, ideas: d.ideas.filter((i) => i.id !== id) });
  }, []);

  const restoreIdea = useCallback((idea: Idea) => {
    const next = { ...idea, syncedAt: Date.now() };
    batch(() => {
      forgetTombstone(idea.id);
      saveIdea(next);
    });
    const d = live.current;
    commit({ ...d, ideas: [next, ...d.ideas.filter((i) => i.id !== idea.id)] });
  }, []);

  /** Saves the finance entry `id`, changed by `change`. */
  const changeMoney = useCallback((id: string, change: (m: MoneyEntry) => Partial<MoneyEntry>) => {
    const d = live.current;
    const entry = d.money.find((m) => m.id === id);
    if (!entry) return;
    const next = { ...entry, ...change(entry), syncedAt: Date.now() };
    saveMoney(next);
    commit({ ...d, money: d.money.map((m) => (m.id === id ? next : m)) });
  }, []);

  const toggleBillPaid = useCallback((id: string) => changeMoney(id, (m) => ({ paid: !m.paid })), []);

  const addMoney: Actions['addMoney'] = useCallback((input) => {
    const id = uid();
    const now = Date.now();
    const entry: MoneyEntry = { id, seriesId: id, ...input, createdAt: now, syncedAt: now };
    saveMoney(entry);
    const d = live.current;
    commit({ ...d, money: [...d.money, entry] });
  }, []);

  const editMoney = useCallback((id: string, patch: Partial<MoneyEntry>) => changeMoney(id, () => patch), []);

  const deleteMoney = useCallback((id: string) => {
    removeRecord('money', id);
    const d = live.current;
    commit({ ...d, money: d.money.filter((m) => m.id !== id) });
  }, []);

  const restoreMoney = useCallback((entry: MoneyEntry) => {
    const next = { ...entry, syncedAt: Date.now() };
    batch(() => {
      forgetTombstone(entry.id);
      saveMoney(next);
    });
    const d = live.current;
    commit({ ...d, money: [...d.money.filter((m) => m.id !== entry.id), next] });
  }, []);

  const resetData = useCallback((withSample: boolean) => {
    eraseAll();
    if (withSample) batch(seedSample);
    gone.current = loadGone('tasks');
    commit(loadFilled(latestSettings.current, gone.current));
  }, []);

  const actions = useMemo<Actions>(
    () => ({
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
    [setSetting, addTask, ensureRepeats, ensureBills, toggleTask, setTasksDone, editTask, reorderTasks, deleteTask, writeJournal, addIdea, toggleStar, toggleIdeaDone, deleteIdea, restoreIdea, toggleBillPaid, addMoney, editMoney, deleteMoney, restoreMoney, resetData],
  );

  return (
    <ActionsContext value={actions}>
      <SliceContexts.settings value={settings}>
        <SliceContexts.today value={today}>
          <SliceContexts.tasks value={data.tasks}>
            <SliceContexts.journal value={data.journal}>
              <SliceContexts.ideas value={data.ideas}>
                <SliceContexts.money value={data.money}>{children}</SliceContexts.money>
              </SliceContexts.ideas>
            </SliceContexts.journal>
          </SliceContexts.tasks>
        </SliceContexts.today>
      </SliceContexts.settings>
    </ActionsContext>
  );
}

/** The store's actions alone; a component reading only these never re-renders for a data change. */
export function useStoreActions(): Actions {
  const actions = use(ActionsContext);
  if (!actions) throw new Error('useStoreActions must be used inside StoreProvider');
  return actions;
}

/** One slice of the data; the component re-renders only when that slice changes. */
export function useSlice<K extends keyof Slices>(key: K): Slices[K] {
  const slice = use(SliceContexts[key]);
  if (slice === null) throw new Error('useSlice must be used inside StoreProvider');
  return slice;
}

/** Everything: all the data and all the actions. Re-renders on any change. */
export function useStore(): Store {
  const actions = useStoreActions();
  const tasks = useSlice('tasks');
  const journal = useSlice('journal');
  const ideas = useSlice('ideas');
  const money = useSlice('money');
  const today = useSlice('today');
  const settings = useSlice('settings');
  return useMemo(
    () => ({ ...actions, tasks, journal, ideas, money, today, settings }),
    [actions, tasks, journal, ideas, money, today, settings],
  );
}
