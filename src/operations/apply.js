'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const stateStore = require('../state');
const { resolveContained } = require('../fs/containment');
const { writeFileAtomic } = require('../fs/atomic');
const { hashTree } = require('../fs/hash');
const { materializeNative } = require('../outputs/materialize');
const config = require('../config');

function renderTransform(action) {
  throw Object.assign(new Error(`unsupported transform: ${action.kind}`), { code: 'E_TARGET_COLLISION' });
}

function actionNeeded(cwd, action) {
  if (action.type === 'create-skill') return !fs.existsSync(resolveContained(cwd, action.path));
  if (action.type !== 'materialize') return true;
  const target = resolveContained(cwd, action.target);
  const source = resolveContained(cwd, action.source);
  if (!fs.existsSync(target)) return true;
  if (action.kind === 'native') {
    try {
      if (fs.lstatSync(target).isSymbolicLink()) return fs.realpathSync.native(target) !== fs.realpathSync.native(source);
      return !fs.existsSync(source) || hashTree(target) !== hashTree(source);
    } catch { return true; }
  }
  return true;
}

function prepareActions(cwd, actions) { return actions.filter((action) => actionNeeded(cwd, action)); }

function artifactRecord(cwd, action, result) {
  const sourcePath = resolveContained(cwd, action.source);
  const targetPath = resolveContained(cwd, action.target);
  if (result.actual === 'link') {
    return { source: action.source, sourceHash: hashTree(sourcePath), kind: 'link', sourceRealpath: fs.realpathSync.native(sourcePath), linkTarget: fs.readlinkSync(targetPath), generator: 'native@1', requested: action.requested, actual: 'link', consumers: [...action.consumers].sort() };
  }
  return { source: action.source, sourceHash: hashTree(sourcePath), kind: 'copy', outputHash: hashTree(targetPath), generator: 'native@1', requested: action.requested, actual: result.actual, consumers: [...action.consumers].sort() };
}

function targetForAction(action) { return action.type === 'create-skill' ? action.path : action.type === 'materialize' ? action.target : null; }

function existsIncludingLink(target) { try { fs.lstatSync(target); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }

function copyPath(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const stat = fs.lstatSync(source);
  if (stat.isSymbolicLink()) fs.symlinkSync(fs.readlinkSync(source), target, process.platform === 'win32' ? 'junction' : undefined);
  else if (stat.isDirectory()) fs.cpSync(source, target, { recursive: true, dereference: false });
  else fs.copyFileSync(source, target);
}

function createTransaction(cwd) {
  const journalRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-transaction-'));
  const records = [];
  const captured = new Set();
  const absentParents = new Set();

  function capture(relative) {
    const target = resolveContained(cwd, relative);
    if (captured.has(target)) return target;
    captured.add(target);
    let parent = path.dirname(target);
    while (parent !== path.resolve(cwd) && !existsIncludingLink(parent)) {
      absentParents.add(parent);
      parent = path.dirname(parent);
    }
    const existed = existsIncludingLink(target);
    const backup = path.join(journalRoot, String(records.length));
    if (existed) copyPath(target, backup);
    records.push({ target, existed, backup });
    return target;
  }

  function rollback() {
    for (const record of [...records].reverse()) {
      fs.rmSync(record.target, { recursive: true, force: true });
      if (record.existed) copyPath(record.backup, record.target);
    }
    for (const parent of [...absentParents].sort((a, b) => b.length - a.length)) {
      try { fs.rmdirSync(parent); } catch {}
    }
    fs.rmSync(journalRoot, { recursive: true, force: true });
  }

  function commit() { fs.rmSync(journalRoot, { recursive: true, force: true }); }

  return {
    capture,
    write(relative, content) {
      capture(relative);
      return writeFileAtomic(cwd, relative, content);
    },
    remove(relative) {
      const target = capture(relative);
      fs.rmSync(target, { recursive: true, force: true });
    },
    move(source, target) {
      const sourcePath = capture(source);
      const targetPath = capture(target);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.renameSync(sourcePath, targetPath);
    },
    commitState(relative, writer) {
      capture(relative);
      return writer();
    },
    rollback,
    commit,
  };
}

function runTransaction({ cwd }, operation) {
  const transaction = createTransaction(cwd);
  try {
    const result = operation(transaction);
    transaction.commit();
    return result;
  } catch (error) {
    try { transaction.rollback(); } catch (rollbackError) { error.rollbackError = rollbackError; }
    throw error;
  }
}

function performPlan({ cwd, actions, hooks = {}, transaction }) {
  const stateResult = stateStore.read(cwd);
  if (!stateResult.ok) throw Object.assign(new Error(stateResult.error.message), { code: stateResult.error.code });
  const nextState = structuredClone(stateResult.state);
  const applied = [];
  const issues = [];
  for (const [index, action] of actions.entries()) {
    if (hooks.beforeAction) hooks.beforeAction(action, index);
    const target = targetForAction(action);
    if (target) transaction.capture(target);
    if (action.type === 'create-skill') {
      writeFileAtomic(cwd, action.path, Buffer.from(action.content));
      applied.push(action);
      continue;
    }
    if (action.type !== 'materialize') continue;
    if (action.kind !== 'native') renderTransform(action);
    const result = materializeNative({ cwd, source: action.source, target: action.target, requested: action.requested });
    if (result.issue) issues.push(result.issue);
    if (result.action !== 'none') applied.push(action);
    nextState.artifacts[action.target] = artifactRecord(cwd, action, result);
  }
  if (hooks.beforeStateCommit) hooks.beforeStateCommit(nextState);
  if (applied.length) transaction.commitState(stateStore.STATE_FILE, () => stateStore.write(cwd, nextState));
  return { applied: applied.length > 0, actions: applied, issues };
}

function applyPlan({ cwd, actions, hooks = {} }) {
  return runTransaction({ cwd }, (transaction) => performPlan({ cwd, actions, hooks, transaction }));
}

function applyConfigPlan({ cwd, nextConfig, actions }) {
  return runTransaction({ cwd }, (transaction) => {
    transaction.capture(config.CONFIG_FILE);
    const written = config.write(cwd, nextConfig);
    if (!written.ok) throw Object.assign(new Error(written.error.message), { code: written.error.code });
    return performPlan({ cwd, actions, transaction });
  });
}

function applyUnregister({ cwd, nextConfig, nextState, actions }) {
  return runTransaction({ cwd }, (transaction) => {
    for (const action of actions.filter((item) => item.type === 'delete-output')) {
      transaction.remove(action.target);
    }
    transaction.capture(config.CONFIG_FILE);
    const written = config.write(cwd, nextConfig);
    if (!written.ok) throw Object.assign(new Error(written.error.message), { code: written.error.code });
    transaction.commitState(stateStore.STATE_FILE, () => stateStore.write(cwd, nextState));
  });
}

function applySkillRemoval({ cwd, planned }) {
  const sourceAction = planned.actions[0];
  return runTransaction({ cwd }, (transaction) => {
    for (const action of planned.actions.filter((item) => item.type === 'delete-output')) {
      transaction.remove(action.target);
    }
    if (sourceAction.type === 'deactivate-skill') {
      transaction.move(sourceAction.source, sourceAction.target);
    } else transaction.remove(sourceAction.source);
    transaction.commitState(stateStore.STATE_FILE, () => stateStore.write(cwd, planned.nextState));
  });
}

function applyActivation({ cwd, disabled, active, plannedTargets }) {
  return runTransaction({ cwd }, (transaction) => {
    transaction.move(path.relative(cwd, disabled), path.relative(cwd, active));
    return performPlan({ cwd, actions: prepareActions(cwd, plannedTargets), transaction });
  });
}

module.exports = { actionNeeded, prepareActions, applyPlan, renderTransform, applyConfigPlan, applyUnregister, applySkillRemoval, applyActivation, createTransaction, runTransaction };
