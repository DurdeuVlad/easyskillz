'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const wirer = require('../src/wirer');

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'easyskillz-test-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeSkill(cwd, name) {
  const skillDir = path.join(cwd, '.easyskillz', 'skills', name);
  fs.mkdirSync(skillDir, { recursive: true });
  fs.writeFileSync(path.join(skillDir, 'SKILL.md'), `# ${name}\n`, 'utf8');
  return skillDir;
}

const fakeEntry = (cwd, id = 'claude') => ({
  id,
  name: 'Claude Code',
  skillsDir: `.${id}/skills`,
  instructionFile: `${id.toUpperCase()}.md`,
});

// ── probeSymlinks ─────────────────────────────────────────────────────────────

test('probeSymlinks returns a boolean', () => {
  const result = wirer.probeSymlinks();
  assert.equal(typeof result, 'boolean');
});

// ── isWired ───────────────────────────────────────────────────────────────────

test('isWired returns false when target does not exist', () => {
  const cwd = tmpDir();
  try {
    const srcPath = path.join(cwd, '.easyskillz', 'skills', 'my-skill');
    assert.equal(wirer.isWired(path.join(cwd, '.claude', 'skills'), 'my-skill', srcPath, 'symlink'), false);
  } finally {
    cleanup(cwd);
  }
});

test('isWired returns true for copy strategy when SKILL.md exists', () => {
  const cwd = tmpDir();
  try {
    const targetDir = path.join(cwd, '.claude', 'skills');
    const target = path.join(targetDir, 'my-skill');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'SKILL.md'), '# my-skill\nsome content', 'utf8');
    const srcPath = path.join(cwd, '.easyskillz', 'skills', 'my-skill');
    assert.equal(wirer.isWired(targetDir, 'my-skill', srcPath, 'stub'), true);
  } finally {
    cleanup(cwd);
  }
});

// ── wireSkill (stub strategy) ─────────────────────────────────────────────────

test('wireSkill with stub strategy copies real SKILL.md content', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'review-pr');
    const entry = fakeEntry(cwd);
    const result = wirer.wireSkill('review-pr', entry, cwd, 'stub');
    assert.equal(result, 'wired');
    const stubFile = path.join(cwd, `.claude/skills/review-pr/SKILL.md`);
    assert.ok(fs.existsSync(stubFile));
    const content = fs.readFileSync(stubFile, 'utf8');
    assert.ok(content.includes('review-pr'));
    assert.ok(content.includes('review-pr'));
  } finally {
    cleanup(cwd);
  }
});

test('wireSkill returns "already" when stub already wired', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'review-pr');
    const entry = fakeEntry(cwd);
    wirer.wireSkill('review-pr', entry, cwd, 'stub');
    const result = wirer.wireSkill('review-pr', entry, cwd, 'stub');
    assert.equal(result, 'already');
  } finally {
    cleanup(cwd);
  }
});

// ── wireSkill (symlink strategy) ──────────────────────────────────────────────

test('wireSkill with symlink strategy wires or stubs without throwing', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'commit-msg');
    const entry = fakeEntry(cwd);
    const result = wirer.wireSkill('commit-msg', entry, cwd, 'symlink');
    assert.ok(['wired', 'already'].includes(result));
    // target must exist either way
    const target = path.join(cwd, '.claude', 'skills', 'commit-msg');
    assert.ok(fs.existsSync(target));
  } finally {
    cleanup(cwd);
  }
});

// ── wireSkill (workflow type) ─────────────────────────────────────────────────

test('wireSkill writes Codex skills to .agents/skills', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'codex-skill');
    const entry = {
      id: 'codex',
      name: 'Codex',
      skillsDir: '.agents/skills',
      instructionFile: 'AGENTS.md',
      skillTargets: [{ kind: 'skill-dir', path: '.agents/skills' }],
    };
    wirer.wireSkill('codex-skill', entry, cwd, 'stub');
    assert.ok(fs.existsSync(path.join(cwd, '.agents', 'skills', 'codex-skill', 'SKILL.md')));
    assert.ok(!fs.existsSync(path.join(cwd, '.codex', 'skills', 'codex-skill')));
  } finally {
    cleanup(cwd);
  }
});

test('wireSkill writes Cursor rules instead of skill directories', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'cursor-skill');
    const entry = {
      id: 'cursor',
      name: 'Cursor',
      skillsDir: '.cursor/rules',
      instructionFile: 'AGENTS.md',
      skillTargets: [{ kind: 'cursor-rule', path: '.cursor/rules' }],
    };
    wirer.wireSkill('cursor-skill', entry, cwd, 'stub');
    assert.ok(fs.existsSync(path.join(cwd, '.cursor', 'rules', 'cursor-skill.mdc')));
    assert.ok(!fs.existsSync(path.join(cwd, '.cursor', 'skills', 'cursor-skill')));
  } finally {
    cleanup(cwd);
  }
});

test('wireSkill workflow type creates flat .md file not directory', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'my-workflow');
    fs.writeFileSync(path.join(cwd, '.easyskillz', 'skills', 'my-workflow', 'SKILL.md'), [
      '---',
      'name: my-workflow',
      'description: A manual workflow',
      '---',
      '# my-workflow',
    ].join('\n'), 'utf8');
    const entry = {
      id: 'workflows-tool',
      name: 'Workflows Tool',
      skillsDir: '.windsurf/workflows',
      instructionFile: 'AGENTS.md',
      skillTargets: [{ kind: 'windsurf-workflow', path: '.windsurf/workflows' }],
    };
    const result = wirer.wireSkill('my-workflow', entry, cwd, 'stub');
    assert.equal(result, 'wired');
    // should be a flat file, not a directory
    const target = path.join(cwd, '.windsurf', 'workflows', 'my-workflow.md');
    assert.ok(fs.existsSync(target), 'my-workflow.md should exist');
    assert.ok(fs.statSync(target).isFile(), 'should be a file not a directory');
    // directory variant must NOT exist
    const targetDir = path.join(cwd, '.windsurf', 'workflows', 'my-workflow');
    assert.ok(!fs.existsSync(targetDir), 'directory variant must not exist');
  } finally {
    cleanup(cwd);
  }
});

test('wireSkill workflow type is idempotent', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'my-workflow');
    const entry = {
      id: 'workflows-tool', name: 'Workflows Tool',
      skillsDir: '.windsurf/workflows',
      instructionFile: 'AGENTS.md',
      skillTargets: [{ kind: 'windsurf-workflow', path: '.windsurf/workflows' }],
    };
    wirer.wireSkill('my-workflow', entry, cwd, 'stub');
    const result = wirer.wireSkill('my-workflow', entry, cwd, 'stub');
    assert.equal(result, 'already');
  } finally {
    cleanup(cwd);
  }
});

// ── wireAllSkills ─────────────────────────────────────────────────────────────

test('wireAllSkills wires all skill directories', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'skill-a');
    makeSkill(cwd, 'skill-b');
    const entry = fakeEntry(cwd);
    const results = wirer.wireAllSkills(entry, cwd, 'stub');
    assert.equal(results.length, 2);
    assert.ok(results.every((r) => r.results.some(res => res.result === 'wired' || res.result === 'already')));
  } finally {
    cleanup(cwd);
  }
});

test('wireAllSkills returns empty array when skills dir missing', () => {
  const cwd = tmpDir();
  try {
    const entry = fakeEntry(cwd);
    assert.deepEqual(wirer.wireAllSkills(entry, cwd, 'stub'), []);
  } finally {
    cleanup(cwd);
  }
});

// ── scanUnwired ───────────────────────────────────────────────────────────────

test('scanUnwired finds unwired skills', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'review-pr');
    const cfg = { tools: ['claude'], linkStrategy: 'stub' };
    const registry = { claude: fakeEntry(cwd) };
    const unwired = wirer.scanUnwired(cwd, cfg, registry);
    assert.equal(unwired.length, 1);
    assert.equal(unwired[0].skill, 'review-pr');
  } finally {
    cleanup(cwd);
  }
});

test('scanUnwired returns empty after wiring', () => {
  const cwd = tmpDir();
  try {
    makeSkill(cwd, 'review-pr');
    const entry = fakeEntry(cwd);
    wirer.wireSkill('review-pr', entry, cwd, 'stub');
    const cfg = { tools: ['claude'], linkStrategy: 'stub' };
    const registry = { claude: entry };
    const unwired = wirer.scanUnwired(cwd, cfg, registry);
    assert.equal(unwired.length, 0);
  } finally {
    cleanup(cwd);
  }
});

// ── appendInstruction ─────────────────────────────────────────────────────────

test('appendInstruction creates file and appends line', () => {
  const cwd = tmpDir();
  try {
    const entry = { instructionFile: 'CLAUDE.md' };
    const result = wirer.appendInstruction(cwd, entry);
    assert.equal(result, 'written');
    const content = fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8');
    assert.ok(content.includes('easyskillz add'));
  } finally {
    cleanup(cwd);
  }
});

test('appendInstruction is idempotent', () => {
  const cwd = tmpDir();
  try {
    const entry = { instructionFile: 'CLAUDE.md' };
    wirer.appendInstruction(cwd, entry);
    const result = wirer.appendInstruction(cwd, entry);
    assert.equal(result, 'already');
  } finally {
    cleanup(cwd);
  }
});

test('appendInstruction appends to existing file', () => {
  const cwd = tmpDir();
  try {
    fs.writeFileSync(path.join(cwd, 'CLAUDE.md'), '# Existing content\n', 'utf8');
    const entry = { instructionFile: 'CLAUDE.md' };
    wirer.appendInstruction(cwd, entry);
    const content = fs.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8');
    assert.ok(content.startsWith('# Existing content'));
    assert.ok(content.includes('easyskillz add'));
  } finally {
    cleanup(cwd);
  }
});

// ── updateGitignore ───────────────────────────────────────────────────────────

test('updateGitignore adds tool skill dirs and instruction files', () => {
  const cwd = tmpDir();
  try {
    const entries = [
      { skillsDir: '.claude/skills', instructionFile: 'CLAUDE.md' },
      { skillsDir: '.cursor/rules', instructionFile: 'AGENTS.md', skillTargets: [{ kind: 'cursor-rule', path: '.cursor/rules' }] },
    ];
    const result = wirer.updateGitignore(cwd, entries, 'full');
    assert.equal(result, 'updated');
    const content = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8');
    assert.ok(content.includes('.claude/'));
    assert.ok(content.includes('.cursor/'));
    assert.ok(content.includes('CLAUDE.md'));
    assert.ok(content.includes('AGENTS.md'));
    assert.ok(content.includes('# easyskillz'));
  } finally {
    cleanup(cwd);
  }
});

test('updateGitignore deduplicates instruction files', () => {
  const cwd = tmpDir();
  try {
    const entries = [
      { skillsDir: '.agents/skills',   instructionFile: 'AGENTS.md', skillTargets: [{ kind: 'skill-dir', path: '.agents/skills' }] },
      { skillsDir: '.cursor/rules',  instructionFile: 'AGENTS.md', skillTargets: [{ kind: 'cursor-rule', path: '.cursor/rules' }] }, // same file — Codex, Cursor, Windsurf all share AGENTS.md
      { skillsDir: '.windsurf/skills', instructionFile: 'AGENTS.md' },
    ];
    wirer.updateGitignore(cwd, entries, 'full');
    const content = fs.readFileSync(path.join(cwd, '.gitignore'), 'utf8');
    assert.equal(content.split('AGENTS.md').length - 1, 1, 'AGENTS.md should appear once despite 3 tools sharing it');
  } finally {
    cleanup(cwd);
  }
});

test('updateGitignore is idempotent', () => {
  const cwd = tmpDir();
  try {
    const entries = [{ skillsDir: '.claude/skills', instructionFile: 'CLAUDE.md' }];
    wirer.updateGitignore(cwd, entries, 'full');
    const result = wirer.updateGitignore(cwd, entries, 'full');
    assert.equal(result, 'already');
  } finally {
    cleanup(cwd);
  }
});
