'use strict';

const { detect } = require('../detect');
const { SCHEMA_VERSION, FILE } = require('../recovery');

const q = (s) => JSON.stringify(String(s));
const val = (v) => (v ? q(v) : '"TODO"');

// Built line by line (not YAML.stringify) so the draft keeps its comments and layout.
function draftRecoveryYaml(f) {
  const y = [];
  y.push(`schema_version: ${q(SCHEMA_VERSION)}`, '');
  y.push('component:', `  name: ${q(f.name)}`, `  ecosystem: ${q(f.ecosystem)}`, '');
  y.push('build:', '  toolchain:');
  const tc = Object.keys(f.toolchain);
  if (tc.length) tc.forEach((k) => y.push(`    ${k}: ${val(f.toolchain[k])}`));
  else y.push('    runtime: "TODO"');
  y.push(`  install: ${val(f.install)}`, '  steps:');
  if (f.build.length) f.build.forEach((s) => y.push(`    - ${q(s)}`));
  else y.push('    - "TODO"');
  y.push('');
  y.push('runtime:', `  start: ${val(f.start)}`);
  if (f.envVars.length) {
    y.push('  env_vars:   # names only, never values');
    f.envVars.forEach((n) => y.push(`    - name: ${n}`));
  } else {
    y.push('  env_vars: []   # names only, never values');
  }
  if (f.services.length) {
    y.push('  services:');
    f.services.forEach((s) => y.push(`    - type: ${s.type}`, `      version: ${val(s.version)}`, '      confidence: inferred'));
  } else {
    y.push('  services: []');
  }
  y.push('', 'owners:', '  build: "TODO"', '  release: "TODO"', '');
  return y.join('\n');
}

function draftRecoveryMd(f) {
  return [
    `# Recovery guide: ${f.name}`, '',
    '## Build', f.build.length ? f.build.map((s) => `- \`${s}\``).join('\n') : 'TODO: how to build this from source.', '',
    '## Run', f.start ? `- \`${f.start}\`` : 'TODO: how to start it.', '',
    '## Configuration', f.envVars.length ? f.envVars.map((n) => `- \`${n}\``).join('\n') : 'TODO: list required environment variables (names only).', '',
    '## Known gaps', 'TODO: anything a stranger would need to know to rebuild and run this.', '',
  ].join('\n');
}

// Drafts recovery.yaml and RECOVERY.md. Returns the exit code.
function init(repo, args) {
  const force = args.flag('--force');
  if (repo.has(FILE) && !force) {
    console.error('recovery.yaml already exists. Use "srp init --force" to overwrite.');
    return 1;
  }
  const f = detect(repo);
  repo.write(FILE, draftRecoveryYaml(f));
  if (!repo.has('RECOVERY.md') || force) repo.write('RECOVERY.md', draftRecoveryMd(f));

  console.log('Created recovery.yaml and RECOVERY.md.');
  console.log('Fill in every "TODO", then run: srp check');
  return 0;
}

module.exports = { init, draftRecoveryYaml, draftRecoveryMd };
