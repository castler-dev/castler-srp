'use strict';

const EXAMPLES = ['.env.example', '.env.sample', '.env.template'];

// Collects variable names only. Values are never captured.
function detectEnvVars(repo, f) {
  for (const e of EXAMPLES) {
    if (!repo.has(e)) continue;
    for (const line of repo.read(e).split('\n')) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (m && !f.envVars.includes(m[1])) f.envVars.push(m[1]);
    }
  }
}

module.exports = { detectEnvVars };
