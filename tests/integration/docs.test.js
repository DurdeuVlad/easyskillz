'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { adopt, sync, restore } = require('../../src/docs/ownership');
const { makeFixture, cleanupFixture } = require('../support/fixture');
const { runCli, parseSingleJson } = require('../support/cli');
const { snapshotTree } = require('../support/fs-snapshot');

test('AC-20: explicit docs sync updates only owned targets and restore recovers original', () => {
  const root = makeFixture({ 'rules.md': 'one\n' });
  try {
    adopt({ cwd: root, source: 'rules.md', target: 'AGENTS.md', write: true, timestamp: '2026-08-08_000000' });
    fs.writeFileSync(path.join(root, 'rules.md'), 'two\n');
    const preview = sync({ cwd: root });
    assert.equal(preview.actions.length, 1);
    assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /one/);
    sync({ cwd: root, write: true, timestamp: '2026-08-08_000001' });
    assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /two/);
    const restored = restore({ cwd: root, backupId: '2026-08-08_000001', write: true });
    assert.equal(restored.applied, true);
    assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /one/);
  } finally { cleanupFixture(root); }
});

test('AC-06/20: docs domain previews adoption and lists the resulting explicit mapping', () => {
  const root = makeFixture({ 'rules.md': 'rules\n' });
  try {
    const preview = runCli(['docs', 'adopt', 'rules.md', '--target', 'AGENTS.md', '--dry-run', '--json'], { cwd: root });
    assert.equal(preview.status, 0, preview.stderr || preview.stdout);
    assert.equal(parseSingleJson(preview.stdout).result.applied, false);
    assert.equal(fs.existsSync(path.join(root, 'AGENTS.md')), false);

    const applied = runCli(['docs', 'adopt', 'rules.md', '--target', 'AGENTS.md', '--write', '--json'], { cwd: root });
    assert.equal(applied.status, 0, applied.stderr || applied.stdout);
    assert.deepEqual(parseSingleJson(applied.stdout).result.actions, parseSingleJson(preview.stdout).result.actions);
    const listed = parseSingleJson(runCli(['docs', 'list', '--json'], { cwd: root }).stdout);
    assert.equal(Object.keys(listed.result.mappings).length, 1);
    assert.equal(listed.result.mappings['AGENTS.md'].source, 'rules.md');
  } finally { cleanupFixture(root); }
});

test('public docs conflicts use the error envelope and a failing exit', () => {
  const root = makeFixture({ 'rules.md': 'rules\n', 'AGENTS.md': 'user owned\n' });
  try {
    const result = runCli(['docs', 'adopt', 'rules.md', '--target', 'AGENTS.md', '--dry-run', '--json'], { cwd: root });
    assert.equal(result.status, 1);
    assert.equal(result.stderr, '');
    const envelope = parseSingleJson(result.stdout);
    assert.equal(envelope.ok, false);
    assert.equal(envelope.command, 'docs.adopt');
    assert.equal(envelope.error.code, 'E_DOC_CONFLICT');
    assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), 'user owned\n');
  } finally { cleanupFixture(root); }
});

test('AC-06/20/AC-31: docs sync and restore previews exactly match apply and never write', () => {
  const root = makeFixture({ 'rules.md': 'one\n' });
  try {
    adopt({ cwd: root, source: 'rules.md', target: 'AGENTS.md', write: true, timestamp: '2026-08-08_000020' });
    fs.writeFileSync(path.join(root, 'rules.md'), 'two\n');

    const beforeSyncPreview = snapshotTree(root);
    const syncPreview = sync({ cwd: root, timestamp: '2026-08-08_000021' });
    assert.equal(snapshotTree(root), beforeSyncPreview);
    const syncApply = sync({ cwd: root, write: true, timestamp: '2026-08-08_000021' });
    assert.deepEqual(syncApply.actions, syncPreview.actions);

    fs.writeFileSync(path.join(root, 'AGENTS.md'), 'temporary\n');
    const beforeRestorePreview = snapshotTree(root);
    const restorePreview = restore({ cwd: root, backupId: '2026-08-08_000021' });
    assert.equal(snapshotTree(root), beforeRestorePreview);
    const restoreApply = restore({ cwd: root, backupId: '2026-08-08_000021', write: true });
    assert.deepEqual(restoreApply.actions, restorePreview.actions);
  } finally { cleanupFixture(root); }
});
