'use strict';

// Launcher used by test/helpers.js so golden output does not depend on the OS
// running the tests: node fake-platform.js <entry> <args...>
// Test-only; the CLI has no such switch.
if (process.env.SRP_TEST_PLATFORM) {
  Object.defineProperty(process, 'platform', { value: process.env.SRP_TEST_PLATFORM });
}
const entry = process.argv.splice(2, 1)[0];
process.argv[1] = entry;
require(entry);
