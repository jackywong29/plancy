#!/usr/bin/env node
/**
 * Writes src/legal/licences.json: the open-source licences of everything that
 * ships inside plancy, for Settings → Open-source licences.
 *
 *   node scripts/licences.mjs
 *
 * Run it after adding, removing or updating a dependency (the licence test
 * in src/legal/legal.test.ts fails until you do). It takes a minute, because
 * the only honest way to know which packages reach the phone is to bundle the
 * app and read the source map: most of node_modules is build tooling that
 * never ships.
 *
 * What it collects:
 * - every package in the iOS JavaScript bundle;
 * - every direct dependency with native code (autolinked Expo modules ship
 *   their Swift even when no JavaScript imports them);
 * - the native libraries React Native builds in, listed by hand in NATIVE
 *   below, because their licence files don't come with the prebuilt binary.
 *
 * Identical licence texts are grouped, so the screen reads "react, scheduler,
 * react-is — MIT, Meta" once rather than three times.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const modules = join(root, 'node_modules');
const read = (path) => readFileSync(path, 'utf8');
const pkgJson = (name) => JSON.parse(read(join(modules, name, 'package.json')));

/** Packages with no licence file of their own, and the package from the same project whose file they share. */
const SAME_PROJECT = {
  '@expo/ui': 'expo',
  'expo-router': 'expo',
  'metro-runtime': 'react-native',
};

/** Web-only, or tooling: listed in package.json but never on the phone. */
const NOT_SHIPPED = new Set(['react-dom', 'react-native-web']);

const BSD3 = (holder) => `Copyright (c) ${holder}
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its contributors
   may be used to endorse or promote products derived from this software
   without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`;

const MIT = (holder) => `MIT License

Copyright (c) ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

const BSL = `Boost Software License - Version 1.0 - August 17th, 2003

Permission is hereby granted, free of charge, to any person or organization
obtaining a copy of the software and accompanying documentation covered by
this license (the "Software") to use, reproduce, display, distribute,
execute, and transmit the Software, and to prepare derivative works of the
Software, and to permit third-parties to whom the Software is furnished to
do so, all subject to the following:

The copyright notices in the Software and this entire statement, including
the above license grant, this restriction and the following disclaimer,
must be included in all copies of the Software, in whole or in part, and
all derivative works of the Software, unless such copies or derivative
works are solely in the form of machine-executable object code generated by
a source language processor.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO EVENT
SHALL THE COPYRIGHT HOLDERS OR ANYONE DISTRIBUTING THE SOFTWARE BE LIABLE
FOR ANY DAMAGES OR OTHER LIABILITY, WHETHER IN CONTRACT, TORT OR OTHERWISE,
ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.`;

/** The full Apache 2.0 text, from TypeScript's copy (a dev dependency, so always installed). */
const APACHE = () => read(join(modules, 'typescript', 'LICENSE.txt')).trim();

/** Native libraries inside React Native's prebuilt frameworks; their licence files aren't shipped with them. */
const NATIVE = [
  { name: 'Hermes', licence: 'MIT', text: () => MIT('Meta Platforms, Inc. and affiliates.') },
  { name: 'folly', licence: 'Apache-2.0', text: () => `Copyright (c) Meta Platforms, Inc. and affiliates.\n\n${APACHE()}` },
  { name: 'glog', licence: 'BSD-3-Clause', text: () => BSD3('2008, Google Inc.') },
  { name: 'double-conversion', licence: 'BSD-3-Clause', text: () => BSD3('2006-2011, the V8 project authors.') },
  { name: 'SocketRocket', licence: 'BSD-3-Clause', text: () => BSD3('2016-present, Facebook, Inc.') },
  { name: 'fmt', licence: 'MIT', text: () => MIT('2012 - present, Victor Zverovich and {fmt} contributors') },
  { name: 'Boost', licence: 'BSL-1.0', text: () => BSL },
  { name: 'fast_float', licence: 'BSL-1.0', text: () => BSL },
];

/** Packages in the iOS bundle, read off its source map. */
function bundled() {
  const out = mkdtempSync(join(tmpdir(), 'plancy-licences-'));
  try {
    execFileSync('npx', ['expo', 'export', '--platform', 'ios', '--source-maps', '--output-dir', out], {
      cwd: root,
      stdio: 'ignore',
    });
    const dir = join(out, '_expo', 'static', 'js', 'ios');
    const map = readdirSync(dir).find((f) => f.endsWith('.map'));
    const names = new Set();
    for (const source of JSON.parse(read(join(dir, map))).sources) {
      const hits = source.match(/node_modules\/((?:@[^/]+\/)?[^/]+)/g);
      if (hits) names.add(hits.at(-1).slice('node_modules/'.length));
    }
    return names;
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}

/** Direct dependencies that autolink native code. */
function native() {
  const deps = Object.keys(JSON.parse(read(join(root, 'package.json'))).dependencies);
  return deps.filter((name) => {
    if (NOT_SHIPPED.has(name)) return false;
    const dir = join(modules, name);
    return existsSync(join(dir, 'expo-module.config.json')) || readdirSync(dir).some((f) => f.endsWith('.podspec'));
  });
}

function licenceFile(name) {
  const dir = join(modules, name);
  const file = readdirSync(dir).find((f) => /^(licen[cs]e|copying)/i.test(f));
  return file ? read(join(dir, file)).trim() : null;
}

/** A package's licence text, from its own file, its project's, or (MIT only) the standard text with its author. */
function textFor(name) {
  const own = licenceFile(name);
  if (own) return own;
  const sibling = SAME_PROJECT[name] ?? (name.startsWith('@react-native/') ? 'react-native' : null);
  if (sibling) return licenceFile(sibling);
  const pkg = pkgJson(name);
  const author = typeof pkg.author === 'string' ? pkg.author.replace(/\s*<.*$/, '') : pkg.author?.name;
  if (pkg.license === 'MIT' && author) return MIT(author);
  throw new Error(`No licence text for ${name}: add it to SAME_PROJECT, or to NATIVE by hand.`);
}

const entries = [];
for (const name of new Set([...bundled(), ...native()])) {
  if (NOT_SHIPPED.has(name)) continue;
  const pkg = pkgJson(name);
  const licence = typeof pkg.license === 'string' ? pkg.license : pkg.license?.type ?? 'See text';
  entries.push({ name, licence, text: textFor(name) });
}
for (const n of NATIVE) entries.push({ name: n.name, licence: n.licence, text: n.text() });

// One group per distinct text, packages A–Z inside it, groups by their first package.
const groups = new Map();
for (const e of entries) {
  const key = e.text.replace(/\s+/g, ' ');
  const group = groups.get(key) ?? { names: [], licence: e.licence, text: e.text };
  group.names.push(e.name);
  groups.set(key, group);
}
const byName = (a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' });
const list = [...groups.values()]
  .map((g) => ({ ...g, names: g.names.sort(byName) }))
  .sort((a, b) => byName(a.names[0], b.names[0]));

writeFileSync(join(root, 'src', 'legal', 'licences.json'), `${JSON.stringify(list, null, 1)}\n`);
console.log(`${entries.length} components, ${list.length} distinct licences → src/legal/licences.json`);
