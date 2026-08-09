'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { resolveContained } = require('../fs/containment');
const { hashTree } = require('../fs/hash');

function defaultCreateLink(source, target) {
  fs.symlinkSync(source, target, process.platform === 'win32' ? 'junction' : 'dir');
}

function currentMatches(source, target) {
  if (!fs.existsSync(target)) return false;
  try {
    if (fs.lstatSync(target).isSymbolicLink()) return fs.realpathSync.native(source) === fs.realpathSync.native(target);
    return fs.statSync(target).isDirectory() && hashTree(source) === hashTree(target);
  } catch { return false; }
}

function replaceStaged(target, staged) {
  const backup = `${target}.easyskillz-old-${crypto.randomBytes(5).toString('hex')}`;
  let moved = false;
  try {
    if (fs.existsSync(target) || fs.lstatSync(target)) { fs.renameSync(target, backup); moved = true; }
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  try {
    fs.renameSync(staged, target);
    if (moved) fs.rmSync(backup, { recursive: true, force: true });
  } catch (error) {
    try { fs.rmSync(staged, { recursive: true, force: true }); } catch {}
    if (moved && !fs.existsSync(target)) fs.renameSync(backup, target);
    throw error;
  }
}

function materializeNative({ cwd, source, target, requested = 'auto', createLink = defaultCreateLink }) {
  const sourcePath = resolveContained(cwd, source);
  const targetPath = resolveContained(cwd, target);
  if (currentMatches(sourcePath, targetPath)) return { action: 'none', requested, actual: fs.lstatSync(targetPath).isSymbolicLink() ? 'link' : 'copy', target };
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const staged = `${targetPath}.easyskillz-stage-${process.pid}-${crypto.randomBytes(5).toString('hex')}`;
  let actual = requested;
  let issue;
  try {
    if (requested === 'link' || requested === 'auto') {
      try { createLink(sourcePath, staged); actual = 'link'; }
      catch (error) {
        if (requested === 'link') throw error;
        fs.cpSync(sourcePath, staged, { recursive: true, force: false, errorOnExist: true });
        actual = 'copy';
        issue = { code: 'W_LINK_FALLBACK', severity: 'warning', message: `link failed; copied complete skill: ${error.code || error.message}` };
      }
    } else if (requested === 'copy') {
      fs.cpSync(sourcePath, staged, { recursive: true, force: false, errorOnExist: true });
      actual = 'copy';
    } else throw new Error(`invalid materialization: ${requested}`);
    replaceStaged(targetPath, staged);
    return { action: 'write', requested, actual, target, ...(issue ? { issue } : {}) };
  } finally {
    try { fs.rmSync(staged, { recursive: true, force: true }); } catch {}
  }
}

module.exports = { materializeNative };
