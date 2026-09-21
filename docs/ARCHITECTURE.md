# plancy. — Technical Architecture

**Version 1.0 · 18 Sep 2026 · Reverse-engineered from the shipped code**

---

## 1. Shape of the thing

plancy is a **local-first, single-user, zero-backend** iOS app. Every byte the
user creates lives in one SQLite file on their phone. There is no server, no
account, no network call in the entire codebase. That is the central
architectural decision and everything else follows from it.

```
┌──────────────────────────────────────────────────────────┐
│  SwiftUI-rendered native chrome (tab bar, headers,       │
│  time wheel, alerts, Liquid Glass) — drawn by iOS        │
└────────────────────────┬─────────────────────────────────┘
                         │
┌────────────────────────▼─────────────────────────────────┐
│  React Native 0.86 / React 19 views  (src/app, src/components)
│  Expo Router native tabs · Reanimated 4 · Expo UI         │
└────────────────────────┬─────────────────────────────────┘
                         │  useStore()
┌────────────────────────▼─────────────────────────────────┐
│  Store (src/data/store.tsx)                               │
│  Whole dataset in memory · selectors · write-through      │
└────────────────────────┬─────────────────────────────────┘
                         │  synchronous calls
┌────────────────────────▼─────────────────────────────────┐
│  SQLite (src/data/db.ts) — expo-sqlite, WAL               │
│  tasks · journal · ideas · money · tombstones · settings  │
└────────────────────────┬─────────────────────────────────┘
                         │  (v1.1)
┌────────────────────────▼─────────────────────────────────┐
│  CloudKit private database via CKSyncEngine — NOT BUILT   │
└──────────────────────────────────────────────────────────┘

Side channels:
  • App group plist  ──► widgets/TodayWidget.tsx (home screen)
  • UNUserNotificationCenter ──► reminders + morning nudge
  • Core Haptics via modules/plancy-haptics (local Swift module)
```

---

## 2. Stack, and why

| Layer | Choice | Why this and not the alternative |
|---|---|---|
| Framework | **Expo SDK 57 / React Native 0.86** | Jacky's web planner is React. Rewriting the domain logic in Swift would have thrown away working, tested date and money code for no user-visible gain. |
| Language | **TypeScript 6, strict** | `npx tsc --noEmit` is the quality gate. It is currently clean and must stay clean. |
| Routing | **Expo Router, native tabs** | Real `UITabBarController`, so iOS 26 draws Liquid Glass and the tab bar behaves like a system one. A JS tab bar would not. |
| Storage | **expo-sqlite, synchronous API** | The whole planner is a few hundred rows. It loads in one pass at startup; every screen then reads from memory with zero async. No loading spinners anywhere in the app. |
| State | **One React context + `useState`** | No Redux, no Zustand, no query cache. There is one writer and one dataset. Anything heavier would be ceremony. |
| Animation | **Reanimated 4** | Runs on the UI thread; layout animations honour Reduce Motion by default. |
| Native bits | **Expo UI (`@expo/ui/swift-ui`)** | The date/time wheel and the widget are genuine SwiftUI. |
| Haptics | **Local Swift module, Core Haptics** | `expo-haptics` builds window-less `UIFeedbackGenerator`s, which are **silent** in an iOS 27 scene-lifecycle app. Confirmed on hardware 18 Sep. Never go back to it. |

### Dependencies that should be removed before release

`react-native-web`, `react-dom`, the `android` and `web` npm scripts, and the
`web` block in `app.json` are all dead weight in an iOS-only app. `expo-haptics`
remains imported in `src/lib/haptics.ts` purely as a fallback for a build
without the local module — keep it only if that fallback is real, otherwise drop it.

---

## 3. Data model

All six tables live in `plancy.db`. Schema in `src/data/db.ts`, types in
`src/data/types.ts`.

### Invariants — these are load-bearing

1. **Money is a whole number of minor units** (sen, cents). `amountMinor INTEGER`.
   Never a float anywhere in the codebase. A planner that loses a cent a month
   is worse than useless.
2. **Dates are `YYYY-MM-DD` strings in local time.** `toISOString()` is banned —
   it is UTC, and a task at 8am in Kuala Lumpur becomes the previous day.
   Conversions go through `src/lib/format.ts` only.
3. **Every record carries `syncedAt`**, the moment it last changed on any
   device. Nothing reads it yet; CloudKit merge will (latest change wins).
4. **Deleting writes a tombstone.** `removeRecord()` deletes the row *and*
   inserts into `tombstones`, so a device that was offline cannot resurrect it.
   Undo calls `forgetTombstone()`.
5. **A repeating task belongs to a `seriesId`** equal to the first instance's id.
   The newest instance in a series is the template for the next.

### Tables

```sql
tasks    (id PK, date, time, title, repeat, seriesId, done, createdAt, syncedAt)
         INDEX tasks_by_date (date)
journal  (id PK, date UNIQUE, body, mood, updatedAt, syncedAt)
ideas    (id PK, text, tag, starred, done, createdAt, syncedAt)
money    (id PK, month, kind, label, amountMinor, dueDay, paid,
          repeatMonthly, seriesId, createdAt, syncedAt)
         INDEX money_by_month (month)
tombstones (id PK, kind, deletedAt)
settings   (key PK, value)   -- values are JSON
```

`journal.date` is `UNIQUE` and writes use `ON CONFLICT(date) DO UPDATE` — one
entry per day is enforced by the database, not by the UI.

### Migrations

`migrate()` runs on every launch: `CREATE TABLE IF NOT EXISTS`, then
hand-rolled `ADD COLUMN` guards (SQLite has no `ADD COLUMN IF NOT EXISTS`),
then a one-time backfill that groups pre-`seriesId` repeating rows into series.
The backfill re-runs as a no-op each launch; at this row count that is free.

**Rule for the future:** migrations must be idempotent and must never drop a
column. A user's whole history is in this file and there is no server copy.

---

## 4. The store

`src/data/store.tsx` holds the entire dataset in React state and writes through
to SQLite synchronously on every mutation. Reads never touch the database after
startup.

```
StoreProvider
  ├── on mount: migrate() → loadAll() → seed() if __DEV__ and empty
  ├── state: { tasks, journal, ideas, money, settings }
  ├── mutations: addTask, setTaskDone, removeTask, restoreTask, … 
  │              each updates state AND calls the matching db.save*/remove*
  └── selectors: tasksFor(date), entryFor(date), moneyFor(month), streak, …
```

Because every mutation is synchronous and the dataset is in memory, the UI has
**no loading, pending or error states anywhere**. That is a deliberate
simplification that holds only while the dataset stays small. If a user ever
accumulates tens of thousands of rows this design has to change — treat 10k
rows as the redesign trigger.

### Derived work on mutation

Two things run off task/money changes, both in `src/app/_layout.tsx`:

- `syncReminders(tasks, settings)` — cancels and re-plans every pending
  notification. Serialised through a promise chain so overlapping calls cannot
  interleave.
- `useWidgetSync(tasks, settings, setTasksDone)` — reads ticks made on the
  widget out of the app group, applies them to SQLite, *then* rewrites the
  widget timeline. Order matters: applying before rewriting is what stops a
  widget tick being overwritten.

---

## 5. Repeats

`src/data/repeats.ts`.

- **Tasks.** `upcomingRepeats(tasks, today, through)` finds the newest instance
  per series, steps forward, skips ahead to today if the series fell behind,
  and emits instances up to `through` (one week out). Ids are assigned by the
  caller.
- **Bills.** `missingBills(money, month)` copies a `repeatMonthly` bill into a
  new month, unpaid, keeping `dueDay` and `amountMinor`.

> **KNOWN-1.** `step()` reads the day-of-month from the date it is stepping
> *from*, not from the series anchor. Once a monthly task is clamped to a short
> month it never recovers: 31 Jan → 28 Feb → 28 Mar → 28 Apr. The fix is to
> carry the anchor day through the stepping loop. Bills are unaffected because
> they carry `dueDay` explicitly.

**For iCloud sync**, generated instances need deterministic ids so two devices
do not both create them: `seriesId@date` for tasks, `seriesId@month` for bills,
`j-<date>` for journal entries. This is the groundwork item and can be done
before the developer account exists.

---

## 6. Notifications

One budget, two consumers, hard cap. iOS allows 64 pending per app; plancy
plans for 60.

| Consumer | Budget | Source |
|---|---|---|
| Task reminders | 53 | `src/lib/reminders.ts`, one week ahead |
| Morning nudge | 7 | `src/lib/nudges.ts`, one week ahead, opt-in |

`syncReminders` cancels everything plancy scheduled (except a pending preview)
and re-plans from scratch. Idempotent by construction — the safest design when
the trigger is "any change to anything".

> **REL-1.** `ensurePermission()` is called from inside `reschedule()`, which
> runs on mount because `remind` defaults to `true`. The permission prompt
> therefore appears on first launch before the user has seen the app. It must
> move into onboarding, behind an explaining screen.

---

## 7. Widget

`widgets/TodayWidget.tsx`, small + medium, rendered by `expo-widgets`.

**Hard constraints — breaking these produces a blank white tile in release,
with no error shown:**

- Only `@expo/ui/swift-ui`. Nothing declared outside the component.
- All data arrives as props. **Every prop must be defaulted** — iOS passes no
  props at all for the gallery preview and the placeholder.
- The root view must call `containerBackground`. iOS 17+ replaces a widget that
  does not with Apple's "adopt containerBackground" card, which is what the
  "blank widget that opens a documentation URL" bug was.
- A layout that throws renders as an empty tile; the red error box is
  debug-only.

**Interactive ticking** works without launching the app: each task row is a
widget `Button` whose `onPress` returns new props, which iOS persists. Ticked
ids accumulate in `touched`; `useWidgetSync` drains them into SQLite on next app
foreground.

**Offline test recipe:** take the layout string from the simulator's app group
plist (`__expo_widgets_TodayWidget_layout`), evaluate `ExpoWidgets.bundle` from
the built app in Node, and call `__expoWidgetRender(props, { widgetFamily })`
with real, empty and partial props. This is the only way to catch a throwing
layout before it reaches a device.

---

## 8. Theming

`src/theme/theme.tsx` + `src/theme/palette.ts`.

`buildTheme(scheme, accent)` returns a flat token object. No screen ever
hardcodes a colour. Contrast is computed, not eyeballed:

- `accentText` — the accent darkened until it reads at **4.5:1 on a card**.
- `onAccent` — ink on a filled accent, chosen from the accent's own brightness,
  not from the light/dark setting.

This is what lets any custom hex from the system colour picker be safe.

### Dark mode reaches native UI three ways — all three are required

1. `Appearance.setColorScheme()` in `ThemeProvider` → tab bar, time wheel, alerts.
2. The navigation `ThemeProvider` in `_layout.tsx` → headers and their glass
   buttons. React Navigation otherwise forces them light.
3. `keyboardAppearance={theme.scheme}` on **every** `TextInput`.

Sheet buttons must be native bar items (`unstable_headerLeftItems` /
`unstable_headerRightItems`), not React views in `headerLeft` — iOS 26 wraps
those in glass that ignores the theme.

---

## 9. Build and platform quirks

Both are local to this Mac and both are already handled.

1. **CocoaPods** lives in `~/.plancy-tools/gems`, put on the PATH by
   `scripts/ios-env.sh`. System Ruby 2.6 is too old and Homebrew will not build
   a newer one until the Xcode 27 Command Line Tools are installed.
2. **UIScene life cycle.** The iOS 27 SDK refuses to launch an app that does not
   adopt it, and the Expo template does not yet. `plugins/with-scene-lifecycle.js`
   adds it on every prebuild. **Delete this plugin once Expo ships it.**

`ios/` is generated and gitignored. `app.config.js` switches on `PLANCY_PHONE`
to produce a free-Apple-ID build (`com.clancyhq.plancy.dev`, no push
entitlement, test tools on).

After installing a package that ships a Babel transform, restart Metro with
`--clear`: `babel-preset-expo` decides once whether to enable the `'widget'`
directive plugin, and a running Metro keeps the stale decision.

---

## 10. Planned: iCloud sync

Not built. The week-2 go/no-go on the launch plan.

**Design:** a small Swift module wrapping `CKSyncEngine` over the CloudKit
**private** database, driven by the existing `syncedAt` and `tombstones`.
Latest-write-wins per record; a tombstone always beats a record older than its
`deletedAt`.

**Prerequisites, doable now without a developer account:**
- Deterministic ids for generated records (§5).
- An outbox table of pending changes.

**Fallback, already agreed:** if sync is not solid by week 2, v1 ships
on-device only — still covered by the iPhone's own iCloud backup — and sync
becomes v1.1. The launch date does not move.
