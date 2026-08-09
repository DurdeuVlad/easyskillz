'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseInvocation } = require('../../src/cli/parse');

test('normalizes canonical commands and options regardless of position', () => {
  const before = parseInvocation(['--json', 'project', '--dry-run', 'export', '--target', 'out']);
  const after = parseInvocation(['project', 'export', '--target=out', '--dry-run', '--json']);

  assert.equal(before.ok, true);
  assert.equal(after.ok, true);
  assert.deepEqual(before.invocation, after.invocation);
  assert.equal(before.invocation.command, 'project.export');
  assert.equal(before.invocation.options.target, 'out');
});

test('normalizes only the three approved compatibility aliases', () => {
  assert.equal(parseInvocation(['sync']).invocation.command, 'project.sync');
  assert.equal(parseInvocation(['doctor']).invocation.command, 'project.doctor');
  assert.deepEqual(parseInvocation(['add', 'review-pr']).invocation.operands, ['review-pr']);
  assert.equal(parseInvocation(['register', 'claude']).error.code, 'E_USAGE_UNKNOWN_COMMAND');
});

test('reports stable usage diagnostics before dispatch', () => {
  const cases = [
    [['project', 'sync', '--wat'], 'E_USAGE_UNKNOWN_OPTION'],
    [['tool', 'unregister', 'claude', '--mode'], 'E_USAGE_MISSING_VALUE'],
    [['tool', 'unregister', 'claude', '--mode=full', '--mode=revert'], 'E_USAGE_DUPLICATE_OPTION'],
    [['tool', 'unregister', 'claude', '--mode=bad'], 'E_USAGE_INVALID_VALUE'],
    [['skill', 'list', 'extra'], 'E_USAGE_EXTRA_OPERAND'],
    [['skill', 'add'], 'E_USAGE_MISSING_VALUE'],
    [['wat'], 'E_USAGE_UNKNOWN_COMMAND'],
    [['skill', 'wat'], 'E_USAGE_UNKNOWN_COMMAND'],
  ];

  for (const [argv, code] of cases) {
    const parsed = parseInvocation(argv);
    assert.equal(parsed.ok, false, argv.join(' '));
    assert.equal(parsed.error.code, code, argv.join(' '));
  }
});

test('-- ends option parsing and leaves following tokens as operands', () => {
  const parsed = parseInvocation(['skill', 'add', '--', '--literal-name']);
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.invocation.operands, ['--literal-name']);
});
