#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { version } = require('./package.json');

const SCHEMA_VERSION = '0.1';
const cwd = process.cwd();
const argv = process.argv.slice(2);
const cmd = argv[0];
const flag = (n) => argv.includes(n);
const opt = (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] ? argv[i + 1] : d; };

const has = (f) => fs.existsSync(path.join(cwd, f));
const read = (f) => fs.readFileSync(path.join(cwd, f), 'utf8').replace(/\r\n/g, '\n');
const q = (s) => JSON.stringify(String(s));
const val = (v) => (v ? q(v) : '"TODO"');

// ---------- detect: read the repo and collect facts ----------
function detect() {
  const f = { name: path.basename(cwd), ecosystem: 'unknown', toolchain: {}, install: null,
    build: [], start: null, pinned: null, envVars: [], services: [] };

  if (has('package.json')) {
    let pkg = {};
    try { pkg = JSON.parse(read('package.json')); } catch (e) { /* ignore */ }
    const s = pkg.scripts || {};
    f.ecosystem = 'node';
    f.name = pkg.name || f.name;
    f.toolchain.node = has('.nvmrc') ? read('.nvmrc').trim() : (pkg.engines && pkg.engines.node) || null;
    if (has('package-lock.json')) { f.pinned = 'package-lock.json'; f.install = 'npm ci'; }
    else if (has('pnpm-lock.yaml')) { f.pinned = 'pnpm-lock.yaml'; f.install = 'pnpm install --frozen-lockfile'; }
    else if (has('yarn.lock')) { f.pinned = 'yarn.lock'; f.install = 'yarn install --frozen-lockfile'; }
    else { f.install = 'npm install'; }
    if (s.build) f.build.push('npm run build');
    if (s.start) f.start = 'npm start';
  } else if (has('pom.xml')) {
    const pom = read('pom.xml');
    const m = pom.match(/<maven\.compiler\.release>([^<]+)</) ||
              pom.match(/<maven\.compiler\.source>([^<]+)</) ||
              pom.match(/<java\.version>([^<]+)</);
    const mvn = has('mvnw') ? './mvnw' : 'mvn';
    f.ecosystem = 'java-maven';
    f.toolchain.java = m && !m[1].trim().startsWith('$') ? m[1].trim() : null;
    f.pinned = has('mvnw') ? 'mvnw' : null;
    f.install = `${mvn} -B dependency:go-offline`;
    f.build.push(`${mvn} -B package -DskipTests`);
  } else if (has('build.gradle') || has('build.gradle.kts')) {
    const g = has('gradlew') ? './gradlew' : 'gradle';
    f.ecosystem = 'java-gradle';
    f.toolchain.java = null;
    f.pinned = has('gradlew') ? 'gradlew' : null;
    f.build.push(`${g} build -x test`);
  }

  for (const e of ['.env.example', '.env.sample', '.env.template']) {
    if (!has(e)) continue;
    for (const line of read(e).split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (m && !f.envVars.includes(m[1])) f.envVars.push(m[1]);
    }
  }

  const KNOWN = ['postgres', 'mysql', 'mariadb', 'mongo', 'redis', 'rabbitmq', 'kafka', 'elasticsearch'];
  for (const c of ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml']) {
    if (!has(c)) continue;
    const text = read(c);
    const re = /image:\s*["']?([^\s"']+)/g;
    let m;
    while ((m = re.exec(text))) {
      const last = m[1].split('/').pop();
      const [base, tag] = last.split(':');
      const type = KNOWN.find((k) => base.startsWith(k));
      if (type && !f.services.some((s) => s.type === type)) f.services.push({ type, version: tag || null });
    }
  }
  return f;
}

// ---------- init: draft recovery.yaml + RECOVERY.md ----------
function init() {
  if (has('recovery.yaml') && !flag('--force')) {
    console.error('recovery.yaml already exists. Use "srp init --force" to overwrite.');
    process.exit(1);
  }
  const f = detect();
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
  fs.writeFileSync(path.join(cwd, 'recovery.yaml'), y.join('\n'));

  if (!has('RECOVERY.md') || flag('--force')) {
    const md = [
      `# Recovery guide: ${f.name}`, '',
      '## Build', f.build.length ? f.build.map((s) => `- \`${s}\``).join('\n') : 'TODO: how to build this from source.', '',
      '## Run', f.start ? `- \`${f.start}\`` : 'TODO: how to start it.', '',
      '## Configuration', f.envVars.length ? f.envVars.map((n) => `- \`${n}\``).join('\n') : 'TODO: list required environment variables (names only).', '',
      '## Known gaps', 'TODO: anything a stranger would need to know to rebuild and run this.', '',
    ].join('\n');
    fs.writeFileSync(path.join(cwd, 'RECOVERY.md'), md);
  }

  console.log('Created recovery.yaml and RECOVERY.md.');
  console.log('Fill in every "TODO", then run: srp check');
}

// ---------- check: score readiness ----------
function check() {
  const f = detect();
  const y = has('recovery.yaml') ? read('recovery.yaml') : '';
  const block = (re) => ((y.match(re) || [])[1] || '');

  const tcBlock = block(/^ {2}toolchain:[ \t]*\n((?: {4}.+\n?)+)/m);
  const versions = [...tcBlock.matchAll(/:\s*["']?([^"'\n#]+)/g)].map((m) => m[1].trim());
  const stepsBlock = block(/^ {2}steps:[ \t]*\n((?: {4}-.+\n?)+)/m);
  const steps = [...stepsBlock.matchAll(/-\s*["']?([^"'\n]+)/g)].map((m) => m[1].trim()).filter((s) => s !== 'TODO');
  const ownersBlock = block(/^owners:[ \t]*\n((?: {2}.+\n?)+)/m);

  const rules = [
    { w: 15, ok: !!y, msg: 'recovery.yaml present' },
    { w: 10, ok: has('RECOVERY.md'), msg: 'RECOVERY.md present' },
    { w: 5, ok: /^schema_version:/m.test(y), msg: 'schema_version declared' },
    { w: 15, ok: versions.length > 0 && versions.every((v) => /^v?\d+(\.\d+)*$/.test(v)), msg: 'toolchain versions pinned (exact, no ranges or TODO)' },
    { w: 15, ok: steps.length > 0, msg: 'build steps declared' },
    { w: 15, ok: !!f.pinned, msg: 'dependencies or build tool pinned (lockfile or wrapper)' },
    { w: 10, ok: /^ {2}env_vars:/m.test(y) && f.envVars.every((n) => new RegExp(`name:\\s*["']?${n}\\b`).test(y)), msg: 'environment variables documented (names only)' },
    { w: 5, ok: ownersBlock.trim() !== '' && !/TODO/.test(ownersBlock), msg: 'build and release owners named' },
    { w: 10, ok: !has('.env'), msg: 'no .env file in repo root' },
  ];

  const score = rules.reduce((s, r) => s + (r.ok ? r.w : 0), 0);
  const min = Number(opt('--min', 70));

  if (flag('--json')) {
    console.log(JSON.stringify({ tool: 'castler-srp', version, score, min, pass: score >= min,
      ecosystem: f.ecosystem, rules: rules.map((r) => ({ rule: r.msg, weight: r.w, pass: r.ok })) }, null, 2));
  } else {
    console.log(`\nsrp check: ${f.name} (${f.ecosystem})\n`);
    rules.forEach((r) => console.log(`  ${r.ok ? 'PASS' : 'FAIL'}  ${r.msg}  [${r.w}]`));
    console.log(`\n  Readiness score: ${score}/100 (minimum ${min})`);
    console.log('  Self-assessed. This is not a Castler verification.\n');
  }
  process.exit(score >= min ? 0 : 1);
}

function help() {
  console.log(`castler-srp ${version}: software recoverability readiness check by Castler

Usage:
  srp init [--force]          Draft recovery.yaml and RECOVERY.md from this repo
  srp check [--min N] [--json]  Score readiness (exits 1 if score < N, default 70)
  srp sbom                    Generate a CycloneDX SBOM (coming soon)
  srp badge                   Generate a self-assessed badge (coming soon)
  srp --version`);
}

switch (cmd) {
  case 'init': init(); break;
  case 'check': check(); break;
  case 'sbom':
  case 'badge': console.log(`"srp ${cmd}" is coming in a later release.`); break;
  case '-v': case '--version': case 'version': console.log(version); break;
  default: help();
}
