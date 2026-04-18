'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { writeInstruction } = require('../src/docs/syncFolder');
const registry = require('../src/registry');

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-test-'));
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('writeInstruction creates .github/copilot-instructions.md at root', () => {
  const cwd = tmpDir();
  try {
    const copilotEntry = registry.copilot;
    const result = writeInstruction(cwd, copilotEntry, true);
    assert.equal(result, 'written');
    const expectedPath = path.join(cwd, '.github', 'copilot-instructions.md');
    assert.ok(fs.existsSync(expectedPath), `Expected file at ${expectedPath}`);
  } finally {
    cleanup(cwd);
  }
});

test('writeInstruction creates copilot-instructions.md in subfolder', () => {
  const cwd = tmpDir();
  try {
    const srcPath = path.join(cwd, 'src');
    fs.mkdirSync(srcPath, { recursive: true });
    const copilotEntry = registry.copilot;
    const result = writeInstruction(srcPath, copilotEntry, false);
    assert.equal(result, 'written');
    const expectedPath = path.join(srcPath, 'copilot-instructions.md');
    assert.ok(fs.existsSync(expectedPath), `Expected file at ${expectedPath}`);
    const wrongPath = path.join(srcPath, '.github', 'copilot-instructions.md');
    assert.ok(!fs.existsSync(wrongPath), `Should not create nested .github in subfolder`);
  } finally {
    cleanup(cwd);
  }
});
