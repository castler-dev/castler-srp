'use strict';

// Regenerates test/golden from the current CLI output.
// Usage: node test/update-golden.js [entry-script]   (default: bin/srp.js)
// Only run this when a human-readable output change is intended, and list
// the exact changes in the change summary (the website demo replays them).

const fs = require('fs');
const path = require('path');
const { CASES, GOLDEN, BIN, runCase } = require('./helpers');

const entry = process.argv[2] ? path.resolve(process.argv[2]) : BIN;

fs.rmSync(GOLDEN, { recursive: true, force: true });
for (const c of CASES) {
  const out = runCase(c, entry);
  const dir = path.join(GOLDEN, c.name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'stdout.txt'), out.stdout);
  fs.writeFileSync(path.join(dir, 'stderr.txt'), out.stderr);
  fs.writeFileSync(path.join(dir, 'exit-code.txt'), `${out.status}\n`);
  for (const [name, text] of Object.entries(out.files)) {
    fs.mkdirSync(path.join(dir, 'files'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'files', name), text);
  }
  console.log(`${c.name}: exit ${out.status}`);
}
