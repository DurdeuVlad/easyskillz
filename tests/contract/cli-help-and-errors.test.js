'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  makeWorkspace,
  removeWorkspace,
  runCli,
  snapshotTree,
  parseSingleJson,
} = require('../support/cli');
const { runCli: runInProcess } = require('../../index');

function memoryIo() {
  let stdout = '';
  let stderr = '';
  return {
    context: {
      stdin: { isTTY: false },
      stdout: { write: (value) => { stdout += value; } },
      stderr: { write: (value) => { stderr += value; } },
      isTTY: false,
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

test('AC-01: root, domain, action, and alias help are successful and non-mutating', () => {
  const cwd = makeWorkspace();
  try {
    const before = snapshotTree(cwd);
    for (const args of [
      ['--help'],
      ['skill', '--help'],
      ['skill', 'add', '--help'],
      ['sync', '--help'],
      ['doctor', '--help'],
      ['add', '--help'],
    ]) {
      const result = runCli(args, { cwd });
      assert.equal(result.status, 0, args.join(' '));
      assert.match(result.stdout, /^Usage:/, args.join(' '));
      assert.equal(result.stderr, '', args.join(' '));
      assert.equal(snapshotTree(cwd), before, args.join(' '));
    }
  } finally {
    removeWorkspace(cwd);
  }
});

test('JSON help uses the success envelope and writes exactly one object', () => {
  const result = runCli(['skill', 'add', '--help', '--json']);
  try {
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    assert.deepEqual(parseSingleJson(result.stdout), {
      ok: true,
      command: 'skill.add',
      result: {
        kind: 'help',
        usage: 'easyskillz skill add <name> [options]',
        commands: [],
        options: ['--help, -h', '--json', '--dry-run', '--confirm'],
      },
    });
  } finally {
    removeWorkspace(result.cwd);
  }
});

test('version is terminal in human and JSON modes', () => {
  const human = runCli(['--version']);
  const json = runCli(['--version', '--json']);
  try {
    assert.match(human.stdout, /^\d+\.\d+\.\d+/);
    assert.equal(human.stderr, '');
    assert.deepEqual(parseSingleJson(json.stdout), {
      ok: true,
      command: 'root',
      result: { kind: 'version' },
    });
    assert.equal(json.stderr, '');
  } finally {
    removeWorkspace(human.cwd);
    removeWorkspace(json.cwd);
  }
});

test('AC-02: validation errors use stderr/exit 2 or one JSON error envelope and never write', () => {
  const cwd = makeWorkspace();
  try {
    const before = snapshotTree(cwd);
    const human = runCli(['project', 'sync', '--force'], { cwd });
    assert.equal(human.status, 2);
    assert.equal(human.stdout, '');
    assert.match(human.stderr, /E_USAGE_UNKNOWN_OPTION/);

    const json = runCli(['--json', 'skill', 'list', 'extra'], { cwd });
    assert.equal(json.status, 2);
    assert.equal(json.stderr, '');
    const envelope = parseSingleJson(json.stdout);
    assert.equal(envelope.ok, false);
    assert.equal(envelope.command, 'skill.list');
    assert.equal(envelope.error.code, 'E_USAGE_EXTRA_OPERAND');
    assert.equal(snapshotTree(cwd), before);
  } finally {
    removeWorkspace(cwd);
  }
});

test('in-process runner honors injected streams for terminal, usage, preview, and operational outcomes', async () => {
  const root = makeWorkspace();
  try {
    let output = memoryIo();
    assert.equal(await runInProcess(['--version'], { ...output.context, cwd: root }), 0);
    assert.match(output.stdout(), /^\d+\.\d+\.\d+/);

    output = memoryIo();
    assert.equal(await runInProcess(['--unknown'], { ...output.context, cwd: root }), 2);
    assert.match(output.stderr(), /E_USAGE_UNKNOWN_OPTION/);

    output = memoryIo();
    assert.equal(await runInProcess(['skill', 'add', 'demo', '--json'], { ...output.context, cwd: root }), 0);
    assert.equal(JSON.parse(output.stdout()).result.kind, 'preview');

    output = memoryIo();
    assert.equal(await runInProcess(['project', 'sync', '--confirm', '--json'], { ...output.context, cwd: root }), 0);
    assert.deepEqual(JSON.parse(output.stdout()).result.actions, []);

    output = memoryIo();
    const badRoot = makeWorkspace();
    fs.mkdirSync(path.join(badRoot, '.easyskillz'), { recursive: true });
    fs.writeFileSync(path.join(badRoot, '.easyskillz/easyskillz.json'), '{bad');
    assert.equal(await runInProcess(['project', 'sync', '--confirm', '--json'], { ...output.context, cwd: badRoot }), 1);
    assert.equal(JSON.parse(output.stdout()).error.code, 'E_CONFIG_PARSE');
    removeWorkspace(badRoot);
  } finally {
    removeWorkspace(root);
  }
});
