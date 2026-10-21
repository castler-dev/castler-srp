'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const pkg = require('../package.json');

const ROOT = path.join(__dirname, '..');

test('package.json: bin points to an existing script with a node shebang', () => {
  const bin = path.join(ROOT, pkg.bin.srp);
  assert.ok(fs.existsSync(bin), pkg.bin.srp);
  assert.ok(fs.readFileSync(bin, 'utf8').startsWith('#!/usr/bin/env node\n'));
});

test('package.json: files ships bin and src, and yaml is the only dependency', () => {
  for (const f of ['bin/', 'src/', 'README.md', 'LICENSE']) assert.ok(pkg.files.includes(f), f);
  assert.deepStrictEqual(Object.keys(pkg.dependencies), ['yaml']);
});

test('package: every relative require resolves to a file under bin/ or src/', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  const sources = [...walk(path.join(ROOT, 'bin')), ...walk(path.join(ROOT, 'src'))].filter((f) => f.endsWith('.js'));
  for (const file of sources) {
    for (const m of fs.readFileSync(file, 'utf8').matchAll(/require\('(\.[^']+)'\)/g)) {
      const target = require.resolve(path.resolve(path.dirname(file), m[1]));
      const rel = path.relative(ROOT, target).split(path.sep).join('/');
      assert.ok(/^(bin|src)\//.test(rel) || rel === 'package.json', `${path.relative(ROOT, file)} requires ${rel}`);
    }
  }
});
