'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { resolveContained } = require('../fs/containment');
const { runTransaction } = require('./apply');

function exportProject({ cwd, target, write = false, hooks = {} }) {
  const destination = resolveContained(cwd, target);
  if (destination === path.resolve(cwd) || !fs.existsSync(destination) || !fs.statSync(destination).isDirectory()) throw Object.assign(new Error('export target must be an existing different directory'), { code: 'E_CONFIG_VALUE' });
  const relativeDestination = path.relative(cwd, destination).replace(/\\/g, '/');
  const actions = [
    { type: 'export-copy', source: '.easyskillz/skills', target: path.posix.join(relativeDestination, '.easyskillz/skills') },
    { type: 'export-config', source: '.easyskillz/easyskillz.json', target: path.posix.join(relativeDestination, '.easyskillz/easyskillz.json') },
  ];
  if (!write) return { kind: 'preview', applied: false, actions };
  const finalRoot = resolveContained(cwd, path.posix.join(relativeDestination, '.easyskillz'));
  const stagedRoot = `${finalRoot}.easyskillz-stage-${crypto.randomBytes(5).toString('hex')}`;
  try {
    runTransaction({ cwd }, (transaction) => {
      fs.mkdirSync(stagedRoot, { recursive: true });
      const skills = resolveContained(cwd, '.easyskillz/skills');
      const configFile = resolveContained(cwd, '.easyskillz/easyskillz.json');
      if (fs.existsSync(skills)) fs.cpSync(skills, path.join(stagedRoot, 'skills'), { recursive: true });
      if (fs.existsSync(configFile)) fs.copyFileSync(configFile, path.join(stagedRoot, 'easyskillz.json'));
      transaction.remove(path.posix.join(relativeDestination, '.easyskillz'));
      fs.renameSync(stagedRoot, finalRoot);
      if (hooks.beforeCommit) hooks.beforeCommit({ cwd, actions });
    });
  } finally { fs.rmSync(stagedRoot, { recursive: true, force: true }); }
  return { applied: true, actions };
}

module.exports = { exportProject };
