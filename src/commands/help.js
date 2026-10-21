'use strict';

const { version } = require('../../package.json');

function help() {
  console.log(`castler-srp ${version}: software recoverability readiness check by Castler

Usage:
  srp init [--force]          Draft recovery.yaml and RECOVERY.md from this repo
  srp check [--min N] [--json]  Score readiness (exits 1 if score < N, default 70)
  srp sbom                    Generate a CycloneDX SBOM (coming soon)
  srp badge                   Generate a self-assessed badge (coming soon)
  srp --version`);
  return 0;
}

module.exports = { help };
