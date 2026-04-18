'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../src/config');

function tmpDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-test-'));
  return dir;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('read returns defaults when no config file exists', () => {
  const cwd = tmpDir();
  try {
    const cfg = config.read(cwd);
    assert.deepEqual(cfg.tools, []);
    assert.equal(cfg.linkStrategy, 'symlink');
  } finally {
    cleanup(cwd);
  }
});

test('write then read round-trips config', () => {
  const cwd = tmpDir();
  try {
    const data = { tools: ['claude', 'cursor'], linkStrategy: 'stub' };
    config.write(cwd, data);
    const cfg = config.read(cwd);
    assert.deepEqual(cfg.tools, ['claude', 'cursor']);
    assert.equal(cfg.linkStrategy, 'stub');
  } finally {
    cleanup(cwd);
  }
});

test('read merges defaults for missing keys', () => {
  const cwd = tmpDir();
  try {
    config.write(cwd, { tools: ['claude'] });
    const cfg = config.read(cwd);
    assert.deepEqual(cfg.tools, ['claude']);
    assert.equal(cfg.linkStrategy, 'symlink'); // default filled in
  } finally {
    cleanup(cwd);
  }
});

test('read returns defaults on malformed JSON', () => {
  const cwd = tmpDir();
  try {
    const dir = path.join(cwd, '.easyskillz');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'easyskillz.json'), 'not json', 'utf8');
    const cfg = config.read(cwd);
    assert.deepEqual(cfg.tools, []);
    assert.equal(cfg.linkStrategy, 'symlink');
  } finally {
    cleanup(cwd);
  }
});

test('skillsPath returns correct path', () => {
  const cwd = tmpDir();
  try {
    const p = config.skillsPath(cwd);
    assert.equal(p, path.join(cwd, '.easyskillz', 'skills'));
  } finally {
    cleanup(cwd);
  }
});

test('listSkills returns empty array when skills dir missing', () => {
  const cwd = tmpDir();
  try {
    assert.deepEqual(config.listSkills(cwd), []);
  } finally {
    cleanup(cwd);
  }
});

test('listSkills returns skill directory names', () => {
  const cwd = tmpDir();
  try {
    const skillsDir = path.join(cwd, '.easyskillz', 'skills');
    fs.mkdirSync(path.join(skillsDir, 'review-pr'), { recursive: true });
    fs.mkdirSync(path.join(skillsDir, 'commit-msg'), { recursive: true });
    // also create a file — should be excluded
    fs.writeFileSync(path.join(skillsDir, 'not-a-skill.txt'), '', 'utf8');
    const skills = config.listSkills(cwd);
    assert.deepEqual(skills.sort(), ['commit-msg', 'review-pr']);
  } finally {
    cleanup(cwd);
  }
});

test('read returns manageDocs false by default', () => {
  const cwd = tmpDir();
  try {
    const cfg = config.read(cwd);
    assert.equal(cfg.manageDocs, false);
    assert.equal(cfg.docsStrategy, null);
  } finally {
    cleanup(cwd);
  }
});

test('write and read manageDocs config', () => {
  const cwd = tmpDir();
  try {
    config.write(cwd, { tools: ['claude'], linkStrategy: 'symlink', manageDocs: true, docsStrategy: 'unified' });
    const cfg = config.read(cwd);
    assert.equal(cfg.manageDocs, true);
    assert.equal(cfg.docsStrategy, 'unified');
  } finally {
    cleanup(cwd);
  }
});

test('write and read tool-specific docsStrategy', () => {
  const cwd = tmpDir();
  try {
    config.write(cwd, { tools: ['claude'], linkStrategy: 'symlink', manageDocs: true, docsStrategy: 'tool-specific' });
    const cfg = config.read(cwd);
    assert.equal(cfg.manageDocs, true);
    assert.equal(cfg.docsStrategy, 'tool-specific');
  } finally {
    cleanup(cwd);
  }
});
