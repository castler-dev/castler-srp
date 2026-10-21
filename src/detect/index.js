'use strict';

const { detectNode } = require('./node');
const { detectMaven } = require('./maven');
const { detectGradle } = require('./gradle');
const { detectEnvVars } = require('./env');
const { detectServices } = require('./compose');

// Ecosystem detectors in priority order; the first that matches wins.
const ECOSYSTEMS = [detectNode, detectMaven, detectGradle];

// Reads the repo and collects facts used by init and check.
function detect(repo) {
  const f = { name: repo.name, ecosystem: 'unknown', toolchain: {}, install: null,
    build: [], start: null, pinned: null, envVars: [], services: [] };
  ECOSYSTEMS.some((d) => d(repo, f));
  detectEnvVars(repo, f);
  detectServices(repo, f);
  return f;
}

module.exports = { detect };
