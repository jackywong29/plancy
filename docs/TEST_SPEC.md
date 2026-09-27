# plancy. — Test Specification

**Version 1.1 · 24 Sep 2026** (1.0 was 18 Sep, before any test existed)

---

## 1. Where things stand

**174 automated tests, all green, in about 1.5 seconds.** Run them with:

```sh
npm test                 # everything
npx jest repeats         # one file, by part of its name
npx tsc --noEmit         # the typecheck covers the tests too
```

They test the pure logic, where every silent bug so far has lived: a monthly
repeat that drifted from the 31st to the 28th, an amount that parsed "1,000"
as one ringgit. Both are pinned now (KNOWN-1, KNOWN-2), and writing the
tests turned up five more (§3.9).

**The rule hasn't changed: do not chase coverage.** Test the pure logic;
test the UI by hand against §4. There are no component or snapshot tests on
purpose — the UI churns, and hand-testing it is faster than maintaining them.

---

## 2. How it is set up

- **Runner:** `jest` with the `jest-expo` preset, configured in
  `package.json` under `"jest"`. `@/` imports resolve through
  `moduleNameMapper`, mirroring `tsconfig.json`.
- **Where tests live:** next to what they test (`src/lib/format.test.ts`),
  except the shared helpers in `test/`.
- **Time zone: every test runs in `Australia/Sydney`** (`test/timezone.js`).
  Sydney, not Kuala Lumpur, because it has both hazards: it is ahead of UTC
  like KL, so a 7:30 am date is still yesterday in UTC (the web planner's
  `toISOString()` bug), and it has daylight saving, which KL doesn't. The
  zone is set in Jest's global setup because a test file can't change its
  own; `format.test.ts` checks it took.
- **Phone language and region:** `expo-localization` is replaced for every
  test by `test/locale.ts`. Tests start as an English phone in Malaysia;
  `setPhone({ languageTag: 'de-DE', currencyCode: 'EUR' })` changes it for
  one test.
- **Records:** `test/make.ts` — `task()`, `bill()`, `settings()` fill in dull
  defaults so a test only spells out what it's about; `days()` and
  `finishedDays()` build date ranges and streaks.
- **Pure code must be importable without SQLite.** `data/store.tsx` opens the
  database the moment it is imported, so the selectors (`streak`,
  `countsByDate`, `tasksForDay`, `monthTotals`…) live in `data/select.ts`,
  and the reminder plan is `planReminders()`, separate from the code that
  talks to iOS. Keep new logic that way.
- **`it.failing`** marks a test written the way plancy *should* behave that
  still fails today (§3.9). Jest counts it as passing while it fails; when a
  fix lands, it turns red — that is the cue to change it to a plain `it`.

---

## 3. What is tested

### 3.1 Repeats — `src/data/repeats.test.ts`

Monthly repeats keep their anchor day (31 Jan → 28 Feb → 31 Mar → 30 Apr,
**KNOWN-1**), both in one call and made a week at a time the way the store
really makes them; 30 Jan, 29 Feb in a leap year, the 15th for a year. Daily
fills every day once; weekly keeps its weekday across daylight saving; a
series left alone restarts today, not in the past; topping up twice adds
nothing. The newest copy is the template, ticks are never copied, the
per-task reminder switch and anytime position carry. Bills: copied unpaid
into a month that lacks them, never duplicated, amount/due day/label from
the latest month, never rolled backwards, one-off bills and income skipped.

### 3.2 Money — `src/lib/format.test.ts`

`parseMoney`: "1,000" is a thousand and "1,234.56" parses (**KNOWN-2**);
German numbers on a German phone; currency marks ignored; nothing → null;
never a fraction of a sen. `formatMoney`/`formatAmount` round-trip through
`parseMoney` for 14 amounts on ten phone/currency pairs, including yen (no
decimals), the Kuwaiti dinar (three), Swiss, French and Indian grouping.

### 3.3 Dates — `src/lib/format.test.ts`

`isoDate` keeps 7:30 am on its own day (and the test shows `toISOString()`
wouldn't); `todayIso` just after midnight; `addDays` across month and year
ends and both daylight-saving changes, and walked a day at a time through two
whole years; `weekOf`, `monthGrid` (blanks for both week starts, 28–31 real
cells), `weekdayInitials`, `splitTime` on both clocks.

*(1.0 asked for "7 distinct initials" — in English there aren't: T and S
repeat. The test checks the order instead.)*

### 3.4 Colour — `src/theme/palette.test.ts`

Accent text reaches 4.5:1 on light and dark cards for all 12 swatches, for
extremes (white, black, yellow, cyan…), and for **216 colours sampled across
the whole range the custom picker can make** — measured through
`buildTheme`, so it's what the reader actually sees. `inkOn`, `accentFor`,
`mix`.

### 3.5 Notifications — `src/lib/reminders.test.ts`

Against a stand-in for iOS's notification centre: at most 53 reminders and 7
nudges, never more than 60 pending; reminders off cancels reminders and keeps
nudges; both off leaves nothing; a pending nudge preview survives a resync;
no reminder in the past, only open timed tasks that want one within the week;
the lead time; nothing scheduled — and no prompt — without permission; the
exact reminder wording. The morning nudge's copy for an empty day, three
things and "and N more", anytime-only days, a milestone within reach, a
streak in progress, Mondays and the 1st.

**Onboarding copy is checked against the real thing.** The onboarding
screens draw the reminder and the nudge they ask permission for, with the
words typed in. A test generates both from the real code and fails if the
screens say something else.

### 3.6 Celebrations and streaks — `src/lib/celebrate.test.ts`, `src/data/select.test.ts`

Day / milestone / spotless month, rarest first; no replay on untick and
re-tick; milestones only for today; the month needs seven planned days and
none unfinished, and never a past month. Streaks survive an unfinished or
empty today, stop at a gap or an unfinished day, run through daylight saving
and new year. `monthTotals`.

### 3.7 Order and drag — `src/data/order.test.ts`

`dayOrder` (clock, then position, ties by creation), `move` (clamps),
`nextPosition`, and the drag maths: `slotFor` crosses at a neighbour's middle
with uneven row heights, and travelling exactly `offsetTo(from, to)` lands in
slot `to` for every pair.

### 3.8 The widget, rendered offline — `widgets/TodayWidget.test.ts`

Does what §5's manual recipe did, every run. It takes the layout Babel makes
from `TodayWidget.tsx`, loads `ExpoWidgets.bundle` in a separate JavaScript
context, and renders the way the widget extension does. Every family (small,
medium, inline, circular, rectangular) × light and dark × ten kinds of props
— none, empty, real, private, nothing planned, broken types, junk in the
list, a 2,000-character title, a 30-task day — must render without throwing,
because on the phone a throw is a blank white tile with no error. While the
whole-app lock is on, no family and no style may show a task name, and there
is nothing to tick; a control test proves the names are there when unlocked.
Ticking on the home screen flips the task and records it in `touched` once.

`ExpoWidgets.bundle` is built into `node_modules` by the first iOS build. On
a fresh checkout without one: `node node_modules/expo-widgets/scripts/build-bundle.mjs`.

### 3.9 Found by writing the tests (24 Sep)

| | | |
|---|---|---|
| Celebrations | After a streak milestone, unticking and re-ticking the task played a *second* card ("September, spotless"), then the day burst. | **Fixed.** Everything one tick earns is spent together. |
| BUG-1 | Deleting the furthest copy of a repeating task (a week out) brings it back the next time the series is topped up — on the next launch, or the next task added. | `it.failing` in `repeats.test.ts`. Open. |
| BUG-2 | Deleting the first copy of a monthly series on the 31st moves the series to the 28th for good: the anchor is read off the oldest copy still there. | `it.failing` in `repeats.test.ts`. Open. |
| Series | A repeating task can't reliably be stopped or changed. Edits and "Repeat: never" apply to one copy; the newest copy keeps the series going. | Needs a product decision (HANDOFF "Open questions"). |
| Paste | The amount field keeps digits only, so pasting "1,000" stores RM 10.00, and "RM 50" stores RM 0.50. `parseMoney` handles both, but nothing calls it since the field went bank-style on 20 Sep. | Open. Manual test §4.5 covers it. |

---

## 4. Priority 2 — the manual script

Run on **hardware** before every submission. The simulator plays no haptics and
approximates Face ID.

### 4.1 First run
- [ ] Fresh install: onboarding appears, import works, skip works
- [ ] **No permission prompt before the onboarding screen that explains it**
- [ ] Declining notifications leaves the app fully usable
- [ ] Morning nudge is **off** by default
- [ ] Onboarding does not reappear on second launch

### 4.2 Today
- [ ] Week strip marks today; pips match days that have tasks
- [ ] Week start setting flips the strip and the month grid
- [ ] Calendar expands and folds; the choice survives a relaunch
- [ ] Swipe to edit, swipe to delete, Undo restores
- [ ] Ticking the last task fires the day-done celebration **once**
- [ ] Streak increments across midnight

### 4.3 Repeats — *the regression area*
- [ ] Daily task fills the coming week
- [ ] **Monthly task on the 31st: check Feb, then Mar** ← KNOWN-1
- [ ] A series left alone for a month does not backfill the past
- [ ] Deleting one instance does not delete the series
- [ ] A bill marked repeat appears unpaid in a new month, once

### 4.4 Journal / Ideas
- [ ] Autosave survives backgrounding mid-sentence
- [ ] One entry per day; revisiting a date shows the same entry
- [ ] Mood sets and clears
- [ ] Search finds an entry by a word in its body
- [ ] `#tag` becomes a chip; ticking sinks an idea and does not destroy it

### 4.5 Finance
- [ ] `1000`, `12.50`, `0.05` all store exactly ← KNOWN-2
- [ ] **Paste `1,234.56`, then `1,000`, then `RM 50`** ← KNOWN-2, and §3.9 "Paste"
- [ ] Left-this-month matches the arithmetic by hand
- [ ] Bills sort unpaid-first by due day
- [ ] Currency change re-formats everything
- [ ] Editing an entry corrects it *(once §2.2 of the guide is built)*

### 4.6 Notifications
- [ ] A reminder fires with the app closed and the phone in Airplane Mode
- [ ] Lead time is respected
- [ ] Turning reminders off cancels pending ones
- [ ] Nudge preview arrives with plancy's chime and both buttons
- [ ] "Add a task" opens the task sheet on the right date
- [ ] Never more than 60 pending

### 4.7 Widget
- [ ] Gallery preview renders **with no props** (not a white tile)
- [ ] All three styles render small and medium
- [ ] Ticking on the widget updates the app
- [ ] Renders with zero tasks, and with a very long task title
- [ ] Follows light/dark

### 4.8 Face ID
- [ ] App scope and private scope both behave
- [ ] Scope change applies at once, not next launch
- [ ] One unlock per session; relock on background
- [ ] Passcode fallback works when Face ID fails
- [ ] App switcher shows the cover, not the content
- [ ] **Journal and Finance content is not under the status bar after unlocking**

### 4.9 Appearance
- [ ] All 12 swatches, light and dark: accent text readable everywhere
- [ ] A custom hex from the picker, including near-white and near-black
- [ ] Dark mode reaches the tab bar, headers, keyboard, time wheel and alerts

### 4.10 Accessibility — *never yet done*
- [ ] Largest accessibility size: every screen, both sheets, nothing clipped
- [ ] VoiceOver: one task completed per screen
- [ ] Swipe actions reachable as VoiceOver actions
- [ ] Reduce Motion: celebrations degrade, haptics still fire
- [ ] Bold Text, Increase Contrast
- [ ] A pass on an Apple silicon Mac

### 4.11 Data safety
- [ ] Force-quit mid-edit loses nothing
- [ ] Upgrade over an existing install keeps all data (**test this every release**)
- [ ] Erase all data clears everything and leaves settings
- [ ] Airplane Mode changes nothing — there is no network

---

## 5. Simulator recipes

The iOS Simulator tool panel does not attach on this Mac. Drive it from the CLI:

```sh
xcrun simctl launch booted com.clancyhq.plancy
xcrun simctl openurl booted "plancy://journal"     # today, ideas, finance, settings, task, money
xcrun simctl io booted screenshot shot.png
```

**Face ID:**
```sh
xcrun simctl spawn booted notifyutil -s com.apple.BiometricKit.enrollmentChanged '1'
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit.enrollmentChanged
xcrun simctl spawn booted notifyutil -p com.apple.BiometricKit_Sim.pearl.match   # or .nomatch
```

**Widget, offline.** Automated now: `npx jest TodayWidget` (§3.8). To check
the exact layout a built app stored instead of the one Babel makes from
source, it is in the simulator's app group plist under
`__expo_widgets_TodayWidget_layout`; the same harness renders it.

---

## 6. Release gate

Do not submit unless:

1. `npx tsc --noEmit` is clean.
2. `npm test` is green, including every KNOWN-1 and KNOWN-2 case, **and no
   `it.failing` is left** — shipping a known bug must be a decision, not an
   accident.
3. §4 has been walked on hardware, on the actual submission build.
4. §4.10 is complete — it has never been done.
5. The build has **no test tools**: `extra.testTools` absent, no sample data.
6. Upgrade-over-existing-install verified.
