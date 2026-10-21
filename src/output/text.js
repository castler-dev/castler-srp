'use strict';

const DISCLAIMER = 'Self-assessed. This is not a Castler verification.';

function formatCheckText(r) {
  return [
    `\nsrp check: ${r.name} (${r.ecosystem})\n`,
    ...r.results.map((x) => `  ${x.pass ? 'PASS' : 'FAIL'}  ${x.message}  [${x.weight}]`),
    `\n  Readiness score: ${r.score}/100 (minimum ${r.min})`,
    `  ${DISCLAIMER}\n`,
  ].join('\n');
}

module.exports = { DISCLAIMER, formatCheckText };
