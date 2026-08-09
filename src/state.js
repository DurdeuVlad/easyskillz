'use strict';

const fs = require('fs');
const path = require('path');
const { writeJsonAtomic } = require('./fs/atomic');

const STATE_FILE = '.easyskillz/state.json';

function emptyState() { return { schemaVersion: 1, artifacts: {}, docs: {} }; }

function safeRelative(value) {
  if (typeof value !== 'string' || !value || path.isAbsolute(value)) return false;
  const normalized = path.normalize(value);
  return normalized !== '..' && !normalized.startsWith(`..${path.sep}`);
}

function validate(value) {
  if (!value || value.schemaVersion !== 1 || !value.artifacts || typeof value.artifacts !== 'object' || Array.isArray(value.artifacts) || !value.docs || typeof value.docs !== 'object' || Array.isArray(value.docs)) return false;
  return Object.entries(value.artifacts).every(([target, artifact]) => safeRelative(target) && artifact && safeRelative(artifact.source) && Array.isArray(artifact.consumers)) &&
    Object.entries(value.docs).every(([target, mapping]) => safeRelative(target) && mapping && safeRelative(mapping.source));
}

function read(cwd) {
  const filePath = path.join(cwd, STATE_FILE);
  if (!fs.existsSync(filePath)) return { ok: true, kind: 'missing', state: emptyState() };
  try {
    const value = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!validate(value)) throw new Error('state schema is invalid');
    return { ok: true, kind: 'state', state: value };
  } catch (cause) {
    return { ok: false, error: { code: 'E_STATE_INVALID', message: `cannot trust ${STATE_FILE}`, details: { cause: cause.message } } };
  }
}

function write(cwd, value) {
  if (!validate(value)) { const error = new Error('invalid ownership state'); error.code = 'E_STATE_INVALID'; throw error; }
  writeJsonAtomic(cwd, STATE_FILE, value);
}

module.exports = { STATE_FILE, emptyState, validate, read, write };
