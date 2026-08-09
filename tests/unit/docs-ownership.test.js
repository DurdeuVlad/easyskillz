'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const state = require('../../src/state');
const { adopt, sync, restore } = require('../../src/docs/ownership');
const { makeFixture, cleanupFixture } = require('../support/fixture');
const { snapshotTree } = require('../support/fs-snapshot');

test('AC-20: docs adoption previews an exact source-to-target mapping without writes', () => {
  const root = makeFixture({ 'instructions/source.md': '# Rules\n' });
  try {
    const result = adopt({ cwd: root, source: 'instructions/source.md', target: 'AGENTS.md' });
    assert.equal(result.ok, true);
    assert.equal(result.applied, false);
    assert.deepEqual(result.action, { type: 'docs-adopt', source: 'instructions/source.md', target: 'AGENTS.md' });
    assert.equal(fs.existsSync(path.join(root, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/state.json')), false);
  } finally { cleanupFixture(root); }
});

test('AC-20: adoption writes marked content and ownership only with write', () => {
  const root = makeFixture({ 'instructions/source.md': '# Rules\n' });
  try {
    const result = adopt({ cwd: root, source: 'instructions/source.md', target: 'AGENTS.md', write: true });
    assert.equal(result.applied, true);
    assert.match(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), /easyskillz-managed.*# Rules/s);
    assert.equal(state.read(root).state.docs['AGENTS.md'].source, 'instructions/source.md');
  } finally { cleanupFixture(root); }
});

test('AC-20: adoption refuses unmarked user content and competing ownership', () => {
  const root = makeFixture({ 'a.md': 'A\n', 'b.md': 'B\n', 'AGENTS.md': '# User rules\n' });
  try {
    const first = adopt({ cwd: root, source: 'a.md', target: 'AGENTS.md' });
    assert.equal(first.ok, false);
    assert.equal(first.error.code, 'E_DOC_CONFLICT');
    fs.rmSync(path.join(root, 'AGENTS.md'));
    adopt({ cwd: root, source: 'a.md', target: 'AGENTS.md', write: true });
    const second = adopt({ cwd: root, source: 'b.md', target: 'AGENTS.md' });
    assert.equal(second.ok, false);
    assert.equal(second.error.code, 'E_DOC_CONFLICT');
  } finally { cleanupFixture(root); }
});

test('docs ownership diagnoses missing sources, invalid state, drift, and missing backups', () => {
  const root = makeFixture();
  try {
    assert.equal(adopt({ cwd: root, source: 'missing.md', target: 'AGENTS.md' }).error.code, 'E_DOC_CONFLICT');
    fs.mkdirSync(path.join(root, '.easyskillz'), { recursive: true });
    fs.writeFileSync(path.join(root, '.easyskillz/state.json'), '{bad');
    fs.writeFileSync(path.join(root, 'rules.md'), 'rules\n');
    assert.equal(adopt({ cwd: root, source: 'rules.md', target: 'AGENTS.md' }).error.code, 'E_STATE_INVALID');
    fs.rmSync(path.join(root, '.easyskillz/state.json'));
    assert.equal(restore({ cwd: root, backupId: 'absent' }).error.code, 'E_DOC_CONFLICT');
  } finally { cleanupFixture(root); }
});

test('docs sync reports missing owned sources and refuses unmarked drift', () => {
  const root = makeFixture({ 'rules.md': 'rules\n' });
  try {
    adopt({ cwd: root, source: 'rules.md', target: 'AGENTS.md', write: true });
    fs.rmSync(path.join(root, 'rules.md'));
    assert.equal(sync({ cwd: root }).actions[0].type, 'docs-missing-source');
    fs.writeFileSync(path.join(root, 'rules.md'), 'new rules\n');
    fs.appendFileSync(path.join(root, 'AGENTS.md'), '\nuser content\n');
    assert.equal(sync({ cwd: root }).error.code, 'E_DOC_CONFLICT');
  } finally { cleanupFixture(root); }
});

test('docs adoption rolls its target back when state commit fails', () => {
  const root = makeFixture({ 'rules.md': 'rules\n' });
  try {
    assert.throws(() => adopt({
      cwd: root, source: 'rules.md', target: 'AGENTS.md', write: true,
      hooks: { beforeStateCommit: () => { throw new Error('state failed'); } },
    }), /state failed/);
    assert.equal(fs.existsSync(path.join(root, 'AGENTS.md')), false);
    assert.equal(fs.existsSync(path.join(root, '.easyskillz/state.json')), false);
  } finally { cleanupFixture(root); }
});

test('failed docs adoption and sync leave no new backup or other filesystem change', () => {
  const root = makeFixture({ 'rules.md': 'one\n' });
  try {
    adopt({ cwd: root, source: 'rules.md', target: 'AGENTS.md', write: true, timestamp: '2026-08-08_000020' });

    const beforeAdopt = snapshotTree(root);
    assert.throws(() => adopt({
      cwd: root, source: 'rules.md', target: 'AGENTS.md', write: true, timestamp: '2026-08-08_000021',
      hooks: { beforeStateCommit: () => { throw new Error('adopt failed'); } },
    }), /adopt failed/);
    assert.equal(snapshotTree(root), beforeAdopt);

    fs.writeFileSync(path.join(root, 'rules.md'), 'two\n');
    const beforeSync = snapshotTree(root);
    assert.throws(() => sync({
      cwd: root, write: true, timestamp: '2026-08-08_000022',
      hooks: { beforeWrite: () => { throw new Error('sync failed'); } },
    }), /sync failed/);
    assert.equal(snapshotTree(root), beforeSync);
  } finally { cleanupFixture(root); }
});

test('multi-target docs sync and restore roll back all earlier writes on a late failure', () => {
  const root = makeFixture({ 'a.md': 'a1\n', 'b.md': 'b1\n' });
  try {
    adopt({ cwd: root, source: 'a.md', target: 'AGENTS.md', write: true, timestamp: '2026-08-08_000010' });
    adopt({ cwd: root, source: 'b.md', target: 'CLAUDE.md', write: true, timestamp: '2026-08-08_000010' });
    fs.writeFileSync(path.join(root, 'a.md'), 'a2\n');
    fs.writeFileSync(path.join(root, 'b.md'), 'b2\n');
    const beforeSync = { agents: fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), claude: fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8') };
    assert.throws(() => sync({ cwd: root, write: true, timestamp: '2026-08-08_000011', hooks: { beforeWrite: (_change, index) => { if (index === 1) throw new Error('sync failed'); } } }), /sync failed/);
    assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), beforeSync.agents);
    assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), beforeSync.claude);

    sync({ cwd: root, write: true, timestamp: '2026-08-08_000012' });

    fs.writeFileSync(path.join(root, 'AGENTS.md'), 'current agents\n');
    fs.writeFileSync(path.join(root, 'CLAUDE.md'), 'current claude\n');
    assert.throws(() => restore({ cwd: root, backupId: '2026-08-08_000012', write: true, hooks: { beforeWrite: (_change, index) => { if (index === 1) throw new Error('restore failed'); } } }), /restore failed/);
    assert.equal(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8'), 'current agents\n');
    assert.equal(fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8'), 'current claude\n');
  } finally { cleanupFixture(root); }
});
