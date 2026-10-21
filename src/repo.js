'use strict';

const fs = require('fs');
const path = require('path');

// File access relative to the repo being assessed. Reads normalise CRLF to LF.
function createRepo(root) {
  const resolve = (f) => path.join(root, f);
  return {
    root,
    name: path.basename(root),
    has: (f) => fs.existsSync(resolve(f)),
    read: (f) => fs.readFileSync(resolve(f), 'utf8').replace(/\r\n/g, '\n'),
    write: (f, text) => fs.writeFileSync(resolve(f), text),
  };
}

module.exports = { createRepo };
