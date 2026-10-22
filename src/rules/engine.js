'use strict';

const RULES = require('./rules.json');

const hasOwn = (o, k) => !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k);
const isMap = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const scalar = (v) => (v === null || v === undefined ? '' : String(v).trim());

// One evaluator per rule id in rules.json. Each gets { repo, facts, recovery }
// where recovery = { text, doc } from src/recovery.js.
const EVALUATORS = {
  'recovery-yaml-present': ({ recovery }) => !!recovery.text,

  'recovery-md-present': ({ repo }) => repo.has('RECOVERY.md'),

  'schema-version-declared': ({ recovery }) => hasOwn(recovery.doc, 'schema_version'),

  'toolchain-pinned': ({ recovery }) => {
    const tc = recovery.doc.build && recovery.doc.build.toolchain;
    if (!isMap(tc)) return false;
    const versions = Object.values(tc);
    return versions.length > 0 && versions.every((v) => !isMap(v) && !Array.isArray(v) && /^v?\d+(\.\d+)*$/.test(scalar(v)));
  },

  'build-steps-declared': ({ recovery }) => {
    const steps = recovery.doc.build && recovery.doc.build.steps;
    return Array.isArray(steps) && steps.map(scalar).some((s) => s !== '' && s !== 'TODO');
  },

  'dependencies-pinned': ({ facts }) => !!facts.pinned,

  'env-vars-documented': ({ facts, recovery }) => {
    const runtime = recovery.doc.runtime;
    if (!hasOwn(runtime, 'env_vars')) return false;
    const list = Array.isArray(runtime.env_vars) ? runtime.env_vars : [];
    const names = list.filter(isMap).map((e) => scalar(e.name));
    return facts.envVars.every((n) => names.includes(n));
  },

  // Every owner listed must have a non-empty name; "build:" with no value fails.
  'owners-named': ({ recovery }) => {
    const owners = recovery.doc.owners;
    if (!owners || typeof owners !== 'object') return false;
    const names = Object.values(owners);
    return names.length > 0 && names.every((v) => !isMap(v) && !Array.isArray(v) && scalar(v) !== '' && !/TODO/.test(scalar(v)));
  },

  'no-dotenv-file': ({ repo }) => !repo.has('.env'),
};

for (const r of RULES) {
  if (!EVALUATORS[r.id]) throw new Error(`rules.json: no evaluator for rule "${r.id}"`);
}

function evaluate(ctx, rules = RULES) {
  const results = rules.map((r) => ({ id: r.id, weight: r.weight, message: r.message, pass: !!EVALUATORS[r.id](ctx) }));
  const score = results.reduce((s, r) => s + (r.pass ? r.weight : 0), 0);
  return { results, score };
}

module.exports = { RULES, EVALUATORS, evaluate };
