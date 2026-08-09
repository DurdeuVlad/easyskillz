'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '../..');

function runNode(script, args = []) {
  return spawnSync(process.execPath, [script, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

test('AC-25/AC-26/AC-30: CI matrix and package gate validate the published runtime contract', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const ci = fs.readFileSync(path.join(ROOT, '.github', 'workflows', 'ci.yml'), 'utf8');

  assert.equal(packageJson.version, '0.5.0');
  assert.equal(packageJson.engines.node, '>=22.0.0');
  assert.equal(packageJson.scripts['test:package'], 'node scripts/test-package.js');
  assert.equal(packageJson.scripts['test:coverage'], 'node --test --experimental-test-coverage --test-coverage-lines=90 --test-coverage-functions=90 --test-coverage-branches=85 tests/unit/*.test.js tests/contract/*.test.js tests/integration/*.test.js tests/e2e/*.test.js');
  assert.match(ci, /os: \[ubuntu-latest, macos-latest, windows-latest\]/);
  assert.match(ci, /node-version: \[22\.x, 24\.x\]/);
  assert.match(ci, /- run: npm ci/);
  assert.match(ci, /- run: npm run ci/);

  const result = runNode('scripts/test-package.js', ['--skip-audit']);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Installed PTY confirmation gate passed/);
  assert.match(result.stdout, /Installed PTY acceptance gate passed/);
  assert.match(result.stdout, /Package gate passed/);
});
