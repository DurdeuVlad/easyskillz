'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const detectDevin = require('../../src/detectors/devin');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-test-devin-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('Devin detector returns found true when .devin exists', () => {
  const cwd = tmpDir();
  try {
    fs.mkdirSync(path.join(cwd, '.devin'));
    const result = detectDevin(cwd);
    assert.equal(result.id, 'devin');
    assert.equal(result.found, true);
    assert.ok(result.entry);
  } finally {
    cleanup(cwd);
  }
});

test('Devin detector returns found true when .devin/skills exists', () => {
  const cwd = tmpDir();
  try {
    fs.mkdirSync(path.join(cwd, '.devin', 'skills'), { recursive: true });
    const result = detectDevin(cwd);
    assert.equal(result.id, 'devin');
    assert.equal(result.found, true);
  } finally {
    cleanup(cwd);
  }
});

test('Devin detector returns found false when .devin does not exist', () => {
  const cwd = tmpDir();
  try {
    const result = detectDevin(cwd);
    assert.equal(result.id, 'devin');
    assert.equal(result.found, false);
  } finally {
    cleanup(cwd);
  }
});
