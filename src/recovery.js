'use strict';

const YAML = require('yaml');

const SCHEMA_VERSION = '0.1';
const FILE = 'recovery.yaml';

// Loads recovery.yaml. `text` is the raw file ('' when absent); `doc` is the
// parsed mapping, or {} when the file is absent, empty, not a mapping, or not
// valid YAML (check scores what it can; "srp validate" will report the errors).
function loadRecovery(repo) {
  const text = repo.has(FILE) ? repo.read(FILE) : '';
  return { text, doc: parseRecovery(text) };
}

function parseRecovery(text) {
  const parsed = YAML.parseDocument(text, { uniqueKeys: false });
  if (parsed.errors.length) return {};
  const doc = parsed.toJS();
  return doc && typeof doc === 'object' && !Array.isArray(doc) ? doc : {};
}

module.exports = { SCHEMA_VERSION, FILE, loadRecovery, parseRecovery };
