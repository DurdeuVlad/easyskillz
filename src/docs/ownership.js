'use strict';

const fs = require('fs');
const path = require('path');
const stateStore = require('../state');
const { resolveContained } = require('../fs/containment');
const { runTransaction } = require('../operations/apply');

const OPEN = '<!-- easyskillz-managed';
const CLOSE = '<!-- /easyskillz-managed -->';

function error(message, details) { return { ok: false, error: { code: 'E_DOC_CONFLICT', message, ...(details ? { details } : {}) } }; }
function timestampNow() { return new Date().toISOString().replace(/[-:]/g, '').replace(/T/, '_').replace(/\..+/, ''); }
function marker(source, content) { return `<!-- easyskillz-managed source="${source}" -->\n${content.replace(/\s*$/, '')}\n${CLOSE}\n`; }

function unmarkedContent(content) {
  const start = content.indexOf(OPEN);
  const end = content.indexOf(CLOSE, start);
  if (start === -1 || end === -1) return content.trim();
  return `${content.slice(0, start)}${content.slice(end + CLOSE.length)}`.trim();
}

function replaceManaged(content, rendered) {
  const start = content.indexOf(OPEN);
  const end = content.indexOf(CLOSE, start);
  if (start === -1 || end === -1) return rendered;
  return `${content.slice(0, start)}${rendered.trimEnd()}${content.slice(end + CLOSE.length)}`;
}

function loadState(cwd) {
  const result = stateStore.read(cwd);
  return result.ok ? result.state : null;
}

function backupTarget(cwd, target, timestamp, transaction) {
  const absolute = resolveContained(cwd, target);
  if (!fs.existsSync(absolute)) return null;
  const backup = path.posix.join('.easyskillz/.backups', timestamp, target.replace(/\\/g, '/'));
  transaction.write(backup, fs.readFileSync(absolute));
  return backup;
}

function adopt({ cwd, source, target, write = false, timestamp = timestampNow(), hooks = {} }) {
  const sourcePath = resolveContained(cwd, source);
  const targetPath = resolveContained(cwd, target);
  if (!fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isFile()) return error('documentation source does not exist', { source });
  const state = loadState(cwd);
  if (!state) return { ok: false, error: { code: 'E_STATE_INVALID', message: 'local state is invalid; docs ownership cannot be changed' } };
  const owned = state.docs[target];
  if (owned && owned.source !== source) return error('instruction target is owned by another source', { source, target, owner: owned.source });
  if (fs.existsSync(targetPath)) {
    const existing = fs.readFileSync(targetPath, 'utf8');
    if (!owned && unmarkedContent(existing)) return error('instruction target contains unmarked user content', { target });
  }
  const action = { type: 'docs-adopt', source, target };
  if (!write) return { ok: true, applied: false, action, actions: [action] };
  const content = marker(source, fs.readFileSync(sourcePath, 'utf8'));
  const previous = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
  return runTransaction({ cwd }, (transaction) => {
    backupTarget(cwd, target, timestamp, transaction);
    transaction.write(target, Buffer.from(replaceManaged(previous, content)));
    state.docs[target] = { source };
    if (hooks.beforeStateCommit) hooks.beforeStateCommit(state);
    transaction.commitState(stateStore.STATE_FILE, () => stateStore.write(cwd, state));
    return { ok: true, applied: true, action, actions: [action] };
  });
}

function sync({ cwd, write = false, timestamp = timestampNow(), hooks = {} }) {
  const state = loadState(cwd);
  if (!state) return { ok: false, error: { code: 'E_STATE_INVALID', message: 'local state is invalid' } };
  const actions = [];
  const changes = [];
  for (const target of Object.keys(state.docs).sort()) {
    const source = state.docs[target].source;
    const sourcePath = resolveContained(cwd, source);
    const targetPath = resolveContained(cwd, target);
    if (!fs.existsSync(sourcePath)) { actions.push({ type: 'docs-missing-source', source, target }); continue; }
    const rendered = marker(source, fs.readFileSync(sourcePath, 'utf8'));
    const existing = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf8') : '';
    if (unmarkedContent(existing)) return error('owned target contains unmarked user content', { target });
    const next = replaceManaged(existing, rendered);
    if (next === existing) continue;
    actions.push({ type: 'docs-sync', source, target });
    changes.push({ target, content: next });
  }
  if (write) {
    runTransaction({ cwd }, (transaction) => {
      for (const change of changes) backupTarget(cwd, change.target, timestamp, transaction);
      for (const [index, change] of changes.entries()) {
        if (hooks.beforeWrite) hooks.beforeWrite(change, index);
        transaction.write(change.target, Buffer.from(change.content));
      }
    });
  }
  return { ok: true, applied: Boolean(write && actions.length), actions };
}

function restore({ cwd, backupId, write = false, hooks = {} }) {
  const root = resolveContained(cwd, path.posix.join('.easyskillz/.backups', backupId));
  if (!fs.existsSync(root)) return error('backup does not exist', { backupId });
  const actions = [];
  const changes = [];
  function visit(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else {
        const target = path.relative(root, absolute).replace(/\\/g, '/');
        actions.push({ type: 'docs-restore', backupId, target });
        changes.push({ target, content: fs.readFileSync(absolute) });
      }
    }
  }
  visit(root);
  if (write) runTransaction({ cwd }, (transaction) => {
    for (const [index, change] of changes.entries()) {
      if (hooks.beforeWrite) hooks.beforeWrite(change, index);
      transaction.write(change.target, Buffer.from(change.content));
    }
  });
  return { ok: true, applied: Boolean(write && actions.length), actions };
}

module.exports = { OPEN, CLOSE, adopt, sync, restore, unmarkedContent };
