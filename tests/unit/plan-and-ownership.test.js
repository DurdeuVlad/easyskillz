'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { planTargets } = require('../../src/operations/planner');
const fs = require('fs');
const { canDelete, inspectCurrent } = require('../../src/outputs/cleanup');
const { makeFixture, cleanupFixture } = require('../support/fixture');

test('AC-14: all shared native consumers deduplicate to one physical action', () => {
  const root = makeFixture({ '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: Demo skill\n---\n# Demo\n' });
  try {
    const consumers = ['codex', 'copilot', 'gemini-cli', 'antigravity', 'cursor', 'devin'];
    const actions = planTargets({ cwd: root, skills: [{ name: 'demo', workflow: false }], surfaces: consumers, materialization: 'copy' });
    assert.equal(actions.length, 1);
    assert.equal(actions[0].target, '.agents/skills/demo');
    assert.deepEqual(actions[0].consumers, [...consumers].sort());
    assert.equal(actions[0].kind, 'native');
  } finally { cleanupFixture(root); }
});

test('AC-12: Cursor plans a complete shared native directory with no transform', () => {
  const root = makeFixture({ '.easyskillz/skills/demo/SKILL.md': '# Demo', '.easyskillz/skills/demo/scripts/run.js': 'run' });
  try {
    const actions = planTargets({ cwd: root, skills: [{ name: 'demo', workflow: false }], surfaces: ['cursor'], materialization: 'copy' });
    assert.deepEqual(actions.map(({ kind, target }) => ({ kind, target })), [{ kind: 'native', target: '.agents/skills/demo' }]);
  } finally { cleanupFixture(root); }
});

test('AC-15: cleanup requires no consumers and matching copy identity', () => {
  assert.equal(canDelete({ manifest: { consumers: [], kind: 'copy', outputHash: 'abc' }, current: { kind: 'copy', outputHash: 'abc' } }), true);
  assert.equal(canDelete({ manifest: { consumers: ['codex'], kind: 'copy', outputHash: 'abc' }, current: { kind: 'copy', outputHash: 'abc' } }), false);
  assert.equal(canDelete({ manifest: { consumers: [], kind: 'copy', outputHash: 'abc' }, current: { kind: 'copy', outputHash: 'changed' } }), false);
  assert.equal(canDelete({ manifest: null, current: { kind: 'copy', outputHash: 'abc' } }), false);
});

test('AC-15: link cleanup compares realpath or recorded broken-link target', () => {
  const source = path.resolve('source');
  assert.equal(canDelete({ manifest: { consumers: [], kind: 'link', sourceRealpath: source }, current: { kind: 'link', realpath: source } }), true);
  assert.equal(canDelete({ manifest: { consumers: [], kind: 'link', linkTarget: '..\\source' }, current: { kind: 'broken-link', linkTarget: '..\\source' } }), true);
  assert.equal(canDelete({ manifest: { consumers: [], kind: 'link', sourceRealpath: source }, current: { kind: 'link', realpath: path.resolve('other') } }), false);
  assert.equal(canDelete({ manifest: { consumers: [], kind: 'link' }, current: { kind: 'unknown' } }), false);
  assert.equal(canDelete({ manifest: { consumers: [], kind: 'unknown' }, current: { kind: 'unknown' } }), false);
});

test('cleanup inspection distinguishes missing, copied, transformed, and unknown outputs', () => {
  const root = makeFixture({ 'copy/file.txt': 'copy', 'rule.mdc': 'rule', 'plain.txt': 'plain' });
  try {
    assert.equal(inspectCurrent(root, 'missing', { kind: 'copy' }).kind, 'missing');
    assert.equal(inspectCurrent(root, 'copy', { kind: 'copy' }).kind, 'copy');
    assert.equal(inspectCurrent(root, 'rule.mdc', { kind: 'transform' }).kind, 'transform');
    assert.equal(inspectCurrent(root, 'plain.txt', { kind: 'copy' }).kind, 'unknown');
    fs.mkdirSync(path.join(root, 'directory'));
    assert.equal(inspectCurrent(root, 'directory', { kind: 'transform' }).kind, 'unknown');
  } finally { cleanupFixture(root); }
});
