'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function digest(parts) {
  const hash = crypto.createHash('sha256');
  for (const part of parts) hash.update(part);
  return hash.digest('hex');
}

function hashFile(filePath) { return digest([fs.readFileSync(filePath)]); }

function hashTree(root) {
  const parts = [];
  function visit(dir, relative = '') {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const rel = path.posix.join(relative, entry.name);
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) { parts.push(Buffer.from(`D\0${rel}\0`)); visit(absolute, rel); }
      else if (entry.isSymbolicLink()) parts.push(Buffer.from(`L\0${rel}\0${fs.readlinkSync(absolute)}\0`));
      else { parts.push(Buffer.from(`F\0${rel}\0`)); parts.push(fs.readFileSync(absolute)); parts.push(Buffer.from('\0')); }
    }
  }
  visit(root);
  return digest(parts);
}

module.exports = { hashFile, hashTree };
