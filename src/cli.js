'use strict';

const { version } = require('../package.json');
const { createRepo } = require('./repo');
const { init } = require('./commands/init');
const { check } = require('./commands/check');
const { sbom } = require('./commands/sbom');
const { badge } = require('./commands/badge');
const { help } = require('./commands/help');

function parseArgs(argv) {
  return {
    cmd: argv[0],
    flag: (n) => argv.includes(n),
    opt: (n, d) => { const i = argv.indexOf(n); return i > -1 && argv[i + 1] ? argv[i + 1] : d; },
  };
}

// Runs one srp command against the repo at `cwd`. Returns the exit code.
function run(argv, cwd) {
  const args = parseArgs(argv);
  const repo = createRepo(cwd);
  switch (args.cmd) {
    case 'init': return init(repo, args);
    case 'check': return check(repo, args);
    case 'sbom': return sbom(repo, args);
    case 'badge': return badge(repo, args);
    case '-v': case '--version': case 'version': console.log(version); return 0;
    default: return help();
  }
}

module.exports = { run, parseArgs };
