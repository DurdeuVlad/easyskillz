'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const config = require('../src/config');
const { scanAll } = require('../src/docs/scanInstructionFiles');
const { centralize } = require('../src/docs/centralizeFiles');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-test-'));
}

function cleanup(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

test('scanAll finds instruction files in root', () => {
  const cwd = tmpDir();
  try {
    fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Claude instructions', 'utf8');
    fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Agents instructions', 'utf8');
    
    const scanned = scanAll(cwd);
    assert.ok(scanned['.']);
    assert.deepEqual(scanned['.'].sort(), ['AGENTS.md', 'CLAUDE.md']);
  } finally {
    cleanup(cwd);
  }
});

test('scanAll finds instruction files in subdirectories', () => {
  const cwd = tmpDir();
  try {
    fs.mkdirSync(path.join(cwd, 'src'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Root', 'utf8');
    fs.writeFileSync(path.join(cwd, 'src', 'CLAUDE.md'), '# Src', 'utf8');
    
    const scanned = scanAll(cwd);
    assert.ok(scanned['.'].includes('CLAUDE.md'));
    assert.ok(scanned['src'].includes('CLAUDE.md'));
  } finally {
    cleanup(cwd);
  }
});

test('scanAll skips node_modules and hidden dirs', () => {
  const cwd = tmpDir();
  try {
    fs.mkdirSync(path.join(cwd, 'node_modules'), { recursive: true });
    fs.mkdirSync(path.join(cwd, '.git'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'node_modules', 'CLAUDE.md'), '# Should skip', 'utf8');
    fs.writeFileSync(path.join(cwd, '.git', 'AGENTS.md'), '# Should skip', 'utf8');
    
    const scanned = scanAll(cwd);
    assert.deepEqual(scanned, {});
  } finally {
    cleanup(cwd);
  }
});

test('centralize unified strategy creates single INSTRUCTION.md', () => {
  const cwd = tmpDir();
  try {
    fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Claude content', 'utf8');
    fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Agents content', 'utf8');
    
    const scanned = scanAll(cwd);
    const actions = centralize(cwd, scanned, 'unified');
    
    assert.ok(actions.length > 0);
    assert.ok(fs.existsSync(path.join(cwd, '.easyskillz', 'docs', '.', 'INSTRUCTION.md')));
    
    const content = fs.readFileSync(path.join(cwd, '.easyskillz', 'docs', '.', 'INSTRUCTION.md'), 'utf8');
    assert.ok(content.includes('Claude content'));
    assert.ok(content.includes('Agents content'));
  } finally {
    cleanup(cwd);
  }
});

test('centralize tool-specific strategy preserves separate files', () => {
  const cwd = tmpDir();
  try {
    fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Claude content', 'utf8');
    fs.writeFileSync(path.join(cwd, 'AGENTS.md'), '# Agents content', 'utf8');
    
    const scanned = scanAll(cwd);
    const actions = centralize(cwd, scanned, 'tool-specific');
    
    assert.ok(actions.length > 0);
    assert.ok(fs.existsSync(path.join(cwd, '.easyskillz', 'docs', '.', 'CLAUDE.md')));
    assert.ok(fs.existsSync(path.join(cwd, '.easyskillz', 'docs', '.', 'AGENTS.md')));
    
    const claudeContent = fs.readFileSync(path.join(cwd, '.easyskillz', 'docs', '.', 'CLAUDE.md'), 'utf8');
    const agentsContent = fs.readFileSync(path.join(cwd, '.easyskillz', 'docs', '.', 'AGENTS.md'), 'utf8');
    
    assert.ok(claudeContent.includes('Claude content'));
    assert.ok(agentsContent.includes('Agents content'));
    assert.ok(!claudeContent.includes('Agents content'));
  } finally {
    cleanup(cwd);
  }
});

test('centralize handles nested directories', () => {
  const cwd = tmpDir();
  try {
    fs.mkdirSync(path.join(cwd, 'src', 'api'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'src', 'api', 'CLAUDE.md'), '# API docs', 'utf8');
    
    const scanned = scanAll(cwd);
    const actions = centralize(cwd, scanned, 'unified');
    
    assert.ok(fs.existsSync(path.join(cwd, '.easyskillz', 'docs', 'src', 'api', 'INSTRUCTION.md')));
  } finally {
    cleanup(cwd);
  }
});
