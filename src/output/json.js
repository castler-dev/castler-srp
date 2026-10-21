'use strict';

function formatCheckJson(r) {
  return JSON.stringify({ tool: 'castler-srp', version: r.version, score: r.score, min: r.min, pass: r.pass,
    ecosystem: r.ecosystem, rules: r.results.map((x) => ({ rule: x.message, weight: x.weight, pass: x.pass })) }, null, 2);
}

module.exports = { formatCheckJson };
