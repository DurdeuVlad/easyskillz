'use strict';

const { test, describe, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { setupRepo, mockTool, runEZ, cleanup } = require('./helpers');

describe('E2E Scenarios', () => {
  let repoPath;

  afterEach(() => {
    cleanup(repoPath);
  });

  function isLinked(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const stats = fs.lstatSync(filePath);
    if (stats.isSymbolicLink()) return true;
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('Managed by easyskillz') || content.includes('easyskillz-managed');
  }

  test('Scenario 1: The Fresh Clone (Multi-Tool)', () => {
    repoPath = setupRepo();
    const skillsDir = path.join(repoPath, '.easyskillz', 'skills');
    fs.mkdirSync(path.join(skillsDir, 'skill-1'), { recursive: true });
    fs.writeFileSync(path.join(skillsDir, 'skill-1', 'SKILL.md'), '# skill 1', 'utf8');
    mockTool(repoPath, 'claude');
    mockTool(repoPath, 'cursor');
    const result = runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    assert.ok(result.ok, 'Sync failed: ' + result.output);
    assert.ok(fs.existsSync(path.join(repoPath, '.claude/skills/skill-1')), 'Claude skill missing');
    assert.ok(fs.existsSync(path.join(repoPath, '.cursor/skills/skill-1')), 'Cursor skill missing');
    const gitignore = fs.readFileSync(path.join(repoPath, '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('# easyskillz-start'), 'Gitignore missing markers');
  });

  test('Scenario 2: The Tool Hopper (Claude to Windsurf)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    mockTool(repoPath, 'windsurf');
    const result = runEZ('tool register windsurf --confirm', repoPath);
    assert.ok(result.ok, 'Registration failed');
    assert.ok(fs.existsSync(path.join(repoPath, '.windsurf/skills')), 'Windsurf skills folder missing');
    assert.ok(fs.existsSync(path.join(repoPath, '.windsurf/workflows')), 'Windsurf workflows folder missing');
  });

  test('Scenario 3: Surgical Gitignore (Protect unmanaged files)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    const hookPath = path.join(repoPath, '.claude', 'hooks', 'pre-commit.sh');
    fs.mkdirSync(path.dirname(hookPath), { recursive: true });
    fs.writeFileSync(hookPath, 'echo 1', 'utf8');
    runEZ('project sync --confirm --gitignore=smart --docs=no', repoPath);
    const gitignore = fs.readFileSync(path.join(repoPath, '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('.claude/skills/'), 'Managed skills should be ignored');
    assert.ok(!gitignore.includes('hooks'), 'User hooks should NOT be ignored');
  });

  test('Scenario 4: Smart Switch (Blanket to Surgical)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    
    // Step 1: Empty folder -> Blanket ignore
    runEZ('project sync --confirm --gitignore=full --docs=no', repoPath);
    let gitignore = fs.readFileSync(path.join(repoPath, '.gitignore'), 'utf8');
    assert.ok(gitignore.match(/^\.claude\/$/m), 'Should use blanket ignore for empty tool folder');
    
    // Step 2: Add user file -> Switch to surgical
    const customDir = path.join(repoPath, '.claude/custom');
    fs.mkdirSync(customDir, { recursive: true });
    fs.writeFileSync(path.join(customDir, 'script.sh'), 'echo 1', 'utf8');
    const result = runEZ('project sync --confirm --docs=no --gitignore=full', repoPath); 
    
    gitignore = fs.readFileSync(path.join(repoPath, '.gitignore'), 'utf8');
    assert.ok(!gitignore.match(/^\.claude\/$/m), 'Blanket ignore should be removed');
    assert.ok(gitignore.includes('.claude/skills/'), 'Surgical ignore should be added');
  });

  test('Scenario 5: Auto-Repair malformed skills (Gemini)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'gemini');
    const skillPath = path.join(repoPath, '.easyskillz/skills/broken');
    fs.mkdirSync(skillPath, { recursive: true });
    fs.writeFileSync(path.join(skillPath, 'SKILL.md'), '# broken', 'utf8');
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    const content = fs.readFileSync(path.join(skillPath, 'SKILL.md'), 'utf8');
    assert.ok(content.startsWith('---'), 'YAML frontmatter not injected');
  });

  test('Scenario 6: The Clean Break (Unregister Full)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    runEZ('tool unregister claude --confirm --mode=full', repoPath);
    assert.ok(!fs.existsSync(path.join(repoPath, '.claude/skills')), 'Skills folder should be deleted');
  });

  test('Scenario 7: The Reversible Break (Unregister Revert)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    runEZ('tool unregister claude --confirm --mode=revert', repoPath);
    assert.ok(fs.existsSync(path.join(repoPath, '.claude/skills')), 'Skills folder should remain');
  });

  test('Scenario 8: The Docs Migrator (Unified Strategy)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    fs.writeFileSync(path.join(repoPath, 'CLAUDE.md'), '# Claude Docs', 'utf8');
    runEZ('project sync --confirm --docs=yes --docs-strategy=unified --gitignore=full', repoPath);
    assert.ok(fs.existsSync(path.join(repoPath, '.easyskillz/docs/INSTRUCTION.md')), 'Centralized doc missing');
    assert.ok(isLinked(path.join(repoPath, 'CLAUDE.md')), 'Original file should be linked');
  });

  test('Scenario 9: Nested Docs Migrator (Tool-Specific)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    const nestedDir = path.join(repoPath, 'src/api');
    fs.mkdirSync(nestedDir, { recursive: true });
    fs.writeFileSync(path.join(nestedDir, 'CLAUDE.md'), '# API Docs', 'utf8');
    runEZ('project sync --confirm --docs=yes --docs-strategy=tool-specific --gitignore=full', repoPath);
    assert.ok(fs.existsSync(path.join(repoPath, '.easyskillz/docs/src/api/CLAUDE.md')), 'Centralized nested doc missing');
    assert.ok(isLinked(path.join(nestedDir, 'CLAUDE.md')), 'Nested file should be linked');
  });

  test('Scenario 10: The Case-Insensitive Developer', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'cursor');
    const result = runEZ('tool register CuRsoR --confirm', repoPath);
    assert.ok(result.ok, 'Mixed case registration failed');
    const cfg = JSON.parse(fs.readFileSync(path.join(repoPath, '.easyskillz/easyskillz.json'), 'utf8'));
    assert.ok(cfg.tools.includes('cursor'), 'Stored tool ID should be lowercase');
  });

  test('Scenario 11: The GitHub Protector', () => {
    repoPath = setupRepo();
    runEZ('tool register copilot --confirm', repoPath);
    runEZ('project sync --confirm --gitignore=full --docs=no', repoPath);
    const gitignorePath = path.join(repoPath, '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), 'Gitignore should exist');
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    assert.ok(gitignore.includes('.github/skills/'), 'Copilot skills should be ignored');
    assert.ok(!gitignore.match(/^\.github\/$/m), '.github/ root should NOT be ignored');
  });

  test('Scenario 12: The Manual Meddler (Overwrite Protection)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    const gitignore = path.join(repoPath, '.gitignore');
    let content = fs.readFileSync(gitignore, 'utf8');
    content = content.replace('strategy: smart', 'strategy: smart\n# User garbage file');
    fs.writeFileSync(gitignore, content, 'utf8');
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    const finalContent = fs.readFileSync(gitignore, 'utf8');
    assert.ok(!finalContent.includes('User garbage file'), 'Manual edits inside block should be overwritten');
  });

  test('Scenario 13: The Minimalist (Conflict-Only Strategy)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    runEZ('project sync --confirm --docs=no --gitignore=minimal', repoPath);
    const gitignore = fs.readFileSync(path.join(repoPath, '.gitignore'), 'utf8');
    assert.ok(gitignore.includes('settings.json'), 'Config should be ignored');
  });

  test('Scenario 14 & 15: The Deactivator & Reactivator', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    runEZ('skill add test-skill', repoPath);
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    // Deactivate
    runEZ('skill deactivate test-skill', repoPath);
    assert.ok(!fs.existsSync(path.join(repoPath, '.claude/skills/test-skill')), 'Wired link should be removed');
    assert.ok(fs.existsSync(path.join(repoPath, '.easyskillz/skills/.test-skill.disabled')), 'Skill should be renamed');
    // Reactivate
    runEZ('skill activate test-skill', repoPath);
    assert.ok(fs.existsSync(path.join(repoPath, '.claude/skills/test-skill')), 'Skill should be re-wired');
  });

  test('Scenario 16: The Empty State Sync', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    const result = runEZ('project sync --confirm --docs=no --gitignore=none', repoPath);
    assert.ok(result.ok, 'Empty sync failed: ' + result.output);
    assert.ok(fs.existsSync(path.join(repoPath, '.easyskillz/easyskillz.json')), 'Config should be created');
  });

  test('Docs List Command', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    fs.writeFileSync(path.join(repoPath, 'CLAUDE.md'), '# test', 'utf8');
    runEZ('project sync --confirm --docs=yes --docs-strategy=unified --gitignore=smart', repoPath);
    const result = runEZ('docs list --json', repoPath);
    assert.ok(result.ok, 'Docs list failed: ' + result.output);
    const data = JSON.parse(result.output);
    assert.ok(data.folders.length >= 1, 'Should list at least one folder');
  });

  test('Scenario 17: The Exporter', () => {
    repoPath = setupRepo();
    runEZ('skill add shared-skill', repoPath);
    const targetPath = setupRepo();
    try {
      const result = runEZ(`project export --target="${targetPath}" --confirm`, repoPath);
      assert.ok(result.ok, 'Export failed: ' + result.output);
      assert.ok(fs.existsSync(path.join(targetPath, '.easyskillz/skills/shared-skill')), 'Skill not exported');
    } finally {
      cleanup(targetPath);
    }
  });

  test('Scenario 18: Robust Detection (Folder Only)', () => {
    repoPath = setupRepo();
    fs.mkdirSync(path.join(repoPath, '.claude'), { recursive: true });
    const result = runEZ('project sync --confirm --docs=no --gitignore=full', repoPath);
    assert.ok(result.output.includes('Claude Code'), 'Claude should be detected');
  });

  test('Scenario 19: Codex Explicit Test', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'codex');
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    const cfg = JSON.parse(fs.readFileSync(path.join(repoPath, '.easyskillz/easyskillz.json'), 'utf8'));
    assert.ok(cfg.tools.includes('codex'), 'Codex not registered');
  });

  test('Scenario 20: AI Friendliness (JSON Output)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    const result = runEZ('project sync --confirm --docs=no --gitignore=smart --json', repoPath);
    assert.ok(result.ok, 'JSON sync failed: ' + result.output);
    const data = JSON.parse(result.output);
    assert.ok(data.ok, 'JSON ok field should be true');
    assert.ok(data.tools.includes('claude'), 'JSON tools missing claude');
  });

  test('Scenario 21: Idempotency (Repeat Sync)', () => {
    repoPath = setupRepo();
    mockTool(repoPath, 'claude');
    runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    
    // Run again
    const result = runEZ('project sync --confirm --docs=no --gitignore=smart', repoPath);
    assert.ok(result.ok, 'Second sync failed: ' + result.output);
    assert.ok(result.output.includes('wired') || result.output.includes('already wired') || result.output.includes('Nothing to do'), 'Should handle repeat sync');
  });
});
