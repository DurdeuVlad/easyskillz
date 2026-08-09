'use strict';

const path = require('path');
const fs = require('fs');
const { hashFile, hashTree } = require('../fs/hash');
const { resolveContained } = require('../fs/containment');

function samePath(left, right) {
  if (!left || !right) return false;
  const a = path.resolve(left);
  const b = path.resolve(right);
  return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
}

function canDelete({ manifest, current }) {
  if (!manifest || !current || !Array.isArray(manifest.consumers) || manifest.consumers.length) return false;
  if (manifest.kind === 'link') {
    if (current.kind === 'link') return samePath(manifest.sourceRealpath, current.realpath);
    if (current.kind === 'broken-link') return Boolean(manifest.linkTarget && manifest.linkTarget === current.linkTarget);
    return false;
  }
  if (manifest.kind === 'copy' || manifest.kind === 'transform') return manifest.kind === current.kind && Boolean(manifest.outputHash) && manifest.outputHash === current.outputHash;
  return false;
}

function inspectCurrent(cwd, target, manifest) {
  const absolute = resolveContained(cwd, target);
  try {
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      const linkTarget = fs.readlinkSync(absolute);
      try { return { kind: 'link', linkTarget, realpath: fs.realpathSync.native(absolute) }; }
      catch { return { kind: 'broken-link', linkTarget }; }
    }
    if (manifest.kind === 'copy' && stat.isDirectory()) return { kind: 'copy', outputHash: hashTree(absolute) };
    if (manifest.kind === 'transform' && stat.isFile()) return { kind: 'transform', outputHash: hashFile(absolute) };
    return { kind: 'unknown' };
  } catch (error) {
    return error.code === 'ENOENT' ? { kind: 'missing' } : { kind: 'unknown', error };
  }
}

module.exports = { canDelete, inspectCurrent };
