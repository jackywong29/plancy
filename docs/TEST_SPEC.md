# plancy. — Test Specification

**Version 1.0 · 18 Sep 2026**

---

## 1. Where things stand

**There are no automated tests.** No test runner, no test files, no CI. The
only gate today is `npx tsc --noEmit`, which is clean and must stay clean.

That is survivable for a four-tab local app with one developer — but not for
the parts where a bug is *silent*. A wrong colour is obvious the moment you
look. A monthly repeat that drifts from the 31st to the 28th, or an amount that
parses "1,000" as one ringgit, is invisible until a user's data is already
wrong. Both of those bugs are in the app right now, and both would have been
caught by a twenty-line test.

**So: do not chase coverage. Test the pure logic, and test the rest by hand
against a written script.**

---

## 2. What to set up

```sh
npx expo install --dev jest jest-expo @types/jest
```

`jest-expo` is the preset that understands Expo's module resolution. Add to
`package.json`:

```json
"scripts": { "test": "jest" },
"jest": { "preset": "jest-expo" }
```

Tests live next to what they test: `src/lib/format.test.ts`,
`src/data/repeats.test.ts`.

**Scope: `src/lib/format.ts`, `src/data/repeats.ts`, `src/lib/celebrate.ts`,
`src/theme/palette.ts`, and the nudge/reminder planners.** These are pure
functions with no native dependencies. They are also where every silent bug
lives. Do not write component tests — the UI churns, and hand-testing it is
faster than maintaining snapshots.

---

## 3. Priority 1 — the tests that catch the bugs you have

### 3.1 Repeats — `src/data/repeats.test.ts`

```
monthly anchor
  ✓ 31 Jan steps to 28 Feb, then back to 31 Mar, 30 Apr, 31 May   ← KNOWN-1
  ✓ 30 Jan steps to 28 Feb, then 30 Mar
  ✓ 29 Feb in a leap year steps to 28 Feb the next year
  ✓ 15th stays the 15th for twelve months
daily / weekly
  ✓ daily fills exactly `through - today + 1` instances
  ✓ weekly lands on the same weekday every time
  ✓ a series dormant for a month emits nothing before today
series
  ✓ the newest instance is the template
  ✓ two tasks with the same title but different seriesId stay separate
  ✓ a non-repeating task emits nothing
bills
  ✓ a repeatMonthly bill missing from a month is emitted, unpaid
  ✓ a bill already present is not duplicated
  ✓ dueDay and amountMinor carry forward
  ✓ a bill in a future month is not rolled backwards
```

### 3.2 Money — `src/lib/format.test.ts`

```
parseMoney
  ✓ "12.50" → 1250
  ✓ "1,000" → 100000, not 100                     ← KNOWN-2
  ✓ "1,234.56" → 123456, not rejected             ← KNOWN-2
  ✓ "1.000,50" in de-DE → 100050                  ← KNOWN-2
  ✓ "RM 12.50" → 1250
  ✓ "" , "-", "." , "abc" → null
  ✓ "0" → 0 (and the caller rejects it, not the parser)
  ✓ negatives are absolute
  ✓ never returns a non-integer
formatMoney
  ✓ round-trips every parseMoney result
  ✓ JPY (0 minor units) formats without a decimal point
minorUnits
  ✓ MYR/USD → 100, JPY → 1
```

### 3.3 Dates — `src/lib/format.test.ts`

```
  ✓ isoDate uses local time, not UTC        (pin TZ=Asia/Kuala_Lumpur, assert
                                             a 23:30 local date is still today)
  ✓ addDays crosses month and year boundaries
  ✓ addDays crosses a DST boundary without slipping a day
  ✓ weekOf returns 7 days starting Monday when weekStart = 1, Sunday when 7
  ✓ monthGrid leading blanks are correct for both week starts
  ✓ monthGrid has 28/29/30/31 real cells as appropriate
  ✓ weekdayInitials returns 7 distinct initials in the right order
  ✓ splitTime: "00:00" → 12:00 am, "12:00" → 12:00 pm, "13:05" → 1:05 pm
```

The UTC one is worth its own note: `toISOString()` is banned in this codebase
precisely because it broke this in the web planner. A test pins it.

### 3.4 Contrast — `src/theme/palette.test.ts`

```
  ✓ accentTextFor reaches ≥ 4.5:1 for all 12 swatches on light and dark cards
  ✓ ... and for the extremes: #FFFFFF, #000000, #FFFF00
  ✓ inkOn picks dark ink for amber, white for slate
  ✓ accentFor lifts a dark swatch in dark mode
  ✓ mix(a, b, 0) === a and mix(a, b, 1) === b
```

This is the test that makes the custom colour picker safe: it proves any hex a
user picks stays readable.

### 3.5 Notification budget — `src/lib/reminders`, `src/lib/nudges`

```
  ✓ a week of hourly tasks never plans more than 53 reminders
  ✓ nudges never exceed 7
  ✓ total pending ≤ 60 with reminders and nudges both on
  ✓ reminders off cancels every pending reminder but keeps nudges
  ✓ a reminder whose lead time is in the past is not scheduled
```

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
- [ ] **Paste `1,234.56`** ← KNOWN-2
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

**Widget, offline.** A release build renders a throwing layout as an empty white
tile with no error, so test it outside the widget host: take the layout string
from the app group plist (`__expo_widgets_TodayWidget_layout`), evaluate
`ExpoWidgets.bundle` from the built app in Node, and call
`__expoWidgetRender(props, { widgetFamily })` with **real, empty and partial
props**. The empty case is the one that catches the gallery-preview crash.

---

## 6. Release gate

Do not submit unless:

1. `npx tsc --noEmit` is clean.
2. `npm test` is green, including every KNOWN-1 and KNOWN-2 case.
3. §4 has been walked on hardware, on the actual submission build.
4. §4.10 is complete — it has never been done.
5. The build has **no test tools**: `extra.testTools` absent, no sample data.
6. Upgrade-over-existing-install verified.
