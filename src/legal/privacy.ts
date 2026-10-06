/**
 * plancy's privacy policy: one source for the in-app screen (app/privacy.tsx)
 * and the page on clancyhq.com (docs/legal/plancy-privacy-policy.md, written
 * from this by `node scripts/legal-pages.mjs`; legal.test.ts fails if the two
 * differ).
 *
 * It must stay true. Before anything that sends data anywhere ships — iCloud
 * sync, a crash reporter, analytics — change this first, bump `effective`,
 * and re-answer App Store Connect's privacy questions. Plain JavaScript on
 * purpose (no `@/` imports): Node reads this file directly.
 */

export type PolicySection = { heading: string; paragraphs: string[] };

export const PRIVACY = {
  title: 'plancy privacy policy',
  effective: '6 October 2026',
  contact: 'support@clancyhq.com',
  intro: [
    'plancy is made by Clancy Sdn Bhd (“Clancy”, “we”), a company in Malaysia. This policy explains what happens to your information when you use plancy on your iPhone.',
    'The short version: everything you put into plancy stays on your device. We don’t collect it, we can’t see it, and we never sell or share it.',
  ],
  sections: [
    {
      heading: 'What plancy keeps, and where',
      paragraphs: [
        'Your tasks, journal entries, ideas, finance entries and settings are stored in a database on your iPhone. plancy has no account, no sign-up and no server, so none of it is sent to us or to anyone else.',
        'The home screen and Lock Screen widgets keep a copy of your next few days’ tasks in storage that only plancy and its widgets can read, on the same iPhone.',
      ],
    },
    {
      heading: 'What we collect',
      paragraphs: [
        'Nothing. plancy contains no analytics, advertising, crash-reporting or tracking code, and it makes no internet connections of its own. That is why its App Store page says “Data Not Collected”.',
      ],
    },
    {
      heading: 'Buying plancy',
      paragraphs: [
        'You buy plancy from Apple’s App Store. Apple handles the payment and tells us how many copies sold, not who bought them. Apple’s privacy policy covers your purchase.',
      ],
    },
    {
      heading: 'Crash reports from Apple',
      paragraphs: [
        'If you turn on “Share with App Developers” in iPhone Settings → Privacy & Security → Analytics & Improvements, Apple may pass us crash reports and usage statistics for plancy. Apple says these don’t identify you. You can turn it off there at any time.',
      ],
    },
    {
      heading: 'Reminders and nudges',
      paragraphs: [
        'Task reminders, the morning nudge and the evening check-in are scheduled on your iPhone by iOS itself, from the data already on it. They never pass through us.',
      ],
    },
    {
      heading: 'Face ID',
      paragraphs: [
        'If you lock plancy, iOS checks your face, fingerprint or passcode. plancy is only told whether it matched. Your biometric data never reaches plancy or us.',
      ],
    },
    {
      heading: 'Backups',
      paragraphs: [
        'iPhone backups — iCloud Backup, or a backup to your computer — include plancy’s data, under Apple’s terms and your own backup settings. We can’t see them.',
      ],
    },
    {
      heading: 'Your control over your data',
      paragraphs: [
        'Because your data lives on your device, you are in charge of it: change or delete anything in the app, or delete plancy to remove its data from your iPhone. Copies in your backups follow your backup settings.',
        'We hold nothing about you, so there is nothing for us to show you, correct, hand over or delete. That applies wherever you live, including under the GDPR in Europe and Malaysia’s Personal Data Protection Act.',
      ],
    },
    {
      heading: 'Children',
      paragraphs: ['plancy is for a general audience and collects no data from anyone, children included.'],
    },
    {
      heading: 'If this changes',
      paragraphs: [
        'If a future version of plancy changes any of this — for example, by syncing between your devices through your own iCloud account — we will update this policy and the date at the top before that version is released, and say so in its App Store release notes.',
      ],
    },
    {
      heading: 'Contact',
      paragraphs: ['Questions about this policy, or about plancy: support@clancyhq.com. Clancy Sdn Bhd, Malaysia.'],
    },
  ] satisfies PolicySection[],
};

/** The policy as Markdown, for the website. */
export function privacyMarkdown(): string {
  const out = [`# ${PRIVACY.title}`, '', `Effective ${PRIVACY.effective}`, '', ...PRIVACY.intro.flatMap((p) => [p, ''])];
  for (const s of PRIVACY.sections) out.push(`## ${s.heading}`, '', ...s.paragraphs.flatMap((p) => [p, '']));
  return `${out.join('\n').trimEnd()}\n`;
}
