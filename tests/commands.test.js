'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../src/config');
const wirer = require('../src/wirer');
const AddCommand = require('../src/commands/skill/AddCommand');
const RegisterCommand = require('../src/commands/tool/RegisterCommand');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-test-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Commands call process.exit(1) on validation errors.
// Intercept it so tests don't die.
const realExit = process.exit.bind(process);
process.exit = (code) => {
  if (code) throw new Error(`process.exit(${code})`);
  realExit(0);
};

// ── add command ───────────────────────────────────────────────────────────────

test('add creates SKILL.md and wires to registered tools', async () => {
  const cwd = tmpDir();
  try {
    // pre-register claude via config
    config.write(cwd, { tools: ['claude'], linkStrategy: 'stub' });

    const cmd = new AddCommand('review-pr', cwd, { json: true });
    await cmd.execute();

    const skillFile = path.join(cwd, '.easyskillz', 'skills', 'review-pr', 'SKILL.md');
    assert.ok(fs.existsSync(skillFile), 'SKILL.md should be created');

    const wiredFile = path.join(cwd, '.claude', 'skills', 'review-pr', 'SKILL.md');
    assert.ok(fs.existsSync(wiredFile), 'skill should be wired to claude');
  } finally {
    cleanup(cwd);
  }
});

test('add is idempotent — second call does not throw', async () => {
  const cwd = tmpDir();
  try {
    config.write(cwd, { tools: ['claude'], linkStrategy: 'stub' });
    const cmd1 = new AddCommand('review-pr', cwd, { json: true });
    await cmd1.execute();
    const cmd2 = new AddCommand('review-pr', cwd, { json: true });
    await cmd2.execute(); // should not throw
  } finally {
    cleanup(cwd);
  }
});

test('add rejects invalid skill names', async () => {
  const cwd = tmpDir();
  try {
    config.write(cwd, { tools: ['claude'], linkStrategy: 'stub' });
    const cmd = new AddCommand('../escape', cwd, { json: true });
    await assert.rejects(() => cmd.execute());
  } finally {
    cleanup(cwd);
  }
});

test('add rejects names with slashes', async () => {
  const cwd = tmpDir();
  try {
    config.write(cwd, { tools: ['claude'], linkStrategy: 'stub' });
    const cmd = new AddCommand('foo/bar', cwd, { json: true });
    await assert.rejects(() => cmd.execute());
  } finally {
    cleanup(cwd);
  }
});

// ── register command ──────────────────────────────────────────────────────────

test('register adds tool to config and wires existing skills', async () => {
  const cwd = tmpDir();
  try {
    // start with empty config
    config.write(cwd, { tools: [], linkStrategy: 'stub' });

    // create a skill manually
    const skillDir = path.join(cwd, '.easyskillz', 'skills', 'commit-msg');
    fs.mkdirSync(skillDir, { recursive: true });
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), '# commit-msg\n', 'utf8');

    const cmd = new RegisterCommand('claude', cwd, { json: true });
    await cmd.execute();

    const cfg = config.read(cwd);
    assert.ok(cfg.tools.includes('claude'), 'claude should be in tools');

    const wiredFile = path.join(cwd, '.claude', 'skills', 'commit-msg', 'SKILL.md');
    assert.ok(fs.existsSync(wiredFile), 'existing skill should be wired to new tool');
  } finally {
    cleanup(cwd);
  }
});

test('register is idempotent — second call does not throw', async () => {
  const cwd = tmpDir();
  try {
    config.write(cwd, { tools: [], linkStrategy: 'stub' });
    const cmd1 = new RegisterCommand('claude', cwd, { json: true });
    await cmd1.execute();
    const cmd2 = new RegisterCommand('claude', cwd, { json: true });
    await cmd2.execute(); // already registered
    const cfg = config.read(cwd);
    assert.equal(cfg.tools.filter((t) => t === 'claude').length, 1, 'no duplicates');
  } finally {
    cleanup(cwd);
  }
});

test('register rejects unknown tool', async () => {
  const cwd = tmpDir();
  try {
    config.write(cwd, { tools: [], linkStrategy: 'stub' });
    const cmd = new RegisterCommand('nonexistent-tool', cwd, { json: true });
    await assert.rejects(
      () => cmd.execute(),
      // process.exit(1) throws in test context — just check it rejects
    );
  } finally {
    cleanup(cwd);
  }
});
