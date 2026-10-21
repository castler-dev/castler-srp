'use strict';

// Every case must reproduce test/golden byte for byte. The goldens were
// recorded from v0.2.0 (index.js); regenerate with test/update-golden.js only
// for intended output changes.

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { CASES, GOLDEN, runCase } = require('./helpers');

const golden = (c, f) => fs.readFileSync(path.join(GOLDEN, c.name, f), 'utf8');

for (const c of CASES) {
  test(`golden: ${c.name} (srp ${c.args.join(' ')})`, () => {
    const out = runCase(c);
    assert.strictEqual(out.stdout, golden(c, 'stdout.txt'), 'stdout');
    assert.strictEqual(out.stderr, golden(c, 'stderr.txt'), 'stderr');
    assert.strictEqual(`${out.status}\n`, golden(c, 'exit-code.txt'), 'exit code');
    for (const f of c.files || []) assert.strictEqual(out.files[f], golden(c, path.join('files', f)), f);
  });
}

test('golden: every case has a recorded golden and no golden is orphaned', () => {
  const recorded = fs.readdirSync(GOLDEN).sort();
  assert.deepStrictEqual(recorded, CASES.map((c) => c.name).sort());
});
