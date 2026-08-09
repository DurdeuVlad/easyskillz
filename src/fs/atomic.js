'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { resolveContained } = require('./containment');

function stageName(target) { return `${target}.easyskillz-stage-${process.pid}-${crypto.randomBytes(6).toString('hex')}`; }

function writeFileAtomic(workspace, relativePath, content, hooks = {}) {
  const target = resolveContained(workspace, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const staged = stageName(target);
  try {
    fs.writeFileSync(staged, content);
    if (hooks.beforeRename) hooks.beforeRename({ staged, target });
    fs.renameSync(staged, target);
  } finally {
    try { fs.rmSync(staged, { recursive: true, force: true }); } catch {}
  }
  return target;
}

function writeJsonAtomic(workspace, relativePath, value) {
  return writeFileAtomic(workspace, relativePath, Buffer.from(`${JSON.stringify(value, null, 2)}\n`));
}

module.exports = { writeFileAtomic, writeJsonAtomic, stageName };
