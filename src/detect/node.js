'use strict';

function detectNode(repo, f) {
  if (!repo.has('package.json')) return false;
  let pkg = {};
  try { pkg = JSON.parse(repo.read('package.json')); } catch (e) { /* ignore */ }
  const s = pkg.scripts || {};
  f.ecosystem = 'node';
  f.name = pkg.name || f.name;
  f.toolchain.node = repo.has('.nvmrc') ? repo.read('.nvmrc').trim() : (pkg.engines && pkg.engines.node) || null;
  if (repo.has('package-lock.json')) { f.pinned = 'package-lock.json'; f.install = 'npm ci'; }
  else if (repo.has('pnpm-lock.yaml')) { f.pinned = 'pnpm-lock.yaml'; f.install = 'pnpm install --frozen-lockfile'; }
  else if (repo.has('yarn.lock')) { f.pinned = 'yarn.lock'; f.install = 'yarn install --frozen-lockfile'; }
  else { f.install = 'npm install'; }
  if (s.build) f.build.push('npm run build');
  if (s.start) f.start = 'npm start';
  return true;
}

module.exports = { detectNode };
