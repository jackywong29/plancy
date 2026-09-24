/**
 * Local database. Everything lives on the phone: no account, no server.
 *
 * The synchronous API is deliberate — the whole planner is a few hundred rows,
 * so it loads in one pass at startup and every screen reads from memory.
 * iCloud sync will sit on top of these same tables.
 */
import * as SQLite from 'expo-sqlite';

import type { Idea, JournalEntry, MoneyEntry, Settings, Task } from './types';

export const db = SQLite.openDatabaseSync('plancy.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  repeat TEXT NOT NULL DEFAULT '',
  seriesId TEXT NOT NULL DEFAULT '',
  done INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  syncedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_by_date ON tasks (date);

CREATE TABLE IF NOT EXISTS journal (
  id TEXT PRIMARY KEY NOT NULL,
  date TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL DEFAULT '',
  mood TEXT NOT NULL DEFAULT '',
  updatedAt INTEGER NOT NULL,
  syncedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ideas (
  id TEXT PRIMARY KEY NOT NULL,
  text TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '',
  starred INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  syncedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS money (
  id TEXT PRIMARY KEY NOT NULL,
  month TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  amountMinor INTEGER NOT NULL,
  dueDay INTEGER,
  paid INTEGER NOT NULL DEFAULT 0,
  repeatMonthly INTEGER NOT NULL DEFAULT 0,
  seriesId TEXT NOT NULL DEFAULT '',
  createdAt INTEGER NOT NULL,
  syncedAt INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS money_by_month ON money (month);

/* Deleted ids, so a device that was offline can't resurrect them later. */
CREATE TABLE IF NOT EXISTS tombstones (
  id TEXT PRIMARY KEY NOT NULL,
  kind TEXT NOT NULL,
  deletedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

export function migrate(): void {
  db.execSync('PRAGMA journal_mode = WAL;');
  db.execSync(SCHEMA);
  // Columns added after the first build. SQLite has no ADD COLUMN IF NOT EXISTS.
  for (const table of ['tasks', 'money']) {
    const cols = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`).map((c) => c.name);
    if (!cols.includes('seriesId')) db.execSync(`ALTER TABLE ${table} ADD COLUMN seriesId TEXT NOT NULL DEFAULT ''`);
  }
  const taskCols = db.getAllSync<{ name: string }>('PRAGMA table_info(tasks)').map((c) => c.name);
  if (!taskCols.includes('notes')) db.execSync("ALTER TABLE tasks ADD COLUMN notes TEXT NOT NULL DEFAULT ''");
  if (!taskCols.includes('position')) db.execSync('ALTER TABLE tasks ADD COLUMN position INTEGER NOT NULL DEFAULT 0');
  const ideaCols = db.getAllSync<{ name: string }>('PRAGMA table_info(ideas)').map((c) => c.name);
  if (!ideaCols.includes('done')) db.execSync('ALTER TABLE ideas ADD COLUMN done INTEGER NOT NULL DEFAULT 0');
  // Rows from before series existed: repeating tasks that look alike become one
  // series, otherwise each of them would spawn its own copies.
  db.execSync(`
    UPDATE tasks SET seriesId = (
      SELECT MIN(o.id) FROM tasks o WHERE o.title = tasks.title AND o.time = tasks.time AND o.repeat = tasks.repeat
    ) WHERE seriesId = '' AND repeat != '';
    UPDATE tasks SET seriesId = id WHERE seriesId = '';
    UPDATE money SET seriesId = (
      SELECT MIN(o.id) FROM money o WHERE o.label = money.label AND o.kind = money.kind
    ) WHERE seriesId = '' AND repeatMonthly = 1;
    UPDATE money SET seriesId = id WHERE seriesId = '';
  `);
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/* ---------- reads ---------- */

type Row = Record<string, string | number | null>;

const asTask = (r: Row): Task => ({
  id: String(r.id),
  date: String(r.date),
  time: String(r.time),
  title: String(r.title),
  notes: String(r.notes ?? ''),
  position: Number(r.position ?? 0),
  repeat: String(r.repeat) as Task['repeat'],
  seriesId: String(r.seriesId ?? '') || String(r.id),
  done: Number(r.done) === 1,
  createdAt: Number(r.createdAt),
  syncedAt: Number(r.syncedAt),
});

const asEntry = (r: Row): JournalEntry => ({
  id: String(r.id),
  date: String(r.date),
  body: String(r.body),
  mood: String(r.mood) as JournalEntry['mood'],
  updatedAt: Number(r.updatedAt),
  syncedAt: Number(r.syncedAt),
});

const asIdea = (r: Row): Idea => ({
  id: String(r.id),
  text: String(r.text),
  tag: String(r.tag),
  starred: Number(r.starred) === 1,
  done: Number(r.done) === 1,
  createdAt: Number(r.createdAt),
  syncedAt: Number(r.syncedAt),
});

const asMoney = (r: Row): MoneyEntry => ({
  id: String(r.id),
  month: String(r.month),
  kind: String(r.kind) as MoneyEntry['kind'],
  label: String(r.label),
  amountMinor: Number(r.amountMinor),
  dueDay: r.dueDay === null ? null : Number(r.dueDay),
  paid: Number(r.paid) === 1,
  repeatMonthly: Number(r.repeatMonthly) === 1,
  seriesId: String(r.seriesId ?? '') || String(r.id),
  createdAt: Number(r.createdAt),
  syncedAt: Number(r.syncedAt),
});

export function loadAll() {
  return {
    tasks: db.getAllSync<Row>('SELECT * FROM tasks ORDER BY date, time').map(asTask),
    journal: db.getAllSync<Row>('SELECT * FROM journal ORDER BY date DESC').map(asEntry),
    ideas: db.getAllSync<Row>('SELECT * FROM ideas ORDER BY createdAt DESC').map(asIdea),
    money: db.getAllSync<Row>('SELECT * FROM money ORDER BY createdAt').map(asMoney),
  };
}

/* ---------- writes ---------- */

export function saveTask(t: Task): void {
  db.runSync(
    `INSERT INTO tasks (id, date, time, title, notes, position, repeat, seriesId, done, createdAt, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       date = excluded.date, time = excluded.time, title = excluded.title, notes = excluded.notes,
       position = excluded.position, repeat = excluded.repeat, seriesId = excluded.seriesId,
       done = excluded.done, syncedAt = excluded.syncedAt`,
    [t.id, t.date, t.time, t.title, t.notes, t.position, t.repeat, t.seriesId, t.done ? 1 : 0, t.createdAt, t.syncedAt],
  );
}

export function saveEntry(e: JournalEntry): void {
  db.runSync(
    `INSERT INTO journal (id, date, body, mood, updatedAt, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       body = excluded.body, mood = excluded.mood,
       updatedAt = excluded.updatedAt, syncedAt = excluded.syncedAt`,
    [e.id, e.date, e.body, e.mood, e.updatedAt, e.syncedAt],
  );
}

export function saveIdea(i: Idea): void {
  db.runSync(
    `INSERT INTO ideas (id, text, tag, starred, done, createdAt, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       text = excluded.text, tag = excluded.tag, starred = excluded.starred,
       done = excluded.done, syncedAt = excluded.syncedAt`,
    [i.id, i.text, i.tag, i.starred ? 1 : 0, i.done ? 1 : 0, i.createdAt, i.syncedAt],
  );
}

export function saveMoney(m: MoneyEntry): void {
  db.runSync(
    `INSERT INTO money (id, month, kind, label, amountMinor, dueDay, paid, repeatMonthly, seriesId, createdAt, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       month = excluded.month, kind = excluded.kind, label = excluded.label,
       amountMinor = excluded.amountMinor, dueDay = excluded.dueDay, paid = excluded.paid,
       repeatMonthly = excluded.repeatMonthly, seriesId = excluded.seriesId, syncedAt = excluded.syncedAt`,
    [m.id, m.month, m.kind, m.label, m.amountMinor, m.dueDay, m.paid ? 1 : 0, m.repeatMonthly ? 1 : 0, m.seriesId, m.createdAt, m.syncedAt],
  );
}

export function removeRecord(kind: 'tasks' | 'journal' | 'ideas' | 'money', id: string): void {
  db.runSync(`DELETE FROM ${kind} WHERE id = ?`, [id]);
  db.runSync('INSERT OR REPLACE INTO tombstones (id, kind, deletedAt) VALUES (?, ?, ?)', [id, kind, Date.now()]);
}

/** Undo: bring a record back and drop the tombstone that would out-vote it in a sync merge. */
export function forgetTombstone(id: string): void {
  db.runSync('DELETE FROM tombstones WHERE id = ?', [id]);
}

/**
 * Deletes every task, journal entry, idea and finance entry, each with its
 * tombstone like any other delete. Settings stay. Test builds only.
 */
export function eraseAll(): void {
  db.withTransactionSync(() => {
    for (const kind of ['tasks', 'journal', 'ideas', 'money'] as const) {
      for (const { id } of db.getAllSync<{ id: string }>(`SELECT id FROM ${kind}`)) removeRecord(kind, id);
    }
  });
}

/* ---------- settings ---------- */

export function readSettings(fallback: Settings): Settings {
  const rows = db.getAllSync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out = { ...fallback };
  for (const key of Object.keys(fallback) as (keyof Settings)[]) {
    const raw = stored[key];
    if (raw === undefined) continue;
    try {
      (out[key] as unknown) = JSON.parse(raw);
    } catch {
      // A value written by an older build stays at its default rather than
      // taking the whole settings object down with it.
    }
  }
  return out;
}

export function writeSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, JSON.stringify(value)]);
}
