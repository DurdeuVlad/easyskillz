'use strict';

const fs = require('fs');
const path = require('path');

function pathEscape(message, details) {
  const error = new Error(message);
  error.code = 'E_PATH_ESCAPE';
  error.details = details;
  return error;
}

function sameOrInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function nearestExistingParent(candidate) {
  let current = candidate;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return current;
}

function resolveContained(workspace, relativePath) {
  if (typeof relativePath !== 'string' || path.isAbsolute(relativePath)) throw pathEscape('absolute paths are not allowed', { path: relativePath });
  const root = path.resolve(workspace);
  const lexical = path.resolve(root, relativePath);
  if (!sameOrInside(root, lexical)) throw pathEscape('path escapes workspace', { path: relativePath });
  const realRoot = fs.realpathSync.native(root);
  const existing = nearestExistingParent(lexical);
  const realParent = fs.realpathSync.native(existing);
  if (!sameOrInside(realRoot, realParent)) throw pathEscape('parent link escapes workspace', { path: relativePath });
  return lexical;
}

module.exports = { resolveContained, sameOrInside };
