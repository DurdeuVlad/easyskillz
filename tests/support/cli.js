'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { createHash } = require('crypto');

const BIN = path.resolve(__dirname, '../../bin/easyskillz.js');

function makeWorkspace() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-cli-'));
}

function removeWorkspace(cwd) {
  fs.rmSync(cwd, { recursive: true, force: true });
}

function runCli(args, options = {}) {
  const cwd = options.cwd || makeWorkspace();
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...options.env },
    input: options.input,
  });

  return {
    cwd,
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    error: result.error,
  };
}

function snapshotTree(root) {
  const hash = createHash('sha256');

  function visit(directory, relative = '') {
    if (!fs.existsSync(directory)) return;
    const entries = fs.readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const next = relative ? `${relative}/${entry.name}` : entry.name;
      hash.update(`${entry.isDirectory() ? 'd' : 'f'}:${next}\0`);
      if (entry.isDirectory()) visit(absolute, next);
      else hash.update(fs.readFileSync(absolute));
    }
  }

  visit(root);
  return hash.digest('hex');
}

function parseSingleJson(stdout) {
  const value = JSON.parse(stdout);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('CLI JSON output must be one object');
  }
  return value;
}

module.exports = {
  BIN,
  makeWorkspace,
  removeWorkspace,
  runCli,
  snapshotTree,
  parseSingleJson,
};
