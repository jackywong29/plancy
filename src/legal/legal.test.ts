import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import licences from './licences.json';
import { privacyMarkdown } from './privacy';

const root = join(__dirname, '..', '..');

describe('open-source licences', () => {
  const listed = new Set(licences.flatMap((g) => g.names));

  it('cover every dependency that ships (re-run `node scripts/licences.mjs` after changing one)', () => {
    const deps = Object.keys(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).dependencies);
    const webOnly = new Set(['react-dom', 'react-native-web']);
    expect(deps.filter((d) => !webOnly.has(d) && !listed.has(d))).toEqual([]);
  });

  it('each carry their full text', () => {
    for (const g of licences) expect(g.text.length).toBeGreaterThan(100);
  });
});

describe('privacy policy', () => {
  it('on the website matches the one in the app (re-run `node scripts/legal-pages.mjs`)', () => {
    expect(readFileSync(join(root, 'docs', 'legal', 'plancy-privacy-policy.md'), 'utf8')).toBe(privacyMarkdown());
  });

  it('gives a way to reach us', () => {
    expect(privacyMarkdown()).toContain('support@clancyhq.com');
  });
});
