'use strict';

// Shared by the golden-output test and test/update-golden.js.
// Each case copies a fixture into a temp dir whose basename is the fixture
// name (detect() falls back to it), applies setup, runs the CLI, and captures
// stdout, stderr, exit code and any files the command writes.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const FIXTURES = path.join(__dirname, 'fixtures');
const GOLDEN = path.join(__dirname, 'golden');
const BIN = path.join(ROOT, 'bin', 'srp.js');

const WRITTEN = ['recovery.yaml', 'RECOVERY.md'];

const CASES = [
  { name: 'help', fixture: null, args: [] },
  { name: 'help-unknown-command', fixture: null, args: ['frobnicate'] },
  { name: 'version', fixture: null, args: ['--version'] },
  { name: 'version-short', fixture: null, args: ['-v'] },
  { name: 'sbom-placeholder', fixture: null, args: ['sbom'] },
  { name: 'badge-placeholder', fixture: null, args: ['badge'] },

  { name: 'empty-check', fixture: null, args: ['check'] },
  { name: 'empty-init', fixture: null, args: ['init'], files: WRITTEN },
  { name: 'empty-init-then-check', fixture: null, pre: [['init']], args: ['check'] },
  { name: 'init-exists', fixture: null, pre: [['init']], args: ['init'] },
  { name: 'init-force', fixture: null, pre: [['init']], args: ['init', '--force'], files: WRITTEN },

  { name: 'node-basic-check', fixture: 'node-basic', args: ['check'] },
  { name: 'node-basic-init', fixture: 'node-basic', args: ['init'], files: WRITTEN },
  { name: 'node-basic-init-then-check', fixture: 'node-basic', pre: [['init']], args: ['check'] },
  { name: 'node-basic-init-then-check-json', fixture: 'node-basic', pre: [['init']], args: ['check', '--json'] },
  { name: 'node-pnpm-init', fixture: 'node-pnpm', args: ['init'], files: WRITTEN },
  { name: 'node-pnpm-init-then-check', fixture: 'node-pnpm', pre: [['init']], args: ['check'] },
  { name: 'node-yarn-init', fixture: 'node-yarn', args: ['init'], files: WRITTEN },
  { name: 'node-yarn-init-then-check', fixture: 'node-yarn', pre: [['init']], args: ['check', '--min', '40'] },
  { name: 'node-nolock-init', fixture: 'node-nolock', args: ['init'], files: WRITTEN },

  { name: 'maven-init', fixture: 'maven', args: ['init'], files: WRITTEN },
  { name: 'maven-init-then-check', fixture: 'maven', pre: [['init']], args: ['check'] },
  { name: 'maven-property-init', fixture: 'maven-property', args: ['init'], files: WRITTEN },
  { name: 'gradle-init', fixture: 'gradle', args: ['init'], files: WRITTEN },
  { name: 'gradle-init-then-check-json', fixture: 'gradle', pre: [['init']], args: ['check', '--json'] },

  { name: 'complete-check', fixture: 'complete', args: ['check'] },
  { name: 'complete-check-json', fixture: 'complete', args: ['check', '--json', '--min', '90'] },
  { name: 'complete-check-min-101', fixture: 'complete', args: ['check', '--min', '101'] },
  { name: 'complete-check-crlf', fixture: 'complete', crlf: true, args: ['check'] },
  { name: 'complete-check-dotenv', fixture: 'complete', dotenv: true, args: ['check'] },
];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function toCrlf(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) toCrlf(p);
    else fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replace(/\r?\n/g, '\r\n'));
  }
}

function runCli(entry, cwd, args) {
  const r = spawnSync(process.execPath, [entry, ...args], { cwd, encoding: 'utf8' });
  if (r.error) throw r.error;
  return { stdout: r.stdout, stderr: r.stderr, status: r.status };
}

// Runs one case with the given entry script and returns everything it produced.
function runCase(c, entry = BIN) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'srp-test-'));
  const dir = path.join(tmp, c.fixture || 'empty-repo');
  try {
    if (c.fixture) copyDir(path.join(FIXTURES, c.fixture), dir);
    else fs.mkdirSync(dir);
    if (c.crlf) toCrlf(dir);
    // Created at runtime so no .env file is ever committed.
    if (c.dotenv) fs.writeFileSync(path.join(dir, '.env'), 'PLACEHOLDER=1\n');
    for (const p of c.pre || []) {
      const r = runCli(entry, dir, p);
      if (r.status !== 0) throw new Error(`${c.name}: setup "${p.join(' ')}" exited ${r.status}`);
    }
    const out = runCli(entry, dir, c.args);
    out.files = {};
    for (const f of c.files || []) out.files[f] = fs.readFileSync(path.join(dir, f), 'utf8');
    return out;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

module.exports = { CASES, GOLDEN, BIN, runCase };
