'use strict';

// Rule engine and recovery.yaml parsing. These cover layouts the v0.2.0
// indentation-dependent regexes could not read.

const test = require('node:test');
const assert = require('node:assert');
const { RULES, EVALUATORS, evaluate } = require('../src/rules/engine');
const { parseRecovery } = require('../src/recovery');

// In-memory repo: `files` maps path -> content.
function fakeRepo(files = {}) {
  return { root: '/x', name: 'x', has: (f) => f in files, read: (f) => files[f], write: () => {} };
}

function score(yamlText, { facts = {}, files = {} } = {}) {
  const f = { pinned: 'package-lock.json', envVars: [], ...facts };
  const repo = fakeRepo({ 'RECOVERY.md': '', ...files });
  const { results, score: s } = evaluate({ repo, facts: f, recovery: { text: yamlText, doc: parseRecovery(yamlText) } });
  return { score: s, pass: Object.fromEntries(results.map((r) => [r.id, r.pass])) };
}

const CANONICAL = `schema_version: "0.1"
component:
  name: "app"
  ecosystem: "node"
build:
  toolchain:
    node: "20.11.1"
  steps:
    - "npm run build"
runtime:
  env_vars:
    - name: PORT
owners:
  build: "Alice"
  release: "Bob"
`;

test('rules.json: ids unique, weights sum to 100, every rule has an evaluator', () => {
  const ids = RULES.map((r) => r.id);
  assert.strictEqual(new Set(ids).size, ids.length);
  assert.strictEqual(RULES.reduce((s, r) => s + r.weight, 0), 100);
  for (const r of RULES) assert.strictEqual(typeof EVALUATORS[r.id], 'function', r.id);
});

test('canonical recovery.yaml scores 100', () => {
  assert.strictEqual(score(CANONICAL, { facts: { envVars: ['PORT'] } }).score, 100);
});

test('4-space indentation scores the same as 2-space', () => {
  const fourSpace = CANONICAL.replace(/^( +)/gm, (s) => s + s);
  assert.notStrictEqual(fourSpace, CANONICAL);
  assert.strictEqual(score(fourSpace, { facts: { envVars: ['PORT'] } }).score, 100);
});

test('flow-style mappings and sequences are read', () => {
  const flow = `schema_version: "0.1"
build: { toolchain: { node: 20.11.1, java: 17 }, steps: [npm run build] }
runtime: { env_vars: [{ name: PORT }] }
owners: { build: Alice, release: Bob }
`;
  assert.strictEqual(score(flow, { facts: { envVars: ['PORT'] } }).score, 100);
});

test('unquoted numeric versions count as pinned', () => {
  const y = 'build:\n  toolchain:\n    node: 20\n    java: 17.0\n';
  assert.strictEqual(score(y).pass['toolchain-pinned'], true);
});

test('ranges, TODO, empty or nested toolchain values are not pinned', () => {
  for (const v of ['">=18"', '"^20.0.0"', '"TODO"', '', '{ major: 20 }', '[20]']) {
    const y = `build:\n  toolchain:\n    node: ${v}\n`;
    assert.strictEqual(score(y).pass['toolchain-pinned'], false, v);
  }
  assert.strictEqual(score('build:\n  toolchain: {}\n').pass['toolchain-pinned'], false);
});

test('build steps: only TODO or empty does not count', () => {
  assert.strictEqual(score('build:\n  steps:\n    - "TODO"\n').pass['build-steps-declared'], false);
  assert.strictEqual(score('build:\n  steps: []\n').pass['build-steps-declared'], false);
  assert.strictEqual(score('build:\n  steps: "make"\n').pass['build-steps-declared'], false);
  assert.strictEqual(score('build:\n  steps:\n    - "TODO"\n    - make\n').pass['build-steps-declared'], true);
});

test('env vars: every detected name must be listed; a prefix match is not enough', () => {
  const y = 'runtime:\n  env_vars:\n    - name: DB\n';
  assert.strictEqual(score(y, { facts: { envVars: ['DB'] } }).pass['env-vars-documented'], true);
  assert.strictEqual(score(y, { facts: { envVars: ['DB', 'PORT'] } }).pass['env-vars-documented'], false);
  assert.strictEqual(score('runtime:\n  env_vars:\n    - name: DB_HOST\n', { facts: { envVars: ['DB'] } }).pass['env-vars-documented'], false);
  assert.strictEqual(score('runtime:\n  env_vars: []\n').pass['env-vars-documented'], true);
  assert.strictEqual(score('runtime:\n  start: x\n').pass['env-vars-documented'], false);
});

test('env vars: a name elsewhere in the file (e.g. component.name) does not count', () => {
  const y = 'component:\n  name: PORT\nruntime:\n  env_vars: []\n';
  assert.strictEqual(score(y, { facts: { envVars: ['PORT'] } }).pass['env-vars-documented'], false);
});

test('owners: TODO values fail, named values pass, a TODO comment is ignored', () => {
  assert.strictEqual(score('owners:\n  build: "TODO"\n  release: Bob\n').pass['owners-named'], false);
  assert.strictEqual(score('owners:\n  build: Alice   # TODO confirm\n').pass['owners-named'], true);
  assert.strictEqual(score('owners: Alice\n').pass['owners-named'], false);
  assert.strictEqual(score('owners: {}\n').pass['owners-named'], false);
});

test('schema_version must be a top-level key', () => {
  assert.strictEqual(score('schema_version: "0.1"\n').pass['schema-version-declared'], true);
  assert.strictEqual(score('component:\n  schema_version: "0.1"\n').pass['schema-version-declared'], false);
});

test('invalid or non-mapping YAML does not throw; only "present" can pass', () => {
  for (const y of ['build: [unclosed\n', '- a\n- b\n', 'just a string\n', '# only a comment\n']) {
    const r = score(y);
    assert.strictEqual(r.pass['recovery-yaml-present'], true, y);
    assert.strictEqual(r.pass['schema-version-declared'], false, y);
    assert.strictEqual(r.pass['build-steps-declared'], false, y);
  }
});

test('CRLF recovery.yaml parses the same as LF', () => {
  const crlf = CANONICAL.replace(/\n/g, '\r\n');
  assert.deepStrictEqual(parseRecovery(crlf), parseRecovery(CANONICAL));
});

test('duplicate keys are tolerated by check (validate will report them)', () => {
  assert.strictEqual(score('schema_version: "0.1"\nschema_version: "0.1"\n').pass['schema-version-declared'], true);
});

test('.env and RECOVERY.md rules read the repo, not recovery.yaml', () => {
  assert.strictEqual(score('', { files: { '.env': 'X=1' } }).pass['no-dotenv-file'], false);
  assert.strictEqual(score('').pass['no-dotenv-file'], true);
  assert.strictEqual(score('').pass['recovery-yaml-present'], false);
});
