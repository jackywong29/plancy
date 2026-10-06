#!/usr/bin/env node
/**
 * Writes the web copy of plancy's privacy policy from the one in the app:
 *
 *   node scripts/legal-pages.mjs
 *
 * → docs/legal/plancy-privacy-policy.md, to publish at
 *   https://clancyhq.com/plancy/privacy (the App Store's Privacy Policy URL).
 *
 * src/legal/legal.test.ts fails while the two differ, so an edit to the
 * policy can't reach the app without reaching the website too.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { privacyMarkdown } from '../src/legal/privacy.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
mkdirSync(join(root, 'docs', 'legal'), { recursive: true });
writeFileSync(join(root, 'docs', 'legal', 'plancy-privacy-policy.md'), privacyMarkdown());
console.log('docs/legal/plancy-privacy-policy.md');
