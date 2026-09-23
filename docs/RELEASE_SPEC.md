# plancy. — Release Specification

**Version 1.0 · 18 Sep 2026 · Target: submit week of 9 Nov 2026**
Seller: Clancy Sdn Bhd · Price: US$4.99, paid before download · iOS only

---

## 1. Account prerequisites

| Step | Status | Notes |
|---|---|---|
| **Clancy Sdn Bhd incorporated** | **Done** — 19 Sep | The seller of record |
| **`support@clancyhq.com`** | **Done** — 19 Sep | The listing requires a support address |
| **D-U-N-S number** | **473263782** — issued 23 Sep 2026 | The long pole is gone |
| Apple Developer Program, organization | **Next action** | Sdn Bhd legal name must match the D-U-N-S record **exactly** — a mismatch is the most common enrollment rejection |
| Reserve "Plancy: Daily Planner" | Waiting on enrolment | Do this the hour enrollment completes |
| Paid Apps agreement | Waiting on enrolment | Nothing can be sold until this is accepted |
| Bank + tax details | Waiting on enrolment | Malaysian bank account, W-8BEN-E |
| Small Business Program | Waiting on enrolment | 15% instead of 30%. Apply immediately — it is not retroactive. |
| **Trademark check on "Plancy"** | **Jacky, not blocked** | MyIPO + WIPO. Do this *before* reserving the name. |
| clancyhq.com footer: Sdn Bhd legal name + work email | Jacky | Apple checks the seller's site |
| Privacy + support pages on clancyhq.com | Jacky publishes | clancyhq.com also runs Clancy HQ, so these are pages on that site |

> **Before the enrolment form: look up 473263782 at D&B and confirm the legal
> name and address match the Sdn Bhd registration exactly.** A mismatch there
> is the most common organization-enrolment rejection, and the fix is another
> round trip through D&B.
>
> **Do the trademark check first.** Reserving a name you then have to abandon
> costs more than the hour it takes to search. Backup name: **daycy**.

---

## 2. App Store listing

### Name and subtitle

**Name** (30 max): `Plancy: Daily Planner` — 21
**Subtitle** (30 max): `Tasks, journal, ideas, money` — 28

### Keywords (100 characters, comma-separated, no spaces after commas)

```
planner,daily,todo,task,journal,diary,habit,streak,budget,expense,offline,private,widget,no account
```

99 characters. Do **not** repeat words from the name or subtitle — Apple indexes
those separately and the duplication wastes the field.

### Promotional text (170 max, editable without a review)

```
Your whole day in one app: today's tasks, a line in the journal, the ideas you
don't want to lose, and where the money went. No account. Nothing leaves your phone.
```

### Description

```
plancy is a daily planner for one person: you.

Four things, one day. What you planned, how it went, what you thought of, and
what it cost. They live on the same screen because they belong to the same day.

TODAY
Your week across the top, your tasks below. Tick one and feel it. Tasks can
repeat daily, weekly or monthly, and plancy fills the coming week in for you.
Reminders arrive on your phone even with no signal.

JOURNAL
One entry a day. Pick a mood, write a line, and plancy saves as you type.
Search everything you've ever written.

IDEAS
Somewhere to put a thought before it goes anywhere else. Type #anything to
file it. Star the good ones.

FINANCE
Income, savings, spending and bills, a month at a time. See what's left. Bills
that repeat roll into the new month by themselves. Six months of cash flow in
one chart.

MADE THE WAY IT SHOULD BE
• No account. No sign-up. No password.
• Nothing leaves your phone. plancy has no server to send it to.
• Works completely offline, because it always was.
• Lock your journal and finances behind Face ID.
• A home screen widget you can tick tasks from.
• Light and dark, and twelve colours — or any colour you like.
• Paid once. No subscription, ever.

plancy is made in Malaysia by Clancy.
```

### Fields

| Field | Value |
|---|---|
| Category | Productivity (primary) · Lifestyle (secondary) |
| Age rating | 4+ |
| Price | Tier US$4.99, paid before download |
| Availability | See the EU question in §7 |
| Support URL | `https://clancyhq.com/plancy/support` — page not built yet |
| Marketing URL | `https://clancyhq.com/plancy` |
| Privacy Policy URL | `https://clancyhq.com/privacy` — **required, no exceptions** |
| Copyright | `2026 Clancy Sdn Bhd` |

---

## 3. Screenshots — 6.9-inch (iPhone 17 Pro Max), required

Six, in this order. The first two are what most people ever see.

| # | Screen | Caption |
|---|---|---|
| 1 | Today, a real week, a streak going | "Your whole day, in one place." |
| 2 | Home screen with the widget | "Tick tasks without opening the app." |
| 3 | Journal with a mood and text | "One entry a day. Saves as you type." |
| 4 | Finance, left-this-month + chart | "Know what's left." |
| 5 | Ideas with tags | "Catch it before it's gone." |
| 6 | Palette, light and dark | "Twelve colours. Or your own." |

Rules: real-looking content, never lorem ipsum, never a demo-data placeholder.
Nothing recognisable from Jacky's actual life. Both appearances represented.
Captions burned in above the device, in Futura, on plancy's ground colour.

> No App Preview video for v1. It is a week of work for a marginal gain on a
> US$4.99 utility. Revisit for v1.1.

---

## 4. Privacy

This is plancy's strongest marketing asset. Get it exactly right.

### App Privacy (App Store Connect questionnaire)

**"Do you or your third-party partners collect data from this app?" → NO.**

That answer is true and is worth defending: there is no analytics SDK, no crash
reporter, no network call anywhere in the codebase. It produces the "Data Not
Collected" badge on the listing.

**Before submitting, confirm it is still true.** If a crash reporter is ever
added, this answer changes and the badge goes.

### Privacy manifest — `PrivacyInfo.xcprivacy`

Generated by `expo prebuild` into `ios/plancy/`. Currently declares:

| API category | Reason |
|---|---|
| FileTimestamp | `C617.1` |
| UserDefaults | `CA92.1` |
| SystemBootTime | `35F9.1` |

`NSPrivacyTracking: false`, `NSPrivacyCollectedDataTypes: []`.

> `ios/` is gitignored and regenerated on every prebuild. **Verify the manifest
> exists in the archive you actually upload** — a missing or wrong one is an
> automated rejection at upload, not a review finding.

### Privacy policy — must actually say

That plancy stores everything on the device; that Clancy Sdn Bhd receives
nothing and operates no server; that data syncs through the user's own iCloud
account under Apple's terms *(only if sync ships)*; that notifications are
scheduled locally; that deleting the app deletes the data; and a contact
address. Written plainly. This is the one page a privacy-minded buyer reads.

### Accessibility Nutrition Label

New in App Store Connect and worth filling in honestly. Declare **only** what
§4.10 of TEST_SPEC has actually verified. VoiceOver and Larger Text have not
been tested yet — do not tick them until they have. An over-claimed label is
worse than a blank one.

---

## 4b. Security audit (20 Sep 2026)

### What holds up

- **No network code exists.** Not a single `fetch`, socket or HTTP client in
  `src`, `widgets` or `modules`. This is what makes "Data Not Collected"
  defensible rather than merely claimed.
- No secrets, keys or credentials in the repo; `.gitignore` covers `*.p12`,
  `*.mobileprovision`, `*.key`, `*.pem`, `.env*.local`.
- `NSAllowsArbitraryLoads` is false. `ITSAppUsesNonExemptEncryption` is false
  and correct — plancy implements no cryptography of its own.
- `NSFaceIDUsageDescription` present and in plain English.
- Test tools and sample data are gated behind `__DEV__ || extra.testTools`,
  and `extra.testTools` is only set by `PLANCY_PHONE`.
- Unknown deep links redirect to Today. **No destructive action is reachable
  by deep link** — erase-all needs Settings → Testing plus a confirm.

### Findings

**1. The Face ID lock does not reach the widget.** *(privacy, design)*
With `lockScope: 'app'` the person has asked for the whole app to be locked,
but `src/lib/widget.ts` keeps writing task titles to the app group, and the
home screen widget keeps rendering them. Anyone holding the phone reads them
without unlocking. A Lock Screen widget is on the roadmap, which would make it
worse. *(Under `lockScope: 'private'` this is consistent — tasks aren't private
under that scope. It is only the `app` scope where the promise and the
behaviour part company.)*
**Fix:** when the app scope is locked, feed the widget counts without titles,
or a locked placeholder.

**2. The Face ID lock does not reach notifications.** *(privacy, design)*
Reminders put `task.title` in the notification title; the morning nudge puts
the first three task titles in the body. On a locked phone with previews on,
they are readable from the Lock Screen. iOS gives an app no way to force
previews hidden, so the fix has to be in the content.
**Fix:** when the app scope is locked, send generic copy — "A task is due in 10
minutes" — and let the app reveal the detail after Face ID.

**3. The widget extension has no privacy manifest.** *(App Store)*
`expo-widgets` ships no `PrivacyInfo.xcprivacy` of its own, and
`expo-widgets/ios/WidgetsStorage.swift` calls `UserDefaults(suiteName:)` — a
required-reason API — from inside the `ExpoWidgetsTarget` extension bundle,
which has no manifest. The main app's manifest declares UserDefaults (CA92.1)
but only covers the app target.
**Fix:** a config plugin that writes a manifest into the extension on every
prebuild, the same way `plugins/with-scene-lifecycle.js` adds the scene
lifecycle. `ios/` is generated, so this cannot be a one-off hand edit.
**Verify in the archive you actually upload** — a missing manifest is an
automated rejection at upload, not a review note.

**4. Two capabilities the app does not use.** *(hygiene)*
`NSAllowsLocalNetworking: true` (Expo's Metro setting) and
`NSSupportsLiveActivities: true` are both in `Info.plist`. plancy makes no
connections at all and has no Live Activities. Neither is dangerous; both are
surface that should not ship.

**5. Data at rest is iOS default, and the copy must match.** *(accuracy)*
No protection class is set, so `plancy.db` gets
`NSFileProtectionCompleteUntilFirstUserAuthentication` — encrypted at rest,
decryptable once after a reboot-and-unlock. That is normal and fine. It does
mean the Face ID lock is a **borrowed-phone** protection, not an encryption
boundary. The listing says "Lock your journal and finances behind Face ID",
which is accurate. **Never let that become "encrypted" or "secure".**

## 5. Build checklist

- [ ] `npx expo prebuild --platform ios --clean` (simulator mode, **not** `PLANCY_PHONE`)
- [ ] Bundle id `com.clancyhq.plancy`, **not** `.dev`
- [ ] `extra.testTools` **absent** — Settings → Testing must not exist
- [ ] No sample data (`src/data/seed.ts` is `__DEV__`-only — confirm)
- [ ] Version `1.0.0`, build number bumped
- [ ] `ITSAppUsesNonExemptEncryption: false` present
- [ ] Privacy manifest present in the archive **and in the widget extension** (§4b.3)
- [ ] `NSAllowsLocalNetworking` and `NSSupportsLiveActivities` removed (§4b.4)
- [ ] `NSFaceIDUsageDescription` present and in plain English
- [ ] `aps-environment` present (paid team) — needed for notifications
- [ ] Icon: all three variants, and **the build number bumped since the last icon change**
- [ ] Launch screen shows the plancy mark, no Expo template assets anywhere
- [ ] `npx tsc --noEmit` clean
- [ ] `npm test` green
- [ ] TEST_SPEC §4 walked **on hardware, on this exact build**
- [ ] Upgrade-over-existing-install verified
- [ ] Release build, JS bundled, no Metro
- [ ] Remove `react-native-web`, `react-dom`, the `android`/`web` scripts and the `web` block

---

## 6. Review risks, and the answer to each

| Risk | Guideline | Where plancy stands |
|---|---|---|
| **Habit nudges read as marketing** | 4.5.4 | Nudge is opt-in, default off, asked separately from reminders. **Do not bundle the two asks.** |
| **Permission asked without context** | 5.1.1 | Currently a cold prompt on first launch — REL-1. Must be fixed. |
| **Minimum functionality** | 4.2 | Four substantial features, a widget, Face ID, recurrence. Not at risk. |
| **Paid app with thin value** | 4.2 / 3.1.1 | Screenshots must show real depth. Reviewers do judge a US$4.99 utility on its first screenshot. |
| **Face ID without a reason string** | 5.1.1 | `NSFaceIDUsageDescription` present. ✓ |
| **Privacy answers not matching behaviour** | 5.1.2 | "Data Not Collected" is true today. Re-verify at submission. |
| **Test tools visible** | 2.3 | `extra.testTools` must be absent. |
| **Missing privacy manifest** | — | Automated upload rejection. Verify in the archive. |

**Reviewer notes field** — say this:

> plancy stores all data on the device using SQLite. There is no account, no
> server and no network request in the app. Notifications are scheduled locally
> with UNUserNotificationCenter. The morning nudge is off by default and must be
> enabled in Settings. No login is required to use any feature.

No demo account is needed — say so explicitly, so the reviewer does not ask.

---

## 7. Decisions still open

| Question | Recommendation |
|---|---|
| **EU at launch?** | **Yes, but only after KNOWN-2 is fixed** — European decimal commas are mis-parsed today. The DSA trader declaration is a form, not a burden. |
| **Flat $4.99 or $2.99 introductory?** | **Flat $4.99.** A launch discount on an unknown app buys noise, not reviews, and anchors the price low. Keep the discount in reserve for a moment worth marketing. |
| Curated 12 colours | Ship all twelve. Nothing to gain by cutting. |
| Undo instead of confirm on delete | Keep. It is the better pattern and it is already built. |
| Nudge surfaced in onboarding | Yes — **offered**, separately, still default-off. |

---

## 8. Submission week

**Mon** — final build, walk TEST_SPEC §4 on hardware
**Tue** — screenshots and listing text into App Store Connect
**Wed** — privacy answers, nutrition label, reviewer notes
**Thu** — upload, TestFlight smoke test of the exact binary
**Fri** — submit

Set release to **manual**, not automatic. You want to choose the day it goes
live, and you want the option to pull it if TestFlight surfaces something after
approval.

---

## 9. After approval

- Day 1: verify the live listing on a device that has never had plancy.
- Week 1: watch reviews daily and respond to every one. Early reviews set the rating.
- Week 2: v1.0.1 for whatever the first real users hit.
- Then: the deferred list — iCloud sync if it slipped, Lock Screen widget,
  localisation.

**Crash-free sessions above 99.5%.** There is no crash reporter in the app, so
this comes from App Store Connect's own metrics. Check it weekly.
