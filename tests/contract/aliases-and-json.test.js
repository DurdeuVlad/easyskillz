'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runCli, removeWorkspace, parseSingleJson } = require('../support/cli');

test('AC-04: human aliases emit exactly one deprecation warning when dispatched', () => {
  for (const args of [['doctor'], ['sync', '--dry-run'], ['add', 'demo', '--dry-run']]) {
    const result = runCli(args);
    try {
      assert.equal(result.status, 0, args.join(' '));
      const warnings = result.stderr.match(/deprecated/g) || [];
      assert.equal(warnings.length, 1, args.join(' '));
    } finally {
      removeWorkspace(result.cwd);
    }
  }
});

test('JSON aliases suppress warnings and expose the canonical command', () => {
  const result = runCli(['--json', 'doctor']);
  try {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    const envelope = parseSingleJson(result.stdout);
    assert.equal(envelope.ok, true);
    assert.equal(envelope.command, 'project.doctor');
    assert.equal(typeof envelope.result.issueCount, 'number');
  } finally {
    removeWorkspace(result.cwd);
  }
});

test('AC-03: alias options never become actions or skill names', () => {
  const result = runCli(['--json', '--dry-run', 'add', 'review-pr']);
  try {
    assert.equal(result.status, 0);
    const envelope = parseSingleJson(result.stdout);
    assert.equal(envelope.command, 'skill.add');
    assert.equal(envelope.result.actions[0].path, '.easyskillz/skills/review-pr/SKILL.md');
    assert.equal(envelope.result.actions.some((action) => String(action.path || '').includes('dry-run')), false);
  } finally {
    removeWorkspace(result.cwd);
  }
});
