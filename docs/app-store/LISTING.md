# plancy. — App Store Connect, field by field

The words to paste into App Store Connect for version 1.0, and the answers to
its questions. This file is the source; `docs/RELEASE_SPEC.md` points here.
Written 13 Oct 2026 from build 8. Re-read it against the app before you paste:
the listing may only promise what the build really does.

Primary language: **English (U.K.)** — plancy spells "colour" and "licence".
Stores without their own listing show this one.

---

## App information

| Field | Value |
|---|---|
| Name (30) | `Plancy: Daily Planner` (21) |
| Subtitle (30) | `Tasks, journal, ideas, money` (28) |
| Bundle ID | `com.clancyhq.plancy` |
| SKU | `PLANCY-IOS-1` (private, never shown) |
| Primary category | Productivity |
| Secondary category | Lifestyle |
| Content rights | No third-party content |
| Age rating | 4+ (see the answers below) |
| Licence agreement | Apple's Standard EULA (leave the field empty) |

## Pricing and availability

| Field | Value |
|---|---|
| Price | US$4.99 (Apple sets each country's local price from it) |
| Availability | All countries and regions **except China mainland**: apps there need a government ICP filing, which plancy doesn't have. |
| EU | Available, once the trader status is declared (Business → compliance). |
| Pre-orders | No |

## Version 1.0 — the store page

### Promotional text (170, can change any time without review) — 159

```
Tasks, a journal, ideas and money in one calm app. Unfinished tasks move to tomorrow by themselves. No account, no subscription, and nothing leaves your phone.
```

### Keywords (100, commas, no spaces after commas) — 96

```
todo,diary,habit,streak,budget,expense,bills,reminder,routine,checklist,organizer,offline,widget
```

No word from the name or subtitle: Apple indexes those already, so repeating
them wastes the field.

### Description (4,000)

```
plancy is a daily planner for one person: you.

Four things, one day: what you planned, how it went, what you thought of, and what it cost. They live together because they belong to the same day.

TODAY
Your week across the top and your tasks below. Give a task a time and plancy reminds you, or leave it for anytime and drag it into the order you want. Tasks can repeat daily, weekly or monthly. Finish everything and the day celebrates with you; keep going and your streak grows.

Anything you don't finish moves to tomorrow by itself, so nothing slips away. The day it left still remembers it, so your streak stays honest.

JOURNAL
One entry a day. Write a line or a page, and plancy saves as you type. Search everything you've ever written.

IDEAS
Somewhere to put a thought before it escapes. Type #anything to file it, star the good ones, and swipe them away when they're done.

FINANCE
Income, savings, spending and bills, one month at a time, so you always know what's left. Bills that repeat roll into the new month by themselves. Six months of cash flow in one chart.

A NUDGE, IF YOU WANT ONE
A morning note with the day's plan, and an evening check-in when something is still open. Pick a voice: warm, gentle or playful. Both stay off until you turn them on.

MADE THE WAY IT SHOULD BE
• No account. No sign-up. No password.
• Nothing leaves your phone. plancy has no server to send it to.
• Works completely offline.
• Lock all of plancy, or just your journal and finances, with Face ID.
• Home Screen and Lock Screen widgets. Tick tasks right from the widget.
• Light and dark, twelve colours, or any colour you like.
• Pay once. No subscription and no ads.

plancy is made in Malaysia by Clancy.
```

Never let this say "encrypted" or "secure": the Face ID lock keeps a borrowed
phone out, it isn't encryption (RELEASE_SPEC §4b.5).

### URLs and contact

| Field | Value |
|---|---|
| Support URL | `https://clancyhq.com/plancy/support` (publish `docs/legal/plancy-support.md`) |
| Marketing URL | `https://clancyhq.com/plancy` (optional; leave empty until the page exists) |
| Privacy Policy URL | `https://clancyhq.com/plancy/privacy` (publish `docs/legal/plancy-privacy-policy.md`) |
| Copyright | `2026 Clancy Sdn Bhd` |

### Screenshots

6.9-inch iPhone (1320 × 2868), required; Apple scales them down for smaller
iPhones. Six, in the order and with the captions in RELEASE_SPEC §3. Taken
from the iPhone 17 Pro Max simulator with sample data, never from Jacky's own.

## App Review information

| Field | Value |
|---|---|
| Sign-in required | **No** (say so, so the reviewer doesn't ask for an account) |
| Contact | Jacky Wong · jacky@clancyhq.com · a phone number Apple can reach |
| Release | **Manually release this version** |

Notes:

```
plancy keeps all of its data on the device (SQLite). There is no account, no sign-in, no server and no network request anywhere in the app, so no demo account is needed.

Notifications are scheduled locally on the device: task reminders, plus an optional morning nudge and an optional evening check-in. Both nudges are off by default; onboarding offers the morning nudge on its own screen, and Settings → Nudges controls both.

To try it quickly: tap + above the tab bar on Today to add a task. Face ID lock is optional (Settings → Privacy).
```

## App Privacy

**"Do you or your third-party partners collect data from this app?" → No.**

That gives the "Data Not Collected" label. It's true: plancy makes no network
requests and contains no analytics, ads or crash-reporting code. Apple's own
crash reports, which people opt into in iPhone Settings, don't count as
plancy collecting data. Answer again if any of that ever changes.

## Age rating questions

Answer **None** or **No** to every one: no violence, no mature or suggestive
themes, no gambling, no medical advice, no unrestricted web access, no
user-generated content shared with others, no messaging, no advertising. The
result is **4+**.

## Accessibility Nutrition Label

Claim only what has been checked on the phone, on this build:

| Feature | Claim? |
|---|---|
| Dark Interface | Yes: light, dark and system, reaching native screens too |
| Larger Text | Yes: checked at 310% on 20 Sep; recheck the 6 Oct screens |
| Sufficient Contrast | Yes: accent text is held at 4.5:1 |
| Reduced Motion | Yes: honoured by every animation |
| VoiceOver | **Not yet**: needs one pass on the phone, completing a task on every screen |
| Voice Control | **Not yet**: untested |
| Differentiate Without Color | Check first: statuses use words and icons beside colour |
| Captions, Audio Descriptions | Not applicable: plancy has no video |

An over-claimed label is worse than an empty one.

## Export compliance

Answered by the build itself (`ITSAppUsesNonExemptEncryption = false`):
plancy uses no encryption of its own.
