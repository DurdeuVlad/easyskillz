'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const exportCmd = require('../src/commands/export');
const config = require('../src/config');

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-test-'));
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function setupSourceProject(cwd) {
  config.write(cwd, { tools: ['claude'], linkStrategy: 'symlink', docsFolders: ['.'] });
  const skillsDir = path.join(cwd, '.easyskillz', 'skills');
  fs.mkdirSync(path.join(skillsDir, 'review-pr'), { recursive: true });
  fs.writeFileSync(path.join(skillsDir, 'review-pr', 'SKILL.md'), '# Review PR\n', 'utf8');
  fs.mkdirSync(path.join(skillsDir, 'commit-msg'), { recursive: true });
  fs.writeFileSync(path.join(skillsDir, 'commit-msg', 'SKILL.md'), '# Commit Msg\n', 'utf8');
  fs.mkdirSync(path.join(skillsDir, '_easyskillz'), { recursive: true });
  fs.writeFileSync(path.join(skillsDir, '_easyskillz', 'SKILL.md'), '# Meta\n', 'utf8');
  fs.mkdirSync(path.join(cwd, '.claude'), { recursive: true });
  fs.writeFileSync(path.join(cwd, '.claude', 'settings.json'), '{}', 'utf8');
}

test('export copies skills to target', async () => {
  const source = tmpDir();
  const target = tmpDir();
  try {
    setupSourceProject(source);
    await exportCmd({ cwd: source, args: ['--target', target], json: true, isTTY: false });
    assert.ok(fs.existsSync(path.join(target, '.easyskillz', 'skills', 'review-pr', 'SKILL.md')));
    assert.ok(fs.existsSync(path.join(target, '.easyskillz', 'skills', 'commit-msg', 'SKILL.md')));
  } finally {
    cleanup(source);
    cleanup(target);
  }
});

test('export skips skills already in target', async () => {
  const source = tmpDir();
  const target = tmpDir();
  try {
    setupSourceProject(source);
    const targetSkillsDir = path.join(target, '.easyskillz', 'skills');
    fs.mkdirSync(path.join(targetSkillsDir, 'review-pr'), { recursive: true });
    fs.writeFileSync(path.join(targetSkillsDir, 'review-pr', 'SKILL.md'), '# Existing\n', 'utf8');
    config.write(target, { tools: [], linkStrategy: 'symlink', docsFolders: [] });
    
    const output = [];
    const originalLog = console.log;
    console.log = (s) => output.push(s);
    try {
      await exportCmd({ cwd: source, args: ['--target', target], json: true, isTTY: false });
    } finally {
      console.log = originalLog;
    }
    
    const result = JSON.parse(output[output.length - 1]);
    assert.ok(result.skipped.includes('review-pr'));
    assert.ok(!result.copied.includes('review-pr'));
    assert.ok(result.copied.includes('commit-msg'));
    
    const existingContent = fs.readFileSync(path.join(targetSkillsDir, 'review-pr', 'SKILL.md'), 'utf8');
    assert.equal(existingContent, '# Existing\n');
  } finally {
    cleanup(source);
    cleanup(target);
  }
});

test('export excludes _easyskillz from copy', async () => {
  const source = tmpDir();
  const target = tmpDir();
  try {
    setupSourceProject(source);
    const output = [];
    const originalLog = console.log;
    console.log = (s) => output.push(s);
    try {
      await exportCmd({ cwd: source, args: ['--target', target], json: true, isTTY: false });
    } finally {
      console.log = originalLog;
    }
    const result = JSON.parse(output[output.length - 1]);
    assert.ok(!result.copied.includes('_easyskillz'));
    assert.ok(!result.skipped.includes('_easyskillz'));
  } finally {
    cleanup(source);
    cleanup(target);
  }
});

test('export merges config tools', async () => {
  const source = tmpDir();
  const target = tmpDir();
  try {
    setupSourceProject(source);
    config.write(target, { tools: ['cursor'], linkStrategy: 'stub', docsFolders: [] });
    await exportCmd({ cwd: source, args: ['--target', target], json: true, isTTY: false });
    const targetConfig = config.read(target);
    assert.ok(targetConfig.tools.includes('claude'));
    assert.ok(targetConfig.tools.includes('cursor'));
  } finally {
    cleanup(source);
    cleanup(target);
  }
});

test('export errors when --target missing', async () => {
  const source = tmpDir();
  try {
    setupSourceProject(source);
    let exitCode = 0;
    const originalExit = process.exit;
    process.exit = (code) => { exitCode = code; throw new Error('exit'); };
    try {
      await exportCmd({ cwd: source, args: [], json: true, isTTY: false });
    } catch (e) {
      if (e.message !== 'exit') throw e;
    } finally {
      process.exit = originalExit;
    }
    assert.equal(exitCode, 1);
  } finally {
    cleanup(source);
  }
});

test('export errors when path not found', async () => {
  const source = tmpDir();
  try {
    setupSourceProject(source);
    let exitCode = 0;
    const originalExit = process.exit;
    process.exit = (code) => { exitCode = code; throw new Error('exit'); };
    try {
      await exportCmd({ cwd: source, args: ['--target', '/nonexistent/path'], json: true, isTTY: false });
    } catch (e) {
      if (e.message !== 'exit') throw e;
    } finally {
      process.exit = originalExit;
    }
    assert.equal(exitCode, 1);
  } finally {
    cleanup(source);
  }
});

test('export errors when path is file', async () => {
  const source = tmpDir();
  const target = tmpDir();
  try {
    setupSourceProject(source);
    const filePath = path.join(target, 'file.txt');
    fs.writeFileSync(filePath, 'content', 'utf8');
    let exitCode = 0;
    const originalExit = process.exit;
    process.exit = (code) => { exitCode = code; throw new Error('exit'); };
    try {
      await exportCmd({ cwd: source, args: ['--target', filePath], json: true, isTTY: false });
    } catch (e) {
      if (e.message !== 'exit') throw e;
    } finally {
      process.exit = originalExit;
    }
    assert.equal(exitCode, 1);
  } finally {
    cleanup(source);
    cleanup(target);
  }
});

test('export errors when path equals cwd', async () => {
  const source = tmpDir();
  try {
    setupSourceProject(source);
    let exitCode = 0;
    const originalExit = process.exit;
    process.exit = (code) => { exitCode = code; throw new Error('exit'); };
    try {
      await exportCmd({ cwd: source, args: ['--target', source], json: true, isTTY: false });
    } catch (e) {
      if (e.message !== 'exit') throw e;
    } finally {
      process.exit = originalExit;
    }
    assert.equal(exitCode, 1);
  } finally {
    cleanup(source);
  }
});

test('export handles --target=value syntax', async () => {
  const source = tmpDir();
  const target = tmpDir();
  try {
    setupSourceProject(source);
    await exportCmd({ cwd: source, args: [`--target=${target}`], json: true, isTTY: false });
    assert.ok(fs.existsSync(path.join(target, '.easyskillz', 'skills', 'review-pr')));
  } finally {
    cleanup(source);
    cleanup(target);
  }
});
