'use strict';

const { version } = require('../../package.json');
const { detect } = require('../detect');
const { loadRecovery } = require('../recovery');
const { evaluate } = require('../rules/engine');
const { formatCheckText } = require('../output/text');
const { formatCheckJson } = require('../output/json');

// Scores readiness. Returns the exit code: 0 if score >= --min (default 70), else 1.
function check(repo, args) {
  const facts = detect(repo);
  const recovery = loadRecovery(repo);
  const { results, score } = evaluate({ repo, facts, recovery });
  const min = Number(args.opt('--min', 70));
  const result = { version, name: facts.name, ecosystem: facts.ecosystem, score, min, pass: score >= min, results };

  console.log(args.flag('--json') ? formatCheckJson(result) : formatCheckText(result));
  return result.pass ? 0 : 1;
}

module.exports = { check };
