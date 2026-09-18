# plancy. — handoff

Paste this into a new chat, or just say "read ~/plancy/HANDOFF.md and continue".
Written 16 Sep 2026, last updated 18 Sep 2026.

## What this is

Jacky's Daily Planner web app (`~/daily-planner`) rebuilt as a native iPhone
app called **plancy.**, to be sold on the App Store by his company Clancy.
Nothing is public yet. It runs in the simulator and on Jacky's own iPhone 17
Pro Max, installed over the cable with his free Apple ID (see "On Jacky's
iPhone" below). **That signing lasts 7 days: the build from 17 Sep stops
opening around 24 Sep. Plug the phone in (or have it on the same Wi-Fi) and
run `sh scripts/install-on-iphone.sh` to renew it; data survives.**

- **Code:** `~/plancy` (git, 17 commits, all work committed). Project notes
  live in `AGENTS.md`.
- **Old web app:** `~/daily-planner` (git, untouched, still runs). It stays as
  the reference and keeps working until the iOS app replaces it.
- **Launch plan:** https://claude.ai/artifact/FtoMDwzjv6KxCXDfqWZA9P
- **Design draft (clickable HTML):** https://claude.ai/artifact/AtdezYxSubQXP6vgejuYTi

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

- Domain **clancyhq.com** bought on Vercel. Work email works (ImprovMX
  forwarding into Gmail, sending via Gmail "Send mail as").
- **D-U-N-S number requested, waiting on D&B review.** This is the only
  blocker for Apple enrollment and reserving the name in App Store Connect.
  Nothing in the code waits on it.
- Still to do by Jacky: trademark check on "Plancy" (MyIPO + WIPO), add the
  Sdn Bhd legal name and work email to the clancyhq.com site footer, then
  enroll, accept the Paid Apps agreement, add bank/tax details, and apply to
  the Small Business Program (15% instead of 30%).

## Running it

```sh
cd ~/plancy
. scripts/ios-env.sh && npx expo run:ios      # simulator; first build ~10 min, later ones seconds
npx tsc --noEmit                              # typecheck; keep it clean
```

Two local quirks, both already handled:

1. **CocoaPods** can't be installed normally on this Mac (system Ruby 2.6 is
   too old, and Homebrew won't build a newer one until the Command Line Tools
   for Xcode 27 are installed from Software Update). It lives in
   `~/.plancy-tools/gems`, put on the PATH by `scripts/ios-env.sh`.
2. **UIScene life cycle.** The iOS 27 SDK refuses to launch an app that
   doesn't adopt it, and the Expo template doesn't yet. `plugins/with-scene-lifecycle.js`
   adds it on every `expo prebuild`. Delete the plugin once Expo ships this.

The **iOS Simulator tool panel does not attach** on this Mac ("Xcode is
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
props for the gallery preview and placeholder. Test a layout offline: take the
layout string from the simulator's app group plist
(`__expo_widgets_TodayWidget_layout`), eval `ExpoWidgets.bundle` from the
built app in Node, and call `__expoWidgetRender(props, { widgetFamily })` with
real, empty and partial props.

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
src/data/types.ts          records; every one carries syncedAt, ready for iCloud merge
src/data/db.ts             SQLite schema, reads/writes, tombstones, migrations
src/data/store.tsx         in-memory store writing through to SQLite; selectors
src/data/repeats.ts        repeat series for tasks; monthly bill roll-forward
src/data/seed.ts           sample rows, __DEV__ only
src/lib/format.ts          local-time dates, 12/24h, money in minor units, locale defaults
src/lib/reminders.ts       schedules iOS notifications for the coming week
src/theme/palette.ts       12 swatches + contrast maths (inkOn, accentTextFor)
src/theme/theme.tsx        light/dark tokens, useTheme(), type scale
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

## Next, in this order

1. **iCloud sync** — Jacky agreed (16 Sep) it waits until the Apple
   developer account exists, since it can't be tested before then. The
   groundwork can start any time: deterministic ids for generated repeats
   (`seriesId@date`) and bills (`seriesId@month`) and journal (`j-date`), so
   two devices don't create duplicates, plus an outbox of changes.
   The big one, and the week-2 go/no-go on the plan. Needs a
   small Swift module using CloudKit's `CKSyncEngine` over the existing
   `syncedAt` + tombstones. If it isn't solid, v1 ships on-device only (still
   in the iPhone's iCloud backup) and sync moves to v1.1, keeping the date.
2. Widgets: interactive ticking is done (17 Sep). Each task row is a widget
   Button whose onPress returns new props (iOS saves them, no app launch);
   ticked ids go in `touched`, and `useWidgetSync` (src/lib/widget.ts) applies
   them to SQLite before it ever rewrites the timeline. Tested offline by
   evaluating ExpoWidgets.bundle in Node and by writing a pressed entry into
   the app group plist (kill cfprefsd) and launching. Next: a Lock Screen size.
   Launch-screen "old logo" reports: the open animation cross-fades from the
   *icon*, and iOS's icon cache only refreshes on a phone restart.
3. Onboarding, 2–3 screens, including import from the web planner's export
   JSON. Ask for notifications there and offer the morning nudge (it must stay
   opt-in: App Review 4.5.4 treats habit nudges as marketing).
4. Editing finance entries.
5. Tune haptics and celebrations on the phone (the simulator plays no
   haptics), from Jacky's feedback.
6. Larger text sizes, VoiceOver and a pass on an Apple silicon Mac: reviewers
   look, and nothing has been checked at accessibility sizes yet.
7. App Store material that needs no Apple account: 6.9-inch screenshots,
   listing text and keywords, and the privacy policy + support pages for
   clancyhq.com (Claude writes, Jacky publishes).
8. Move UI text out of the code for translation (structure now, translate later).

## Confirmed on Jacky's phone (18 Sep)

- **Haptics work** through `modules/plancy-haptics` (Core Haptics). expo-haptics
  is silent on iOS 27, so never go back to it. Feel wasn't re-tuned, so take
  any later "too strong / too weak" note as tuning, not breakage.
- **Ticking on the widget works**, and plancy picks the tick up.
- **The eyedropper colour circle works** (our swatch with Apple's colour well
  invisible on top).

## Waiting on Jacky

- Morning nudge: Settings → Morning nudge → **Send a preview** (arrives in 5
  seconds, with plancy's own chime and See my day / Add a task buttons). Not
  yet seen on a real phone.
- **Restart the iPhone once.** iOS caches app icons phone-wide; until a
  restart, notifications, Spotlight and the app-open animation still show the
  old Expo icon, which is what the "mixed logo at launch" reports were.

His own to-do list, outside the code: chase the D-U-N-S number, trademark
check on "Plancy" (MyIPO + WIPO), add the Sdn Bhd legal name and work email to
the clancyhq.com footer, and set up `support@clancyhq.com` in ImprovMX (only
`jacky@clancyhq.com` → jackywong0004@gmail.com exists today; the App Store
listing needs a support address).

## Open questions for Jacky

- Confirm undo-instead-of-confirm on delete.
- Morning nudge starts off (App Review rule). Fine, or surface it in onboarding?
- Which curated colours stay in the palette of 12.
- EU countries at launch or later.
- Price promo: flat $4.99, or $2.99 for the first two weeks?
