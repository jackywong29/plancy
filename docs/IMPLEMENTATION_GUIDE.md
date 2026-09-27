# plancy. — Implementation Guide

**Version 1.0 · 18 Sep 2026 · Target: submitted for review the week of 9 Nov 2026**

plancy is roughly 70% built. This guide covers what is left, in the order it
should be done, with the dependencies that actually gate each item.

---

## Where this stands — 20 Sep 2026

The week numbers below were written on 18 Sep assuming a start on the 22nd.
The code moved faster than that: weeks 1 to 3 are essentially done in two
days. **What's left is mostly not code.**

| | |
|---|---|
| ✅ Week 1 — correctness | Monthly repeat drift, locale-aware money parsing, chip tap targets, notification permission priming. All verified in the simulator. |
| ✅ Week 2 — onboarding & finance | Four onboarding screens; finance entries can be edited, with swipe and Undo to match every other list. |
| ✅ Week 3.1 — accessibility | Full pass at 310%; segmented controls, calendar, month pill, streak, legend and two fixed-width columns all fixed. **VoiceOver on hardware is the one gap.** |
| ➕ Not in the plan | A security audit (`RELEASE_SPEC` §4b) that found and fixed a missing widget privacy manifest — which would have been an automated rejection at upload. |
| ⬜ Week 3.2 — store material | Not started. Needs no Apple account. |
| ⬜ Week 4.1–4.2 — sync groundwork | Not started. Needs no Apple account. |
| ✅ Tests (24 Sep) | 174 tests, `npm test`, ~1.5 s — everything `TEST_SPEC` §3 asked for, plus the drag maths and the widget rendered offline. Found five more problems; one fixed, the rest in `TEST_SPEC` §3.9. |
| 🔓 Week 4.3, 6 — sync engine, TestFlight | **Unblocked 23 Sep**: D-U-N-S 473263782 issued. Reachable once Apple enrolment clears. |

### What to do while Apple verifies the enrolment

In this order, and none of it needs Apple:

0. **Start the enrolment today.** It is a queue, not a task — Apple takes days
   to a couple of weeks to verify an organization. Everything below runs in
   parallel. Order and the D&B name-match warning are in `HANDOFF.md`.
1. **App Store material** (§3.2). Screenshots, listing, and the privacy +
   support pages. On the critical path, and it was right to wait until after
   the accessibility work — those changes altered every screen, and
   screenshots taken earlier would have been reshot.
2. **Tests** (`TEST_SPEC` §3). Two silent data bugs have already been through
   this codebase; both were twenty-line tests. Highest value per hour of
   anything on this list.
3. **iCloud sync groundwork** (§4.1–4.2). Deterministic ids and an outbox.
   It needs a migration, so it is much cheaper now than after launch.
4. **Import from the web planner**, into Settings rather than onboarding.
5. **Extract UI strings** (week 5).
6. **The two open security findings** (`RELEASE_SPEC` §4b.1–2) — the Face ID
   lock reaching the widget and notifications. Product decisions, not bugs.

### Small things still owed from week 1.4

`fontSize: 17` in `src/app/task.tsx:115` and two 11pt labels
(`cashflow.tsx`, the PLANCY line in the notification preview) are still raw
numbers rather than `Type` tokens. Cosmetic, and they survived the 310% pass.

---

**Time available: ~7 weeks.** The critical path runs through one thing that is
not in your control — Apple's verification of the organization.

---

## 0. The gate everything else waits on

```
D-U-N-S 473263782 — ISSUED 23 Sep 2026
   └─► Apple Developer enrollment (Clancy Sdn Bhd, organization)
         ├─► Reserve "Plancy: Daily Planner" in App Store Connect
         ├─► TestFlight
         ├─► Paid Apps agreement + bank/tax details
         ├─► Small Business Program (15% instead of 30%)
         └─► iCloud container ──► CKSyncEngine can be tested at all
```

**Nothing in the code waits on this.** The D-U-N-S arrived on 23 Sep, so what
remains of the gate is Apple's own verification of the organization. Start it,
then carry on: the risk was never technical.

---

## Week 1 (22–26 Sep) — Correctness

Fix what is wrong before adding what is missing. These are small and they are
the kind of bug that earns one-star reviews.

### 1.1 Monthly repeat drift — `src/data/repeats.ts` *(KNOWN-1)*

`step()` reads the day-of-month from the date it is stepping *from*, so once a
monthly task is clamped to a short month it never recovers.

```
31 Jan → 28 Feb → 28 Mar → 28 Apr        (what it does)
31 Jan → 28 Feb → 31 Mar → 30 Apr        (what it should do)
```

Carry the **anchor day** — the day-of-month of the series' first instance —
through the stepping loop, and clamp only for display:

```ts
function step(task: Task, from: string, anchorDay: number): string {
  if (task.repeat === 'daily')  return addDays(from, 1);
  if (task.repeat === 'weekly') return addDays(from, 7);
  return clampDay(addMonths(from.slice(0, 7), 1), anchorDay);
}
```

`anchorDay` comes from the series' earliest instance, not `latest.date`.
**Write the regression test first** (TEST_SPEC §3.1).

### 1.2 Money parsing — `src/lib/format.ts` *(KNOWN-2)*

`parseMoney` does `.replace(/,/g, '.')` unconditionally:

| Input | Now | Should be |
|---|---|---|
| `1,000` | RM 1.00 | RM 1,000.00 |
| `1,234.56` | rejected | RM 1,234.56 |
| `1.000,50` *(de-DE)* | rejected | RM 1,000.50 |

Decide the separators from the **locale**, not by blanket replacement: derive
the decimal and group separators from `Intl.NumberFormat().formatToParts()`,
strip the group separator, and normalise the decimal one. Reject anything left
over rather than silently coercing. This blocks the EU launch question.

### 1.3 Notification permission priming — `src/app/_layout.tsx` *(REL-1)*

`syncReminders` runs on mount, `settings.remind` defaults to `true`, so
`ensurePermission()` fires a cold system prompt on first launch before the user
has seen anything.

Split it: `syncReminders` should **only schedule against an already-granted
permission** and return quietly otherwise. Asking moves into onboarding (§2.1).
A user who declined once cannot be asked again, so the first ask has to be the
good one.

### 1.4 Tap targets and the type scale

- `Chip` in `src/components/ui.tsx`: add `hitSlop` or `minHeight: 44`.
- Replace the four hardcoded `fontSize: 17` with `Type` tokens.
- `Screen`'s hardcoded `bottomInset = 110`: derive from safe-area insets.

---

## Week 2 (29 Sep – 3 Oct) — Onboarding and the finance gap

### 2.1 Onboarding, 2–3 screens

The last thing built and the first thing seen. It has three jobs:

1. **Say what plancy is** — four things, one day, on your phone, no account.
2. **Import** from the web planner's export JSON. Read the export shape from
   `~/daily-planner` and map it onto `src/data/types.ts`. Import is a one-shot
   at first launch; skip must be obvious.
3. **Ask for notifications, with the reason first.** A plain screen saying what
   reminders do, a "Turn on reminders" button that calls
   `requestPermissionsAsync()`, and a "Not now" that is equally easy to press.

Then offer the morning nudge **separately, off by default**. App Review 4.5.4
treats habit nudges as marketing; bundling it into the reminders ask is exactly
the pattern that gets flagged.

Show onboarding once — a `settings` key, so it survives nothing but a reinstall.

### 2.2 Editing finance entries

Currently create-only: a typo in an amount is permanent. `src/app/money.tsx`
already has the full form; give it an `id` param, prefill from the store, and
switch the confirm button between Add and Save. Mirror the task sheet, which
already does exactly this. Add swipe-to-delete with Undo on finance rows, via
`SwipeRow`, to match every other list in the app.

---

## Week 3 (6–10 Oct) — Accessibility and store material

### 3.1 The accessibility pass

Nothing has been checked at accessibility text sizes. Reviewers do look.

- Every screen at the **largest accessibility size**: nothing clipped,
  truncated or overlapping. Expect trouble in `Row`s with a label and a value
  side by side (Settings), the segmented control in `money.tsx`, and the
  calendar's fixed 38pt day circles.
- **VoiceOver end to end**: complete one task per screen without looking.
  Confirm swipe actions are reachable as custom actions.
- Reduce Motion, Increase Contrast, Bold Text.
- A pass on an Apple silicon Mac.

### 3.2 App Store material — needs no Apple account

- **6.9-inch screenshots** (iPhone 17 Pro Max). Six: Today, Journal, Ideas,
  Finance, the widget on a home screen, the palette.
- **Listing text and keywords** — see RELEASE_SPEC §2.
- **Privacy policy and support pages** on clancyhq.com. Claude writes, Jacky
  publishes. The listing cannot be submitted without both URLs.
- Set up `support@clancyhq.com` in ImprovMX. Only `jacky@` exists today.

---

## Week 4 (13–17 Oct) — iCloud sync groundwork, then the go/no-go

### 4.1 Deterministic ids — do this regardless

Generated records must have ids two devices would both compute, or sync creates
duplicates:

| Record | Id |
|---|---|
| Generated repeat instance | `seriesId@YYYY-MM-DD` |
| Rolled-forward bill | `seriesId@YYYY-MM` |
| Journal entry | `j-YYYY-MM-DD` |

Needs a migration that rewrites existing generated rows. Idempotent, never
drops a column — a user's whole history is in that file and there is no server
copy.

### 4.2 Outbox

A table of pending changes, written by the same mutations that write through to
SQLite. Useful on its own as a change log; required by `CKSyncEngine`.

### 4.3 CKSyncEngine — **only if the developer account exists**

A small Swift module over the CloudKit **private** database, driven by the
existing `syncedAt` and `tombstones`. Latest-write-wins per record; a tombstone
beats any record older than its `deletedAt`.

> **Go/no-go, end of week 4.** If sync is not solid, v1 ships on-device only —
> still covered by the iPhone's own iCloud backup — and sync becomes v1.1.
> **The launch date does not move.** This was agreed on 16 Sep. Do not
> relitigate it in week 6.

---

## Week 5 (20–24 Oct) — Polish

- **Tune haptics and celebrations on hardware.** The simulator plays nothing,
  so this can only happen on the phone. Feel has never been retuned since it
  was first written — treat any "too strong / too weak" note as tuning.
- **Lock Screen widgets** (accessory families). expo-widgets supports all three (circular, rectangular, inline), and they don't need the paid account. Name the account as a blocker only for the things that truly need it.
- **Extract UI strings** into one module. Structure now, translate later. Doing
  it after launch means touching every screen twice.
- Empty states, error copy, the version footer.

---

## Week 6 (27–31 Oct) — Beta

- TestFlight build, 10–20 testers. Needs the developer account.
- **If there is no account by 27 Oct**, fall back to cable installs on any phone
  you can physically reach, and accept a smaller beta. Do not delay submission
  for a bigger one.
- Watch for: monthly repeats over a month boundary (the week-1 fix), widget
  ticks not syncing back, Face ID edge cases, notification budget overflow.

---

## Week 7 (3–7 Nov) — Submission prep

Work through RELEASE_SPEC.md end to end. Then submit the week of 9 Nov.

---

## Working rules

Carried from `AGENTS.md` — these are not style preferences, each one is a bug
that already happened once.

- `npx tsc --noEmit` stays clean. It is the only automated gate until TEST_SPEC
  lands.
- Read the **versioned** Expo docs — `https://docs.expo.dev/versions/v57.0.0/` —
  before using any Expo API.
- Money in whole minor units. Dates as local-time `YYYY-MM-DD`. Never
  `toISOString()`.
- Every colour from `useTheme()`. Accent text is `accentText`; ink on accent is
  `onAccent`.
- 44pt tap targets. Every gesture has a visible or accessibility twin.
- Deleting writes a tombstone. Undo clears it.
- Widget layouts must never throw and must default every prop.
- After installing a package with a Babel transform, restart Metro with `--clear`.
- Commit on every completed item. `HANDOFF.md` is the handover contract — update
  it in the same commit as the work it describes.

---

## What is explicitly out of scope for v1

Collaboration. Any server. Accounts. Journal attachments. Sub-tasks, projects
or task tags. Calendar import. Budget categories. Apple Watch. iPad layouts.
Android — never.

If a week runs long, cut from week 5 before cutting from weeks 1–3. Correctness
and accessibility are not polish.
