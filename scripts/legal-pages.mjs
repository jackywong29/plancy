#!/usr/bin/env node
/**
 * Writes the web copy of plancy's privacy policy from the one in the app:
 *
 *   node scripts/legal-pages.mjs
 *
 * → docs/legal/plancy-privacy-policy.md, and both web pages (privacy and
 *   support) copied into the Clancy HQ site repo, which serves them at
 *   https://clancyhq.com/plancy/privacy and /plancy/support.
 *
 * src/legal/legal.test.ts fails while the two differ, so an edit to the
 * policy can't reach the app without reaching the website too.
 */
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { privacyMarkdown } from '../src/legal/privacy.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'docs', 'legal'), { recursive: true });
writeFileSync(join(root, 'docs', 'legal', 'plancy-privacy-policy.md'), privacyMarkdown());
console.log('docs/legal/plancy-privacy-policy.md');

// The pages themselves are served by the Clancy HQ site (its app/plancy/),
// from these two files. Where that repo is checked out, keep it in step;
// it goes live when that repo is pushed.
const site = process.env.CLANCY_SITE ?? join(homedir(), 'Developer', 'Claude', 'crm-platform');
if (existsSync(join(site, 'app'))) {
  mkdirSync(join(site, 'content', 'plancy'), { recursive: true });
  copyFileSync(join(root, 'docs', 'legal', 'plancy-privacy-policy.md'), join(site, 'content', 'plancy', 'privacy.md'));
  copyFileSync(join(root, 'docs', 'legal', 'plancy-support.md'), join(site, 'content', 'plancy', 'support.md'));
  console.log(`${site}/content/plancy/{privacy,support}.md — push that repo to publish`);
}
