'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PassThrough } = require('node:stream');
const {
  BIN,
  makeWorkspace,
  removeWorkspace,
  runCli,
  snapshotTree,
  parseSingleJson,
} = require('../support/cli');
const { runPty } = require('../support/pty');
const { runCli: runInProcess } = require('../../index');

function injectedTty(response) {
  const stdin = new PassThrough();
  let stdout = '';
  let stderr = '';
  stdin.isTTY = true;
  stdin.end(`${response}\n`);
  return {
    context: {
      stdin,
      stdout: { write: (value) => { stdout += value; } },
      stderr: { write: (value) => { stderr += value; } },
      isTTY: true,
    },
    stdout: () => stdout,
    stderr: () => stderr,
  };
}

function relativeFiles(root, directory = root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory()
      ? relativeFiles(root, absolute)
      : [path.relative(root, absolute).replaceAll('\\', '/')];
  }).sort();
}

test('dry-run returns a deterministic preview without dispatch or writes', () => {
  const cwd = makeWorkspace();
  try {
    const before = snapshotTree(cwd);
    const result = runCli(['skill', 'add', 'review-pr', '--dry-run', '--json'], { cwd });
    assert.equal(result.status, 0);
    const envelope = parseSingleJson(result.stdout);
    assert.equal(envelope.command, 'skill.add');
    assert.equal(envelope.result.kind, 'preview');
    assert.equal(envelope.result.applied, false);
    assert.equal(envelope.result.actions.length, 1);
    assert.deepEqual(envelope.result.actions[0].type, 'create-skill');
    assert.equal(envelope.result.actions[0].path, '.easyskillz/skills/review-pr/SKILL.md');
    assert.equal(snapshotTree(cwd), before);
  } finally {
    removeWorkspace(cwd);
  }
});

test('AC-05: bare non-interactive mutation previews instead of inferring consent', () => {
  const cwd = makeWorkspace();
  try {
    const before = snapshotTree(cwd);
    const result = runCli(['skill', 'add', 'review-pr', '--json'], { cwd });
    assert.equal(result.status, 0);
    assert.equal(parseSingleJson(result.stdout).result.kind, 'preview');
    assert.equal(snapshotTree(cwd), before);
  } finally {
    removeWorkspace(cwd);
  }
});

test('AC-05/30: injected TTY accepts or rejects exactly one public-runner plan', async () => {
  for (const item of [
    { response: 'n', applied: false },
    { response: 'yes', applied: true },
  ]) {
    const cwd = makeWorkspace();
    try {
      const before = snapshotTree(cwd);
      const io = injectedTty(item.response);
      assert.equal(await runInProcess(['skill', 'add', 'review-pr'], { ...io.context, cwd }), 0);
      const output = io.stdout();
      assert.equal((output.match(/Plan for skill\.add:/g) || []).length, 1);
      assert.equal((output.match(/Apply this plan\?/g) || []).length, 1);
      assert.equal(io.stderr(), '');
      if (item.applied) {
        const skillPath = path.join(cwd, '.easyskillz', 'skills', 'review-pr', 'SKILL.md');
        assert.deepEqual(relativeFiles(cwd), [
          '.easyskillz/skills/review-pr/SKILL.md',
          '.easyskillz/state.json',
        ]);
        assert.match(fs.readFileSync(skillPath, 'utf8'), /^---\nname: review-pr\n/);
        assert.notEqual(snapshotTree(cwd), before);
        assert.doesNotMatch(output, /Cancelled\./);
      } else {
        assert.equal(snapshotTree(cwd), before);
        assert.equal((output.match(/Cancelled\./g) || []).length, 1);
      }
    } finally {
      removeWorkspace(cwd);
    }
  }
});

test('AC-05: real PTY presents one boundary prompt and rejection makes no changes', async () => {
  const cwd = makeWorkspace();
  try {
    const before = snapshotTree(cwd);
    const result = await runPty(['skill', 'add', 'review-pr'], {
      cwd,
      entrypoint: BIN,
      respondWhen: 'Apply this plan? [y/N]:',
      response: 'n\r',
    });
    assert.equal(result.status, 0);
    assert.equal((result.output.match(/Apply this plan\?/g) || []).length, 1);
    assert.match(result.output, /Cancelled\./);
    assert.equal(snapshotTree(cwd), before);
  } finally {
    removeWorkspace(cwd);
  }
});

test('AC-05: write-gated mutations preview under a real PTY without an approval prompt', async () => {
  const cases = [
    {
      args: ['skill', 'format', 'demo'],
      files: { '.easyskillz/skills/demo/SKILL.md': '---\nname: demo\ndescription: >\n  Demo\n---\n# Demo\n' },
    },
    {
      args: ['project', 'migrate'],
      files: { '.easyskillz/easyskillz.json': JSON.stringify({ tools: ['gemini'], linkStrategy: 'stub' }) },
    },
    {
      args: ['docs', 'adopt', 'rules.md', '--target', 'AGENTS.md'],
      files: { 'rules.md': 'rules\n' },
    },
  ];
  for (const item of cases) {
    const cwd = makeWorkspace();
    try {
      for (const [relative, content] of Object.entries(item.files)) {
        const target = path.join(cwd, relative);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }
      const before = snapshotTree(cwd);
      const result = await runPty(item.args, { cwd, entrypoint: BIN });
      assert.equal(result.status, 0, item.args.join(' '));
      assert.doesNotMatch(result.output, /Apply this plan\?/);
      assert.equal(snapshotTree(cwd), before);
    } finally { removeWorkspace(cwd); }
  }
});
