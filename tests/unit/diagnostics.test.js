'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createDiagnostic, sortDiagnostics } = require('../../src/diagnostics');
const { renderSuccess, renderError, aliasWarning } = require('../../src/cli/output');

function memoryIo() {
  let stdout = '';
  let stderr = '';
  return {
    io: { stdout: { write: (value) => { stdout += value; } }, stderr: { write: (value) => { stderr += value; } } },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

test('diagnostics infer severity and sort deterministically by path, field, and code', () => {
  const issues = [
    createDiagnostic('W_SKILL_EXTENSION', { path: 'b', field: 'z' }),
    createDiagnostic('E_SKILL_NAME', { path: 'a', field: 'name' }),
    createDiagnostic('E_SKILL_DESCRIPTION', { path: 'a', field: 'description' }),
  ];
  assert.equal(issues[0].severity, 'warning');
  assert.equal(issues[1].severity, 'error');
  assert.deepEqual(sortDiagnostics(issues).map((issue) => issue.code), ['E_SKILL_DESCRIPTION', 'E_SKILL_NAME', 'W_SKILL_EXTENSION']);
});

test('human output renders all structured result families and scoped errors', () => {
  const output = memoryIo();
  renderSuccess('skill.add', { kind: 'preview', actions: [] }, { json: false }, output.io);
  renderSuccess('project.doctor', { issueCount: 0, issues: [] }, { json: false }, output.io);
  renderSuccess('project.doctor', { issueCount: 1, issues: [{ code: 'W_TEST', path: 'a', message: 'warning' }] }, { json: false }, output.io);
  renderSuccess('skill.list', { skills: ['one'] }, { json: false }, output.io);
  renderSuccess('skill.list', {}, { json: false }, output.io);
  renderError({ command: 'skill.add', error: { code: 'E_TEST', message: 'bad' } }, { json: false }, output.io);
  assert.match(output.stdout(), /No actions required/);
  assert.match(output.stdout(), /No easyskillz compatibility issues/);
  assert.match(output.stdout(), /\[W_TEST\] a warning/);
  assert.match(output.stdout(), /"skills"/);
  assert.match(output.stderr(), /easyskillz skill add --help/);
});

test('JSON output preserves unsuccessful diagnostic results and null-command errors', () => {
  const output = memoryIo();
  renderSuccess('project.doctor', { issueCount: 1 }, { json: true }, output.io, false);
  renderError({ error: { code: 'E_TEST', message: 'bad' } }, { json: true }, output.io);
  const lines = output.stdout().trim().split('\n').map(JSON.parse);
  assert.deepEqual(lines[0], { ok: false, command: 'project.doctor', result: { issueCount: 1 } });
  assert.equal(lines[1].command, null);
  assert.equal(aliasWarning({}), null);
});
