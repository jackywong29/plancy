# plancy. — Product Requirements Document

**Version 1.0 · 18 Sep 2026 · Owner: Jacky Wong / Clancy Sdn Bhd**

> Written after the fact. plancy was built first; this PRD is reverse-engineered
> from the shipped code so the remaining specs have a single source of truth.
> Where the code and this document disagree, the code is right — fix this file.

---

## 1. The problem

People who plan their day end up with the day scattered across four apps: a
to-do list, a notes app for how it went, a scratchpad for ideas, and a
spreadsheet for money. Nothing joins them, so nothing gets reviewed. Jacky
built a web planner (`~/daily-planner`) that put all four on one page and used
it daily for months. It works, but it lives in a browser tab: no home screen,
no widget, no notifications that fire when the laptop is shut, no phone.

**plancy is that planner as a native iPhone app.**

### Who it is for

Someone who already plans by hand or in a browser tab, wants it on their phone,
and does not want an account, a subscription, or their day on someone's server.

### Who it is *not* for

Teams. Shared projects. Anyone needing assignees, comments or boards. plancy is
single-player on purpose, and that is what lets it have no backend at all.

---

## 2. Why this can win

The productivity category is brutally crowded, and plancy does not beat Things,
Todoist or Notion at task management. It is not trying to. Three things it has
that they do not:

1. **Four surfaces, one app, one day.** Tasks, journal, ideas and money on the
   same day's spine. Things has no journal. Day One has no tasks. Notion has
   everything and no opinion.
2. **No account, ever.** SQLite on the phone, syncing through the user's own
   iCloud. Nothing to sign up for, nothing to leak, nothing to shut down. This
   is a *feature* to the target buyer, not a limitation.
3. **Paid once, US$4.99.** No subscription in a category that has made
   subscriptions exhausting. The whole app, once.

### The honest risk

"Does everything" apps are how indie apps die: four half-features beat by four
specialists. plancy's defence is that the four are deliberately *small* — the
journal is one box a day, finance is four numbers a month — and joined by the
date, not bolted together. Every feature request that deepens one tab at the
cost of that balance should be refused.

---

## 3. Scope of v1

### Shipped

| Area | What it does |
|---|---|
| **Today** | Week strip (expands to a month), progress dots, streak, task list. Tick, swipe to edit or delete with 5-second Undo. |
| **Tasks** | Title, time (native iOS wheel), repeat daily/weekly/monthly, per-task reminder. Repeating series fill the coming week automatically. |
| **Journal** | One entry a day. Five moods, autosave, day navigation, past entries, full-text search. |
| **Ideas** | Fast capture with `#tag`, filter chips, star, tick-to-done (sinks to the bottom), swipe to delete with Undo. |
| **Finance** | Month at a time: income, saving, spending, bills. Left-this-month, split bar, bills first, six-month cash-flow chart. Monthly bills roll forward into a new month. |
| **Reminders** | Local iOS notifications for the coming week, re-planned on every change. Capped at 53 pending (iOS allows 64). |
| **Morning nudge** | Opt-in, once a day, 06:00–10:00. Own chime, context headline, first three tasks, "See my day" / "Add a task" buttons. Mondays add last week's tally, the 1st adds last month's. Budget: 7 pending. |
| **Widget** | Home screen "Today", small + medium, three styles (Progress / Streak / Tasks). Tasks can be ticked from the widget without opening the app. |
| **Face ID lock** | Whole app, or just Journal + Finance. Passcode fallback, one unlock per session, relock on background, privacy cover in the app switcher. |
| **Appearance** | Light / Dark / System, 12-colour palette plus any custom hex via the system colour picker. Contrast maths keeps accent text at 4.5:1. |
| **Celebrations** | Day complete, spotless month, streak milestones — dot burst plus a milestone card, with Core Haptics patterns timed to the animation. |
| **Settings** | Appearance, palette, currency, week start, 12/24h, reminders, nudge, widget style, haptics, privacy lock. |

### Not in v1 — deliberately

Collaboration. Any server. Accounts. Attachments or photos in the journal.
Sub-tasks, projects, tags on tasks. Calendar import. Budgets or categories in
Finance beyond the four kinds. Apple Watch. iPad layouts. Android — **never**.

### Decided but not yet built

| # | Item | Gate |
|---|---|---|
| 1 | **iCloud sync (CKSyncEngine)** | Needs the paid developer account to test. Week-2 go/no-go. If it is not solid, v1 ships on-device only (still in the iPhone's iCloud backup) and sync moves to v1.1 without moving the date. |
| 2 | Lock Screen widget size | After the paid account. |
| 3 | **Onboarding, 2–3 screens** | Includes import from the web planner's export JSON, and the notification permission ask. Blocking for launch — see §5. |
| 4 | Editing finance entries | Blocking: entries can be created but not corrected. |
| 5 | Haptic and celebration tuning on hardware | Needs Jacky's feedback. |
| 6 | Dynamic Type / VoiceOver / Mac pass | Blocking for review quality. |
| 7 | App Store material (screenshots, listing, privacy + support pages) | No Apple account needed. Can start now. |
| 8 | UI strings extracted for translation | Structure now, translate later. |

---

## 4. User stories with acceptance criteria

### Today

- **As someone starting my day, I see what is on it in one screen.**
  - Opening the app lands on Today, scrolled to the top, no loading state.
  - The week strip marks today, shows a pip per day that has tasks, and honours the week-start setting.
  - Progress dots show done / total for today.
  - An empty day says what the screen holds and how to start, never a blank card.

- **As someone finishing a task, ticking it feels like something.**
  - The tick springs, fires one haptic, and the row restyles immediately.
  - Ticking the last open task of the day triggers the day-done celebration exactly once.
  - Reduce Motion replaces the animation; the haptic still plays.

- **As someone who mistyped, I can undo a delete.**
  - Swiping a task reveals Edit and Delete; both also exist as VoiceOver actions.
  - Deleting shows a 5-second toast with Undo. No confirmation dialog.
  - Undo restores the record and clears its tombstone.

### Tasks

- **As someone with a weekly commitment, I set it once.**
  - Repeat daily / weekly / monthly. The coming week is always filled in.
  - A monthly task anchored on the 31st falls on the 31st in every month that has one, and on the last day in months that do not. *(See KNOWN-1 in §6.)*
  - A series that went quiet for a month does not flood the past with unticked copies.

- **As someone who forgets, the phone reminds me.**
  - Reminders fire with the app closed and no internet.
  - Lead time is a setting. Turning reminders off cancels every pending one.
  - Never more than 60 pending notifications total.

### Journal

- **As someone reflecting, I write one entry a day without saving.**
  - One entry per date, enforced in the schema.
  - Text autosaves; leaving the screen never loses a keystroke.
  - Mood is optional and clearable.
  - Search matches across every past entry.

### Ideas

- **As someone with a thought in a lift, I capture it in under three seconds.**
  - The capture field is the first thing on the screen.
  - `#tag` typed inside the text becomes the idea's bucket and a filter chip.
  - Ticking an idea sinks it to the bottom and dims it; it is never destroyed by a tick.

### Finance

- **As someone watching a month, I see what is left.**
  - Left-this-month is the headline number; the split bar breaks it down.
  - Bills sort first, unpaid before paid, by due day.
  - A bill marked "repeat every month" appears unpaid in a new month the first time that month is opened.
  - Money is exact to the minor unit. Never a float. *(See KNOWN-2 in §6.)*

### Privacy

- **As someone who hands their phone over, my journal stays mine.**
  - Face ID locks the whole app, or Journal + Finance only.
  - Scope changes take effect at once, not next launch.
  - One unlock per session; relock when the app backgrounds.
  - The app switcher shows a cover, not the content.

---

## 5. Launch requirements

Blocking for App Store submission:

1. **Onboarding with permission priming.** The notification permission prompt currently appears cold on first launch, before the user has seen anything. It must be asked for inside onboarding, after explaining what it is for. *(REL-1)*
2. **Editing finance entries.** A typo in an amount is currently permanent.
3. **Dynamic Type and VoiceOver pass** at accessibility text sizes.
4. **Support page and privacy policy** live on clancyhq.com with a working `support@clancyhq.com`.
5. **Morning nudge stays opt-in and default-off.** App Review 4.5.4 treats habit nudges as marketing.
6. **No test tools in the App Store build.** `extra.testTools` must be absent.

---

## 6. Known defects carried into the specs

| ID | Defect | Severity |
|---|---|---|
| **KNOWN-1** | Monthly repeating tasks drift: a task on the 31st becomes the 28th permanently after February, because the next date is stepped from the last *clamped* date instead of the series anchor. `src/data/repeats.ts` | High — silent wrong data |
| **KNOWN-2** | `parseMoney` maps `,` to `.` unconditionally, so "1,000" is read as 1.00, and a European "1.000,50" is rejected with no message. `src/lib/format.ts` | Medium — wrong value on paste; blocks EU launch |
| **REL-1** | Notification permission asked cold at first launch from `syncReminders`, because `remind` defaults to true. `src/app/_layout.tsx` | Medium — HIG violation, hurts opt-in rate |

---

## 7. Success measures

v1 is a success at **500 paid downloads in the first 90 days** with a **4.5★+
average** and **crash-free sessions above 99.5%**. At US$4.99 with the Small
Business Program's 15% cut, 500 units is roughly US$2,100 — not a living, but
proof the positioning works and a base to build v1.1 on.

Leading signals worth watching weekly: widget install rate (the strongest
retention proxy in this category), day-7 retention, and the share of buyers who
turn the morning nudge on.
