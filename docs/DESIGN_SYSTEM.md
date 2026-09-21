# plancy. — Design System

**Version 1.0 · 18 Sep 2026**
Source of truth: `src/theme/theme.tsx`, `src/theme/palette.ts`, `src/components/ui.tsx`

---

## 1. The one rule

**No screen ever hardcodes a colour.** Every colour comes from `useTheme()`.
That single rule is what lets one tap in Settings repaint the entire app, and
what keeps twelve accents × two appearances legible without twelve sets of
hand-tuned values.

---

## 2. Identity

**plancy.** — always lowercase, always closed by a full stop in the accent
colour. Screen titles follow the same shape: `today.` `journal.` `ideas.`
`finance.` The dot is the brand.

Wordmark face: **Futura Medium**, which ships with iOS, so it costs nothing to
bundle and nothing to load.

App icon: the all-accent **p** with a tick cut out of its bowl, on a
violet-washed ground. Drawn by `scripts/draw-icon.swift`; light, dark and tinted
variants in `assets/icon/`. **The icon is always Clancy violet** — iOS icons
cannot follow the in-app accent.

> iOS caches app icons phone-wide. Bump `ios.buildNumber` whenever the icon
> changes, or Spotlight and the app-open animation keep showing the old one
> until the phone is restarted.

---

## 3. Colour

### Base tokens

| Token | Light | Dark | Used for |
|---|---|---|---|
| `ground` | `#F2F1F5` | `#111013` | Page background |
| `card` | `#FFFFFF` | `#1E1D21` | Card / row surface |
| `ink` | `#1E1D21` | `#F4EFE6` | Primary text |
| `ink2` | `#6E6C76` | `#A7A2AB` | Secondary text |
| `ink3` | `#A3A1AB` | `#6F6B74` | Placeholder, empty tick border |
| `line` | `#E4E3E9` | `#2E2C33` | Hairline between rows |
| `fill` | `#E8E7ED` | `#2A282E` | Segmented control trough |
| `good` | `#2B9563` | `#4CC48A` | Income, positive |
| `bad` | `#D9434A` | `#F0646A` | Destructive, overspend |
| `warn` | `#8A5A08` | `#E9B04E` | Due soon |
| `warnSoft` | `#FBF0D9` | `#2F2615` | Warning background |

Dark is a warm charcoal (`#111013`) with warm-white ink (`#F4EFE6`), not a pure
black-on-white inversion. It reads as the same app at night rather than a
different one.

### The palette of 12

| | | | |
|---|---|---|---|
| Violet `#6D5EF0` *(default — Clancy)* | Blue `#3E7BFA` | Teal `#1A9FC0` | Green `#2B9563` |
| Olive `#6E8F24` | Amber `#C98B0B` | Orange `#E2702C` | Red `#DD434A` |
| Pink `#D2437A` | Purple `#9F4FD3` | Stone `#7B6F63` | Slate `#4B5563` |

Plus any hex the user picks from the system colour picker. The contrast maths
below is what makes an arbitrary hex safe.

### Derived accent tokens

Four values are computed from the chosen accent — never authored by hand.

| Token | How | Why |
|---|---|---|
| `accent` | `accentFor(hex, scheme)` — in dark mode, mixed toward white by 38% if luminance < 0.12, else 20% | Deep swatches (slate, violet) vanish into the charcoal otherwise |
| `accentText` | `accentTextFor()` — darkened toward the card's opposite in 10% steps until **contrast ≥ 4.5:1** | Amber and olive are fine as a fill but unreadable as a label |
| `accentSoft` | Card mixed toward accent, 24% dark / 14% light | Tinted backgrounds |
| `onAccent` | `inkOn()` — whichever of `#1E1D21` or `#FFFFFF` has more contrast **against the accent itself** | Amber gets dark ink, navy gets white, on either appearance |

The last one is the subtle bit: `onAccent` follows the **accent's** brightness,
not the light/dark setting. Getting this wrong is what produces white text on
yellow buttons.

### Colour usage rules

- Accent **text** on a card is `accentText`. Never raw `accent`.
- Ink on a filled accent is `onAccent`. Never `ink` or a literal.
- `bad` is for destructive actions and overspend only — not for "due soon",
  which is `warn`.
- Colour is never the only carrier of meaning. The split bar and cash-flow
  chart are decorative and hidden from VoiceOver; adjacent text carries the number.

---

## 4. Type

`Type` in `src/theme/theme.tsx`. Sizes are points; React Native `Text` scales
them with the reader's text size by default (`allowsFontScaling` is on).

| Token | Size | Used for |
|---|---|---|
| `display` | `Futura-Medium` | The wordmark and screen titles only |
| `title` | 38 | `BigTitle` — `today.` |
| `sectionTitle` | 17 | Card headings, empty-state titles |
| `body` | 16 | Settings rows, entry text |
| `callout` | 15 | Task titles, chips, subtitles |
| `footnote` | 13 | Section heads, secondary lines |
| `caption` | 12 | Tags, suffixes |

**Rules**

- Never write a raw number in `fontSize`. Use a `Type` token.
  *(Currently violated: `fontSize: 17` in `task.tsx:115`, `money.tsx:114`,
  `money.tsx:120`, `money.tsx:150`. Route these through `Type`.)*
- Futura is for the wordmark and titles. Body copy is the system face.
- Numbers that change in place use `fontVariant: ['tabular-nums']` so they do
  not jitter — task times, money amounts.
- Because text scales but containers do not, **never** use a fixed `height`
  around text. Use `minHeight`.

---

## 5. Space

`Space` in `src/theme/theme.tsx`.

| Token | Value | Used for |
|---|---|---|
| `gutter` | 16 | Screen and row horizontal padding |
| `gap` | 12 | Between items in a row |
| `radius` | 14 | Card corner |
| `row` | 48 | Row `minHeight` — **never a fixed `height`** |

Other constants in use: chip radius `999` (pill), round button `44`, swatch
`44`, tick `28` (with `hitSlop` to 44).

---

## 6. Components — `src/components/ui.tsx`

| Component | Contract |
|---|---|
| `Screen` | Scrolling body. Horizontal gutter, `paddingTop: 4`, bottom inset clears the floating tab bar. Adds **no** top inset — the tab screen provides it. |
| `BigTitle` | Lowercase Futura title + accent dot. Optional `subtitle` and `actions`. `role="header"`. Actions go here, never in a row above. |
| `SectionHead` | Footnote label, optional trailing value, baseline-aligned. |
| `Card` | `card` background, radius 14, `overflow: hidden`. |
| `Row` | Flex row, `minHeight: 48`, hairline top border unless `first`. Pressable variant dims to 0.6. |
| `Tick` | 28pt circle, fills with accent when checked. `role="checkbox"` + `accessibilityState`. Springs on becoming checked only — not on first draw. **Silent**: the haptic belongs to the `onPress` owner. |
| `Icon` | `SymbolView` (SF Symbols). Always takes an explicit `color`. |
| `RoundButton` | 44pt circle, icon only, requires `label`. |
| `Chip` | Pill, filled with accent when selected. Fires `select` haptic on becoming selected. |
| `Empty` | Centred title + body. Every list must have one. |
| `SwipeRow` | Swipeable container. Tap guard after a swipe; swipe actions exposed as VoiceOver custom actions. |
| `Toast` | Bottom, Liquid Glass, one action, 5 seconds. Used for Undo. |

### Tap targets

Apple's minimum is **44 × 44pt**. `RoundButton`, `Row`, the calendar arrows and
the swatches are all 44. `Tick` is 28 visually with `hitSlop` making up the
difference.

> **`Chip` is the exception and it is a bug.** `paddingVertical: 8` around
> 15pt text is roughly 34pt tall with no `hitSlop`. Add one, or raise
> `minHeight` to 44.

---

## 7. Native surfaces

iOS draws the tab bar, headers, keyboard, time wheel, alerts and Liquid Glass.
plancy has to *tell* it which appearance to use, in three separate places, and
all three are required:

1. `Appearance.setColorScheme()` in `ThemeProvider` → tab bar, time wheel, alerts
2. The navigation `ThemeProvider` in `_layout.tsx` → headers and their glass
   buttons (React Navigation otherwise forces them light)
3. `keyboardAppearance={theme.scheme}` on **every** `TextInput`

**Sheet buttons must be native bar items** — `unstable_headerLeftItems` /
`unstable_headerRightItems`, `xmark` to close, a prominent `checkmark` to
confirm. React views in `headerLeft` get wrapped by iOS 26 in glass that ignores
the theme.

**The tab bar has no background colour on purpose.** Setting one defeats Liquid Glass.

---

## 8. Motion

Reanimated 4 layout animations, which honour Reduce Motion by default. Bespoke
motion checks `useReducedMotion()`.

| Element | Spec |
|---|---|
| Tick | 0.82 scale over 90ms, then spring (damping 9, stiffness 260) |
| Day-done dot | Spring (damping 7, stiffness 220): lands ~0.11s, bounces ~0.33s and ~0.55s |
| Milestone card | Appears 0.65s, full size ~0.8s |
| Launch | 350ms fade from the plancy mark into the first frame |
| Calendar | Month unfolds from the current week; months slide on swipe |

Haptic patterns in `src/lib/haptics.ts` are timed to these numbers. **If you
change an animation, change its pattern.**

---

## 9. Voice

Lowercase titles. Plain words. No exclamation marks except in a celebration. No
"Oops". Never blame the user.

| Instead of | Write |
|---|---|
| "No data available" | "Nothing planned yet." |
| "Are you sure you want to delete?" | *(delete, then offer Undo)* |
| "Task successfully created!" | *(say nothing — the row is there)* |
| "Invalid amount" | "Enter an amount like 12.50" |

Empty states say what the screen holds **and** how to start it. Two lines, never more.
