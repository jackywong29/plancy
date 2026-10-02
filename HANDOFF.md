# plancy. — handoff

Paste this into a new chat, or just say "read ~/plancy/HANDOFF.md and continue".
Written 16 Sep 2026, last updated 24 Sep 2026.

## What this is

Jacky's Daily Planner web app (`~/daily-planner`) rebuilt as a native iPhone
app called **plancy.**, to be sold on the App Store by his company Clancy.
Nothing is public yet. It runs in the simulator and on Jacky's own iPhone 17
Pro Max, installed over the cable with his free Apple ID (see "On Jacky's
iPhone" below). **That signing lasts 7 days: it was last renewed from the
MacBook Air on 1 Oct, so renew it from the Mac mini before 8 Oct.** Plug the
phone in (or have it on the same Wi-Fi) and run `sh scripts/install-on-iphone.sh`
to renew it; data survives. A renewal after a new profile may need Settings →
General → VPN & Device Management → trust the Apple ID again.

- **Machine:** since 2 Oct, the **M4 Mac mini** (Mac user `clancy`, Xcode 27,
  Node 24 LTS at `/usr/local/bin/node`). It was built on the MacBook Air before
  that; the Air is Jacky's personal Mac again. The first simulator build on the
  mini succeeded on 2 Oct. Not yet done from the mini: an iPhone install —
  Xcode needs the signing Apple ID added (Settings → Accounts) first.
- **Code:** `~/plancy` (git, all work committed; private on GitHub as
  `jackywong29/plancy`).
  Project notes live in `AGENTS.md`; seven specs live in `docs/`.
- **Old web app:** `~/daily-planner` (git, untouched, still runs). It stays as
  the reference and keeps working until the iOS app replaces it.
- **Specs:** `docs/` — PRD, Architecture, UX, Design System, Implementation
  Guide, Test Spec, Release Spec. Written 18 Sep from the shipped code, so they
  describe what plancy *is*, not what it was once meant to be. The
  Implementation Guide carries the week-by-week plan to the 9 Nov submission.
- **Launch plan:** https://claude.ai/artifact/FtoMDwzjv6KxCXDfqWZA9P
- **Design draft (clickable HTML):** https://claude.ai/artifact/AtdezYxSubQXP6vgejuYTi

## Start here — state on 24 Sep

- **Every launch blocker in the code is done**: correctness fixes, onboarding
  with permission priming, finance editing, accessibility at 310%, and a
  security audit (privacy manifest for the widget, Info.plist hygiene).
- **24 Sep round**, on the phone as build 6: task notes, one add button for
  the whole app, Lock Screen widgets that hide task names while the app is
  locked, and anytime tasks you drag into order. Details in "Round of
  changes, 24 Sep" below.
- **After build 6**, *not yet on the phone*: the task sheet's Remind me
  switch is now a real per-task setting, and a celebration fix (below).
  Build 7 will carry them.
- **Tests exist (24 Sep): 174 of them, `npm test`, ~1.5 s.** Everything
  `docs/TEST_SPEC.md` §3 asked for, plus the drag maths and the widget
  rendered offline in every family. Keep `npm test` and `npx tsc --noEmit`
  green. See "Tests (24 Sep)" below.
- **The tests found a real gap in repeating tasks.** Decided 27 Sep: plancy
  will ask "This task only / This and future tasks" on editing or deleting a
  repeating task, like Apple's Calendar. Item 1 of "Next, in this order".
- **Apple enrolment is on hold by Jacky's choice.** The D-U-N-S (473263782)
  is issued; resume "Enrolment, in order" below only when Jacky says so.
- **Waiting on Jacky's hands**, because the CLI can't touch a screen: drag
  anytime tasks, try the add button on each tab, add a Lock Screen widget,
  and do one VoiceOver pass.
- **Next piece of work**: repeat series, together with the iCloud id
  groundwork (see "Next, in this order").

## Decisions already made (don't re-open these)

| | |
|---|---|
| Name | **plancy.** (plan + clancy). Store name "Plancy: Daily Planner". Backup name: daycy. |
| Platform | **iOS only.** Never mention Android or Google Play. |
| Devices | iPhone, plus Apple silicon Macs. No iPad layouts. |
| Stack | Expo SDK 57, Expo Router native tabs, TypeScript, SQLite on device |
| Data | On the phone, to sync through each user's own iCloud. No accounts, no server. |
| Price | US$4.99, paid before download |
| Seller | Clancy Sdn Bhd (organization enrollment) |
| Tabs | Today, Journal, Ideas, Finance. Settings behind the gear on Today. |
| Look | Light/Dark/System + a 12-colour palette, default Clancy violet `#6D5EF0`. Lowercase Futura titles ending in the accent dot ("today."). |
| v1 extras | Widgets, Face ID lock, recurring tasks and bills, streaks with celebration |
| Target | Submitted for App Store review the week of 9 Nov 2026 |

## Where the App Store side stands

- **Clancy Sdn Bhd is incorporated** (confirmed 19 Sep). Contracts and the
  App Store seller name can now be the company, not Jacky personally.
- Domain **clancyhq.com** bought on Vercel, and it is also where Clancy HQ
  (the CRM platform) runs in production — so plancy's privacy and support
  pages are pages on that same site, not a separate one.
- **`support@clancyhq.com` exists** (confirmed 19 Sep), alongside
  `jacky@clancyhq.com`. The App Store listing needs a support address and now
  has one.
- **D-U-N-S: 473263782** — issued 23 Sep 2026. Apple enrolment, the name
  reservation, TestFlight and iCloud sync are all reachable, but **enrolment
  is on hold since 24 Sep by Jacky's choice**; see "Enrolment, in order".
- Still to do by Jacky, in this order: trademark check on "Plancy" (MyIPO +
  WIPO) **before** reserving the name; add the Sdn Bhd legal name and work
  email to the clancyhq.com footer; then enroll, accept the Paid Apps
  agreement, add bank/tax details, and apply to the Small Business Program
  (15% instead of 30%).

## Running it

```sh
cd ~/plancy
. scripts/ios-env.sh && npx expo run:ios      # simulator; first build ~10 min, later ones seconds
npx tsc --noEmit                              # typecheck; keep it clean
npm test                                      # 174 tests, ~1.5 s; keep them green
```

On a **fresh clone**, `npm test` fails 17 widget tests until the widget bundle
exists: run `node node_modules/expo-widgets/scripts/build-bundle.mjs` once
(any iOS build also makes it).

Two local quirks, both already handled:

1. **CocoaPods.** On the Mac mini it comes from Homebrew (`brew install
   cocoapods`, 1.17.0). On the MacBook Air it couldn't be installed normally
   (system Ruby 2.6 too old), so it lived in `~/.plancy-tools/gems`, put on the
   PATH by `scripts/ios-env.sh`. Sourcing that script on the mini is harmless —
   its folders don't exist there, and it still sets a UTF-8 `LANG`.
2. **UIScene life cycle.** The iOS 27 SDK refuses to launch an app that
   doesn't adopt it, and the Expo template doesn't yet. `plugins/with-scene-lifecycle.js`
   adds it on every `expo prebuild`. Delete the plugin once Expo ships this.

The **iOS Simulator tool panel did not attach** on the MacBook Air ("Xcode is
installed but not selected", although `xcode-select -p` is correct). Work
around it from the command line:

```sh
xcrun simctl launch booted com.clancyhq.plancy
xcrun simctl openurl booted "plancy://journal"        # or today, ideas, finance, settings, task, money
xcrun simctl io booted screenshot shot.png
```

**Things that looked like our bugs but were iOS rules (16 Sep, round 3):**
- *Widget blank white, tap opens `plancy://documentation/widgetkit/...`:* iOS
  17+ replaces a widget that doesn't call `containerBackground` with Apple's
  "adopt containerBackground" card. The root view now sets it.
- *Journal/Finance content under the status bar after unlocking:* native tabs
  give their top inset to the first scroll view found when the tab mounts.
  PrivateLock now overlays a mounted tab instead of replacing it.
- *No haptics at all:* expo-haptics builds window-less UIFeedbackGenerators,
  which play nothing in an iOS 27 scene-lifecycle app. `modules/plancy-haptics`
  uses Core Haptics (falls back to generators tied to the key window).

**Widget debugging.** A release build renders a widget layout that throws as
an *empty white tile* (the red error box is debug-only), and iOS passes no
props for the gallery preview and placeholder. `npx jest TodayWidget` now
renders every family offline against real, empty and broken props (see
"Tests (24 Sep)"). The layout a built app actually stored is in the
simulator's app group plist (`__expo_widgets_TodayWidget_layout`) if you
ever need to render that exact string instead.

**Face ID in the simulator:** `xcrun simctl spawn booted notifyutil -s
com.apple.BiometricKit.enrollmentChanged '1'` then `-p` the same name to
enrol; `notifyutil -p com.apple.BiometricKit_Sim.pearl.match` (or
`.nomatch`) answers the prompt.

Metro: `npx expo start --port 8081` if it isn't already running. **After
installing a package that ships a Babel transform (expo-widgets did), restart
Metro with `--clear`**: babel-preset-expo only enables the `'widget'`
directive plugin when it sees expo-widgets, and a running Metro keeps the old
decision. The symptom was `ArgumentCastException: The 2nd argument cannot be
cast to type String` from `createWidget` at launch.

### On Jacky's iPhone (cable, free Apple ID)

Until Clancy's paid developer account exists (no TestFlight yet), plancy is
installed straight onto Jacky's iPhone 17 Pro Max over the cable:

```sh
sh scripts/install-on-iphone.sh      # prebuild in "phone" mode + Release build + install
```

- Signed with Jacky's free personal team `TN5SQM7946` (Xcode is signed in to
  that Apple ID; Developer Mode is on on the phone).
- `app.config.js` switches on `PLANCY_PHONE`: bundle id
  `com.clancyhq.plancy.dev` (so the free team never claims the real id) and no
  `aps-environment` entitlement (free teams can't have push; reminders are
  local and still work).
- Release build: JS is bundled in, no Metro, no sample data. It's the real copy.
- **Free signing expires after 7 days**: the app stops opening. Re-run the
  script; data survives as long as the app isn't deleted.
- The script leaves `ios/` in phone mode. For the simulator again:
  `npx expo prebuild --platform ios --clean` then `npx expo run:ios`.
- First install only: on the phone, Settings → General → VPN & Device
  Management → trust the Apple ID.

## Code map

```
src/app/_layout.tsx        providers: store -> theme -> toast -> Stack; also re-plans reminders
src/app/(tabs)/_layout.tsx native tab bar (no background colour: iOS draws Liquid Glass)
src/app/(tabs)/index.tsx   Today: week strip, progress dots, streak, task list
src/app/(tabs)/journal.tsx Journal: day nav, moods, autosave, past entries + search
src/app/(tabs)/ideas.tsx   Ideas: capture with #tag, filter chips, star
src/app/(tabs)/finance.tsx Finance: left-this-month, split bar, bills first
src/app/settings.tsx       appearance, palette + custom colour, region, reminders, nudge, widget, privacy, testing
src/app/currency.tsx       currency list with search (Settings → Currency)
src/components/calendar.tsx week strip / month grid on Today, with the toggle chevron
src/components/cashflow.tsx six-month in/out bars on Finance
src/lib/lock.tsx           Face ID: LockProvider (rules in the header), AppLock, PrivateLock, privacy cover
src/lib/haptics.ts         haptic vocabulary: event -> Core Haptics pattern (timed to animations), Settings toggle
modules/plancy-haptics/    local Expo module (Swift, CHHapticEngine) that plays those patterns
src/lib/celebrate.ts       which moment a tick earned: day / spotless month / streak milestone
src/components/celebration.tsx  dot burst + milestone card (CelebrationProvider at the root)
src/lib/nudges.ts          morning nudge copy, planned a week ahead (opt-in)
src/lib/widget.ts          feeds widgets/TodayWidget.tsx a 4-day timeline
widgets/TodayWidget.tsx    the home screen widget (small + medium), Expo UI only
src/app/task.tsx           new/edit task sheet (native time wheel via Expo UI)
src/app/money.tsx          new finance entry sheet
src/components/ui.tsx      Screen, BigTitle, Card, Row, Tick, Chip, Empty, RoundButton, Icon
src/components/swipe-row.tsx swipeable row: tap guard after a swipe, VoiceOver actions
src/components/task-row.tsx swipe to edit/delete (on SwipeRow)
src/components/toast.tsx   bottom toast with one action (used for Undo)
src/components/onboarding.tsx  four first-run screens; mock notifications on the permission asks
src/components/money-row.tsx   finance row on SwipeRow; statement colours (amountColour)
src/components/sortable.tsx    drag-to-reorder list (anytime tasks); Move up/down for VoiceOver
src/lib/add-action.ts      the one add button: each tab registers useAddAction(label, action)
src/data/order.ts          a day's order (timed by clock, anytime by position) + drag maths
plugins/with-widget-privacy-manifest.js  widget extension's PrivacyInfo.xcprivacy (register before expo-widgets)
plugins/with-store-hygiene.js  drops unused Info.plist keys; PLANCY_STORE=1 for the upload build
src/data/types.ts          records; every one carries syncedAt, ready for iCloud merge
src/data/db.ts             SQLite schema, reads/writes, tombstones, migrations
src/data/store.tsx         in-memory store writing through to SQLite (opens the db on import)
src/data/select.ts         selectors: streak, countsByDate, tasksForDay, monthTotals (pure, tested)
src/data/repeats.ts        repeat series for tasks; monthly bill roll-forward
src/data/seed.ts           sample rows, __DEV__ only
src/lib/format.ts          local-time dates, 12/24h, money in minor units, locale defaults
src/lib/reminders.ts       schedules iOS notifications for the coming week
src/theme/palette.ts       12 swatches + contrast maths (inkOn, accentTextFor)
src/theme/theme.tsx        light/dark tokens, useTheme(), type scale
*.test.ts                  tests, next to what they test; widgets/TodayWidget.test.ts renders the widget offline
test/                      test helpers: time zone pin, phone-locale stand-in, record makers
```

## Rules that must hold

- Money is stored in whole minor units (sen). Never a float.
- Dates are `YYYY-MM-DD` handled in local time. Never `toISOString()`.
- Every colour comes from `useTheme()`. Accent **text** uses `theme.accentText`
  (darkened until it reads at 4.5:1 on a card); ink on a filled accent is
  `theme.onAccent` (chosen from the accent's own brightness).
- Tap targets 44pt. Any gesture must also exist as a visible or accessibility
  action.
- Deleting writes a tombstone (`removeRecord`) so iCloud sync can't resurrect
  it; undo calls `restoreTask` / `restoreIdea`, which clear the tombstone.
- Sample data loads by itself only under `__DEV__`. Settings → Testing (load
  sample data, erase all) shows in dev and in the iPhone test build
  (`extra.testTools`), never in the App Store build.
- **Dark mode reaches native UI three ways, keep all three:**
  `Appearance.setColorScheme` in `ThemeProvider` (tab bar, time wheel,
  alerts), the navigation `ThemeProvider` in `_layout.tsx` (headers and their
  glass buttons; React Navigation otherwise forces them light), and
  `keyboardAppearance={theme.scheme}` on every `TextInput`.
- Sheet buttons are native bar items (`unstable_headerLeftItems` /
  `unstable_headerRightItems`: xmark to close, prominent checkmark to
  confirm), not React views in `headerLeft`, which iOS 26 wraps in glass that
  ignores the theme.
- Swipeable rows use `SwipeRow` (`src/components/swipe-row.tsx`): it stops the
  lift-off after a swipe counting as a tap, and hands swipe actions and
  in-row buttons to VoiceOver.
- Screens don't add a top inset; the tab screen already provides it. Screen
  actions go in `BigTitle`'s `actions` prop, not a row above the title.

## Built so far

Four tabs on real SQLite data. Swipe a task to edit or delete, with a 5-second
Undo toast instead of a confirmation. Task sheet with the real iOS time wheel,
day chips plus calendar, repeat, reminder switch. Repeat series: the coming
week of repeating tasks is always filled in, and monthly bills copy into a new
month the first time it's opened. Reminders scheduled on the phone for the
coming week and re-planned on every change (iOS caps pending at 64; we use 60).
Journal search. Finance add sheet. Settings with appearance and the palette.
Ideas: tick to mark done (sinks to the bottom, "Done" filter), swipe to delete
with Undo. Undo toast is Liquid Glass. Dark mode fixed across native pieces
(16 Sep, from Jacky's first test on his iPhone).

Also 16 Sep: Face ID lock (whole app or Journal+Finance; passcode fallback);
currency picker; custom accent via the system colour picker (any hex; the
contrast maths copes); Today's calendar expands to a month with arrows; the
morning nudge (opt-in, Settings, hour 6–10; Mondays add last week's tally,
the 1st adds last month's; shares the 64-notification budget: 53 reminders +
7 nudges); Finance cash-flow chart (last 6 months, in vs out, tap a month);
home screen widget "Today" in small + medium, style chosen in Settings →
Widget (Progress / Streak / Tasks), fed by `syncWidget` on every change.

Round 3 (16 Sep): the three fixes above; lock cover lifts away while the tab
settles in; haptics as timed Core Haptics patterns; morning nudge with its own
chime (assets/sounds/plancy-morning.wav, synthesised), context headline,
first three tasks, "See my day" / "Add a task" buttons, and Settings → Send a
preview (`plancy://settings?preview=nudge` in test builds); launch screen is
the plancy mark (`assets/icon/launch-{light,dark}.png`) on plancy's light/dark
ground and dissolves into the first frame; every Expo/React template image is
deleted; `ios.buildNumber` is bumped whenever the icon changes, because iOS
keeps showing a cached icon (Spotlight especially) until the build number
changes; unknown links redirect to Today. App icon: Jacky chose 4e, the
all-accent p with a tick cut out of its bowl on a violet-washed ground
(`assets/icon/plancy-{light,dark,tinted}.png`, drawn by
`scripts/draw-icon.swift`; the Expo template icon is gone). The icon is
always Clancy violet: iOS icons can't follow the in-app accent.

Also 16 Sep, second round from Jacky's phone test: Face ID reworked (scope
changes apply at once, one unlock per session, relock on background, privacy
cover); widget fixed (blank tile + "unmatched route"); calendar month
unfolds/folds from the current week with swipe and month slides; haptics
vocabulary with a toggle; day-done and streak-milestone celebrations; cash
flow chart redesigned (single series of money left, see the component
header for why) and shown from the first month.

## Round of changes, 24 Sep (enrolment on hold meanwhile)

All committed, checked in the simulator, and **on the phone as build 6**
(24 Sep).

- **Task notes.** Under the title in the same card; the list shows the first
  line; repeats copy them.
- **One add button for the whole app**, centred above the tab bar, rendered
  once by `app/(tabs)/_layout.tsx`. Each tab says what "add" means with
  `useAddAction(label, action)`. Jacky's first choice was the glass circle
  iOS 26 puts beside the tab bar; it was tried and **doesn't work yet** —
  react-native-screens builds tab items with the older UITabBarItem API, not
  UISearchTab, so a search-role tab just renders as an ordinary fifth tab.
  Revisit if the library adopts UITab.
- **Lock Screen widgets**: a line above the clock, a progress ring, and a
  rectangle with the next task. **While the whole-app Face ID lock is on, no
  widget shows a task name** — which also closes security finding 4b.1. Every
  family was rendered offline against real, private, empty and malformed
  props (see "Widget debugging" above for the method).
- **Anytime tasks you can drag.** "Set a time" off in the task sheet. Timed
  tasks stay in clock order and can't be dragged; anytime ones sit under
  their own heading with a grab handle — press, hold, drag. VoiceOver gets
  Move up / Move down. The drag maths is in `data/order.ts` and tested.
- **Siri**: deferred to 1.1 by Jacky's choice. App Intents would do it, via a
  small local Swift module like `modules/plancy-haptics`.

**Must be tried by hand on the phone**, because the CLI can't touch the
screen: dragging anytime tasks (the hold, the lift, rows stepping aside, the
drop), the add button on each tab, and adding a Lock Screen widget.

**Fixed after build 6:** the task sheet's **Remind me** switch used to do
nothing. It's now a real per-task setting (`task.remind`, default on), with
Settings → Task reminders still the master switch. Not on the phone until
build 7.

## Tests (24 Sep)

`npm test` runs 174 tests in about 1.5 seconds; `docs/TEST_SPEC.md` §1–3
says what each file covers and how it's set up. Things worth knowing:

- **Every test runs in Sydney time** (`test/timezone.js`): ahead of UTC like
  KL, *and* with daylight saving, which KL lacks. The date tests would catch
  the web planner's `toISOString()` bug and a day that is 23 hours long.
- **Pure logic must be importable without SQLite.** `store.tsx` opens the
  database on import, so the selectors moved to `data/select.ts` (screens
  import them from there now), and reminders gained `planReminders()`, the
  "which and when" half of `syncReminders`. `widget.ts` exports `propsFor`
  so the widget test renders real props.
- **The widget test renders the real layout in a separate JavaScript
  context**, the way the widget extension does, across every family, both
  schemes and ten kinds of props including none and garbage — a throw on the
  phone is a blank white tile with no error. It also proves no task name
  shows while the whole-app lock is on. It needs `ExpoWidgets.bundle`, which
  any iOS build puts in `node_modules`.
- **Onboarding's notification pictures are checked against the real
  notifications.** Change the reminder or nudge wording and the test tells
  you to change the onboarding screen too.
- **`it.failing`** marks a known bug written as the behaviour we want. It
  "passes" while the bug is there and turns red once it's fixed — then make
  it a plain `it`. Two of them today (BUG-1, BUG-2 below). The release gate
  says none may be left at submission.

**Found while writing them:**

1. **Fixed — a celebration could play twice.** After a streak milestone,
   unticking and re-ticking the task showed a second card ("September,
   spotless"), then the day burst. `celebrate.ts` now spends everything one
   tick earned together.
2. **BUG-1 — a deleted repeat comes back.** Delete the furthest copy of a
   repeating task (a week out) and the next top-up (next launch, or the next
   task added) recreates it with a new id. The tombstone can't stop it
   because the id differs. Deterministic ids (`seriesId@date`) plus a
   tombstone check fix it — the same ids the iCloud groundwork needs anyway.
3. **BUG-2 — a monthly series on the 31st drifts after a delete.** The
   anchor day is read off the oldest copy still there; delete January's 31st
   and the series walks to the 28th from March on.
4. **A repeating task can't reliably be stopped or changed.** Edits and
   "Repeat: never" apply to the one copy you opened; the newest copy is the
   series' template and keeps it going. Turning Repeat off on the *newest*
   copy even creates a duplicate on its date. See "Open questions".
5. **Pasting an amount.** The amount field keeps digits only, so pasting
   "1,000" stores RM 10.00 and "RM 50" stores RM 0.50. `parseMoney` reads
   both correctly but has had no caller since the field went bank-style.
   Small fix: if the text changed by more than one character (a paste), run
   it through `parseMoney`. Not done — it's UI and needs a hand test.

## On the phone: build 4 (20 Sep)

`version` stays **1.0.0** and `ios.buildNumber` went 3 → 4. Two different
numbers: the version names a *release* and is what buyers see, so it stays
1.0.0 until v1 ships; the build number increments on every build put on a
device, and Apple requires a fresh one for every upload. 1.1 is the first
feature update *after* 1.0 is live, not the next thing installed.

Build 4 carries everything since the 18th: the correctness fixes, the floating
add button, bank-style amounts, the Finance colour scheme and editing,
onboarding, the accessibility pass and the two security plugins. It also
proved both new config plugins work in phone mode, not just the simulator.

**Worth Jacky's hands, because the CLI can't drive them:** the swipe gestures
on Finance rows, tapping through onboarding end to end, and a VoiceOver pass.
The VoiceOver one is what blocks an honest Accessibility Nutrition Label.

## Fixed 18 Sep (review pass, not yet run on a device)

Three bugs found by reading the code, each reproduced before it was changed.
Typecheck is clean; **none of this has been run in the simulator or on the
phone yet** — `ios/` is still in phone mode.

- **Monthly repeats drifted.** `src/data/repeats.ts` stepped the next date from
  the last *clamped* date, so a task on the 31st became the 28th permanently
  after February (31 Jan → 28 Feb → 28 Mar → 28 Apr). It now carries the
  series' anchor day through the loop: 31 Jan → 28 Feb → 31 Mar → 30 Apr.
- **`parseMoney` mis-read thousands separators.** `src/lib/format.ts` replaced
  every comma with a dot, so "1,000" was stored as RM 1.00 and "1,234.56" was
  rejected outright. It now decides which mark is the decimal point from the
  number's own shape and the phone's locale, which also unblocks the EU
  question ("1.000,50" used to be rejected).
- **Chips were a ~34pt tap target.** `hitSlop` in `src/components/ui.tsx`
  carries them to Apple's 44.

Worth a look when the phone build is next renewed: a monthly task on the 31st
over a February boundary, and typing an amount with a comma in it.

## Changed 20 Sep

- **The cold notification prompt is gone.** `ensurePermission` is split into
  `hasPermission` (read-only) and `askPermission` (prompts). Scheduling only
  ever reads, so a fresh install now reaches Today with no system prompt —
  verified on a clean install in the simulator. Asking moved to the two
  Settings switches, which is an explicit request; onboarding will take it
  over. Settings also shows an **Allow notifications** row whenever reminders
  or the nudge are on but iOS hasn't granted permission, so the switch can
  never quietly claim something that isn't true. If permission was refused for
  good, the row opens iPhone Settings instead.
- **Adding moved to a floating button** at the bottom right, above the tab bar,
  on Today and Finance — where Mail keeps Compose, and in reach of a thumb.
  `Fab` and `FAB_CLEARANCE` are in `components/ui.tsx`; screens using it pass
  `bottomInset={FAB_CLEARANCE}` so the last row can still be scrolled clear.
  `Space.tabBarHeight` (the glass itself) is now separate from `Space.tabBar`
  (that plus breathing room), because the two were being conflated.
- **Amounts are typed the way a bank app does it.** Digits fill in from the
  right — 1, 2, 5, 0 reads 0.01, 0.12, 1.25, 12.50 — so there's no decimal
  point to type and no separator to get wrong. The field holds minor units,
  which is exactly what gets stored. `formatAmount()` prints the number without
  a currency mark, for places that already say the currency.
- **Finance reads like a statement.** Money in and savings are green and
  signed `+`; spending is ordinary ink; a bill turns amber as it comes due, red
  once it's actually late, and dims when paid. Red no longer marks ordinary
  spending, so it still means something. Green means "money kept" in the split
  bar too, and Left took the accent. "Saving" is now "Savings" and covers
  investments — no new kind, and nothing to migrate.

## Finance entries can be edited (20 Sep)

The last create-only screen is gone. `money.tsx` takes `?id=...` and opens the
same form filled in, with **Save** in place of Add; `?kind=&month=` still opens
a new one. Editing deliberately leaves `paid` alone — whether a bill is settled
isn't something the form asks about, and the tick on Finance owns it. An
entry's month doesn't change here either: moving one is rare enough not to earn
a control.

Store gained `editMoney` and `restoreMoney`, mirroring `patchTask` and
`restoreTask`.

**Finance rows are now `MoneyRow`** (`components/money-row.tsx`), built on
`SwipeRow` like every other list: tap to open, swipe for Edit and Delete, and a
bill's tick sits in the row. Deleting offers **Undo** — Finance used to answer
a tap with a delete alert, which was the only place in plancy that asked "are
you sure" instead. The colour rules live there too, next to the row that uses
them.

Verified in the simulator: the Rent bill opens with its name, RM 1,800.00, due
day and repeat all filled in and Save enabled; the list shows paid bills
dimmed, "Due today" in amber, and "Due in 8 days" in plain ink. **Not
verified:** actually tapping Save, and the swipe gesture — the CLI can't send
touches and the simulator tool still won't attach on this Mac.

## Onboarding (built 20 Sep, four screens)

`src/components/onboarding.tsx`, shown instead of the tab bar until
`settings.onboarded` is true — so a new install can't wander off mid-flow.

1. **plancy.** — four things, one day, a line each, and the line that actually
   sells it: no account, nothing leaves this iPhone.
2. **make it yours.** — accent and appearance, straight away. It costs nothing
   and the app feels like the reader's before they've typed a word.
3. **reminders.** — the reason first, *then* the prompt. "Turn on reminders"
   calls `askPermission()`; "Not now" is equally easy to press and sets
   `remind` false.
4. **each morning.** — the nudge, on its own screen, off unless asked for.

**Why the nudge has its own screen:** App Review 4.5.4 treats habit nudges as
marketing, and bundling one into the reminder ask is the shape that gets
flagged. Keep them apart.

**Import is deliberately not here.** It only serves someone moving off the web
planner, and it would cost every other buyer a screen they'd skip. It belongs
in Settings → Import, which isn't built yet.

Screens 3 and 4 each show a **mock of the notification they are asking
permission for** — the reminder banner, and the nudge with its two buttons. It
fills what was a dead band, but that isn't why it's there: the honest way to
ask for a permission is to show what will actually arrive. The wording is
copied from what `lib/reminders.ts` and `lib/nudges.ts` really produce, **so if
either changes, change the preview too** — a preview that lies is worse than
none. The preview sits in `Step`'s `feature` slot, which takes whatever height
the copy leaves and centres in it.

Verified on a clean install: all four screens render, and the run reaches Today
with no system prompt until screen 3 asks for one.

## Accessibility pass (20 Sep)

Walked every screen at **310%** text (`accessibility-extra-extra-extra-large`),
then again at the default size to prove nothing regressed. Driven from the CLI:

```sh
xcrun simctl ui booted content_size accessibility-extra-extra-extra-large
xcrun simctl ui booted content_size large        # back to normal
xcrun simctl ui booted increase_contrast enabled
xcrun simctl ui booted appearance dark
```

**What broke, and why.** React Native text scales on its own, so nothing was
missing a multiplier — every failure was a *container* that couldn't grow, or
a row of things that had to become a column. Two rules came out of it:

1. **Display type gets a cap; content type never does.** The screen titles and
   the "left this month" figure are branding, and at 310% an uncapped 38pt
   Futura is wider than the phone and breaks mid-word ("financ / e."). Both now
   carry `maxFontSizeMultiplier={1.6}`. Everything that carries meaning scales
   without a ceiling.
2. **Side by side becomes stacked.** `useAccessibilitySize()` in
   `components/ui.tsx` is true once `fontScale` passes 1.35, which is iOS's
   first accessibility size.

**Fixed**

- **Segmented controls** rendered "Syst / em", "Ligh / t" and pushed "Dark" off
  screen. There were four hand-rolled copies; they are now one `Segmented` in
  `components/ui.tsx` that turns into a vertical list at accessibility sizes,
  with proper `radiogroup`/`radio` roles it never had. Its items also got a
  44pt minimum, which they were under before.
- **Calendar day numbers were sliced in half** — fixed 38pt circles can't hold
  50pt digits, and a seven-column grid can't widen. The number and the weekday
  initial are capped at 1.35 and the circle grows with them. Nothing is lost:
  the day's accessibility label reads the full date, uncapped.
- **Finance's month chevron was pushed off screen** by a two-line month, so
  there was no way to reach the next month. The label now flexes.
- **Today's streak ran off the progress card**, and **Finance's three-column
  Saved / Spent / Left legend ran off the card**. Both stack now.
- **Task row's time column** was a fixed 52pt and clipped "7:00 am"; so was the
  bill due-day field at 80pt. Both are `minWidth` now.
- **VoiceOver**, in what was built this week: the amount field's tap-target
  wrapper was a focusable unlabelled box (now `accessible={false}`, so focus
  lands on the input), and the notification preview read as five loose strings
  (now one grouped element).

**Also checked:** Increase Contrast in dark mode — accent text stays legible,
which is `accentTextFor()` holding 4.5:1 as designed. Reduce Motion is honoured
by Reanimated's defaults and by explicit `useReducedMotion()` checks.

**Not done — the one gap left.** A real **VoiceOver pass** has not happened:
the CLI can't drive it and the simulator tool won't attach on this Mac. The
tree is in good shape by inspection, but *completing one task per screen with
the screen off* still needs doing on the phone. Until it is, **do not tick
VoiceOver on the App Store Accessibility Nutrition Label** — an over-claimed
label is worse than a blank one.

## Security pass (20 Sep)

Full audit in `docs/RELEASE_SPEC.md` §4b. Two of the five findings are fixed;
two are product decisions still open; one is just a note.

**Fixed — `plugins/with-widget-privacy-manifest.js`.** The widget extension
had no `PrivacyInfo.xcprivacy`. `expo-widgets` ships none of its own and its
`WidgetsStorage.swift` reads the app group through `UserDefaults(suiteName:)`,
a required-reason API, from inside a bundle that declared nothing. A missing
manifest is an automated rejection at upload, not a review note. The plugin
writes the manifest (declaring only `CA92.1`) and gives the widget target its
own Resources build phase, which it never had — `addResourceFile` is no use
here because it resolves "Resources" across the whole project and would have
bundled the file into the *app* target instead.

**Fixed — `plugins/with-store-hygiene.js`.** Drops `NSSupportsLiveActivities`
(plancy has none) from every build, and `NSAllowsLocalNetworking` from store
builds only, since Metro needs it while developing. Build the upload with
`PLANCY_STORE=1`; the plugin prints which mode it ran in, so a missed flag
shows up in the prebuild output instead of in the archive.

> **Both plugins are registered ahead of `expo-widgets` in app.json, and that
> is load-bearing.** Expo runs a *later*-registered mod *earlier*, so listed
> after expo-widgets the manifest plugin finds no widget target and fails the
> prebuild, and the hygiene plugin deletes Info.plist keys that expo-widgets
> then writes straight back. Verified both ways round.

**Still open — two product decisions.** The Face ID lock doesn't reach the
**widget** (task titles stay on the home screen while the app is locked) or
**notifications** (reminders carry the task title; the nudge carries three).
Both only diverge under the whole-app scope — under Journal & Finance, tasks
aren't private anyway. Fixes are sketched in RELEASE_SPEC §4b.1–2 and need a
decision about how much a locked widget should still say.

**Note.** `plancy.db` uses the iOS default protection class, so the Face ID
lock is a borrowed-phone protection, not an encryption boundary. The listing
says "Lock your journal and finances behind Face ID", which is accurate.
**Never let that become "encrypted" or "secure".**

## Next, in this order

The week-by-week plan in `docs/IMPLEMENTATION_GUIDE.md` has a status block at
the top; this is the short version as of 24 Sep. Items 1 to 5 of the old list
(correctness, permission priming, onboarding, finance editing, accessibility)
are done, and so are the tests (24 Sep).

1. **Repeat series — decided 27 Sep: "This task only / This and future
   tasks"** on edit and on delete, like Apple's Calendar. The
   tests found that a repeating task can't reliably be stopped or edited,
   plus BUG-1 and BUG-2 ("Tests (24 Sep)"). The likely fix gives each series
   its own record (rule, anchor day, end, and the title/time/notes new copies
   take) and gives each copy a deterministic id, `seriesId@date`, so a
   tombstone keeps a deleted copy deleted. That id is the same one item 3
   needs, so do the two together — it's one migration instead of two. Flip
   the two `it.failing` tests in `repeats.test.ts` to `it` when done.
2. **App Store material** — needs no Apple account: 6.9-inch screenshots,
   listing text and keywords (drafted in `docs/RELEASE_SPEC.md`), and the
   privacy + support pages for clancyhq.com (Claude writes, Jacky publishes).
   Screenshots after the 24 Sep round, since it changed Today and every tab.
3. **iCloud sync groundwork** — deterministic ids for generated records
   (`seriesId@date`, `seriesId@month`, `j-date`) plus an outbox; start it
   with item 1. Doable now;
   the `CKSyncEngine` module itself needs the developer account. If sync isn't
   solid in time, v1 ships on-device only and sync becomes v1.1. **The date
   does not move.**
4. **Import from the web planner**, in Settings (not onboarding).
5. **Security finding 4b.2 is still open**: notifications carry task titles
   onto the Lock Screen even with the whole-app lock on. The widgets already
   hide names in that case (4b.1, fixed); notifications should follow the
   same rule — generic copy when locked. Needs Jacky's yes.
6. Tune haptics and celebrations on hardware (the simulator plays none).
7. **Pasting into the amount field** ("Tests (24 Sep)", item 5): route a
   paste through `parseMoney`. Small; needs a hand test on the phone.
8. Move UI text out of the code for translation (structure now, translate
   later).
9. **Version 1.1**: Siri via App Intents ("Add a task in plancy", "What's on
   my plancy today?" — the widget's app-group data already has the answer),
   and the iOS 26 glass add circle if react-native-screens adopts UITab.

## Confirmed on Jacky's phone (18 Sep)

- **Haptics work** through `modules/plancy-haptics` (Core Haptics). expo-haptics
  is silent on iOS 27, so never go back to it. Feel wasn't re-tuned, so take
  any later "too strong / too weak" note as tuning, not breakage.
- **Ticking on the widget works**, and plancy picks the tick up.
- **The eyedropper colour circle works** (our swatch with Apple's colour well
  invisible on top).

### Also confirmed 19 Sep

- **The mixed logo at launch is gone** after the phone restart, as expected —
  it was iOS's phone-wide icon cache, not our bug. The rule stands: bump
  `ios.buildNumber` whenever the icon changes.
- **The morning nudge preview looks right** on hardware — chime, headline and
  both buttons. Copy and timing are settled; only the delivery hour is still a
  setting.

## Waiting on Jacky

## Enrolment, in order (D-U-N-S in hand, 23 Sep)

> **ON HOLD since 24 Sep, by Jacky's choice.** The D-U-N-S is issued and
> nothing is lost by waiting. He wants another round of product changes first
> (task notes, one global add button, Siri, Lock Screen widgets, reordering).
> Resume from step 1 below when he says so. Don't start enrolment unprompted.

Do these in this order — two of them are irreversible in ways the others
aren't.

1. **Check the D&B record before touching Apple.** Look up 473263782 and confirm
   the legal name and address D&B holds match the Sdn Bhd registration
   *character for character*. A mismatch between the D-U-N-S record and the
   enrolment form is the most common reason organization enrolment is
   rejected, and fixing it afterwards means going back to D&B and waiting
   again.
2. **Trademark check on "Plancy"** (MyIPO + WIPO) — still before the name is
   reserved. Abandoning a reserved name costs far more than the hour the
   search takes. Backup name: daycy.
3. **Add the Sdn Bhd legal name and work email to the clancyhq.com footer.**
   Apple looks at the seller's website during organization enrolment.
4. **Enrol in the Apple Developer Program** as an organization, using 473263782.
   Expect Apple to take days, sometimes a couple of weeks, to verify.
5. Reserve **Plancy: Daily Planner** in App Store Connect the hour enrolment
   clears.
6. Accept the **Paid Apps agreement**, add bank and tax details.
7. **Apply to the Small Business Program** — 15% instead of 30%, and it is not
   retroactive, so a late application costs real money on early sales.

Nothing in the code waits on any of this, so the work in "Next, in this order"
carries on in parallel. Enrolment is a queue, not a task: start it, then go
back to the tests.

## Open questions for Jacky

Answered since 18 Sep, and recorded where they apply: EU at launch (yes, now
that money parsing is locale-aware), flat US$4.99 (no launch discount), the
morning nudge offered on its own onboarding screen and off by default, undo
instead of confirm on delete, all twelve colours stay, Siri waits for 1.1,
anytime tasks rather than priority, Lock Screen names follow the Face ID lock,
and repeating tasks ask "This task only / This and future tasks" (27 Sep).

Still open:

- Notifications while the whole-app lock is on (item 5 of "Next").

