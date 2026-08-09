'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const { doctor } = require('../../src/doctor');
const { makeFixture, cleanupFixture } = require('../support/fixture');

const VALID_CONFIG = JSON.stringify({ schemaVersion: 2, tools: [], materialization: 'auto', instructions: { mappings: [] } }, null, 2);

test('AC-22: clean doctor result is success-shaped and empty', () => {
  const root = makeFixture({ '.easyskillz/easyskillz.json': VALID_CONFIG });
  try {
    const result = doctor({ cwd: root });
    assert.deepEqual(result, { ok: true, command: 'project.doctor', result: { issueCount: 0, issues: [] } });
  } finally { cleanupFixture(root); }
});

test('AC-08/18/21/22: doctor reports invalid config, skills, state, and broad ignores deterministically', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': '{bad',
    '.easyskillz/state.json': '{bad',
    '.easyskillz/skills/Bad/SKILL.md': '---\nname: wrong\ndescription: ""\n---\n# Bad\n',
    '.gitignore': '**/AGENTS.md\n',
  });
  try {
    const result = doctor({ cwd: root });
    assert.equal(result.ok, false);
    assert.deepEqual(result.result.issues.map((issue) => issue.code), ['E_CONFIG_PARSE', 'E_SKILL_DESCRIPTION', 'E_SKILL_NAME', 'E_STATE_INVALID', 'W_IGNORE_BROAD']);
  } finally { cleanupFixture(root); }
});

test('AC-22: warnings alone are ok normally and fail strict without becoming an error envelope', () => {
  const root = makeFixture({ '.easyskillz/easyskillz.json': VALID_CONFIG, '.gitignore': '.agents/\n' });
  try {
    const normal = doctor({ cwd: root });
    const strict = doctor({ cwd: root, strict: true });
    assert.equal(normal.ok, true);
    assert.equal(normal.exitCode, 0);
    assert.equal(strict.ok, false);
    assert.equal(strict.exitCode, 1);
    assert.ok(strict.result);
    assert.equal(strict.error, undefined);
  } finally { cleanupFixture(root); }
});

test('AC-15/22: doctor detects drifted owned copies without modifying them', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': VALID_CONFIG,
    '.easyskillz/state.json': JSON.stringify({ schemaVersion: 1, docs: {}, artifacts: { '.agents/skills/demo': { source: '.easyskillz/skills/demo', sourceHash: 'a', kind: 'copy', outputHash: 'expected', generator: 'native@1', consumers: ['codex'] } } }),
    '.agents/skills/demo/SKILL.md': '# drifted\n',
  });
  try {
    const before = fs.readFileSync(path.join(root, '.agents/skills/demo/SKILL.md'), 'utf8');
    const result = doctor({ cwd: root });
    assert.ok(result.result.issues.some((issue) => issue.code === 'E_OUTPUT_DRIFT'));
    assert.equal(fs.readFileSync(path.join(root, '.agents/skills/demo/SKILL.md'), 'utf8'), before);
  } finally { cleanupFixture(root); }
});

test('AC-22: doctor covers shared, orphaned, stale-link, unowned, docs, guidance, and interrupted states', () => {
  const root = makeFixture({
    '.easyskillz/easyskillz.json': JSON.stringify({ schemaVersion: 2, tools: ['codex'], materialization: 'copy', instructions: { mappings: [] } }),
    '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo\n---\n# Demo\n',
    '.easyskillz/skills/easyskillz-reference/SKILL.md': 'outdated\n',
    '.easyskillz/state.json': JSON.stringify({ schemaVersion: 1, docs: { 'AGENTS.md': { source: 'missing-rules.md' } }, artifacts: {
      '.claude/skills/shared': { source: '.easyskillz/skills/demo', sourceHash: 'stale', kind: 'copy', outputHash: 'invalid', generator: 'native@1', consumers: ['claude', 'codex'] },
      '.agents/skills/missing': { source: '.easyskillz/skills/demo', sourceHash: 'stale', kind: 'copy', outputHash: 'x', generator: 'native@1', consumers: ['codex'] },
      '.agents/skills/broken': { source: '.easyskillz/skills/demo', sourceHash: 'stale', kind: 'link', sourceRealpath: path.join(rootPlaceholder(), 'missing'), linkTarget: 'missing', generator: 'native@1', consumers: ['codex'] },
    } }),
    '.agents/skills/demo/SKILL.md': '# unowned\n',
    '.claude/skills/shared/SKILL.md': '# changed\n',
    'AGENTS.md': '<!-- easyskillz-managed source="other.md" -->\nstale\n<!-- /easyskillz-managed -->\n',
    '.agents/skills/demo.easyskillz-stage-test/file': 'partial',
  });
  try {
    fs.symlinkSync('missing', path.join(root, '.agents/skills/broken'), process.platform === 'win32' ? 'junction' : 'dir');
    const result = doctor({ cwd: root });
    const codes = result.result.issues.map((issue) => issue.code);
    for (const code of ['W_OUTPUT_SHARED', 'W_OUTPUT_ORPHANED', 'E_OUTPUT_DRIFT', 'W_OUTPUT_UNOWNED', 'W_DOC_UNOWNED', 'W_MANAGED_BLOCK_STALE', 'E_INTERRUPTED']) {
      assert.ok(codes.includes(code), `${code}: ${codes.join(', ')}`);
    }
  } finally { cleanupFixture(root); }
});

function rootPlaceholder() { return path.join(process.cwd(), 'placeholder'); }
