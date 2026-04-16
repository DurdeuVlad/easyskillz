'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const docs = require('../src/commands/docs');
const config = require('../src/config');
const { MANAGED_OPEN } = require('../src/docs/syncFolder');

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-test-'));
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function setupTestProject(cwd) {
  config.write(cwd, { tools: ['claude'], linkStrategy: 'symlink', docsFolders: [] });
  fs.mkdirSync(path.join(cwd, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.claude', 'settings.json'), '{}', 'utf8');
}

test('docs sync initialises docsFolders to [.] when empty', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    await docs({ cwd, subAction: 'sync', args: [], json: true, isTTY: false });
    const cfg = config.read(cwd);
    assert.deepEqual(cfg.docsFolders, ['.']);
  } finally {
    cleanup(cwd);
  }
});

test('docs sync creates managed files at root', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    await docs({ cwd, subAction: 'sync', args: [], json: true, isTTY: false });
    const claudeFile = path.join(cwd, 'CLAUDE.md');
    assert.ok(fs.existsSync(claudeFile));
    const content = fs.readFileSync(claudeFile, 'utf8');
    assert.ok(content.includes(MANAGED_OPEN));
  } finally {
    cleanup(cwd);
  }
});

test('docs sync is idempotent', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    await docs({ cwd, subAction: 'sync', args: [], json: true, isTTY: false });
    const before = fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8');
    await docs({ cwd, subAction: 'sync', args: [], json: true, isTTY: false });
    const after = fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8');
    assert.equal(before, after);
  } finally {
    cleanup(cwd);
  }
});

test('docs sync removes old single-line hint on upgrade', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    const claudeFile = path.join(cwd, 'CLAUDE.md');
    fs.writeFileSync(claudeFile, 'When creating a new skill, run: `easyskillz add <name>`\n', 'utf8');
    await docs({ cwd, subAction: 'sync', args: [], json: true, isTTY: false });
    const content = fs.readFileSync(claudeFile, 'utf8');
    assert.ok(!content.includes('When creating a new skill, run:'));
    assert.ok(content.includes(MANAGED_OPEN));
  } finally {
    cleanup(cwd);
  }
});

test('docs sync warns but does not throw for missing subfolder', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    const cfg = config.read(cwd);
    cfg.docsFolders = ['.', 'nonexistent'];
    config.write(cwd, cfg);
    await docs({ cwd, subAction: 'sync', args: [], json: true, isTTY: false });
    assert.ok(fs.existsSync(path.join(cwd, 'CLAUDE.md')));
  } finally {
    cleanup(cwd);
  }
});

test('docs list returns correct status objects', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    await docs({ cwd, subAction: 'sync', args: [], json: true, isTTY: false });
    const output = [];
    const originalLog = console.log;
    console.log = (s) => output.push(s);
    try {
      await docs({ cwd, subAction: 'list', args: [], json: true, isTTY: false });
    } finally {
      console.log = originalLog;
    }
    const result = JSON.parse(output[0]);
    assert.ok(result.ok);
    assert.ok(result.files.length > 0);
    assert.ok(result.files[0].managed);
  } finally {
    cleanup(cwd);
  }
});

test('docs add registers folder and creates files', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    await docs({ cwd, subAction: 'add', args: ['src'], json: true, isTTY: false });
    const cfg = config.read(cwd);
    assert.ok(cfg.docsFolders.includes('src'));
    assert.ok(fs.existsSync(path.join(cwd, 'src', 'CLAUDE.md')));
  } finally {
    cleanup(cwd);
  }
});

test('docs add is idempotent', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    await docs({ cwd, subAction: 'add', args: ['src'], json: true, isTTY: false });
    const output = [];
    const originalLog = console.log;
    console.log = (s) => output.push(s);
    try {
      await docs({ cwd, subAction: 'add', args: ['src'], json: true, isTTY: false });
    } finally {
      console.log = originalLog;
    }
    const result = JSON.parse(output[0]);
    assert.equal(result.status, 'already');
  } finally {
    cleanup(cwd);
  }
});

test('docs add rejects non-existent folder', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    let exitCode = 0;
    const originalExit = process.exit;
    process.exit = (code) => { exitCode = code; throw new Error('exit'); };
    try {
      await docs({ cwd, subAction: 'add', args: ['nonexistent'], json: true, isTTY: false });
    } catch (e) {
      if (e.message !== 'exit') throw e;
    } finally {
      process.exit = originalExit;
    }
    assert.equal(exitCode, 1);
  } finally {
    cleanup(cwd);
  }
});

test('docs remove unregisters folder and deletes managed files', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    await docs({ cwd, subAction: 'add', args: ['src'], json: true, isTTY: false });
    await docs({ cwd, subAction: 'remove', args: ['src'], json: true, isTTY: false });
    const cfg = config.read(cwd);
    assert.ok(!cfg.docsFolders.includes('src'));
    assert.ok(!fs.existsSync(path.join(cwd, 'src', 'CLAUDE.md')));
  } finally {
    cleanup(cwd);
  }
});

test('docs remove refuses root folder', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    let exitCode = 0;
    const originalExit = process.exit;
    process.exit = (code) => { exitCode = code; throw new Error('exit'); };
    try {
      await docs({ cwd, subAction: 'remove', args: ['.'], json: true, isTTY: false });
    } catch (e) {
      if (e.message !== 'exit') throw e;
    } finally {
      process.exit = originalExit;
    }
    assert.equal(exitCode, 1);
  } finally {
    cleanup(cwd);
  }
});

test('docs remove handles notFound', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    const output = [];
    const originalLog = console.log;
    console.log = (s) => output.push(s);
    try {
      await docs({ cwd, subAction: 'remove', args: ['src'], json: true, isTTY: false });
    } finally {
      console.log = originalLog;
    }
    const result = JSON.parse(output[0]);
    assert.equal(result.status, 'notFound');
  } finally {
    cleanup(cwd);
  }
});

test('docs remove leaves unmanaged files', async () => {
  const cwd = tmpDir();
  try {
    setupTestProject(cwd);
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    const userFile = path.join(cwd, 'src', 'CLAUDE.md');
    fs.writeFileSync(userFile, 'User content\n', 'utf8');
    config.addDocsFolder(cwd, 'src');
    await docs({ cwd, subAction: 'remove', args: ['src'], json: true, isTTY: false });
    assert.ok(fs.existsSync(userFile));
  } finally {
    cleanup(cwd);
  }
});
