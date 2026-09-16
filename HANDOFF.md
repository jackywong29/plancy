# plancy. — handoff

Paste this into a new chat, or just say "read ~/plancy/HANDOFF.md and continue".
Written 16 Sep 2026.

## What this is

Jacky's Daily Planner web app (`~/daily-planner`) rebuilt as a native iPhone
app called **plancy.**, to be sold on the App Store by his company Clancy.
Nothing is public yet; the app runs in the simulator.

- **Code:** `~/plancy` (git, 7 commits). Project notes live in `AGENTS.md`.
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

Metro: `npx expo start --port 8081` if it isn't already running.

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
src/app/settings.tsx       appearance, palette, region, reminders, privacy
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
2. Face ID lock (`expo-local-authentication`, whole app or Journal+Finance).
3. Widgets (`expo-widgets`): today's tasks, tickable via App Intents.
4. Streak celebration: the dot drops into "today, done." Must honour Reduce
   Motion.
5. Onboarding, 2–3 screens, including import from the web planner's export
   JSON.
6. Editing finance entries; month navigation beyond the current month.
7. Move UI text out of the code for translation (structure now, translate later).
8. Finance: monthly cash flow as a chart and stats (Jacky's idea, marked as a
   future feature): income vs spending over recent months, where money went.

## Open questions for Jacky

- Confirm undo-instead-of-confirm on delete.
- Which curated colours stay in the palette of 12.
- EU countries at launch or later.
- Price promo: flat $4.99, or $2.99 for the first two weeks?
