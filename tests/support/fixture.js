'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

function makeFixture(files = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-v05-'));
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

function cleanupFixture(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

module.exports = { makeFixture, cleanupFixture };
