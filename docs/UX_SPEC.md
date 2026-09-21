# plancy. — UX Specification

**Version 1.0 · 18 Sep 2026**

---

## 1. Principles

1. **The day is the spine.** Four tabs, one date. Everything answers "what
   about today?" before it answers anything else.
2. **Never a blank screen.** Every empty state says what the screen holds and
   how to start it.
3. **Never a loading state.** The dataset is in memory. If a spinner ever
   appears, something is architecturally wrong.
4. **Undo, not "are you sure?"** Destructive actions happen immediately and
   offer a 5-second Undo. Confirmation dialogs are friction for the 99% to
   protect the 1%.
5. **Every gesture has a visible twin.** A swipe action must also be reachable
   by tap or by VoiceOver action. No feature is gesture-only.
6. **iOS draws its own furniture.** Tab bar, headers, wheels, alerts and glass
   are the system's. plancy supplies content and colour, not chrome.

---

## 2. Navigation

```
Stack (root)
└── (tabs)  — native UITabBar, Liquid Glass, no background colour
    ├── Today     plancy://today   (default)
    ├── Journal   plancy://journal
    ├── Ideas     plancy://ideas
    └── Finance   plancy://finance
Pushed:
    ├── Settings  plancy://settings   (gear on Today)
    └── Currency  (Settings → Currency)
Modals:
    ├── Task      plancy://task       (new / edit)
    └── Money     plancy://money      (new entry)
```

Settings sits behind the gear on Today rather than taking a fifth tab: it is
visited rarely, and four tabs keep the bar readable at accessibility sizes.

Unknown deep links redirect to Today.

### Screen layout rule

Screens do **not** add a top inset — the tab screen already provides it.
Screen-level actions go in `BigTitle`'s `actions` prop, on the title line, the
way iOS puts bar buttons beside a large title. Never a row of buttons above the
title, which leaves an empty band when there are none.

> Native tabs hand their top inset to the **first scroll view found when the
> tab mounts**. This is why `PrivateLock` overlays a mounted tab rather than
> replacing it — replacing it stole the inset and pushed content under the
> status bar.

---

## 3. Screen by screen

### Today — `src/app/(tabs)/index.tsx`

```
today.                                    [gear] [+]
Tuesday, 18 September

┌─ calendar ──────────────────────────────────────┐
│  M   T   W   T   F   S   S            ⌄         │
│  15  16  17 (18) 19  20  21                     │
│   ·   ·       ··   ·                            │
└─────────────────────────────────────────────────┘
        ● ● ● ○ ○      3 of 5      🔥 12-day streak

┌─────────────────────────────────────────────────┐
│ ○  08:00   Morning pages            daily       │
│ ●  09:30   Stand-up                             │
│ ○  14:00   Draft the spec                       │
└─────────────────────────────────────────────────┘
```

- The chevron expands the week strip into a month grid, with arrows and swipe
  between months. The choice persists (`settings.calendar`).
- A pip under a day means that day has tasks.
- Progress dots are decorative and hidden from VoiceOver; the "3 of 5" text
  carries the meaning.
- Swipe a task row: **Edit** and **Delete**. Both also appear as VoiceOver
  custom actions.
- Ticking the last open task fires the day-done celebration.

**Empty:** "Nothing planned. Tap + to add the first thing."

### Journal — `src/app/(tabs)/journal.tsx`

```
journal.                                      [🔍]
‹  Tuesday, 18 September  ›            Today

  😄   🙂   😐   🙁   😖
  great good okay low  rough

┌─────────────────────────────────────────────────┐
│ How did today go?                               │
│                                                 │
└─────────────────────────────────────────────────┘

Past entries
┌─────────────────────────────────────────────────┐
│ Monday, 17 September   🙂                        │
│ Got the widget rendering at last…                │
└─────────────────────────────────────────────────┘
```

- One entry per day, enforced by the schema.
- Autosaves as you type. No Save button, no dirty state, no confirmation on leave.
- Mood is optional; tapping the selected mood clears it.
- Search filters every past entry.
- Past entry previews are `numberOfLines={2}`.

**Empty:** "No entries yet. Write a line about today."

### Ideas — `src/app/(tabs)/ideas.tsx`

```
ideas.

┌─────────────────────────────────────────────────┐
│ Something you want to remember…            [→]  │
└─────────────────────────────────────────────────┘

[ All ] [ #app ] [ #home ] [ Starred ] [ Done ]

┌─────────────────────────────────────────────────┐
│ ○  Try a lock screen widget           #app  ☆   │
│ ●  Call the landlord                  #home ★   │
└─────────────────────────────────────────────────┘
```

- Capture field first. `#tag` typed inside the text becomes the bucket and a chip.
- Ticking sinks the idea to the bottom and dims it — it is never destroyed by a tick.
- Swipe to delete, with Undo.

**Empty:** "Nothing captured yet. Ideas go here before they go anywhere else."

### Finance — `src/app/(tabs)/finance.tsx`

```
finance.                                       [+]
‹        September 2026        ›

            RM 1,240.50 left this month
┌──────────────────────────────────────────────┐
│ ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │  split bar
└──────────────────────────────────────────────┘

Bills
┌─────────────────────────────────────────────────┐
│ ○  Rent            due 1        RM 1,200.00     │
│ ●  Internet        due 5          RM 149.00     │
└─────────────────────────────────────────────────┘

Cash flow  (last 6 months, tap a month)
```

- Bills first, unpaid before paid, sorted by due day.
- The split bar is decorative and hidden from VoiceOver.
- The cash-flow chart shows a single series (money left) — see the component
  header in `src/components/cashflow.tsx` for why in/out bars were dropped.

**Empty:** "No money tracked this month. Tap + to add income, a bill or a spend."

Rows are `MoneyRow` on `SwipeRow`: tap to open the entry, swipe for Edit and
Delete, Undo on delete, and a bill's tick in the row. Money in and savings are
green and signed `+`; spending is ordinary ink; a bill is amber as it comes
due, red once late, dimmed when paid. Amounts are typed from the right, bank
style — see `Amount` in `money.tsx`.

### Settings — `src/app/settings.tsx`

Appearance (Light/Dark/System) → Palette (12 swatches + custom) → Region
(currency, week start, 24-hour) → Reminders (on, lead time) → Morning nudge
(opt-in, hour, send a preview) → Widget style → Haptics → Privacy (Face ID
scope) → Testing *(dev and test builds only)* → version footer.

---

## 4. Interaction

### Swipe rows — `src/components/swipe-row.tsx`

All swipeable rows go through `SwipeRow`. It does two things a plain gesture
does not:

1. **Tap guard.** The lift-off that ends a swipe does not count as a tap on the
   row underneath.
2. **VoiceOver.** Swipe actions and in-row buttons are exposed as custom
   accessibility actions.

### Undo

Delete → row goes immediately → bottom toast, Liquid Glass, one action, 5
seconds. Undo restores the record and clears its tombstone. No confirmation
dialog anywhere in the app.

### Celebrations — `src/lib/celebrate.ts`, `src/components/celebration.tsx`

| Moment | What happens |
|---|---|
| Last open task of the day ticked | Dot burst, "today, done." headline, day-done haptic pattern |
| A month with no unpaid bills | Spotless-month card |
| Streak milestone (7, 30, 100…) | Milestone card at 0.65s, springs to full size by 0.8s, the biggest haptic plancy plays |

Each fires **once** per occurrence. Reduce Motion replaces the animation; the
haptic still plays.

### Haptics — `src/lib/haptics.ts`

Call sites ask for a *meaning*, never a buzz, so the feel can be retuned in one
file. One owner per event: whichever handler made the change fires it. `Tick`
itself is silent, because only the caller knows whether that tick finished the
day.

Vocabulary, growing with rarity: `select` (keyboard-like click) → `tick` /
`untick` / `reveal` / `remove` / `undo` / `saved` / `unlocked` / `refused` →
`dayDone` (a pattern timed to the animation) → `milestone` (the biggest).

Patterns are Core Haptics timed to the animations they accompany — see the
timing comments in `haptics.ts`. Settings → Haptics turns all of it off. The
simulator plays nothing; this can only be tuned on hardware.

### Face ID — `src/lib/lock.tsx`

- Scope: whole app (`AppLock`) or Journal + Finance only (`PrivateLock`).
- Scope changes apply at once, not next launch.
- One unlock per session. Relock on background.
- Privacy cover in the app switcher.
- `PrivateLock` **overlays** a mounted tab, never replaces it (see §2).
- Passcode fallback when Face ID fails or is unavailable.

---

## 5. Motion

Reanimated 4 layout animations, which honour Reduce Motion by default. Bespoke
motion must check `useReducedMotion()` explicitly.

| Element | Motion |
|---|---|
| Tick | Shrink to 0.82 over 90ms, spring back (damping 9, stiffness 260) |
| Calendar | Month unfolds from the current week; swipe slides months |
| Lock cover | Lifts away once the tab has settled |
| Launch | Launch screen (the plancy mark on plancy's ground) dissolves into the first frame over 350ms |
| Toast | Slides up from the bottom, Liquid Glass |

---

## 6. Accessibility

### Already right

- Every icon-only button has `accessibilityLabel`.
- Decorative composites (progress dots, split bar, privacy cover) are hidden
  with `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`.
- `Tick` is `role="checkbox"` with `accessibilityState={{ checked }}`.
- Swipe actions are exposed as VoiceOver custom actions.
- Titles carry `accessibilityRole="header"`.
- Contrast is computed to 4.5:1, not eyeballed.
- Reduce Motion is honoured.

### Gaps — must close before submission

| Gap | Where | Fix |
|---|---|---|
| **Never tested at accessibility text sizes.** RN `Text` scales by default, but fixed-size containers around it do not. | Whole app | Walk every screen at the largest accessibility size. |
| **`Chip` tap target ≈34pt**, under Apple's 44pt minimum, no `hitSlop`. | `src/components/ui.tsx` | Add `hitSlop` or raise `minHeight`. |
| **`Screen` bottom inset is a hardcoded 110pt** for the floating tab bar. The bar grows at large text sizes. | `src/components/ui.tsx` | Derive from safe-area insets. |
| **`fontSize: 17` hardcoded** in three places instead of the `Type` scale. | `task.tsx`, `money.tsx` | Route through `Type`. |
| **No VoiceOver pass** has been done end to end. | Whole app | One task per screen, eyes closed. |
| **Colour-only meaning** in the split bar and cash-flow chart. | `finance.tsx`, `cashflow.tsx` | Confirm the adjacent text carries the meaning. |

### Test matrix

| Setting | Check |
|---|---|
| Largest accessibility text size | Nothing clipped, truncated or overlapping on all four tabs + both sheets |
| VoiceOver | Complete one task per screen; swipe actions reachable |
| Reduce Motion | Celebrations degrade gracefully, haptics still fire |
| Increase Contrast | Accent text still legible on cards |
| Bold Text | Layout holds |
| Dark mode | Tab bar, headers, keyboard, time wheel, alerts all follow |
