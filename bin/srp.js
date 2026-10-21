#!/usr/bin/env node
'use strict';

const { run } = require('../src/cli');

// exitCode (not process.exit) so piped stdout is fully flushed first.
process.exitCode = run(process.argv.slice(2), process.cwd());
