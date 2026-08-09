'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function snapshotTree(root) {
  const entries = [];
  function visit(current, relative = '') {
    if (!fs.existsSync(current)) return;
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = path.posix.join(relative.split(path.sep).join('/'), entry.name);
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        entries.push(['dir', rel]);
        visit(absolute, rel);
      } else if (entry.isSymbolicLink()) {
        entries.push(['link', rel, fs.readlinkSync(absolute)]);
      } else {
        entries.push(['file', rel, fs.readFileSync(absolute).toString('base64')]);
      }
    }
  }
  visit(root);
  return crypto.createHash('sha256').update(JSON.stringify(entries)).digest('hex');
}

module.exports = { snapshotTree };
