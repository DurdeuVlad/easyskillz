'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { migrate } = require('../../src/migration');
const { snapshotTree } = require('../support/fs-snapshot');
const { makeFixture, cleanupFixture } = require('../support/fixture');
const { failOnCall } = require('../support/failure-injection');
const { runCli, parseSingleJson } = require('../support/cli');
const { renderReferenceSkill } = require('../../src/generated/guidance');

test('AC-19: migration preview is deterministic and byte-preserving', () => {
  const root = makeFixture({ '.easyskillz/easyskillz.json': JSON.stringify({ tools: ['gemini'], linkStrategy: 'symlink' }, null, 2), '.gitignore': '# easyskillz-start\n.agents/\n**/AGENTS.md\n# easyskillz-end\n' });
  try {
    const before = snapshotTree(root);
    const first = migrate({ cwd: root });
    const second = migrate({ cwd: root });
    assert.equal(first.ok, true);
    assert.deepEqual(first.actions, second.actions);
    assert.equal(snapshotTree(root), before);
    assert.deepEqual(first.config.tools, ['antigravity']);
  } finally { cleanupFixture(root); }
});

test('AC-06/19: migration write creates schema 2 config and recoverable backup', () => {
  const raw = JSON.stringify({ tools: ['gemini'], linkStrategy: 'stub' }, null, 2);
  const root = makeFixture({ '.easyskillz/easyskillz.json': raw });
  try {
    const previewActions = migrate({ cwd: root }).actions;
    const result = migrate({ cwd: root, write: true, timestamp: '2026-08-08_000000' });
    assert.equal(result.applied, true);
    assert.deepEqual(result.actions, previewActions);
    const current = JSON.parse(fs.readFileSync(path.join(root, '.easyskillz/easyskillz.json'), 'utf8'));
    assert.equal(current.schemaVersion, 2);
    assert.equal(current.materialization, 'copy');
    assert.equal(fs.readFileSync(path.join(root, '.easyskillz/.backups/2026-08-08_000000/.easyskillz/easyskillz.json'), 'utf8'), raw);
  } finally { cleanupFixture(root); }
});

test('AC-19: injected migration failure restores original config with rollback diagnostic', () => {
  const raw = JSON.stringify({ tools: ['gemini'], linkStrategy: 'symlink' }, null, 2);
  const root = makeFixture({ '.easyskillz/easyskillz.json': raw });
  try {
    const result = migrate({ cwd: root, write: true, timestamp: '2026-08-08_000002', hooks: { beforeConfigWrite: failOnCall(1) } });
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'E_MIGRATION_ROLLBACK');
    assert.equal(fs.readFileSync(path.join(root, '.easyskillz/easyskillz.json'), 'utf8'), raw);
  } finally { cleanupFixture(root); }
});

test('malformed migration input fails through the public JSON error contract', () => {
  const root = makeFixture({ '.easyskillz/easyskillz.json': '{bad' });
  try {
    const result = runCli(['project', 'migrate', '--dry-run', '--json'], { cwd: root });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    assert.equal(parseSingleJson(result.stdout).error.code, 'E_CONFIG_PARSE');
  } finally { cleanupFixture(root); }
});

test('AC-19: migration inventories and applies proven adapters, guidance, instructions, and managed ignores', () => {
  const legacyInstruction = '<!-- easyskillz-managed -->\nlegacy commands\n<!-- /easyskillz-managed -->\n';
  const root = makeFixture({
    '.easyskillz/easyskillz.json': JSON.stringify({ tools: ['gemini'], linkStrategy: 'stub' }),
    '.easyskillz/docs/INSTRUCTION.md': 'Current instructions\n',
    '.easyskillz/skills/easyskillz-reference/SKILL.md': 'legacy reference\n',
    '.agents/skills/demo/SKILL.md': '---\nname: demo\ndescription: Legacy adapter\n---\n<!-- easyskillz-generated -->\nRead the full skill instructions from `.easyskillz/skills/demo/SKILL.md`.\n',
    'AGENTS.md': legacyInstruction,
    '.gitignore': '# user\n# easyskillz-start\n.agents/\n**/AGENTS.md\n# easyskillz-end\n',
  });
  try {
    const before = snapshotTree(root);
    const preview = migrate({ cwd: root, timestamp: '2026-08-08_000003' });
    assert.equal(snapshotTree(root), before);
    assert.deepEqual(preview.actions.map((action) => action.type), [
      'config-schema', 'legacy-artifact-remove', 'instruction-adopt', 'guidance-update', 'gitignore-clean',
    ]);

    const applied = migrate({ cwd: root, write: true, timestamp: '2026-08-08_000003' });
    assert.equal(applied.applied, true);
    assert.equal(fs.existsSync(path.join(root, '.agents/skills/demo')), false);
    assert.equal(fs.readFileSync(path.join(root, '.easyskillz/skills/easyskillz-reference/SKILL.md'), 'utf8'), renderReferenceSkill());
    assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /easyskillz-managed source="\.easyskillz\/docs\/INSTRUCTION\.md"/);
    assert.doesNotMatch(fs.readFileSync(path.join(root, '.gitignore'), 'utf8'), /\.agents\/|\*\*\/AGENTS/);
    const localState = JSON.parse(fs.readFileSync(path.join(root, '.easyskillz/state.json'), 'utf8'));
    assert.equal(localState.docs['AGENTS.md'].source, '.easyskillz/docs/INSTRUCTION.md');
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/.backups/2026-08-08_000003/.agents/skills/demo/SKILL.md')), true);
  } finally { cleanupFixture(root); }
});

test('AC-19: a late migration failure restores every changed artifact', () => {
  const files = {
    '.easyskillz/easyskillz.json': JSON.stringify({ tools: ['gemini'], linkStrategy: 'stub' }),
    '.easyskillz/docs/INSTRUCTION.md': 'Current instructions\n',
    '.easyskillz/skills/easyskillz-reference/SKILL.md': 'legacy reference\n',
    '.agents/skills/demo/SKILL.md': '<!-- easyskillz-generated -->\nlegacy\n',
    'AGENTS.md': '<!-- easyskillz-managed -->\nlegacy\n<!-- /easyskillz-managed -->\n',
  };
  const root = makeFixture(files);
  try {
    const before = snapshotTree(root);
    const previewActions = migrate({ cwd: root }).actions;
    const result = migrate({ cwd: root, write: true, timestamp: '2026-08-08_000004', hooks: { beforeCommit: failOnCall(1) } });
    assert.equal(result.error.code, 'E_MIGRATION_ROLLBACK');
    for (const [relative, content] of Object.entries(files)) assert.equal(fs.readFileSync(path.join(root, relative), 'utf8'), content);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/state.json')), false);
    assert.equal(snapshotTree(root), before);

    const retried = migrate({ cwd: root, write: true, timestamp: '2026-08-08_000004' });
    assert.equal(retried.ok, true);
    assert.deepEqual(retried.actions, previewActions);
    const doctor = runCli(['project', 'doctor', '--json'], { cwd: root });
    assert.equal(doctor.status, 0, doctor.stderr || doctor.stdout);
    assert.equal(parseSingleJson(doctor.stdout).result.issueCount, 0);
  } finally { cleanupFixture(root); }
});
